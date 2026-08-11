// pages/resources/resources.js
const { openDoc } = require('../../utils/doc');
const { SITE } = require('../../data/content');
const {
  DOCUMENTS,
  getResourceGroups,
  documentMatches
} = require('../../data/documents');

const ALL_GROUPS = getResourceGroups();

function countItems(groups) {
  return groups.reduce((total, group) => total + group.items.length, 0);
}

Page({
  data: {
    categories: ALL_GROUPS,
    site: SITE,
    keyword: '',
    flatCount: DOCUMENTS.length,
    resultCount: DOCUMENTS.length
  },

  onUnload() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  },

  onSearchInput(e) {
    const keyword = e.detail.value || '';
    this.setData({ keyword });

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    if (!keyword.trim()) {
      this.applySearch('');
      return;
    }

    this.searchTimer = setTimeout(() => {
      this.applySearch(keyword);
    }, 160);
  },

  onSearchConfirm(e) {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.applySearch(e.detail.value || this.data.keyword || '');
  },

  clearSearch() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.setData({ keyword: '' });
    this.applySearch('');
  },

  applySearch(keyword) {
    if (keyword !== '' && keyword !== this.data.keyword) {
      return;
    }

    const filtered = ALL_GROUPS
      .map(group => ({
        ...group,
        items: group.items.filter(doc => documentMatches(doc, keyword))
      }))
      .filter(group => group.items.length > 0);

    this.setData({
      categories: filtered,
      resultCount: countItems(filtered)
    });
  },

  openDoc(e) {
    const { file, title } = e.currentTarget.dataset;
    openDoc(file, title);
  },

  openSite() {
    const app = getApp();
    app.openWeb(
      this.data.site.siteUrl + 'resources.html',
      '网页版资料中心支持完整在线预览。是否复制链接到浏览器访问？'
    );
  }
});
