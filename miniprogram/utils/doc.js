// utils/doc.js — 文档打开工具
// 规则：PDF / Word / Excel / PPT 源文件 <= 3 MiB 时使用固定分包数据并由微信原生 wx.openDocument 打开；> 3 MiB 复制网页链接。

const LINK_BASE = 'https://www.syuct.top/';
const PREVIEWS = require('../data/previews.js');
const NATIVE_TYPES = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);

function extOf(file) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file || '');
  return match ? match[1].toLowerCase() : '';
}

function baseNameOf(file) {
  return String(file || '').split('/').pop();
}

function webUrlFor(file) {
  const clean = String(file || '').replace(/^\/+/, '');
  return clean ? LINK_BASE + clean : '';
}

function requestLinkCopy(file, title, options) {
  const config = options || {};
  const app = getApp();
  const baseName = baseNameOf(file);
  const displayTitle = title || baseName || '文档';
  app.confirmCopy({
    title: config.modalTitle || '在浏览器中查看',
    content: config.content || `「${displayTitle}」暂不能在小程序内预览，是否复制网页链接？`,
    text: webUrlFor(file),
    confirmText: '复制链接'
  });
}

function openDoc(file, title) {
  if (!file) {
    wx.showToast({ title: '文件不存在', icon: 'none' });
    return;
  }
  const baseName = baseNameOf(file);
  const ext = extOf(file);
  const meta = PREVIEWS[baseName];

  if (meta && meta.root && NATIVE_TYPES.has(ext)) {
    wx.navigateTo({
      url: `${meta.root}/pages/open/open` +
        `?file=${encodeURIComponent(baseName)}` +
        `&title=${encodeURIComponent(title || baseName)}` +
        `&source=${encodeURIComponent(file)}`
    });
    return;
  }

  if (NATIVE_TYPES.has(ext)) {
    requestLinkCopy(file, title, {
      modalTitle: '文件较大',
      content: `「${title || baseName}」未内置或源文件超过 3 MB。为控制小程序总体积并保持原文件质量，是否复制网页链接，在浏览器中查看？`
    });
    return;
  }

  requestLinkCopy(file, title, {
    modalTitle: '暂不支持直接预览',
    content: `「${title || baseName}」为 ${ext.toUpperCase() || '文件'} 格式。是否复制网页链接，在浏览器或电脑端下载查看？`
  });
}

function openUrl(url, hint) {
  if (!url) {
    wx.showToast({ title: '链接不存在', icon: 'none' });
    return;
  }
  const app = getApp();
  app.confirmCopy({
    title: '在浏览器中打开',
    content: hint || '小程序暂不能直接打开该网页，是否复制链接？',
    text: url,
    confirmText: '复制链接'
  });
}

module.exports = { openDoc, openUrl, PREVIEWS, LINK_BASE, webUrlFor };
