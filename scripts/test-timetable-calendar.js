// 用匿名课表验证日期排程、App 备份互通，以及真实 Page 的编辑/调课流程。
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const store = require('../miniprogram/utils/timetable-store');
const calendar = require('../miniprogram/utils/timetable-calendar');
const schedule = require('../miniprogram/utils/timetable-schedule');
const codec = require('../miniprogram/utils/timetable-codec');

// 由 Android 0.2.23 的真实 encodeFullBackup 生成，不含真实学生数据。
const APP_BACKUP = 'SYUCT-APP3:03e7aec6:{"settings":{"semester":"2026-2027-1","firstWeekDate":"2026-08-31","totalWeeks":20,"periodTimes":[["08:00","08:50"],["09:00","09:50"],["10:10","11:00"],["11:10","12:00"],["13:30","14:20"],["14:30","15:20"],["15:40","16:30"],["16:40","17:30"],["18:30","19:20"],["19:30","20:20"],["",""],["",""]]},"courses":[{"name":"测试课程","teacher":"测试教师","room":"瑞师楼222","weekday":1,"startSection":1,"endSection":2,"startWeek":1,"endWeek":7,"weekType":"custom","weeks":[1,2,4,5,7],"colorIndex":0}],"adjustments":[{"sourceDate":"2026-09-28","targetDate":"2026-09-20","suspendSource":true}]}';
const course = (overrides) => Object.assign({ id: 'monday', name: '匿名课程', teacher: '教师甲', room: '瑞师楼222', weekday: 1, startSection: 1, endSection: 2, startWeek: 1, endWeek: 16, weekType: 'all', colorIndex: 0 }, overrides);
const baseState = () => store.normalizeState({ settings: { semester: '2026-2027-1', firstWeekDate: '2026-08-31', totalWeeks: 20 }, courses: [course(), course({ id: 'sunday', name: '周日原课程', weekday: 7 })] });
const event = (dataset, value) => ({ currentTarget: { dataset: dataset || {} }, detail: { value } });

function storageStub() {
  const storage = {}, files = {}, modals = [], toasts = [];
  global.wx = {
    env: { USER_DATA_PATH: '/test' }, getStorageSync: (key) => storage[key],
    setStorageSync: (key, value) => { storage[key] = JSON.parse(JSON.stringify(value)); },
    getFileSystemManager: () => ({ readFileSync: (key) => { if (!files[key]) throw new Error('absent'); return files[key]; }, writeFileSync: (key, value) => { files[key] = value; } }),
    showToast: (options) => toasts.push(options), showModal: (options) => modals.push(options),
    navigateBack: () => {}, switchTab: () => {}
  };
  return { storage, files, modals, toasts };
}

function loadPage(name) {
  const filename = path.resolve(__dirname, `../miniprogram/pages/${name}/${name}.js`);
  let definition;
  const app = { globalData: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    require: createRequire(filename), Page: (value) => { definition = value; }, wx: global.wx,
    getApp: () => app, getCurrentPages: () => [{ route: 'pages/timetable/timetable' }, {}],
    setInterval: () => 1, clearInterval: () => {}, setTimeout, Date, console
  }, { filename });
  const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)) };
  page.setData = (patch, callback) => {
    Object.entries(patch).forEach(([key, value]) => {
      const keys = key.replace(/\[(\d+)\]/g, '.$1').split('.');
      let target = page.data;
      keys.slice(0, -1).forEach((part) => { target = target[part]; });
      target[keys[keys.length - 1]] = value;
    });
    if (callback) callback();
  };
  return { page, app };
}

test('旧课表迁移保留课程并补全默认时间，自选周次在 TT2 中不填补空周', () => {
  const state = baseState();
  assert.equal(state.courses.length, 2);
  assert.deepEqual(state.adjustments, []);
  assert.deepEqual(state.settings.periodTimes, calendar.DEFAULT_TIMES);
  state.courses = [course({ weekType: 'custom', weeks: [7, 1, 2, 5, 4, 4] })];
  const normalized = store.normalizeState(state);
  assert.deepEqual(normalized.courses[0].weeks, [1, 2, 4, 5, 7]);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].filter((w) => calendar.courseRunsInWeek(normalized.courses[0], w)), [1, 2, 4, 5, 7]);
  const decoded = store.parseImportText(store.createShareCode(normalized));
  assert.deepEqual(decoded.courses.map((c) => [c.startWeek, c.endWeek]), [[1, 2], [4, 5], [7, 7]]);
  assert.equal(decoded.courses.some((c) => calendar.courseRunsInWeek(c, 3)), false);
  assert.throws(() => store.normalizeState({ courses: [course({ weekType: 'custom', weeks: [] })] }), /至少选择一周/);
});

