const codec = require('./timetable-codec');
const MAIN_KEY = 'syuct_timetable_v1';
const HISTORY_KEY = 'syuct_timetable_history_v1';
const TITLE_NAME_KEY = 'syuct_timetable_title_name_v1';
const BACKUP_FILENAME = 'syuct-timetable-backup.json';
const FORMAT = 'syuct-timetable';
const FORMAT_VERSION = 1;
const HISTORY_LIMIT = 5;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultState() {
  return {
    schemaVersion: 1,
    settings: {
      semester: '2026-2027-1',
      firstWeekDate: '',
      totalWeeks: 20
    },
    courses: [],
    updatedAt: Date.now()
  };
}

function asInt(value, fallback, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const rounded = Math.round(num);
  if (typeof min === 'number' && rounded < min) return min;
  if (typeof max === 'number' && rounded > max) return max;
  return rounded;
}

function safeText(value, maxLength) {
  const text = String(value == null ? '' : value).trim();
  return text.slice(0, maxLength || 80);
}

function safeTitleName(value) {
  const text = String(value == null ? '' : value).trim();
  return Array.from(text).slice(0, 6).join('');
}

function loadTitleName() {
  try {
    return safeTitleName(wx.getStorageSync(TITLE_NAME_KEY));
  } catch (e) {
    return '';
  }
}

function saveTitleName(value) {
  const titleName = safeTitleName(value);
  try {
    wx.setStorageSync(TITLE_NAME_KEY, titleName);
  } catch (e) {
    throw new Error('课表标题保存失败');
  }
  return titleName;
}

function safeDateText(value) {
  const text = String(value == null ? '' : value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const parts = text.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) return '';
  return text;
}

function makeId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCourse(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const name = safeText(raw.name, 40);
  if (!name) return null;

  let startSection = asInt(raw.startSection, 1, 1, 12);
  let endSection = asInt(raw.endSection, startSection, 1, 12);
  if (endSection < startSection) {
    const temp = startSection;
    startSection = endSection;
    endSection = temp;
  }

  let startWeek = asInt(raw.startWeek, 1, 1, 30);
  let endWeek = asInt(raw.endWeek, startWeek, 1, 30);
  if (endWeek < startWeek) {
    const temp = startWeek;
    startWeek = endWeek;
    endWeek = temp;
  }

  const weekType = ['all', 'odd', 'even'].includes(raw.weekType) ? raw.weekType : 'all';
  return {
    id: safeText(raw.id, 80) || makeId(),
    name,
    teacher: safeText(raw.teacher, 40),
    room: safeText(raw.room, 40),
    weekday: asInt(raw.weekday, 1, 1, 7),
    startSection,
    endSection,
    startWeek,
    endWeek,
    weekType,
    colorIndex: asInt(raw.colorIndex, index || 0, 0, 5)
  };
}

function normalizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const courses = Array.isArray(raw.courses) ? raw.courses : [];
  const semester = settings.semester != null ? settings.semester : raw.semester;
  const firstWeekDate = settings.firstWeekDate != null ? settings.firstWeekDate : raw.firstWeekDate;
  const totalWeeks = settings.totalWeeks != null ? settings.totalWeeks : raw.totalWeeks;
  return {
    schemaVersion: 1,
    settings: {
      semester: safeText(semester, 40) || base.settings.semester,
      firstWeekDate: safeDateText(firstWeekDate),
      totalWeeks: asInt(totalWeeks, 20, 1, 30)
    },
    courses: courses.map(normalizeCourse).filter(Boolean),
    updatedAt: asInt(raw.updatedAt, Date.now(), 0)
  };
}

function getBackupPath() {
  if (typeof wx === 'undefined' || !wx.env || !wx.env.USER_DATA_PATH) return '';
  return `${wx.env.USER_DATA_PATH}/${BACKUP_FILENAME}`;
}

function readFileBackup() {
  try {
    const path = getBackupPath();
    if (!path) return null;
    const fs = wx.getFileSystemManager();
    const text = fs.readFileSync(path, 'utf8');
    return normalizeState(JSON.parse(text));
  } catch (e) {
    return null;
  }
}

