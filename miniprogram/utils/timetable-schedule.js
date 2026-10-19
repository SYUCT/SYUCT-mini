// 课表排程共用逻辑：节次时间表、周次判断与格式化。
// 由课表列表页与周视图页共用，节次时间只维护这一份。
const calendar = require('./timetable-calendar');

const WEEKDAY_OPTIONS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const WEEK_TYPE_OPTIONS = [
  { label: '每周', value: 'all' },
  { label: '单周', value: 'odd' },
  { label: '双周', value: 'even' },
  { label: '自选周次', value: 'custom' }
];

const PERIOD_TIME_OPTIONS = {
  1: { start: '8:00', end: '8:50' },
  2: { start: '9:00', end: '9:50' },
  3: { start: '10:10', end: '11:00' },
  4: { start: '11:10', end: '12:00' },
  5: { start: '13:30', end: '14:20' },
  6: { start: '14:30', end: '15:20' },
  7: { start: '15:40', end: '16:30' },
  8: { start: '16:40', end: '17:30' },
  9: { start: '18:30', end: '19:20' },
  10: { start: '19:30', end: '20:20' }
};

function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const parts = value.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function todayWeekday() {
  return calendar.schoolClock().weekday;
}

function calculateCurrentWeek(firstWeekDate, totalWeeks) {
  const actual = calculateActualWeek(firstWeekDate, totalWeeks, new Date());
  if (actual !== null) return actual;
  if (!firstWeekDate) return 1;
  return calendar.schoolClock().date < firstWeekDate ? 1 : totalWeeks;
}

// 与 calculateCurrentWeek 的区别：超出学期范围时返回 null 而不是夹到边界，
// 用于判断"今天到底是不是第 N 周"，不能靠夹取后的值蒙对。
function calculateActualWeek(firstWeekDate, totalWeeks, referenceDate) {
  if (!parseLocalDate(firstWeekDate)) return null;
  const raw = calendar.weekForDate({ firstWeekDate }, calendar.schoolClock(referenceDate).date);
  if (raw < 1 || raw > totalWeeks) return null;
  return raw;
}

function clockToMinutes(value) {
  return calendar.clockToMinutes(value);
}

function courseRunsInWeek(course, week) {
  return calendar.courseRunsInWeek(course, week);
}

function courseIsCurrent(course, selectedWeek, selectedWeekday, settings, referenceDate) {
  const actualWeek = calculateActualWeek(settings.firstWeekDate, settings.totalWeeks, referenceDate);
  const clock = calendar.schoolClock(referenceDate);
  const actualWeekday = clock.weekday;
  if (!actualWeek || selectedWeek !== actualWeek || selectedWeekday !== actualWeekday) return false;
  if (course.weekday !== actualWeekday || course.inWeek === false || (!course.adjusted && !courseRunsInWeek(course, actualWeek))) return false;
  const times = settings.periodTimes || calendar.DEFAULT_TIMES;
  for (let section = course.startSection; section <= course.endSection; section += 1) {
    const pair = times[section - 1] || [];
    const start = clockToMinutes(pair[0]), end = clockToMinutes(pair[1]);
    if (start !== null && end !== null && clock.minute >= start && clock.minute < end) return true;
  }
  return false;
}

function weekTypeLabel(value) {
  const item = WEEK_TYPE_OPTIONS.find((option) => option.value === value);
  return item ? item.label : '每周';
}

function formatSectionLabel(startSection, endSection) {
  return startSection === endSection ? `${startSection}节` : `${startSection}-${endSection}节`;
}

function formatSectionTime(startSection, endSection, times) {
  if (times) {
    const start = times[startSection - 1], end = times[endSection - 1];
    return start && end && start[0] && end[1] ? `${start[0]} - ${end[1]}` : '';
  }
  const start = PERIOD_TIME_OPTIONS[startSection];
  const end = PERIOD_TIME_OPTIONS[endSection];
  if (!start || !end) return '';
  return `${start.start} - ${end.end}`;
}

function formatCourseWeeks(course) {
  if (course.weekType === 'custom') return `第 ${(course.weeks || []).join('、')} 周`;
  return `${course.startWeek}-${course.endWeek} 周${course.weekType === 'all' ? '' : ` · ${weekTypeLabel(course.weekType)}`}`;
}

function decorateCourse(course, week, settings, now) {
  return { ...course,
    sectionLabel: formatSectionLabel(course.startSection, course.endSection),
    timeLabel: formatSectionTime(course.startSection, course.endSection, settings.periodTimes),
    weekLabel: formatCourseWeeks(course), weekdayLabel: WEEKDAY_OPTIONS[course.weekday - 1],
    inWeek: typeof course.inWeek === 'boolean' ? course.inWeek : courseRunsInWeek(course, week),
    isCurrent: courseIsCurrent(course, week, course.weekday, settings, now || new Date()) };
}

