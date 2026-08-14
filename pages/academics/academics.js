const { ACADEMICS, SITE } = require('../../data/content');
const { openDoc } = require('../../utils/doc');
const { getSectionGroups } = require('../../data/documents');
const { captureTarget, scrollToTarget } = require('../../utils/page');

const { withShare } = require('../../utils/share');

Page(Object.assign({
  data: {
    pageInfo: ACADEMICS,
    site: SITE,
    categories: getSectionGroups('academics')
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
  }
}, withShare()));
