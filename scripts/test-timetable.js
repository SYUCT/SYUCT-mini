#!/usr/bin/env node
'use strict';
// 课表模块回归测试：课表码编解码、导入容错、双份存储仲裁、文档页分享路径。
// 直接 require 运行目录里的真实模块，不复制被测逻辑。
// 用法：node scripts/test-timetable.js

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ROOT = path.join(PROJECT_ROOT, 'miniprogram');

let passed = 0;
const failures = [];
let group = '';

function section(name) {
  group = name;
  console.log(`\n=== ${name} ===`);
}

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failures.push(`[${group}] ${label}${detail ? ` → ${detail}` : ''}`);
    console.log(`  ❌ ${label}${detail ? ` → ${detail}` : ''}`);
  }
}

// 把一组断言包起来：区块内的意外异常记为失败并继续跑完其余区块，
// 否则一处回归就会掩盖掉后面所有断言的结果。
function safely(name, fn) {
  section(name);
  try {
    fn();
  } catch (error) {
    failures.push(`[${name}] 区块因异常中断 → ${error && error.message}`);
    console.log(`  ❌ 区块因异常中断 → ${error && error.message}`);
  }
}

function throwsWith(fn, fragment) {
  try {
    fn();
    return false;
  } catch (error) {
    return typeof error.message === 'string' && error.message.includes(fragment);
  }
}

// 小程序 API 桩：Storage 用内存对象，文件系统用内存 map，两者相互独立，
// 才能真实模拟"一份坏了另一份还在"的场景。
function installStubs() {
  const storage = {};
  const files = {};
  const toasts = [];
  const modals = [];

  global.wx = {
    getStorageSync: (key) => (key in storage ? storage[key] : ''),
    setStorageSync: (key, value) => {
      storage[key] = JSON.parse(JSON.stringify(value));
    },
    removeStorageSync: (key) => {
      delete storage[key];
    },
    env: { USER_DATA_PATH: '/mock' },
    getFileSystemManager: () => ({
      readFileSync: (p) => {
        if (!(p in files)) {
          const error = new Error('ENOENT');
          error.errCode = 1300002;
          throw error;
        }
        return files[p];
      },
      writeFileSync: (p, data) => {
        files[p] = data;
      },
      unlinkSync: (p) => {
        delete files[p];
      }
    }),
    showToast: (opts) => toasts.push(opts || {}),
    showModal: (opts) => modals.push(opts || {}),
    setNavigationBarTitle: () => {}
  };

  return { storage, files, toasts, modals };
}

const stubs = installStubs();

function freshModule(relative) {
  const full = path.join(ROOT, relative);
  delete require.cache[require.resolve(full)];
  return require(full);
}

const codec = freshModule('utils/timetable-codec.js');
const store = freshModule('utils/timetable-store.js');
const { withShare } = freshModule('utils/share.js');

function makeState(courseCount, firstWeekDate, totalWeeks) {
  return {
    settings: {
      semester: '2026-2027-1',
      firstWeekDate: firstWeekDate || '',
      totalWeeks: totalWeeks || 20
    },
    courses: Array.from({ length: courseCount }, (_, i) => ({
      id: `c${i}`,
      name: `课程${i}`,
      teacher: `教师${i}`,
      room: `A${100 + i}`,
      weekday: (i % 7) + 1,
      startSection: 1,
      endSection: 2,
      startWeek: 1,
      endWeek: 16,
      weekType: 'all',
      colorIndex: i % 6
    }))
  };
}

function resetStorage() {
  Object.keys(stubs.storage).forEach((k) => delete stubs.storage[k]);
  Object.keys(stubs.files).forEach((k) => delete stubs.files[k]);
}

// ---------------------------------------------------------------- 编解码往返

