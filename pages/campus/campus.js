const { CAMPUS, SITE } = require('../../data/content');
const { getSectionGroups } = require('../../data/documents');
const { openDoc } = require('../../utils/doc');
const { captureTarget, scrollToTarget } = require('../../utils/page');

const { withShare } = require('../../utils/share');

Page(Object.assign({
  data: {
    campus: CAMPUS,
    site: SITE,
    sections: getSectionGroups('campus')
  },

  onLoad(options) {
    captureTarget(this, options);
  },

  onReady() {
    scrollToTarget(this);
  },



  openLandmark() {
    wx.pageScrollTo({
      selector: '#photos',
      duration: 300
    });
  },

  previewImage(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    wx.navigateTo({
      url: `/packages/gallery/pages/viewer/viewer?index=${index}`
    });
  },

  openDoc(e) {
    const { file, title } = e.currentTarget.dataset;
    openDoc(file, title);
  }
}, withShare()));
