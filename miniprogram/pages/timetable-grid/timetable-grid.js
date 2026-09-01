const store = require('../../utils/timetable-store');
const { withShare } = require('../../utils/share');
const {
  WEEKDAY_OPTIONS,
  GRID_MIN_SECTIONS,
  GRID_ROW_HEIGHT,
  parseLocalDate,
  formatMonthDay,
  calculateCurrentWeek,
  courseRunsInWeek,
  courseIsCurrent,
  weekTypeLabel,
  formatSectionLabel,
  formatSectionTime,
  buildGrid
} = require('../../utils/timetable-schedule');

const SHARE_TITLE = 'SYUCT 校园指南 · 我的课表';

function decorateCourse(course, week, settings, referenceDate) {
  return {
    ...course,
    sectionLabel: formatSectionLabel(course.startSection, course.endSection),
    timeLabel: formatSectionTime(course.startSection, course.endSection),
    weekLabel: `${course.startWeek}-${course.endWeek} 周${course.weekType === 'all' ? '' : ` · ${weekTypeLabel(course.weekType)}`}`,
    weekdayLabel: WEEKDAY_OPTIONS[course.weekday - 1] || '',
    inWeek: courseRunsInWeek(course, week),
    isCurrent: courseIsCurrent(course, week, course.weekday, settings, referenceDate)
  };
}

Page(Object.assign({
  data: {
    state: store.defaultState(),
    selectedWeek: 1,
    currentWeek: 1,
    showOtherWeeks: false,
    rows: [],
    blocks: [],
    weekdays: [],
    rowHeight: GRID_ROW_HEIGHT,
    gridHeight: GRID_MIN_SECTIONS * GRID_ROW_HEIGHT,
    weekCourseCount: 0,
    hiddenCount: 0,
    detail: null
  },

  onLoad(options) {
    const week = Number(options && options.week);
    this.__initialWeek = Number.isFinite(week) && week >= 1 ? Math.floor(week) : 0;
    this.__loaded = false;
  },

  onShow() {
    this.reload();
  },

  reload() {
    const state = store.loadState();
    const currentWeek = calculateCurrentWeek(state.settings.firstWeekDate, state.settings.totalWeeks);
    // 首次进入用传入的周次（没传则用当前周）；再次 onShow 时保留用户翻到的那一周
    let selectedWeek = this.__loaded ? this.data.selectedWeek : (this.__initialWeek || currentWeek);
    this.__loaded = true;
    selectedWeek = Math.max(1, Math.min(selectedWeek || currentWeek, state.settings.totalWeeks));
    this.setData({ state, currentWeek, selectedWeek }, () => this.refresh());
  },

  refresh() {
    const { state, selectedWeek, showOtherWeeks } = this.data;
    const referenceDate = new Date();
    const first = parseLocalDate(state.settings.firstWeekDate);
    const today = new Date(referenceDate.getTime());
    today.setHours(0, 0, 0, 0);

    const inWeek = state.courses.filter((course) => courseRunsInWeek(course, selectedWeek));
    const visible = showOtherWeeks ? state.courses : inWeek;
    const grid = buildGrid(visible, selectedWeek);
    const courseById = new Map(state.courses.map((course) => [course.id, course]));
    const blocks = grid.blocks.map((block) => {
      const primary = courseById.get(block.ids[0]);
      return {
        ...block,
        isCurrent: Boolean(primary && courseIsCurrent(
          primary,
          selectedWeek,
          primary.weekday,
          state.settings,
          referenceDate
        ))
      };
    });

    const weekdays = WEEKDAY_OPTIONS.map((label, index) => {
      let dateLabel = '';
      let isToday = false;
      if (first) {
        const date = new Date(first.getTime());
        date.setDate(date.getDate() + (selectedWeek - 1) * 7 + index);
        dateLabel = formatMonthDay(date);
        isToday = date.getTime() === today.getTime();
      }
      return { weekday: index + 1, label: label.replace('周', ''), dateLabel, isToday };
    });

    this.setData({
      rows: grid.rows,
      blocks,
      weekdays,
      gridHeight: grid.maxSection * GRID_ROW_HEIGHT,
      weekCourseCount: inWeek.length,
      hiddenCount: state.courses.length - inWeek.length
    });
  },

  toggleOtherWeeks() {
    this.setData({ showOtherWeeks: !this.data.showOtherWeeks }, () => this.refresh());
  },

  previousWeek() {
    if (this.data.selectedWeek <= 1) return;
    this.setData({ selectedWeek: this.data.selectedWeek - 1 }, () => this.refresh());
  },

  nextWeek() {
    if (this.data.selectedWeek >= this.data.state.settings.totalWeeks) return;
    this.setData({ selectedWeek: this.data.selectedWeek + 1 }, () => this.refresh());
  },

  goCurrentWeek() {
    this.setData({ selectedWeek: this.data.currentWeek }, () => this.refresh());
  },

  openDetail(e) {
    const key = e.currentTarget.dataset.key;
    const block = this.data.blocks.find((item) => item.key === key);
    if (!block) return;
    const referenceDate = new Date();
    const courses = block.ids
      .map((id) => this.data.state.courses.find((item) => item.id === id))
      .filter(Boolean)
      .map((course) => decorateCourse(course, this.data.selectedWeek, this.data.state.settings, referenceDate));
    if (!courses.length) return;
    this.setData({ detail: { courses } });
  },

  closeDetail() {
    this.setData({ detail: null });
  },

  // 课表页是 tabBar 页面，navigateTo 不可用、switchTab 又不能带参数，
  // 因此把待编辑的课程 id 挂在 globalData 上由课表页 onShow 取走。
  editCourse(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    this.setData({ detail: null });
    const app = getApp();
    if (app && app.globalData) app.globalData.pendingEditCourseId = id;
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({ url: '/pages/timetable/timetable' });
  },

  preventBubble() {}
}, withShare({ shareApp: { title: SHARE_TITLE }, shareTimeline: { title: SHARE_TITLE } })));