safely('1. 课表码编解码往返', () => {
  const base = makeState(3, '2026-08-31');
  const baseCode = codec.encodeShareCode(base);
  const baseBack = codec.decodeShareCode(baseCode);

  check('课表码带 SYUCT-TT2 前缀', baseCode.startsWith('SYUCT-TT2:'));
  check('课程数量往返一致', baseBack.courses.length === 3, String(baseBack.courses.length));
  check('学期往返一致', baseBack.settings.semester === '2026-2027-1', baseBack.settings.semester);
  check('开学日期往返一致', baseBack.settings.firstWeekDate === '2026-08-31', baseBack.settings.firstWeekDate);
  check('总周数往返一致', baseBack.settings.totalWeeks === 20, String(baseBack.settings.totalWeeks));
  check(
    '课程全部字段往返一致',
    JSON.stringify(baseBack.courses.map((c) => [c.name, c.teacher, c.room, c.weekday, c.startSection, c.endSection, c.startWeek, c.endWeek, c.weekType])) ===
      JSON.stringify(base.courses.map((c) => [c.name, c.teacher, c.room, c.weekday, c.startSection, c.endSection, c.startWeek, c.endWeek, c.weekType]))
  );

  const weird = {
    settings: { semester: '2026 春 / 夏', firstWeekDate: '2026-02-23', totalWeeks: 25 },
    courses: [
      { name: '高等数学 A（上）', teacher: '张三 · 李四', room: '致本楼C座（原6#实验楼）214', weekday: 7, startSection: 11, endSection: 12, startWeek: 3, endWeek: 30, weekType: 'odd', colorIndex: 5 },
      { name: '文科高等数学*', teacher: '', room: '', weekday: 1, startSection: 1, endSection: 1, startWeek: 1, endWeek: 1, weekType: 'even', colorIndex: 0 },
      { name: '体育（羽毛球）🏸', teacher: 'A/B', room: '景唐楼(原1#教学楼)403', weekday: 4, startSection: 5, endSection: 6, startWeek: 1, endWeek: 16, weekType: 'all', colorIndex: 2 }
    ]
  };
  const weirdBack = codec.decodeShareCode(codec.encodeShareCode(weird));
  check('全角括号与 # 号往返一致', weirdBack.courses[0].room === '致本楼C座（原6#实验楼）214', weirdBack.courses[0].room);
  check('课程名含空格与星号往返一致', weirdBack.courses[1].name === '文科高等数学*', weirdBack.courses[1].name);
  check('emoji 往返一致', weirdBack.courses[2].name === '体育（羽毛球）🏸', weirdBack.courses[2].name);
  check('空教师/教室字段往返为空串', weirdBack.courses[1].teacher === '' && weirdBack.courses[1].room === '');
  check('第 11-12 节次往返一致', weirdBack.courses[0].startSection === 11 && weirdBack.courses[0].endSection === 12);
  check('单双周标记往返一致', weirdBack.courses[0].weekType === 'odd' && weirdBack.courses[1].weekType === 'even');
  check('第 30 周边界往返一致', weirdBack.courses[0].endWeek === 30, String(weirdBack.courses[0].endWeek));

  const emptyBack = codec.decodeShareCode(codec.encodeShareCode({ settings: { semester: '空课表', firstWeekDate: '', totalWeeks: 1 }, courses: [] }));
  check('零课程课表码可解析', Array.isArray(emptyBack.courses) && emptyBack.courses.length === 0);
  check('空开学日期解析为空串', emptyBack.settings.firstWeekDate === '');

  // ------------------------------------------------------- 粘贴容错（真实场景）
});

