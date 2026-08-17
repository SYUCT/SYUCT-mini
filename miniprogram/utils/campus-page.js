const { CAMPUS, SITE } = require('../data/content');
const { getSectionGroups } = require('../data/documents');
const { openDoc } = require('./doc');
const { captureTarget, scrollToTarget } = require('./page');
const { withShare } = require('./share');

function createCampusPage() {
  return Object.assign({
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
      const index = Number((e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index) || 0);
      wx.navigateTo({
        url: `/packages/gallery/pages/viewer/viewer?index=${index}`
      });
    },

    openDoc(e) {
      const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {};
      openDoc(dataset.file, dataset.title);
    }
  }, withShare());
}

module.exports = { createCampusPage };