test('Android 完整备份导入/导出保留周次、调课和 12 节时间；损坏备份拒绝导入', () => {
  const state = store.parseImportText(APP_BACKUP);
  assert.deepEqual(state.courses[0].weeks, [1, 2, 4, 5, 7]);
  assert.equal(state.adjustments[0].targetDate, '2026-09-20');
  assert.equal(state.settings.periodTimes.length, 12);
  const restored = codec.decodeFullBackup(store.createFullBackup(state));
  assert.deepEqual(restored.adjustments, state.adjustments);
  assert.deepEqual(restored.courses[0].weeks, state.courses[0].weeks);
  assert.deepEqual(store.parseImportText(JSON.stringify(store.createExportPayload(state))).adjustments, state.adjustments);
  assert.throws(() => store.parseImportText(APP_BACKUP.replace('瑞师楼', '其他楼')), /不完整或已被修改/);
});

test('跨周整天调课按原周次生效，目标日原课程被替换，原日期可停课或保留', () => {
  const state = store.parseImportText(APP_BACKUP);
  state.courses.push(course({ id: 'original-target', weekday: 7, name: '原目标日课程' }));
  const target = calendar.effectiveDay(state, '2026-09-20');
  assert.equal(target.status, 'adjusted');
  assert.equal(target.courses.length, 1);
  assert.equal(target.courses[0].name, '测试课程');
  assert.equal(target.courses[0].weekday, 7);
  assert.equal(target.sourceWeek, 5);
  assert.equal(target.targetWeek, 3);
  assert.equal(calendar.effectiveDay(state, '2026-09-28').status, 'suspended');
  assert.equal(calendar.effectiveDay(state, '2026-09-28').courses.length, 0);
  state.adjustments[0].suspendSource = false;
  assert.equal(calendar.effectiveDay(state, '2026-09-28').courses.length, 1);
  state.adjustments = [];
  assert.equal(calendar.effectiveDay(state, '2026-09-20').courses[0].name, '原目标日课程');
  assert.equal(calendar.effectiveDay(state, '2026-10-12').courses[0].name, '测试课程');
});

test('公休日停课；全部模式不重新显示停课课程；手动调到公休日优先', () => {
  const state = baseState();
  state.courses.push(course({ id: 'thursday', weekday: 4 }));
  assert.equal(calendar.effectiveDay(state, '2026-10-01').status, 'holiday');
  assert.equal(calendar.effectiveDay(state, '2026-10-01').courses.length, 0);
  assert.equal(calendar.weekDays(state, 5, true)[3].visibleCourses.length, 0);
  assert.equal(calendar.effectiveDay(state, '2026-09-28').status, 'normal');
  assert.equal(calendar.effectiveDay(state, '2026-09-20').courses.length, 1);
  assert.equal(calendar.isPublicRestDay('2027-10-01'), false);
  state.adjustments = [{ sourceDate: '2026-09-28', targetDate: '2026-10-01', suspendSource: true }];
  assert.equal(calendar.effectiveDay(state, '2026-10-01').status, 'adjusted');
  assert.equal(calendar.effectiveDay(state, '2026-10-01').courses[0].id, 'monday');
  assert.equal(calendar.weekDays(state, 5, true)[0].visibleCourses.length, 0);
});

test('调课冲突、超学期日期和错误节次时间被拒绝；有效自定义时间贯穿显示', () => {
  const state = baseState();
  const a = { sourceDate: '2026-09-28', targetDate: '2026-09-20', suspendSource: true };
  assert.throws(() => calendar.validateAdjustments([a, { ...a, sourceDate: '2026-09-21' }], state.settings), /其他调课/);
  assert.throws(() => calendar.validateAdjustments([{ ...a, targetDate: a.sourceDate }], state.settings), /不能相同/);
  assert.throws(() => calendar.validateAdjustments([{ ...a, targetDate: '2027-06-01' }], state.settings), /本学期/);
  const times = calendar.validateTimes();
  times[1] = ['08:40', '09:50'];
  assert.throws(() => calendar.validateTimes(times), /重叠/);
  times[1] = ['09:00', '09:50']; times[10] = ['20:30', '21:20']; times[11] = ['21:30', '22:20'];
  state.settings.periodTimes = calendar.validateTimes(times);
  assert.equal(schedule.formatSectionTime(11, 12, state.settings.periodTimes), '20:30 - 22:20');
  assert.equal(schedule.buildGrid([course({ startSection: 11, endSection: 12 })], 1, state.settings).rows[10].startLabel, '20:30');
});

