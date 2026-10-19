// 日期排课规则与 Android App 0.2.23 对齐；本地课表、全览和备份共用。
const DAY_MS = 86400000;
const DEFAULT_TIMES = [
  ['08:00', '08:50'], ['09:00', '09:50'], ['10:10', '11:00'], ['11:10', '12:00'],
  ['13:30', '14:20'], ['14:30', '15:20'], ['15:40', '16:30'], ['16:40', '17:30'],
  ['18:30', '19:20'], ['19:30', '20:20'], ['', ''], ['', '']
];
// 国办发明电〔2025〕7号；只采用已公布的 2026 年全国统一放假日期。
const PUBLIC_REST_RANGES = [
  ['2026-01-01', '2026-01-03'], ['2026-02-15', '2026-02-23'],
  ['2026-04-04', '2026-04-06'], ['2026-05-01', '2026-05-05'],
  ['2026-06-19', '2026-06-21'], ['2026-09-25', '2026-09-27'], ['2026-10-01', '2026-10-07']
];

function dateDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) throw new Error('请选择有效日期');
  const [year, month, day] = value.split('-').map(Number);
  const ms = Date.UTC(year, month - 1, day);
  if (new Date(ms).toISOString().slice(0, 10) !== value) throw new Error('日期不存在');
  return ms;
}

function schoolClock(now) {
  const date = new Date((now || new Date()).getTime() + 8 * 3600000);
  return {
    date: date.toISOString().slice(0, 10),
    day: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    weekday: date.getUTCDay() || 7,
    minute: date.getUTCHours() * 60 + date.getUTCMinutes()
  };
}

function weekForDate(settings, date) {
  if (!settings.firstWeekDate) return null;
  return Math.floor((dateDay(date) - dateDay(settings.firstWeekDate)) / (7 * DAY_MS)) + 1;
}

function dateForWeekday(settings, week, weekday) {
  if (!settings.firstWeekDate || week < 1 || week > settings.totalWeeks || weekday < 1 || weekday > 7) return '';
  return new Date(dateDay(settings.firstWeekDate) + ((week - 1) * 7 + weekday - 1) * DAY_MS).toISOString().slice(0, 10);
}

function normalizeWeeks(weeks) {
  if (!Array.isArray(weeks) || !weeks.length || weeks.some((w) => !Number.isInteger(w) || w < 1 || w > 30)) {
    throw new Error('自选周次需至少选择一周，范围为第 1–30 周');
  }
  return [...new Set(weeks)].sort((a, b) => a - b);
}

function courseRunsInWeek(course, week) {
  if (course.weekType === 'custom') return Array.isArray(course.weeks) && course.weeks.includes(week);
  return week >= course.startWeek && week <= course.endWeek
    && (course.weekType === 'all' || week % 2 === (course.weekType === 'odd' ? 1 : 0));
}

function clockToMinutes(value) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function validateTimes(times) {
  if (times === undefined) return DEFAULT_TIMES.map((pair) => pair.slice());
  if (!Array.isArray(times) || times.length !== 12) throw new Error('节次时间表需要 12 行');
  let previous = -1;
  return times.map((pair, index) => {
    if (!Array.isArray(pair) || pair.length !== 2) throw new Error(`第 ${index + 1} 节时间格式有误`);
    if (pair[0] === '' && pair[1] === '') return ['', ''];
    const start = clockToMinutes(pair[0]), end = clockToMinutes(pair[1]);
    if (start === null || end === null || end <= start || start < previous) throw new Error(`第 ${index + 1} 节时间无效或与前一节重叠`);
    previous = end;
    return pair.map((time) => time.padStart(5, '0'));
  });
}

