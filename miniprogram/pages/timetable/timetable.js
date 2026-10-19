const store = require('../../utils/timetable-store');
const { withShare } = require('../../utils/share');
const { searchCoursePresets } = require('../../data/timetable-course-presets');
const { SITE } = require('../../data/content');
const calendar = require('../../utils/timetable-calendar');
const adjustments = require('../../utils/timetable-adjustment-page');
const SHARE_TITLE = 'SYUCT 校园指南 · 我的课表';

const {
  WEEKDAY_OPTIONS,
  WEEK_TYPE_OPTIONS,
  todayWeekday,
  calculateCurrentWeek,
  courseRunsInWeek,
  decorateCourse,
  formatSectionLabel,
  formatSectionTime
} = require('../../utils/timetable-schedule');
const SECTION_PAIR_OPTIONS = [
  { label: '1-2节', startSection: 1, endSection: 2 },
  { label: '3-4节', startSection: 3, endSection: 4 },
  { label: '5-6节', startSection: 5, endSection: 6 },
  { label: '7-8节', startSection: 7, endSection: 8 },
  { label: '9-10节', startSection: 9, endSection: 10 },
  { label: '11-12节', startSection: 11, endSection: 12 }
];
function sectionPickerLabel(pair, times) {
  const time = formatSectionTime(pair.startSection, pair.endSection, times);
  return time ? `${pair.label}（${time}）` : `${pair.label}（时间未设置）`;
}
const SECTION_PAIR_LABELS = SECTION_PAIR_OPTIONS.map((item) => sectionPickerLabel(item));
const TOTAL_WEEK_OPTIONS = Array.from({ length: 30 }, (_, index) => `${index + 1} 周`);
const COURSE_WEEK_OPTIONS = Array.from({ length: 30 }, (_, index) => `${index + 1} 周`);

function formatHeroTitle(titleName) {
  const name = Array.from(String(titleName || '').trim()).slice(0, 6).join('');
  return name ? `${name}的化大课表` : '我的化大课表';
}

function findSectionPairIndex(startSection, endSection) {
  return SECTION_PAIR_OPTIONS.findIndex((item) => item.startSection === startSection && item.endSection === endSection);
}

function createSectionFormState(startSection, endSection, times) {
  const pairIndex = findSectionPairIndex(startSection, endSection);
  if (pairIndex >= 0) {
    return {
      sectionPairIndex: pairIndex,
      sectionPairDisplayLabel: sectionPickerLabel(SECTION_PAIR_OPTIONS[pairIndex], times),
      preserveOriginalSection: false,
      originalStartSection: startSection,
      originalEndSection: endSection
    };
  }
  return {
    sectionPairIndex: 0,
    sectionPairDisplayLabel: `${formatSectionLabel(startSection, endSection)}（原课表节次，保存时保持不变）`,
    preserveOriginalSection: true,
    originalStartSection: startSection,
    originalEndSection: endSection
  };
}

function emptyCourseForm(totalWeeks, times) {
  return {
    id: '',
    name: '',
    teacher: '',
    room: '',
    weekdayIndex: Math.max(0, todayWeekday() - 1),
    sectionPairIndex: 0,
    sectionPairDisplayLabel: sectionPickerLabel(SECTION_PAIR_OPTIONS[0], times),
    preserveOriginalSection: false,
    originalStartSection: 1,
    originalEndSection: 2,
    startWeekIndex: 0,
    endWeekIndex: Math.max(0, Math.min(totalWeeks || 20, 30) - 1),
    weekTypeIndex: 0,
    weeks: [],
    weekCells: []
  };
}