safely('2. 粘贴容错', () => {
  const code = codec.encodeShareCode(makeState(20, '2026-08-31'));
  const expect = 20;

  // 导入失败时返回 -1 而不是抛出，否则单个断言的失败会中断整个套件。
  function importCount(text) {
    try {
      return store.parseImportText(text).courses.length;
    } catch (error) {
      return -1;
    }
  }

  check('纯课表码', importCount(code) === expect);
  check('尾部带换行', importCount(`${code}\n`) === expect);
  check('前后带空行', importCount(`\n\n${code}\n\n`) === expect);
  check('前面带中文说明', importCount(`26级计科课表码：${code}`) === expect);
  check('后面带一句话', importCount(`${code} 大家自己导入哈`) === expect);
  check('前后都有文字', importCount(`【计科26】${code} 有问题群里问`) === expect);
  check('被双引号包裹', importCount(`"${code}"`) === expect);
  check('被书名号包裹', importCount(`「${code}」`) === expect);
  check('连标题行一起复制', importCount(`计算机学院｜2601\n复制下面的完整导入码：\n${code}`) === expect);
  check('尾部粘到下一段', importCount(`${code}\n\n\n理学院｜26级化学\n复制下面的完整导入码：`) === expect);
  check('带 BOM 前缀', importCount(`﻿${code}`) === expect);

  // 码内部被改动必须拒绝——校验和的职责所在
  check('码内部插空格被拒绝', throwsWith(() => store.parseImportText(`${code.slice(0, 300)} ${code.slice(300)}`), '课表码'));
  check('校验和被篡改被拒绝', throwsWith(() => store.parseImportText(`SYUCT-TT2:00000000:${code.split(':').slice(2).join(':')}`), '课表码'));
  check('截断的课表码被拒绝', throwsWith(() => store.parseImportText(code.slice(0, code.length - 20)), '课表码'));

  // 非课表码输入必须给中文提示，不能把 JSON.parse 的英文报错抛给用户
  ['', '   ', 'hello world', '随便一段中文', '{', '{"a":1}', '[]', 'null', 'SYUCT-TT2:', 'SYUCT-TT2:zz'].forEach((bad) => {
    let message = '';
    try {
      store.parseImportText(bad);
      message = '(未抛错)';
    } catch (error) {
      message = error.message || '';
    }
    const chinese = /[一-龥]/.test(message);
    check(`无效输入 ${JSON.stringify(bad.slice(0, 12))} 给中文提示`, chinese, message.slice(0, 60));
  });

  // 合法 JSON 导入路径不能被容错改动破坏
  const jsonPayload = JSON.stringify(store.createExportPayload(makeState(4, '2026-09-07')));
  check('原始 JSON 仍可导入', importCount(jsonPayload) === 4);
  check('JSON 里的开学日期保留', store.parseImportText(jsonPayload).settings.firstWeekDate === '2026-09-07');

  // -------------------------------------------------------------- 双份存储仲裁
});