function writeFileBackup(state) {
  try {
    const path = getBackupPath();
    if (!path) return false;
    wx.getFileSystemManager().writeFileSync(path, JSON.stringify(state, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function loadState() {
  try {
    const stored = wx.getStorageSync(MAIN_KEY);
    if (stored && typeof stored === 'object') {
      const state = normalizeState(stored);
      writeFileBackup(state);
      return state;
    }
  } catch (e) {}

  const fromFile = readFileBackup();
  if (fromFile) {
    try { wx.setStorageSync(MAIN_KEY, fromFile); } catch (e) {}
    return fromFile;
  }

  return defaultState();
}

function getHistory() {
  try {
    const history = wx.getStorageSync(HISTORY_KEY);
    if (!Array.isArray(history)) return [];
    return history.map(normalizeState).slice(0, HISTORY_LIMIT);
  } catch (e) {
    return [];
  }
}

function pushHistory(state) {
  const history = getHistory();
  const snapshot = normalizeState(state);
  const signature = JSON.stringify({ settings: snapshot.settings, courses: snapshot.courses });
  const first = history[0];
  if (first) {
    const firstSignature = JSON.stringify({ settings: first.settings, courses: first.courses });
    if (signature === firstSignature) return history.length;
  }
  history.unshift(snapshot);
  const trimmed = history.slice(0, HISTORY_LIMIT);
  try { wx.setStorageSync(HISTORY_KEY, trimmed); } catch (e) {}
  return trimmed.length;
}

function saveState(nextState, options) {
  const opts = options || {};
  const current = loadState();
  if (opts.snapshot !== false) pushHistory(current);
  const next = normalizeState(nextState);
  next.updatedAt = Date.now();
  try {
    wx.setStorageSync(MAIN_KEY, next);
  } catch (e) {
    throw new Error('课表本地缓存保存失败');
  }
  writeFileBackup(next);
  return next;
}

function restoreLatestHistory() {
  const history = getHistory();
  if (!history.length) return null;
  const restored = normalizeState(history[0]);
  try { wx.setStorageSync(MAIN_KEY, restored); } catch (e) { return null; }
  writeFileBackup(restored);
  const rest = history.slice(1);
  try { wx.setStorageSync(HISTORY_KEY, rest); } catch (e) {}
  return restored;
}

function courseSignature(course) {
  return [
    course.name,
    course.teacher,
    course.room,
    course.weekday,
    course.startSection,
    course.endSection,
    course.startWeek,
    course.endWeek,
    course.weekType
  ].join('|').toLowerCase();
}

function mergeCourses(currentCourses, incomingCourses) {
  const merged = (currentCourses || []).map((item, index) => normalizeCourse(item, index)).filter(Boolean);
  const seen = new Set(merged.map(courseSignature));
  (incomingCourses || []).forEach((raw, index) => {
    const course = normalizeCourse(raw, merged.length + index);
    if (!course) return;
    const signature = courseSignature(course);
    if (seen.has(signature)) return;
    course.id = makeId();
    course.colorIndex = merged.length % 6;
    merged.push(course);
    seen.add(signature);
  });
  return merged;
}

function createExportPayload(state) {
  const normalized = normalizeState(state);
  return {
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    semester: normalized.settings.semester,
    settings: normalized.settings,
    courses: normalized.courses.map((course) => ({
      name: course.name,
      teacher: course.teacher,
      room: course.room,
      weekday: course.weekday,
      startSection: course.startSection,
      endSection: course.endSection,
      startWeek: course.startWeek,
      endWeek: course.endWeek,
      weekType: course.weekType,
      colorIndex: course.colorIndex
    }))
  };
}

function parseImportText(text) {
  const source = String(text || '').replace(/^\uFEFF/, '').trim();
  const raw = codec.isShareCode(source) ? codec.decodeShareCode(source) : JSON.parse(source);
  if (raw && raw.format === FORMAT && Array.isArray(raw.courses)) {
    return normalizeState({
      settings: raw.settings || { semester: raw.semester },
      courses: raw.courses,
      updatedAt: Date.now()
    });
  }
  if (raw && Array.isArray(raw.courses)) {
    return normalizeState({
      ...raw,
      settings: raw.settings || {
        semester: raw.semester,
        firstWeekDate: raw.firstWeekDate,
        totalWeeks: raw.totalWeeks
      }
    });
  }
  throw new Error('不是有效的 SYUCT 课表 JSON');
}

function createShareCode(state) {
  return codec.encodeShareCode(createExportPayload(state));
}

function writeExportFile(state) {
  const payload = createExportPayload(state);
  const safeSemester = String(payload.semester || 'schedule').replace(/[^0-9A-Za-z_-]+/g, '-');
  const path = `${wx.env.USER_DATA_PATH}/SYUCT-timetable-${safeSemester}.json`;
  wx.getFileSystemManager().writeFileSync(path, JSON.stringify(payload, null, 2), 'utf8');
  return path;
}

module.exports = {
  FORMAT,
  FORMAT_VERSION,
  defaultState,
  normalizeState,
  loadState,
  saveState,
  getHistory,
  restoreLatestHistory,
  mergeCourses,
  createExportPayload,
  createShareCode,
  parseImportText,
  writeExportFile,
  loadTitleName,
  saveTitleName,
  makeId
};
