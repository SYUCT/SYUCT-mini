// Compatibility shim for v1.4.2/v1.4.3 cached page references.
// Keep this file for one release cycle so older campus.js does not white-screen.
const { CAMPUS, SITE } = require('../data/content');
const { getSectionGroups } = require('../data/documents');
const { openDoc } = require('./doc');
const { withShare } = require('./share');

function createCampusPage() {
  return Object.assign({
    data: { campus: CAMPUS, site: SITE, sections: getSectionGroups('campus') },
    onLoad(options) {
      this.__scrollTarget = options && options.target ? String(options.target) : '';
    },
    onReady() {
      const target = this.__scrollTarget;
      if (!target) return;
      setTimeout(() => wx.pageScrollTo({ selector: `#${target}`, duration: 280 }), 80);
    },
    openLandmark() {
      wx.pageScrollTo({ selector: '#photos', duration: 300 });
    },
    previewImage(e) {
      const index = Number((e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index) || 0);
      wx.navigateTo({ url: `/packages/gallery/pages/viewer/viewer?index=${index}` });
    },
    openDoc(e) {
      const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {};
      openDoc(dataset.file, dataset.title);
    }
  }, withShare());
}

module.exports = { createCampusPage };
