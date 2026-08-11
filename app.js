// app.js — 沈化校园指南小程序
const { SITE } = require('./data/content');

App({
  globalData: {
    site: SITE
  },

  copyText(text, successTitle) {
    if (!text) {
      wx.showToast({ title: '暂无可复制内容', icon: 'none' });
      return;
    }

    wx.setClipboardData({
      data: String(text),
      success: () => {
        wx.showToast({ title: successTitle || '已复制', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '复制失败，请重试', icon: 'none' });
      }
    });
  },

  confirmCopy(options) {
    const config = options || {};
    wx.showModal({
      title: config.title || '在浏览器中打开',
      content: config.content || '小程序暂不能直接打开该链接，是否复制到剪贴板？',
      confirmText: config.confirmText || '复制链接',
      cancelText: '取消',
      success: result => {
        if (result.confirm) {
          this.copyText(config.text, config.successTitle || '链接已复制');
        }
      }
    });
  },

  openWeb(url, hint) {
    this.confirmCopy({
      title: '在浏览器中打开',
      content: hint || '小程序暂不能直接打开网页，是否复制链接到浏览器访问？',
      text: url
    });
  }
});
