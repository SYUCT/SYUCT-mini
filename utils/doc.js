// utils/doc.js — 文档打开工具
// 本地 JPG 分包用于小程序内预览；未打包 PDF、Word、Excel 通过确认后复制网页链接。

const LINK_BASE = 'https://www.syuct.top/';
const PREVIEWS = require('../data/previews.js');

function extOf(file) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file || '');
  return match ? match[1].toLowerCase() : '';
}

function baseNameOf(file) {
  return String(file || '').split('/').pop();
}

function requestLinkCopy(file, title, options) {
  const config = options || {};
  const app = getApp();
  const baseName = baseNameOf(file);
  const displayTitle = title || baseName || '文档';

  app.confirmCopy({
    title: config.modalTitle || '在浏览器中查看',
    content: config.content || `「${displayTitle}」暂不能在小程序内预览，是否复制网页链接？`,
    text: LINK_BASE + file,
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

  if (meta && Array.isArray(meta.ranges) && meta.ranges.length > 0) {
    const root = meta.ranges[0][0];
    wx.navigateTo({
      url: `${root}/pages/preview/preview` +
        `?file=${encodeURIComponent(baseName)}` +
        `&part=0` +
        `&title=${encodeURIComponent(title || baseName)}`
    });
    return;
  }

  if (ext === 'pdf') {
    requestLinkCopy(file, title, {
      modalTitle: '文件较大',
      content: `「${title || baseName}」未打包到小程序内。是否复制网页链接，在浏览器中查看？`
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

module.exports = { openDoc, openUrl, PREVIEWS, LINK_BASE };