function validateAdjustments(raw, settings) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 50) throw new Error('调课记录最多 50 条');
  if (raw.length && !settings.firstWeekDate) throw new Error('请先设置第一周的周一，再按日期调课');
  const first = settings.firstWeekDate ? dateDay(settings.firstWeekDate) : 0;
  const end = first + settings.totalWeeks * 7 * DAY_MS;
  const used = new Set();
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('调课记录无效');
    const sourceDate = String(item.sourceDate || ''), targetDate = String(item.targetDate || '');
    const source = dateDay(sourceDate), target = dateDay(targetDate);
    if (source === target) throw new Error('原日期和目标日期不能相同');
    if (source < first || source >= end || target < first || target >= end) throw new Error('调课日期必须在本学期内');
    if (used.has(sourceDate) || used.has(targetDate)) throw new Error('该日期已参与其他调课，请先取消原记录');
    if (typeof item.suspendSource !== 'boolean') throw new Error('请选择原日期是否停课');
    used.add(sourceDate); used.add(targetDate);
    return { sourceDate, targetDate, suspendSource: item.suspendSource };
  });
}

function isPublicRestDay(date) {
  return PUBLIC_REST_RANGES.some(([first, last]) => date >= first && date <= last);
}

function effectiveDay(state, date) {
  const day = dateDay(date), targetWeek = weekForDate(state.settings, date);
  const weekday = new Date(day).getUTCDay() || 7;
  const adjustments = state.adjustments || [];
  const target = adjustments.find((a) => a.targetDate === date);
  const holiday = !target && isPublicRestDay(date);
  const stopped = !target && !holiday && adjustments.some((a) => a.sourceDate === date && a.suspendSource);
  const sourceDate = target ? target.sourceDate : date;
  const sourceWeek = weekForDate(state.settings, sourceDate);
  const sourceWeekday = new Date(dateDay(sourceDate)).getUTCDay() || 7;
  const inTerm = sourceWeek !== null && sourceWeek >= 1 && sourceWeek <= state.settings.totalWeeks;
  const status = target ? 'adjusted' : holiday ? 'holiday' : stopped ? 'suspended' : 'normal';
  const courses = !holiday && !stopped && inTerm ? state.courses
    .filter((c) => c.weekday === sourceWeekday && courseRunsInWeek(c, sourceWeek))
    .map((c) => ({ ...c, weekday, sourceDate, adjusted: Boolean(target), date, inWeek: true })) : [];
  return { date, weekday, sourceDate, sourceWeek, sourceWeekday, targetWeek, status, courses };
}

const STATUS_LABELS = { normal: '', adjusted: '调课', holiday: '公休日', suspended: '调课迁出' };

function weekDays(state, week, showOtherWeeks, now) {
  const today = schoolClock(now).date;
  return Array.from({ length: 7 }, (_, index) => {
    const weekday = index + 1, date = dateForWeekday(state.settings, week, weekday);
    const day = date ? effectiveDay(state, date) : {
      date: '', weekday, sourceWeek: week, sourceWeekday: weekday, status: 'normal',
      courses: state.courses.filter((c) => c.weekday === weekday && courseRunsInWeek(c, week))
        .map((c) => ({ ...c, inWeek: true }))
    };
    const extra = showOtherWeeks && !['holiday', 'suspended'].includes(day.status) ? state.courses
      .filter((c) => c.weekday === day.sourceWeekday && !courseRunsInWeek(c, day.sourceWeek))
      .map((c) => ({ ...c, weekday, inWeek: false, date, sourceDate: day.sourceDate, adjusted: day.status === 'adjusted' })) : [];
    return { ...day, label: `周${'一二三四五六日'[index]}`, dateLabel: date ? `${Number(date.slice(5, 7))}/${Number(date.slice(8))}` : '',
      statusLabel: STATUS_LABELS[day.status], isToday: Boolean(date && date === today), count: day.courses.length,
      visibleCourses: day.courses.concat(extra) };
  });
}

module.exports = { DEFAULT_TIMES, dateDay, schoolClock, weekForDate, dateForWeekday, normalizeWeeks,
  courseRunsInWeek, clockToMinutes, validateTimes, validateAdjustments, isPublicRestDay, effectiveDay, weekDays };