test('按北京时间标记调课后的当前课，课间和下课瞬间不误标', () => {
  const state = store.parseImportText(APP_BACKUP);
  const moved = calendar.effectiveDay(state, '2026-09-20').courses[0];
  assert.equal(schedule.courseIsCurrent(moved, 3, 7, state.settings, new Date('2026-09-20T00:20:00Z')), true);
  assert.equal(schedule.courseIsCurrent(moved, 3, 7, state.settings, new Date('2026-09-20T00:50:00Z')), false);
  assert.equal(schedule.courseIsCurrent(moved, 3, 7, state.settings, new Date('2026-09-20T00:55:00Z')), false);
  assert.equal(schedule.courseIsCurrent(moved, 3, 7, state.settings, new Date('2026-09-20T01:00:00Z')), true);
  assert.equal(calendar.schoolClock(new Date('2026-09-19T16:01:00Z')).date, '2026-09-20');
});

test('调课单独修改也进入历史；双份存储和恢复保留高级排课', () => {
  storageStub();
  const state = baseState();
  store.saveState(state);
  state.adjustments.push({ sourceDate: '2026-09-28', targetDate: '2026-09-20', suspendSource: true });
  store.saveState(state);
  assert.equal(store.loadState().adjustments.length, 1);
  state.adjustments = [];
  store.saveState(state);
  assert.equal(store.restoreLatestHistory().adjustments.length, 1);
});

test('真实课程编辑页点选离散周并保存，课程详情保留分行字段；原有数据继续可编辑', () => {
  storageStub(); store.saveState(baseState());
  const { page } = loadPage('timetable');
  page.onLoad(); page.openAddCourse();
  page.onCourseWeekTypeChange(event({}, 3)); page.clearCourseWeeks();
  [1, 2, 4, 5, 7].forEach((week) => page.toggleCourseWeek(event({ week })));
  page.data.courseForm.name = '离散周测试'; page.data.courseForm.weekdayIndex = 1;
  page.saveCourse();
  const saved = page.data.state.courses.find((c) => c.name === '离散周测试');
  assert.deepEqual(saved.weeks, [1, 2, 4, 5, 7]);
  page.setData({ selectedWeek: 5, selectedWeekday: 2 }); page.refreshSchedule();
  page.openDetail(event({ id: saved.id }));
  assert.match(page.data.detail.courses[0].weekLabel, /1、2、4、5、7/);
  page.editCourse(event({ id: saved.id }));
  assert.equal(page.data.courseForm.weekTypeIndex, 3);
  assert.equal(page.data.courseForm.weekCells.filter((w) => w.selected).length, 5);
});

test('全览星期入口可调课，确认前不落盘；详情编辑正确回传源课程，取消后恢复', () => {
  const stub = storageStub(); store.saveState(baseState());
  const { page, app } = loadPage('timetable-grid');
  page.onLoad({ week: '5' }); page.reload();
  page.openAdjustment(event({ weekday: 1 }));
  page.onAdjustmentTargetChange(event({}, '2026-09-20'));
  page.saveAdjustment();
  assert.equal(store.loadState().adjustments.length, 0);
  stub.modals.pop().success({ confirm: true });
  assert.equal(page.data.weekdays[0].statusLabel, '调课迁出');
  assert.equal(store.loadState().adjustments.length, 1);
  page.setData({ selectedWeek: 3 }); page.refresh();
  const block = page.data.blocks.find((b) => b.weekday === 7);
  page.openDetail(event({ key: block.key }));
  assert.equal(page.data.detail.courses[0].id, 'monday');
  assert.equal(page.data.detail.courses[0].teacher, '教师甲');
  page.editCourse(event({ id: 'monday' }));
  assert.equal(app.globalData.pendingEditCourseId, 'monday');
  page.openAdjustment(event({ weekday: 7 })); page.removeAdjustment();
  stub.modals.pop().success({ confirm: true });
  assert.equal(page.data.weekdays[6].statusLabel, '');
  assert.equal(page.data.blocks.find((b) => b.weekday === 7).name, '周日原课程');
});
