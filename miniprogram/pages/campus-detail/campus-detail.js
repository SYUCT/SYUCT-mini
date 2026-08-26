const { CAMPUS, SITE } = require('../../data/content');
const { getSectionGroups } = require('../../data/documents');
const { openDoc } = require('../../utils/doc');
const { withShare } = require('../../utils/share');

Page(Object.assign({
  data: {
    campus: CAMPUS,
    site: SITE,
    sections: getSectionGroups('campus')
  },

  onLoad(options) {
    this.__scrollTarget = options && options.target ? String(options.target) : '';
  },

  onReady() {
    const target = this.__scrollTarget;
    if (!target) return;
    setTimeout(() => {
      wx.pageScrollTo({ selector: `#${target}`, duration: 280 });
    }, 80);
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
  },

  openCommunity() {
    getApp().openWeb(
      `${SITE.siteUrl}community.html`,
      '社团招新帖在网页版的校园社区里。是否复制链接到浏览器打开？'
    );
  },

  openContribute() {
    wx.navigateTo({ url: '/pages/about/about' });
  }
}, withShare()));
