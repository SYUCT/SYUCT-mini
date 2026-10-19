const store = require('./timetable-store');
const calendar = require('./timetable-calendar');

const data = {
  showAdjustmentModal: false, adjustmentForm: {}, adjustmentRecords: [],
  adjustmentMinDate: '', adjustmentMaxDate: '', adjustmentPreview: ''
};

function records(state) {
  return (state.adjustments || []).map((item, index) => ({ ...item, index }));
}

const methods = {
  openAdjustmentManager() {
    this.setData({ showSettingsModal: false });
    this.openAdjustment();
  },
  openAdjustment(e) {
    const state = this.data.state;
    if (!state.settings.firstWeekDate) {
      wx.showToast({ title: '请先设置第一周的周一', icon: 'none' });
      if (this.openSettings) this.openSettings();
      return;
    }
    const dataset = e && e.currentTarget ? e.currentTarget.dataset : {};
    const date = dataset.date || calendar.dateForWeekday(state.settings, this.data.selectedWeek, Number(dataset.weekday) || this.data.selectedWeekday || 1);
    const index = (state.adjustments || []).findIndex((a) => a.sourceDate === date || a.targetDate === date);
    this.setData({
      showAdjustmentModal: true,
      adjustmentForm: index >= 0 ? { ...state.adjustments[index], index } : { sourceDate: date, targetDate: '', suspendSource: true, index: -1 },
      adjustmentMinDate: calendar.dateForWeekday(state.settings, 1, 1),
      adjustmentMaxDate: calendar.dateForWeekday(state.settings, state.settings.totalWeeks, 7),
      adjustmentRecords: records(state)
    }, () => this.refreshAdjustmentPreview());
  },
  openAdjustmentRecord(e) {
    const item = this.data.state.adjustments[Number(e.currentTarget.dataset.index)];
    if (item) this.openAdjustment({ currentTarget: { dataset: { date: item.targetDate } } });
  },
  closeAdjustment() { this.setData({ showAdjustmentModal: false }); },
  onAdjustmentSourceChange(e) { this.setData({ 'adjustmentForm.sourceDate': e.detail.value }, () => this.refreshAdjustmentPreview()); },
  onAdjustmentTargetChange(e) { this.setData({ 'adjustmentForm.targetDate': e.detail.value }, () => this.refreshAdjustmentPreview()); },
  onAdjustmentSuspendChange(e) { this.setData({ 'adjustmentForm.suspendSource': e.detail.value }); },
  refreshAdjustmentPreview() {
    const { sourceDate, targetDate } = this.data.adjustmentForm;
    const { state } = this.data;
    if (!sourceDate || !targetDate) { this.setData({ adjustmentPreview: '将原日期整天的课程搬到目标日期；只影响这一次安排。' }); return; }
    const count = (date) => {
      const weekday = new Date(calendar.dateDay(date)).getUTCDay() || 7;
      const week = calendar.weekForDate(state.settings, date);
      return state.courses.filter((c) => c.weekday === weekday && calendar.courseRunsInWeek(c, week)).length;
    };
    this.setData({ adjustmentPreview: `${sourceDate} 的 ${count(sourceDate)} 个上课安排将移到 ${targetDate}，替换目标日原有安排。取消调课后恢复。` });
  },
  saveAdjustment() {
    const state = store.normalizeState(this.data.state);
    const form = this.data.adjustmentForm;
    const next = state.adjustments.filter((a, index) => index !== form.index);
    next.push({ sourceDate: form.sourceDate, targetDate: form.targetDate, suspendSource: form.suspendSource });
    try { state.adjustments = calendar.validateAdjustments(next, state.settings); }
    catch (e) { wx.showToast({ title: e.message, icon: 'none' }); return; }
    wx.showModal({
      title: '确认调整当天课表',
      content: `${this.data.adjustmentPreview}\n${form.suspendSource ? '原日期停课，标记“调课迁出”（国家公休日仍标记“公休日”）。' : '原日期仍照常上课。'}`,
      confirmText: '确认调课',
      success: (res) => {
        if (!res.confirm) return;
        try {
          const saved = store.saveState(state);
          this.setData({ showAdjustmentModal: false });
          this.onScheduleSaved(saved);
          wx.showToast({ title: '调课已保存', icon: 'success' });
        } catch (e) { wx.showToast({ title: e.message || '保存失败', icon: 'none' }); }
      }
    });
  },
  removeAdjustment() {
    const index = this.data.adjustmentForm.index;
    if (index < 0) return;
    wx.showModal({ title: '取消这次调课', content: '恢复两个日期的常规安排；国家公休日仍停课。', confirmText: '取消调课',
      success: (res) => {
        if (!res.confirm) return;
        try {
          const state = store.normalizeState(this.data.state);
          state.adjustments.splice(index, 1);
          const saved = store.saveState(state);
          this.setData({ showAdjustmentModal: false });
          this.onScheduleSaved(saved);
          wx.showToast({ title: '已恢复原安排', icon: 'success' });
        } catch (e) { wx.showToast({ title: e.message || '取消失败', icon: 'none' }); }
      }
    });
  }
};

module.exports = { data, methods };
