'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const file = path.resolve(__dirname, '../miniprogram/pages/timetable/timetable.js');
let page, copied, toast;
const sandbox = {
  require: createRequire(file),
  Page: definition => { page = definition; },
  wx: {
    setClipboardData: options => { copied = options; },
    showToast: options => { toast = options; }
  }
};
vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, {filename:file});
page.copyTimetableAppLink();
assert.equal(copied.data, 'https://www.syuct.top/downloads/SYUCT-Timetable.apk');
copied.success();assert.match(toast.title, /浏览器打开/);assert.equal(toast.icon, 'none');
copied.fail();assert.match(toast.title, /复制失败/);
page.copyTimetableConverterLink();assert.equal(copied.data, 'https://www.syuct.top/timetable-converter.html');
const wxml = fs.readFileSync(file.replace(/\.js$/, '.wxml'), 'utf8');
assert.match(wxml, /仅限安卓/);assert.match(wxml, /bindtap="copyTimetableAppLink"/);
assert.match(wxml, /本科：复制教务处课表/);assert.match(wxml, /硕士：在网页中上传教务处课表 PDF/);
assert.match(wxml, /网页中获取课表码或 App 生成课表码/);
const styles = fs.readFileSync(file.replace(/\.js$/, '.wxss'), 'utf8');
const downloadStyle = styles.match(/\.data-note-download\s*\{([^}]+)\}/)[1];
for (const rule of ['display: flex', 'align-items: center', 'justify-content: center', 'text-align: center']) assert.ok(downloadStyle.includes(rule), rule);
console.log('PASS App 官网下载链接、复制成功/失败提示、安卓标注，以及现有转换入口保留');
