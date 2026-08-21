const store = require('../../utils/timetable-store');
const { withShare } = require('../../utils/share');
const { searchCoursePresets } = require('../../data/timetable-course-presets');
const SHARE_TITLE = 'SYUCT 校园指南 · 我的课表';

const WEEKDAY_OPTIONS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const WEEK_TYPE_OPTIONS = [
  { label: '每周', value: 'all' },
  { label: '单周', value: 'odd' },
  { label: '双周', value: 'even' }
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
const SECTION_PAIR_OPTIONS = [
  { label: '1-2节', startSection: 1, endSection: 2 },
  { label: '3-4节', startSection: 3, endSection: 4 },
  { label: '5-6节', startSection: 5, endSection: 6 },
  { label: '7-8节', startSection: 7, endSection: 8 },
  { label: '9-10节', startSection: 9, endSection: 10 }
].map((item) => ({
  ...item,
  timeLabel: formatSectionTime(item.startSection, item.endSection),
  pickerLabel: `${item.label}（${formatSectionTime(item.startSection, item.endSection)}）`
}));
const SECTION_PAIR_LABELS = SECTION_PAIR_OPTIONS.map((item) => item.pickerLabel);
const TOTAL_WEEK_OPTIONS = Array.from({ length: 30 }, (_, index) => `${index + 1} 周`);
const COURSE_WEEK_OPTIONS = Array.from({ length: 30 }, (_, index) => `${index + 1} 周`);

function formatHeroTitle(titleName) {
  const name = Array.from(String(titleName || '').trim()).slice(0, 6).join('');
  return name ? `${name}的化大课表` : '我的化大课表';
}

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
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

function calculateCurrentWeek(firstWeekDate, totalWeeks) {
  const first = parseLocalDate(firstWeekDate);
  if (!first) return 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const raw = Math.floor((today.getTime() - first.getTime()) / 604800000) + 1;
  if (raw < 1) return 1;
  if (raw > totalWeeks) return totalWeeks;
  return raw;
}

function calculateActualWeek(firstWeekDate, totalWeeks, referenceDate) {
  const first = parseLocalDate(firstWeekDate);
  if (!first) return null;
  const today = new Date(referenceDate.getTime());
  today.setHours(0, 0, 0, 0);
  const raw = Math.floor((today.getTime() - first.getTime()) / 604800000) + 1;
  if (raw < 1 || raw > totalWeeks) return null;
  return raw;
}

function clockToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function courseIsCurrent(course, selectedWeek, selectedWeekday, settings, referenceDate) {
  const actualWeek = calculateActualWeek(settings.firstWeekDate, settings.totalWeeks, referenceDate);
  const actualWeekday = referenceDate.getDay() === 0 ? 7 : referenceDate.getDay();
  if (!actualWeek || selectedWeek !== actualWeek || selectedWeekday !== actualWeekday) return false;
  if (course.weekday !== actualWeekday || !courseRunsInWeek(course, actualWeek)) return false;

  const start = PERIOD_TIME_OPTIONS[course.startSection];
  const end = PERIOD_TIME_OPTIONS[course.endSection];
  if (!start || !end) return false;
  const startMinutes = clockToMinutes(start.start);
  const endMinutes = clockToMinutes(end.end);
  if (startMinutes === null || endMinutes === null) return false;
  const nowMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
}

function courseRunsInWeek(course, week) {
  if (week < course.startWeek || week > course.endWeek) return false;
  if (course.weekType === 'odd' && week % 2 === 0) return false;
  if (course.weekType === 'even' && week % 2 !== 0) return false;
  return true;
}

function weekTypeLabel(value) {
  const item = WEEK_TYPE_OPTIONS.find((option) => option.value === value);
  return item ? item.label : '每周';
}

function formatSectionLabel(startSection, endSection) {
  return startSection === endSection ? `${startSection}节` : `${startSection}-${endSection}节`;
}

function formatSectionTime(startSection, endSection) {
  const start = PERIOD_TIME_OPTIONS[startSection];
  const end = PERIOD_TIME_OPTIONS[endSection];
  if (!start || !end) return '';
  return `${start.start} - ${end.end}`;
}

function findSectionPairIndex(startSection, endSection) {
  return SECTION_PAIR_OPTIONS.findIndex((item) => item.startSection === startSection && item.endSection === endSection);
}

function createSectionFormState(startSection, endSection) {
  const pairIndex = findSectionPairIndex(startSection, endSection);
  if (pairIndex >= 0) {
    return {
      sectionPairIndex: pairIndex,
      sectionPairDisplayLabel: SECTION_PAIR_OPTIONS[pairIndex].pickerLabel,
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

function emptyCourseForm(totalWeeks) {
  return {
    id: '',
    name: '',
    teacher: '',
    room: '',
    weekdayIndex: Math.max(0, todayWeekday() - 1),
    sectionPairIndex: 0,
    sectionPairDisplayLabel: SECTION_PAIR_OPTIONS[0].pickerLabel,
    preserveOriginalSection: false,
    originalStartSection: 1,
    originalEndSection: 2,
    startWeekIndex: 0,
    endWeekIndex: Math.max(0, Math.min(totalWeeks || 20, 30) - 1),
    weekTypeIndex: 0
  };
}

Page(Object.assign({
  data: {
    state: store.defaultState(),
    heroTitle: '我的化大课表',
    selectedWeek: 1,
    currentWeek: 1,
    weekSummaryPrefix: '本周为',
    selectedWeekday: todayWeekday(),
    weekdays: [],
    dayCourses: [],
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
      historyCount: store.getHistory().length
    }, () => this.refreshSchedule());
  },

  refreshSchedule() {
    const state = this.data.state;
    const selectedWeek = this.data.selectedWeek;
    const selectedWeekday = this.data.selectedWeekday;
    const first = parseLocalDate(state.settings.firstWeekDate);
    const referenceDate = new Date();
    const today = new Date(referenceDate.getTime());
    today.setHours(0, 0, 0, 0);

    const weekdays = WEEKDAY_OPTIONS.map((label, index) => {
      let dateLabel = '';
      let isToday = false;
      if (first) {
        const date = new Date(first.getTime());
        date.setDate(date.getDate() + (selectedWeek - 1) * 7 + index);
        dateLabel = formatMonthDay(date);
        isToday = date.getTime() === today.getTime();
      }
      const weekday = index + 1;
      const count = state.courses.filter((course) => course.weekday === weekday && courseRunsInWeek(course, selectedWeek)).length;
      return {
        weekday,
        label: label.replace('周', ''),
        dateLabel,
        isToday,
        selected: weekday === selectedWeekday,
        count
      };
    });

    const dayCourses = state.courses
      .filter((course) => course.weekday === selectedWeekday && courseRunsInWeek(course, selectedWeek))
      .slice()
      .sort((a, b) => a.startSection - b.startSection)
      .map((course) => ({
        ...course,
        sectionLabel: formatSectionLabel(course.startSection, course.endSection),
        timeLabel: formatSectionTime(course.startSection, course.endSection),
        weekLabel: `${course.startWeek}-${course.endWeek} 周${course.weekType === 'all' ? '' : ` · ${weekTypeLabel(course.weekType)}`}`,
        metaLabel: [course.teacher, course.room].filter(Boolean).join(' · '),
        isCurrent: courseIsCurrent(course, selectedWeek, selectedWeekday, state.settings, referenceDate)
      }));

    const weekCourseCount = state.courses.filter((course) => courseRunsInWeek(course, selectedWeek)).length;
    const weekSummaryPrefix = selectedWeek === this.data.currentWeek ? '本周为' : '正在查看';
    this.setData({ weekdays, dayCourses, weekCourseCount, weekSummaryPrefix });
  },

  selectWeekday(e) {
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
    this.setData({
      showCourseModal: true,
      isEditingCourse: false,
      courseNameSuggestions: [],
      courseForm: emptyCourseForm(this.data.state.settings.totalWeeks)
    });
  },

  editCourse(e) {
    const id = e.currentTarget.dataset.id;
    const course = this.data.state.courses.find((item) => item.id === id);
    if (!course) return;
    const weekTypeIndex = Math.max(0, WEEK_TYPE_OPTIONS.findIndex((item) => item.value === course.weekType));
    const sectionFormState = createSectionFormState(course.startSection, course.endSection);
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
        weekTypeIndex
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
      'courseForm.sectionPairDisplayLabel': sectionPair.pickerLabel,
      'courseForm.preserveOriginalSection': false
    });
  },
  onCourseStartWeekChange(e) { this.setData({ 'courseForm.startWeekIndex': Number(e.detail.value) }); },
  onCourseEndWeekChange(e) { this.setData({ 'courseForm.endWeekIndex': Number(e.detail.value) }); },
  onCourseWeekTypeChange(e) { this.setData({ 'courseForm.weekTypeIndex': Number(e.detail.value) }); },

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
    const startWeek = form.startWeekIndex + 1;
    const endWeek = form.endWeekIndex + 1;
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
      colorIndex: 0
    };
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
        totalWeeksIndex: Math.max(0, settings.totalWeeks - 1)
      }
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

  saveSettings() {
    const form = this.data.settingsForm;
    const state = store.normalizeState(this.data.state);
    state.settings = {
      semester: String(form.semester || '').trim() || '当前学期',
      firstWeekDate: form.firstWeekDate || '',
      totalWeeks: form.totalWeeksIndex + 1
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
      itemList: ['复制校园指南链接', '从剪贴板导入课表码 （强烈推荐）', '从微信聊天选择 JSON 文件'],
      success: (res) => {
        if (res.tapIndex === 0) this.copyCampusGuideLink();
        if (res.tapIndex === 1) this.importFromClipboard();
        if (res.tapIndex === 2) this.importFromMessage();
      }
    });
  },

  copyCampusGuideLink() {
    wx.setClipboardData({
      data: 'https://syuct.top/',
      success: () => wx.showToast({ title: '校园指南链接已复制', icon: 'success' }),
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
          content: `学期：${incoming.settings.semester || '未填写'}\n将以“${label}”方式导入，操作前会自动保存本地历史备份。`,
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
      itemList: ['发送 JSON 文件给同学', '复制课表码（推荐）', '复制原始 JSON（兼容）'],
      success: (res) => {
        if (res.tapIndex === 0) this.shareJsonFile();
        if (res.tapIndex === 1) this.copyShareCode();
        if (res.tapIndex === 2) this.copyJsonBackup();
      }
    });
  },

  shareJsonFile() {
    try {
      const filePath = store.writeExportFile(this.data.state);
      if (typeof wx.shareFileMessage !== 'function') {
        this.copyShareCode('当前微信版本不支持文件转发，已复制课表码');
        return;
      }
      wx.shareFileMessage({
        filePath,
        fileName: `SYUCT课表-${this.data.state.settings.semester}.json`,
        fail: () => this.copyShareCode('文件转发失败，已改为复制课表码')
      });
    } catch (e) {
      wx.showToast({ title: '生成课表文件失败', icon: 'none' });
    }
  },

  copyShareCode(message) {
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

  copyJsonBackup(message) {
    const text = JSON.stringify(store.createExportPayload(this.data.state));
    wx.setClipboardData({
      data: text,
      success: () => {
        if (message) wx.showToast({ title: message, icon: 'none', duration: 2200 });
      }
    });
  },

  preventBubble() {}
}, withShare({ shareApp: { title: SHARE_TITLE }, shareTimeline: { title: SHARE_TITLE } })));