Page(Object.assign({
  data: {
    ...adjustments.data,
    state: store.defaultState(),
    heroTitle: '我的化大课表',
    selectedWeek: 1,
    currentWeek: 1,
    weekSummaryPrefix: '本周为',
    selectedWeekday: todayWeekday(),
    weekdays: [],
    dayCourses: [],
    selectedDay: {},
    detail: null,
    showOtherWeeks: false,
    weekCourseCount: 0,
    weekdayOptions: WEEKDAY_OPTIONS,
    sectionPairOptions: SECTION_PAIR_LABELS,
    totalWeekOptions: TOTAL_WEEK_OPTIONS,
    courseWeekOptions: COURSE_WEEK_OPTIONS,
    weekTypeOptions: WEEK_TYPE_OPTIONS.map((item) => item.label),
    showCourseModal: false,
    showSettingsModal: false,
    isEditingCourse: false,
    courseNameSuggestions: [],
    courseForm: emptyCourseForm(20),
    settingsForm: {
      titleName: '',
      semester: '2026-2027-1',
      firstWeekDate: '',
      totalWeeksIndex: 19
    },
    historyCount: 0
  },

  onLoad() {
    this.reloadState(true);
  },

  onShow() {
    this.reloadState(false);
    this.consumePendingEdit();
    clearInterval(this.__clockTimer);
    this.__clockTimer = setInterval(() => this.refreshSchedule(), 30000);
  },
  onHide() { clearInterval(this.__clockTimer); },
  onUnload() { clearInterval(this.__clockTimer); },

  onScheduleSaved(state) {
    this.setData({ state, detail: null, historyCount: store.getHistory().length }, () => this.refreshSchedule());
  },

  // 周视图跳回来时带的待编辑课程 id（switchTab 无法传参，只能走 globalData）
  consumePendingEdit() {
    const app = getApp();
    const pending = app && app.globalData && app.globalData.pendingEditCourseId;
    if (!pending) return;
    app.globalData.pendingEditCourseId = '';
    this.openCourseEditor(pending);
  },

  reloadState(resetWeek) {
    const state = store.loadState();
    const titleName = store.loadTitleName();
    const currentWeek = calculateCurrentWeek(state.settings.firstWeekDate, state.settings.totalWeeks);
    let selectedWeek = resetWeek ? currentWeek : this.data.selectedWeek;
    selectedWeek = Math.max(1, Math.min(selectedWeek || currentWeek, state.settings.totalWeeks));
    this.setData({
      state,
      heroTitle: formatHeroTitle(titleName),
      currentWeek,
      selectedWeek,
      courseWeekOptions: COURSE_WEEK_OPTIONS.slice(0, state.settings.totalWeeks),
      sectionPairOptions: SECTION_PAIR_OPTIONS.map((pair) => sectionPickerLabel(pair, state.settings.periodTimes)),
      historyCount: store.getHistory().length
    }, () => this.refreshSchedule());
  },

  refreshSchedule() {
    const state = this.data.state;
    const selectedWeek = this.data.selectedWeek;
    const selectedWeekday = this.data.selectedWeekday;
    const referenceDate = new Date();
    const weekdays = calendar.weekDays(state, selectedWeek, this.data.showOtherWeeks, referenceDate)
      .map((day) => ({ ...day, label: day.label.replace('周', ''), selected: day.weekday === selectedWeekday }));
    const selectedDay = weekdays[selectedWeekday - 1];
    const dayCourses = selectedDay.visibleCourses
      .slice()
      .sort((a, b) => a.startSection - b.startSection)
      .map((course) => ({
        ...decorateCourse(course, selectedWeek, state.settings, referenceDate)
      }));
    const weekCourseCount = weekdays.reduce((sum, day) => sum + day.count, 0);
    const weekSummaryPrefix = selectedWeek === this.data.currentWeek ? '本周为' : '正在查看';
    this.setData({ weekdays, selectedDay, dayCourses, weekCourseCount, weekSummaryPrefix,
      currentWeek: calculateCurrentWeek(state.settings.firstWeekDate, state.settings.totalWeeks) });
  },

  toggleOtherWeeks() { this.setData({ showOtherWeeks: !this.data.showOtherWeeks }, () => this.refreshSchedule()); },
  onWeekChange(e) { this.setData({ selectedWeek: Number(e.detail.value) + 1 }, () => this.refreshSchedule()); },

  selectWeekday(e) {
    if (Number(e.currentTarget.dataset.weekday) === this.data.selectedWeekday) { this.openAdjustment(e); return; }
    this.setData({ selectedWeekday: Number(e.currentTarget.dataset.weekday) }, () => this.refreshSchedule());
  },

  previousWeek() {
    if (this.data.selectedWeek <= 1) return;
    this.setData({ selectedWeek: this.data.selectedWeek - 1 }, () => this.refreshSchedule());
  },

  nextWeek() {
    if (this.data.selectedWeek >= this.data.state.settings.totalWeeks) return;
    this.setData({ selectedWeek: this.data.selectedWeek + 1 }, () => this.refreshSchedule());
  },

  goCurrentWeek() {
    this.setData({ selectedWeek: this.data.currentWeek, selectedWeekday: todayWeekday() }, () => this.refreshSchedule());
  },

  openAddCourse() {
    const form = emptyCourseForm(this.data.state.settings.totalWeeks, this.data.state.settings.periodTimes);
    form.weekCells = this.weekCells([]);
    this.setData({
      showCourseModal: true,
      isEditingCourse: false,
      courseNameSuggestions: [],
      courseForm: form
    });
  },

  editCourse(e) {
    this.setData({ detail: null });
    this.openCourseEditor(e.currentTarget.dataset.id);
  },

  openDetail(e) {
    const course = this.data.dayCourses.find((c) => c.id === e.currentTarget.dataset.id);
    if (course) this.setData({ detail: { courses: [course] } });
  },
  closeDetail() { this.setData({ detail: null }); },
  deleteCourseQuick(e) {
    this.setData({ 'courseForm.id': e.currentTarget.dataset.id });
    this.deleteCourse();
  },
  weekCells(weeks) {
    return Array.from({ length: this.data.state.settings.totalWeeks }, (_, index) => ({ week: index + 1, selected: weeks.includes(index + 1) }));
  },

  openCourseEditor(id) {
    const course = this.data.state.courses.find((item) => item.id === id);
    if (!course) return;
    const weekTypeIndex = Math.max(0, WEEK_TYPE_OPTIONS.findIndex((item) => item.value === course.weekType));
    const sectionFormState = createSectionFormState(course.startSection, course.endSection, this.data.state.settings.periodTimes);
    this.setData({
      showCourseModal: true,
      isEditingCourse: true,
      courseNameSuggestions: [],
      courseForm: {
        id: course.id,
        name: course.name,
        teacher: course.teacher,
        room: course.room,
        weekdayIndex: course.weekday - 1,
        ...sectionFormState,
        startWeekIndex: course.startWeek - 1,
        endWeekIndex: course.endWeek - 1,
        weekTypeIndex,
        weeks: course.weeks || [],
        weekCells: this.weekCells(course.weeks || [])
      }
    });
  },

  closeCourseModal() {
    this.setData({ showCourseModal: false, courseNameSuggestions: [] });
  },

  onCourseNameInput(e) {
    const value = e.detail.value;
    const normalizedValue = String(value || '').trim();
    const suggestions = searchCoursePresets(normalizedValue, 4)
      .filter((name) => name !== normalizedValue);
    this.setData({
      'courseForm.name': value,
      courseNameSuggestions: suggestions
    });
  },

  onCourseNameBlur() {
    setTimeout(() => this.setData({ courseNameSuggestions: [] }), 120);
  },

  chooseCourseNameSuggestion(e) {
    const name = String(e.currentTarget.dataset.name || '');
    if (!name) return;
    this.setData({
      'courseForm.name': name,
      courseNameSuggestions: []
    });
  },
  onCourseTeacherInput(e) { this.setData({ 'courseForm.teacher': e.detail.value }); },
  onCourseRoomInput(e) { this.setData({ 'courseForm.room': e.detail.value }); },
  onCourseWeekdayChange(e) { this.setData({ 'courseForm.weekdayIndex': Number(e.detail.value) }); },
  onCourseSectionPairChange(e) {
    const sectionPairIndex = Number(e.detail.value);
    const sectionPair = SECTION_PAIR_OPTIONS[sectionPairIndex] || SECTION_PAIR_OPTIONS[0];
    this.setData({
      'courseForm.sectionPairIndex': sectionPairIndex,
      'courseForm.sectionPairDisplayLabel': sectionPickerLabel(sectionPair, this.data.state.settings.periodTimes),
      'courseForm.preserveOriginalSection': false
    });
  },
  onCourseStartWeekChange(e) { this.setData({ 'courseForm.startWeekIndex': Number(e.detail.value) }); },
  onCourseEndWeekChange(e) { this.setData({ 'courseForm.endWeekIndex': Number(e.detail.value) }); },
  onCourseWeekTypeChange(e) {
    const index = Number(e.detail.value), form = this.data.courseForm;
    let weeks = form.weeks || [];
    if (index === 3 && !weeks.length) {
      const course = { startWeek: form.startWeekIndex + 1, endWeek: form.endWeekIndex + 1,
        weekType: WEEK_TYPE_OPTIONS[form.weekTypeIndex].value };
      weeks = Array.from({ length: this.data.state.settings.totalWeeks }, (_, i) => i + 1).filter((w) => courseRunsInWeek(course, w));
    }
    this.setData({ 'courseForm.weekTypeIndex': index, 'courseForm.weeks': weeks, 'courseForm.weekCells': this.weekCells(weeks) });
  },
  toggleCourseWeek(e) {
    const week = Number(e.currentTarget.dataset.week);
    const weeks = (this.data.courseForm.weeks || []).slice();
    const index = weeks.indexOf(week);
    if (index < 0) weeks.push(week); else weeks.splice(index, 1);
    weeks.sort((a, b) => a - b);
    this.setData({ 'courseForm.weeks': weeks, 'courseForm.weekCells': this.weekCells(weeks) });
  },
  selectAllCourseWeeks() {
    const weeks = Array.from({ length: this.data.state.settings.totalWeeks }, (_, i) => i + 1);
    this.setData({ 'courseForm.weeks': weeks, 'courseForm.weekCells': this.weekCells(weeks) });
  },
  clearCourseWeeks() { this.setData({ 'courseForm.weeks': [], 'courseForm.weekCells': this.weekCells([]) }); },

  saveCourse() {
    const form = this.data.courseForm;
    const name = String(form.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写课程名称', icon: 'none' });
      return;
    }
    const sectionPair = SECTION_PAIR_OPTIONS[form.sectionPairIndex] || SECTION_PAIR_OPTIONS[0];
    const keepOriginalSection = this.data.isEditingCourse && form.preserveOriginalSection;
    const startSection = keepOriginalSection ? form.originalStartSection : sectionPair.startSection;
    const endSection = keepOriginalSection ? form.originalEndSection : sectionPair.endSection;
    const custom = form.weekTypeIndex === 3;
    if (custom && !form.weeks.length) { wx.showToast({ title: '请至少选择一周', icon: 'none' }); return; }
    const startWeek = custom ? form.weeks[0] : form.startWeekIndex + 1;
    const endWeek = custom ? form.weeks[form.weeks.length - 1] : form.endWeekIndex + 1;
    if (endWeek < startWeek) {
      wx.showToast({ title: '结束周不能早于开始周', icon: 'none' });
      return;
    }

    const state = store.normalizeState(this.data.state);
    const course = {
      id: form.id || store.makeId(),
      name,
      teacher: String(form.teacher || '').trim(),
      room: String(form.room || '').trim(),
      weekday: form.weekdayIndex + 1,
      startSection,
      endSection,
      startWeek,
      endWeek,
      weekType: (WEEK_TYPE_OPTIONS[form.weekTypeIndex] || WEEK_TYPE_OPTIONS[0]).value,
      ...(custom ? { weeks: form.weeks.slice() } : {}),
      colorIndex: 0
    };
    if (!Array.from({ length: endWeek - startWeek + 1 }, (_, i) => i + startWeek).some((w) => courseRunsInWeek(course, w))) {
      wx.showToast({ title: '所选范围没有符合单双周的课程', icon: 'none' }); return;
    }
    if (this.data.isEditingCourse) {
      const index = state.courses.findIndex((item) => item.id === course.id);
      if (index < 0) {
        wx.showToast({ title: '课程不存在，请刷新后重试', icon: 'none' });
        return;
      }
      course.colorIndex = state.courses[index].colorIndex;
      state.courses[index] = course;
    } else {
      course.colorIndex = state.courses.length % 6;
      state.courses.push(course);
    }

    try {
      const saved = store.saveState(state);
      this.setData({ state: saved, showCourseModal: false, historyCount: store.getHistory().length }, () => this.refreshSchedule());
      wx.showToast({ title: this.data.isEditingCourse ? '课程已更新' : '课程已添加', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    }
  },

  deleteCourse() {
    const id = this.data.courseForm.id;
    if (!id) return;
    wx.showModal({
      title: '删除课程',
      content: '删除前会自动保留一个本地历史备份。',
      confirmText: '删除',
      confirmColor: '#d1242f',
      success: (res) => {
        if (!res.confirm) return;
        const state = store.normalizeState(this.data.state);
        state.courses = state.courses.filter((item) => item.id !== id);
        let saved;
        try {
          saved = store.saveState(state);
        } catch (e) {
          wx.showToast({ title: e.message || '删除失败', icon: 'none' });
          return;
        }
        this.setData({ state: saved, showCourseModal: false, historyCount: store.getHistory().length }, () => this.refreshSchedule());
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  },

  openSettings() {
    const settings = this.data.state.settings;
    this.setData({
      showSettingsModal: true,
      historyCount: store.getHistory().length,
      settingsForm: {
        titleName: store.loadTitleName(),
        semester: settings.semester,
        firstWeekDate: settings.firstWeekDate,
        totalWeeksIndex: Math.max(0, settings.totalWeeks - 1),
        periodTimes: settings.periodTimes.map((pair) => pair.slice())
      },
      showTimeSettings: false
    });
  },

  closeSettings() {
    this.setData({ showSettingsModal: false });
  },

  onTitleNameInput(e) {
    const titleName = Array.from(String(e.detail.value || '')).slice(0, 6).join('');
    this.setData({ 'settingsForm.titleName': titleName });
  },
  onSemesterInput(e) { this.setData({ 'settingsForm.semester': e.detail.value }); },
  onFirstWeekDateChange(e) { this.setData({ 'settingsForm.firstWeekDate': e.detail.value }); },
  onTotalWeeksChange(e) { this.setData({ 'settingsForm.totalWeeksIndex': Number(e.detail.value) }); },
  toggleTimeSettings() { this.setData({ showTimeSettings: !this.data.showTimeSettings }); },
  onPeriodTimeChange(e) {
    this.setData({ [`settingsForm.periodTimes[${Number(e.currentTarget.dataset.index)}][${Number(e.currentTarget.dataset.side)}]`]: e.detail.value });
  },
  clearPeriodTime(e) { this.setData({ [`settingsForm.periodTimes[${Number(e.currentTarget.dataset.index)}]`]: ['', ''] }); },
  resetPeriodTimes() { this.setData({ 'settingsForm.periodTimes': calendar.validateTimes() }); },

  saveSettings() {
    const form = this.data.settingsForm;
    const state = store.normalizeState(this.data.state);
    if (state.adjustments.length && form.firstWeekDate !== state.settings.firstWeekDate) {
      wx.showToast({ title: '请先取消现有调课，再更改第一周日期', icon: 'none' }); return;
    }
    state.settings = {
      semester: String(form.semester || '').trim() || '当前学期',
      firstWeekDate: form.firstWeekDate || '',
      totalWeeks: form.totalWeeksIndex + 1,
      periodTimes: form.periodTimes
    };
    try {
      const saved = store.saveState(state);
      const titleName = store.saveTitleName(form.titleName);
      const currentWeek = calculateCurrentWeek(saved.settings.firstWeekDate, saved.settings.totalWeeks);
      this.setData({
        state: saved,
        heroTitle: formatHeroTitle(titleName),
        currentWeek,
        selectedWeek: currentWeek,
        courseWeekOptions: COURSE_WEEK_OPTIONS.slice(0, saved.settings.totalWeeks),
        sectionPairOptions: SECTION_PAIR_OPTIONS.map((pair) => sectionPickerLabel(pair, saved.settings.periodTimes)),
        showSettingsModal: false,
        historyCount: store.getHistory().length
      }, () => this.refreshSchedule());
      wx.showToast({ title: '设置已保存', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: e.message || '设置保存失败', icon: 'none' });
    }
  },

  restoreHistory() {
    if (!this.data.historyCount) {
      wx.showToast({ title: '暂无可恢复的历史备份', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '恢复上一次课表',
      content: '将恢复到最近一次修改前的状态。当前状态不会自动覆盖这份历史备份。',
      confirmText: '恢复',
      success: (res) => {
        if (!res.confirm) return;
        const restored = store.restoreLatestHistory();
        if (!restored) {
          wx.showToast({ title: '恢复失败', icon: 'none' });
          return;
        }
        this.setData({ showSettingsModal: false });
        this.reloadState(true);
        wx.showToast({ title: '已恢复', icon: 'success' });
      }
    });
  },

  openAbout() {
    this.setData({ showSettingsModal: false });
    wx.navigateTo({ url: '/pages/about/about' });
  },

  onImport() {
    wx.showActionSheet({
      itemList: ['复制课表转换链接（首次使用）', '从剪贴板导入课表码 / 完整备份', '从微信聊天选择 JSON 文件'],
      success: (res) => {
        if (res.tapIndex === 0) this.copyTimetableConverterLink();
        if (res.tapIndex === 1) this.importFromClipboard();
        if (res.tapIndex === 2) this.importFromMessage();
      }
    });
  },

  copyTimetableAppLink() {
    wx.setClipboardData({
      data: `${SITE.siteUrl}downloads/SYUCT-Timetable.apk`,
      success: () => wx.showToast({ title: '下载链接已复制，请在浏览器打开', icon: 'none', duration: 2200 }),
      fail: () => wx.showToast({ title: '复制失败，请稍后重试', icon: 'none' })
    });
  },

  copyTimetableConverterLink() {
    wx.setClipboardData({
      data: `${SITE.siteUrl}timetable-converter.html`,
      success: () => wx.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none', duration: 2200 }),
      fail: () => wx.showToast({ title: '复制失败，请稍后重试', icon: 'none' })
    });
  },

  importFromMessage() {
    if (typeof wx.chooseMessageFile !== 'function') {
      wx.showToast({ title: '当前微信版本暂不支持选择聊天文件', icon: 'none' });
      return;
    }
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        try {
          const file = res.tempFiles && res.tempFiles[0];
          if (!file || !file.path) throw new Error('没有读取到文件');
          if (file.size && file.size > 1024 * 1024) throw new Error('课表 JSON 文件过大');
          const text = wx.getFileSystemManager().readFileSync(file.path, 'utf8');
          this.previewImport(text);
        } catch (e) {
          wx.showToast({ title: e.message || '读取失败', icon: 'none' });
        }
      }
    });
  },

  importFromClipboard() {
    wx.getClipboardData({
      success: (res) => this.previewImport(res.data),
      fail: () => wx.showToast({ title: '无法读取剪贴板', icon: 'none' })
    });
  },

  previewImport(text) {
    let incoming;
    try {
      incoming = store.parseImportText(text);
    } catch (e) {
      wx.showToast({ title: e.message || 'JSON 格式不正确', icon: 'none' });
      return;
    }
    if (!incoming.courses.length) {
      wx.showToast({ title: '课表文件里没有课程', icon: 'none' });
      return;
    }
    wx.showActionSheet({
      itemList: ['覆盖当前课表', '合并到当前课表'],
      success: (res) => {
        const mode = res.tapIndex === 0 ? 'replace' : 'merge';
        const label = mode === 'replace' ? '覆盖' : '合并';
        wx.showModal({
          title: `导入 ${incoming.courses.length} 门课程`,
          content: `学期：${incoming.settings.semester || '未填写'}\n含 ${incoming.adjustments.length} 条调课。将以“${label}”方式导入，操作前会保存本地历史备份。${mode === 'merge' ? '\n合并保留当前学期与节次时间；换机完整恢复建议选择覆盖。' : ''}`,
          confirmText: '确认导入',
          success: (modalRes) => {
            if (!modalRes.confirm) return;
            this.applyImport(incoming, mode);
          }
        });
      }
    });
  },

  applyImport(incoming, mode) {
    const current = store.normalizeState(this.data.state);
    let next;
    if (mode === 'replace') {
      next = store.normalizeState(incoming);
    } else {
      next = store.normalizeState(current);
      next.courses = store.mergeCourses(current.courses, incoming.courses);
      // 只补自己没填的开学日期，不要连学期名和总周数一起换掉：
      // 导入的 totalWeeks 偏小会让超出范围的周次再也翻不到。
      if (!next.settings.firstWeekDate && incoming.settings.firstWeekDate) {
        next.settings.firstWeekDate = incoming.settings.firstWeekDate;
      }
      if (incoming.adjustments.length) {
        if (next.settings.firstWeekDate !== incoming.settings.firstWeekDate) {
          wx.showToast({ title: '两份课表第一周日期不同，无法合并调课', icon: 'none' }); return;
        }
        const seen = new Set(next.adjustments.map((a) => JSON.stringify(a)));
        next.adjustments = next.adjustments.concat(incoming.adjustments.filter((a) => !seen.has(JSON.stringify(a))));
      }
    }
    let saved;
    try {
      saved = store.saveState(next);
    } catch (e) {
      wx.showToast({ title: e.message || '导入失败', icon: 'none' });
      return;
    }
    this.setData({ state: saved, historyCount: store.getHistory().length });
    this.reloadState(true);

    const doneTitle = mode === 'replace' ? '课表已导入' : '课程已合并';
    // 课表码里通常不带开学日期，缺了它周次相关的功能全都不准，
    // 所以趁用户注意力还在导入结果上引导一次，而不是只留一行静态提示。
    if (!saved.settings.firstWeekDate) {
      wx.showModal({
        title: doneTitle,
        content: `已有 ${saved.courses.length} 门课程。\n还差开学第一周的周一日期——填了才能自动跳到本周、并高亮正在上的课。`,
        confirmText: '现在填写',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) this.openSettings();
        }
      });
      return;
    }
    wx.showToast({ title: doneTitle, icon: 'success' });
  },

  onExport() {
    if (!this.data.state.courses.length) {
      wx.showToast({ title: '先添加课程再分享', icon: 'none' });
      return;
    }
    wx.showActionSheet({
      itemList: ['发送完整 JSON 文件', '复制课表码（普通课程）', '复制完整备份（含调课）'],
      success: (res) => {
        if (res.tapIndex === 0) this.shareJsonFile();
        if (res.tapIndex === 1) this.copyShareCode();
        if (res.tapIndex === 2) this.copyFullBackup();
      }
    });
  },

  shareJsonFile() {
    try {
      const filePath = store.writeExportFile(this.data.state);
      if (typeof wx.shareFileMessage !== 'function') {
        this.copyFullBackup('当前微信版本不支持文件转发，已复制完整备份');
        return;
      }
      wx.shareFileMessage({
        filePath,
        fileName: `SYUCT课表-${this.data.state.settings.semester}.json`,
        fail: () => this.copyFullBackup('文件转发失败，已复制完整备份')
      });
    } catch (e) {
      wx.showToast({ title: '生成课表文件失败', icon: 'none' });
    }
  },

  copyShareCode(message) {
    const state = this.data.state;
    const hasAdvancedSettings = state.adjustments.length || JSON.stringify(state.settings.periodTimes) !== JSON.stringify(calendar.DEFAULT_TIMES);
    if (!message && hasAdvancedSettings) {
      wx.showModal({ title: '普通课表码仅含课程', content: '自选周次会保留，但调课记录与自定义节次时间需要完整备份。', confirmText: '仍然复制', cancelText: '完整备份',
        success: (res) => { if (res.confirm) this.copyShareCode('普通课表码已复制'); else if (res.cancel) this.copyFullBackup(); } });
      return;
    }
    let code;
    try {
      code = store.createShareCode(this.data.state);
    } catch (e) {
      wx.showToast({ title: e.message || '生成课表码失败', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: code,
      success: () => {
        wx.showToast({ title: message || `课表码已复制（${code.length} 字符）`, icon: 'none', duration: 2200 });
      }
    });
  },

  copyFullBackup(message) {
    try {
      wx.setClipboardData({ data: store.createFullBackup(this.data.state), success: () => wx.showToast({ title: typeof message === 'string' ? message : '完整备份已复制，可在 App 或小程序导入', icon: 'none', duration: 2400 }) });
    } catch (e) { wx.showToast({ title: e.message || '备份失败', icon: 'none' }); }
  },

  openGridView() {
    wx.navigateTo({ url: `/pages/timetable-grid/timetable-grid?week=${this.data.selectedWeek}` });
  },

  openCommunity() {
    getApp().openWeb(
      `${SITE.siteUrl}community.html`,
      '课表码分享在网页版的校园社区里。是否复制链接到浏览器打开？'
    );
  },

  preventBubble() {}
}, adjustments.methods, withShare({ shareApp: { title: SHARE_TITLE }, shareTimeline: { title: SHARE_TITLE } })));