safely('3. 双份存储仲裁', () => {
  const BACKUP = '/mock/syuct-timetable-backup.json';

  resetStorage();
  const saved = store.saveState(makeState(5, '2026-08-31'));
  check('保存后 Storage 有主数据', Boolean(stubs.storage.syuct_timetable_v1));
  check('保存后文件备份存在', Boolean(stubs.files[BACKUP]));
  check('两份课程数一致', JSON.parse(stubs.files[BACKUP]).courses.length === saved.courses.length);

  resetStorage();
  store.saveState(makeState(6, '2026-08-31'));
  delete stubs.storage.syuct_timetable_v1;
  let loaded = store.loadState();
  check('Storage 丢失时从文件恢复', loaded.courses.length === 6, String(loaded.courses.length));
  check('恢复后回写 Storage', Boolean(stubs.storage.syuct_timetable_v1));

  resetStorage();
  store.saveState(makeState(7, '2026-08-31'));
  delete stubs.files[BACKUP];
  loaded = store.loadState();
  check('文件备份丢失时仍能读 Storage', loaded.courses.length === 7, String(loaded.courses.length));
  check('备份缺失时自动补写', Boolean(stubs.files[BACKUP]));

  // 主数据被写坏、备份完好：不能让坏数据覆盖好备份
  resetStorage();
  store.saveState(makeState(9, '2026-08-31'));
  const goodBackup = stubs.files[BACKUP];
  stubs.storage.syuct_timetable_v1 = { schemaVersion: 1, settings: {}, courses: [{ teacher: '无名课程' }], updatedAt: 1 };
  loaded = store.loadState();
  check('坏主数据不覆盖好备份', stubs.files[BACKUP] === goodBackup);
  check('仲裁取到完好的备份', loaded.courses.length === 9, String(loaded.courses.length));

  // updatedAt 更新的一份应当胜出
  resetStorage();
  store.saveState(makeState(3, '2026-08-31'));
  const older = JSON.parse(stubs.files[BACKUP]);
  older.updatedAt = 1;
  older.courses = older.courses.slice(0, 1);
  stubs.files[BACKUP] = JSON.stringify(older);
  loaded = store.loadState();
  check('updatedAt 较新的 Storage 胜出', loaded.courses.length === 3, String(loaded.courses.length));

  resetStorage();
  store.saveState(makeState(2, '2026-08-31'));
  const newer = JSON.parse(stubs.files[BACKUP]);
  newer.updatedAt = Date.now() + 60000;
  newer.courses = makeState(8).courses;
  stubs.files[BACKUP] = JSON.stringify(newer);
  loaded = store.loadState();
  check('updatedAt 较新的文件备份胜出', loaded.courses.length === 8, String(loaded.courses.length));

  resetStorage();
  loaded = store.loadState();
  check('两份都不存在时给默认课表', loaded.courses.length === 0 && loaded.settings.totalWeeks === 20);

  resetStorage();
  stubs.storage.syuct_timetable_v1 = 'not-an-object';
  stubs.files[BACKUP] = '{ broken json';
  loaded = store.loadState();
  check('两份都损坏时不抛错并回退默认', loaded.courses.length === 0);

  resetStorage();
  store.saveState(makeState(4, '2026-08-31'));
  store.saveState(makeState(5, '2026-08-31'));
  check('保存会留历史快照', store.getHistory().length >= 1, String(store.getHistory().length));
  const restored = store.restoreLatestHistory();
  check('可从历史快照恢复', restored && restored.courses.length === 4, restored ? String(restored.courses.length) : 'null');

  // ------------------------------------------------------------------ 归一化
});

safely('4. 数据归一化', () => {
  const messy = store.normalizeState({
    settings: { semester: 'x'.repeat(200), firstWeekDate: '2026-13-45', totalWeeks: 999 },
    courses: [
      { name: '正常课', weekday: 99, startSection: 99, endSection: 1, startWeek: 0, endWeek: 999, colorIndex: 99, weekType: '???' },
      { name: '', teacher: '无名' },
      null,
      'not-an-object',
      { name: 'y'.repeat(200) }
    ]
  });
  check('学期名截断到 40 字', messy.settings.semester.length <= 40, String(messy.settings.semester.length));
  check('非法日期归一化为空', messy.settings.firstWeekDate === '', messy.settings.firstWeekDate);
  check('总周数收敛到 1-30', messy.settings.totalWeeks >= 1 && messy.settings.totalWeeks <= 30, String(messy.settings.totalWeeks));
  check('无名课程被丢弃', messy.courses.every((c) => c.name), String(messy.courses.length));
  check('null 与非对象被丢弃', messy.courses.length === 2, String(messy.courses.length));
  check('星期收敛到 1-7', messy.courses.every((c) => c.weekday >= 1 && c.weekday <= 7));
  check('节次收敛到 1-12', messy.courses.every((c) => c.startSection >= 1 && c.endSection <= 12));
  check('起止节次自动纠正顺序', messy.courses[0].startSection <= messy.courses[0].endSection);
  check('周次收敛到 1-30', messy.courses.every((c) => c.startWeek >= 1 && c.endWeek <= 30));
  check('colorIndex 收敛到 0-5', messy.courses.every((c) => c.colorIndex >= 0 && c.colorIndex <= 5), JSON.stringify(messy.courses.map((c) => c.colorIndex)));
  check('非法单双周回落 all', messy.courses[0].weekType === 'all', messy.courses[0].weekType);
  check('课程名截断到 40 字', messy.courses[1].name.length <= 40, String(messy.courses[1].name.length));
  check('归一化结果幂等', JSON.stringify(store.normalizeState(messy)) === JSON.stringify(messy));

  const merged = store.mergeCourses(makeState(3).courses, makeState(3).courses);
  check('合并去重完全相同的课程', merged.length === 3, String(merged.length));
  const mergedMore = store.mergeCourses(makeState(3).courses, makeState(5).courses);
  check('合并保留新增课程', mergedMore.length === 5, String(mergedMore.length));
  check('合并后 id 唯一', new Set(mergedMore.map((c) => c.id)).size === mergedMore.length);

  // ------------------------------------------------------------- 文档页分享路径
});

