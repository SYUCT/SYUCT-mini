const store = require('../../utils/timetable-store');
const calendar = require('../../utils/timetable-calendar');
const adjustments = require('../../utils/timetable-adjustment-page');
const { withShare } = require('../../utils/share');
const { GRID_MIN_SECTIONS, GRID_ROW_HEIGHT, calculateCurrentWeek, decorateCourse, buildGrid } = require('../../utils/timetable-schedule');
const SHARE_TITLE = 'SYUCT 校园指南 · 我的课表';

Page(Object.assign({
  data: {
    ...adjustments.data,
    state: store.defaultState(), selectedWeek: 1, currentWeek: 1, showOtherWeeks: false,
    rows: [], blocks: [], weekdays: [], weekOptions: [], rowHeight: GRID_ROW_HEIGHT,
    gridHeight: GRID_MIN_SECTIONS * GRID_ROW_HEIGHT, weekCourseCount: 0, detail: null
  },
  onLoad(options) {
    const week = Number(options && options.week);
    this.__initialWeek = Number.isFinite(week) && week >= 1 ? Math.floor(week) : 0;
    this.__loaded = false;
  },
  onShow() {
    this.reload();
    clearInterval(this.__clockTimer);
    this.__clockTimer = setInterval(() => this.refresh(), 30000);
  },
  onHide() { clearInterval(this.__clockTimer); },
  onUnload() { clearInterval(this.__clockTimer); },
  reload() {
    const state = store.loadState();
    const currentWeek = calculateCurrentWeek(state.settings.firstWeekDate, state.settings.totalWeeks);
    let selectedWeek = this.__loaded ? this.data.selectedWeek : (this.__initialWeek || currentWeek);
    this.__loaded = true;
    selectedWeek = Math.max(1, Math.min(selectedWeek || currentWeek, state.settings.totalWeeks));
    this.setData({ state, currentWeek, selectedWeek, weekOptions: Array.from({ length: state.settings.totalWeeks }, (_, i) => `第 ${i + 1} 周`) }, () => this.refresh());
  },
  onScheduleSaved(state) { this.setData({ state, detail: null }, () => this.refresh()); },
  refresh() {
    const { state, selectedWeek, showOtherWeeks } = this.data;
    const now = new Date();
    const weekdays = calendar.weekDays(state, selectedWeek, showOtherWeeks, now);
    const visible = [];
    weekdays.forEach((day) => day.visibleCourses.forEach((c) => visible.push(decorateCourse(c, selectedWeek, state.settings, now))));
    this.__occurrences = visible;
    const grid = buildGrid(visible, selectedWeek, state.settings);
    const blocks = grid.blocks.map((block) => {
      const primary = visible.find((c) => c.id === block.ids[0] && c.weekday === block.weekday);
      return { ...block, isCurrent: Boolean(primary && primary.isCurrent) };
    });
    this.setData({ rows: grid.rows, blocks, weekdays,
      gridHeight: grid.maxSection * GRID_ROW_HEIGHT,
      weekCourseCount: weekdays.reduce((sum, day) => sum + day.count, 0),
      currentWeek: calculateCurrentWeek(state.settings.firstWeekDate, state.settings.totalWeeks) });
  },
  toggleOtherWeeks() { this.setData({ showOtherWeeks: !this.data.showOtherWeeks }, () => this.refresh()); },
  previousWeek() { if (this.data.selectedWeek > 1) this.setData({ selectedWeek: this.data.selectedWeek - 1 }, () => this.refresh()); },
  nextWeek() { if (this.data.selectedWeek < this.data.state.settings.totalWeeks) this.setData({ selectedWeek: this.data.selectedWeek + 1 }, () => this.refresh()); },
  onWeekChange(e) { this.setData({ selectedWeek: Number(e.detail.value) + 1 }, () => this.refresh()); },
  goCurrentWeek() { this.setData({ selectedWeek: this.data.currentWeek }, () => this.refresh()); },
  openDetail(e) {
    const block = this.data.blocks.find((b) => b.key === e.currentTarget.dataset.key);
    if (!block) return;
    const courses = block.ids.map((id) => (this.__occurrences || []).find((c) => c.id === id && c.weekday === block.weekday)).filter(Boolean);
    if (courses.length) this.setData({ detail: { courses } });
  },
  closeDetail() { this.setData({ detail: null }); },
  deleteBlock(e) {
    const block = this.data.blocks.find((b) => b.key === e.currentTarget.dataset.key);
    if (!block) return;
    if (block.ids.length > 1) { this.openDetail(e); return; }
    const course = this.data.state.courses.find((c) => c.id === block.ids[0]);
    if (!course) return;
    wx.showModal({ title: '删除课程', content: `删除“${course.name}”的这条常规安排及其调课显示，操作前会保存历史备份。`, confirmText: '删除', confirmColor: '#d1242f',
      success: (res) => {
        if (!res.confirm) return;
        try {
          const state = store.normalizeState(this.data.state);
          state.courses = state.courses.filter((c) => c.id !== course.id);
          this.onScheduleSaved(store.saveState(state));
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (error) { wx.showToast({ title: error.message || '删除失败', icon: 'none' }); }
      }
    });
  },
  editCourse(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    this.setData({ detail: null });
    const app = getApp();
    if (app && app.globalData) app.globalData.pendingEditCourseId = id;
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/timetable/timetable' });
  },
  preventBubble() {}
}, adjustments.methods, withShare({ shareApp: { title: SHARE_TITLE }, shareTimeline: { title: SHARE_TITLE } })));