// 教室名普遍是「应星楼(原6#教学楼)403」这种。全览网格空间有限，
// 去掉括号内的旧楼名与“楼/座”等冗余字，但保留新楼名和门牌号。
function summarizeRoom(room) {
  const text = String(room || '').trim();
  if (!text) return { label: '', building: '', number: '' };

  const clean = text
    .replace(/[（(]\s*原[^）)]*[）)]/g, '')
    .replace(/\s+/g, '');

  let building = '';
  let number = '';
  const tail = /([A-Za-z]?\d+[A-Za-z0-9-]*)$/.exec(clean);

  if (tail) {
    number = tail[1];
    building = clean.slice(0, tail.index);
  } else {
    const paren = /^(.*?)[（(]([^（）()]+)[）)]$/.exec(clean);
    if (paren) {
      building = paren[1];
      number = paren[2];
    } else {
      return { label: clean, building: clean, number: '' };
    }
  }

  building = building
    .replace(/^原/, '')
    .replace(/(?:教学楼|实验楼|实训楼)$/g, '')
    .replace(/楼/g, '')
    .replace(/座$/g, '')
    .replace(/(?:中心|馆)$/g, '');

  if (!building) return { label: number, building: '', number };
  return { label: `${building}·${number}`, building, number };
}

function shortRoom(room) {
  return summarizeRoom(room).label;
}

// 周视图网格布局常量。行高用 rpx，与 timetable-grid.wxss 的 .grid-section 对应。
const GRID_MIN_SECTIONS = 10;
const GRID_MAX_SECTIONS = 12;
const GRID_ROW_HEIGHT = 128;

// 网格用绝对定位而不是 CSS grid：跨节次的课要占多行高度，
// 绝对定位可以直接用 top/height 表达，不需要维护占位表。
function buildGrid(courses, week, settings) {
  const list = Array.isArray(courses) ? courses : [];
  const maxSection = Math.min(
    GRID_MAX_SECTIONS,
    Math.max(GRID_MIN_SECTIONS, ...list.map((course) => course.endSection || 1))
  );

  const rows = [];
  for (let section = 1; section <= maxSection; section += 1) {
    const pair = settings && settings.periodTimes && settings.periodTimes[section - 1];
    const time = pair ? { start: pair[0], end: pair[1] } : PERIOD_TIME_OPTIONS[section];
    rows.push({
      section,
      startLabel: time ? time.start : '',
      endLabel: time ? time.end : ''
    });
  }

  // 同一天同一起始节次可能有多门课（典型是单双周各一门），
  // 网格里每列只有 92rpx，并排会挤成不可读，所以叠成一格 + 数量角标。
  const slots = new Map();
  list.forEach((course) => {
    const key = `${course.weekday}-${course.startSection}`;
    if (!slots.has(key)) slots.set(key, []);
    slots.get(key).push(course);
  });

  const blocks = [];
  slots.forEach((group, key) => {
    const sorted = group.slice().sort((a, b) => {
      const aRuns = (typeof a.inWeek === 'boolean' ? a.inWeek : courseRunsInWeek(a, week)) ? 0 : 1;
      const bRuns = (typeof b.inWeek === 'boolean' ? b.inWeek : courseRunsInWeek(b, week)) ? 0 : 1;
      if (aRuns !== bRuns) return aRuns - bRuns;   // 本周实际上课的排在最前
      return a.endSection - b.endSection;
    });
    const primary = sorted[0];
    const span = Math.max(1, primary.endSection - primary.startSection + 1);
    const room = summarizeRoom(primary.room);
    blocks.push({
      key,
      ids: sorted.map((item) => item.id),
      weekday: primary.weekday,
      startSection: primary.startSection,
      span,
      name: primary.name,
      room: room.label,
      roomBuilding: room.building,
      roomNumber: room.number,
      colorIndex: primary.colorIndex,
      inWeek: typeof primary.inWeek === 'boolean' ? primary.inWeek : courseRunsInWeek(primary, week),
      adjusted: Boolean(primary.adjusted),
      date: primary.date || '',
      overflow: sorted.length > 1 ? sorted.length : 0,
      top: (primary.startSection - 1) * GRID_ROW_HEIGHT,
      height: span * GRID_ROW_HEIGHT
    });
  });

  return { rows, maxSection, blocks };
}

module.exports = {
  WEEKDAY_OPTIONS,
  WEEK_TYPE_OPTIONS,
  PERIOD_TIME_OPTIONS,
  GRID_MIN_SECTIONS,
  GRID_MAX_SECTIONS,
  GRID_ROW_HEIGHT,
  parseLocalDate,
  formatMonthDay,
  todayWeekday,
  calculateCurrentWeek,
  calculateActualWeek,
  clockToMinutes,
  courseRunsInWeek,
  courseIsCurrent,
  weekTypeLabel,
  formatSectionLabel,
  formatSectionTime,
  formatCourseWeeks,
  decorateCourse,
  shortRoom,
  buildGrid
};