safely('5. 文档页分享路径', () => {
  const manifestPath = path.join(ROOT, 'packages/pdf-b/data/manifest.js');
  const manifest = require(manifestPath);
  const sampleDoc = Object.keys(manifest)[0];

  const { createNativeDocumentPage } = freshModule('utils/native-document.js');

  function documentPage(options) {
    const page = createNativeDocumentPage(manifest, 'stub-payload');
    page.route = 'packages/pdf-b/pages/open/open';
    page.file = decodeURIComponent((options && options.file) || '');
    page.documentTitle = decodeURIComponent((options && options.title) || '文档');
    page.sourceFile = decodeURIComponent((options && options.source) || '');
    if (!page.sourceFile && page.file) page.sourceFile = `docs/${page.file}`;
    return page;
  }

  const opened = documentPage({
    file: encodeURIComponent(sampleDoc),
    title: encodeURIComponent('毕业自查表 A/B'),
    source: encodeURIComponent(`docs/${sampleDoc}`)
  });
  const shareApp = opened.onShareAppMessage();

  check('分享路径带 query', shareApp.path.includes('?file='), shareApp.path);
  check('分享标题含文档名', shareApp.title.includes('毕业自查表 A/B'), shareApp.title);

  const received = {};
  shareApp.path.split('?')[1].split('&').forEach((pair) => {
    const at = pair.indexOf('=');
    received[pair.slice(0, at)] = pair.slice(at + 1);
  });
  const receiver = documentPage(received);

  check('接收方还原文件名', receiver.file === sampleDoc, receiver.file);
  check('接收方还原标题（含空格与斜杠）', receiver.documentTitle === '毕业自查表 A/B', receiver.documentTitle);
  check('接收方还原源路径', receiver.sourceFile === `docs/${sampleDoc}`, receiver.sourceFile);
  check('接收方能在 manifest 命中文档', Boolean(manifest[receiver.file]));
  check('接收方浏览器下载链接可生成', Boolean(receiver.sourceFile));

  const brokenPage = documentPage({});
  check('自身无参时分享指向首页', brokenPage.onShareAppMessage().path === '/pages/index/index', brokenPage.onShareAppMessage().path);

  const timeline = opened.onShareTimeline();
  check('朋友圈分享带 query', Boolean(timeline.query && timeline.query.includes('file=')), JSON.stringify(timeline));

  // 其余页面沿用默认分享，不能被文档页的定制破坏
  const plainPage = Object.assign({}, withShare());
  plainPage.route = 'pages/resources/resources';
  check('普通页面分享路径不变', plainPage.onShareAppMessage().path === '/pages/resources/resources');
  check('普通页面默认标题不变', plainPage.onShareAppMessage().title === '沈化校园指南 · 新生入学必备');

  const overridden = Object.assign({}, withShare({ shareApp: { title: '自定义标题' } }));
  overridden.route = 'pages/index/index';
  check('对象形式覆盖仍生效', overridden.onShareAppMessage().title === '自定义标题');

  const functional = Object.assign({}, withShare({ shareApp: (page) => ({ title: `动态-${page.route}` }) }));
  functional.route = 'pages/map/map';
  check('函数形式可读取页面实例', functional.onShareAppMessage().title === '动态-pages/map/map');
});

// ------------------------------------------------------------------------ 汇总

const total = passed + failures.length;
console.log(`\n=== 课表与分享回归测试完成：${passed}/${total} 通过 ===`);

if (failures.length) {
  console.log('\n失败项：');
  failures.forEach((item) => console.log('  ❌ ' + item));
  process.exit(1);
}
process.exit(0);
