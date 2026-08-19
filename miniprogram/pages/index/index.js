const { SITE, HOME, PORTALS, STATS, QUICK_QUESTIONS, COMMUNITY_GROUPS } = require('../../data/content');

const { withShare } = require('../../utils/share');

Page(Object.assign({
  data: {
    site: SITE,
    home: HOME,
    portals: PORTALS,
    stats: STATS,
    quickQuestions: QUICK_QUESTIONS,
    communityGroups: COMMUNITY_GROUPS,
    showGroupModal: false
  },

  TAB_PAGES: ['/pages/index/index', '/pages/map/map', '/pages/timetable/timetable', '/pages/resources/resources', '/pages/campus/campus'],

  onPortalTap(e) {
    this.gotoPage(e.currentTarget.dataset.page);
  },

  onQuickTap(e) {
    this.gotoPage(e.currentTarget.dataset.page);
  },

  gotoPage(page) {
    if (!page) return;
    const route = page.split('?')[0];
    if (this.TAB_PAGES.includes(route) && route === page) {
      wx.switchTab({ url: page });
    } else {
      wx.navigateTo({ url: page });
    }
  },

  openGroupModal() {
    this.setData({ showGroupModal: true });
  },

  closeGroupModal() {
    this.setData({ showGroupModal: false });
  },

  copyCommunityGroup(e) {
    const { number, label } = e.currentTarget.dataset;
    getApp().copyText(number, `${label || '群'}号已复制`);
  },

  previewHomeImage(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    wx.navigateTo({
      url: `/packages/gallery/pages/viewer/viewer?index=${index}`
    });
  },

  openCampusGallery() {
    this.gotoPage('/pages/campus-detail/campus-detail?target=photos');
  },

  openAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  openSite() {
    getApp().openWeb(this.data.site.officialUrl, '是否复制学校官网链接到浏览器打开？');
  },

  preventBubble() {}
}, withShare()));
