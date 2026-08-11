const { DIGITAL, SITE } = require('../../data/content');
const { getSectionGroups } = require('../../data/documents');
const { openDoc, openUrl } = require('../../utils/doc');
const { captureTarget, scrollToTarget } = require('../../utils/page');

const sections = getSectionGroups('digital').map(section => ({
  ...section,
  action: DIGITAL.actions[section.id] || null
}));

Page({
  data: {
    digital: DIGITAL,
    site: SITE,
    sections
  },

  onLoad(options) {
    captureTarget(this, options);
  },

  onReady() {
    scrollToTarget(this);
  },

  openLandmark() {
    wx.navigateTo({
      url: '/pages/campus-detail/campus-detail?target=photos'
    });
  },

  openDoc(e) {
    const { file, title } = e.currentTarget.dataset;
    openDoc(file, title);
  },

  openAction(e) {
    const { url, title } = e.currentTarget.dataset;
    openUrl(url, `${title} 需要在浏览器中访问；校内系统可能需要连接校园网或 WebVPN。是否复制链接？`);
  }
});
