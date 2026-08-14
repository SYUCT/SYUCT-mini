const { FRESHMAN, SITE, COMMUNITY_GROUPS } = require('../../data/content');
const { getSectionGroups } = require('../../data/documents');
const { openDoc } = require('../../utils/doc');
const { captureTarget, scrollToTarget } = require('../../utils/page');

const { withShare } = require('../../utils/share');

Page(Object.assign({
  data: {
    fresh: FRESHMAN,
    guide: getSectionGroups('freshman')[0],
    site: SITE,
    communityGroups: COMMUNITY_GROUPS
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

  copyCommunityGroup(e) {
    const { number, label } = e.currentTarget.dataset;
    getApp().copyText(number, `${label || '群'}号已复制`);
  },

  openPrepLink(e) {
    const { link } = e.currentTarget.dataset;
    if (!link) return;
    wx.navigateTo({ url: link });
  }
}, withShare()));
