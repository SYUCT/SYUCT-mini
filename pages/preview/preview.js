// 分包内文档预览页模板。
// 使用单页 swiper，并仅为当前页前后各两页设置图片 src，降低长文档内存占用。
const PREVIEWS = require('../../../../data/previews.js');

const { withShare } = require('../../utils/share');

const WINDOW_RADIUS = 2;

function padPage(value) {
  return String(value).padStart(2, '0');
}

function totalPages(meta) {
  return meta.ranges.reduce((sum, range) => sum + range[2] - range[1] + 1, 0);
}

function pageOffset(meta, partIndex) {
  return meta.ranges.slice(0, partIndex).reduce((sum, range) => sum + range[2] - range[1] + 1, 0);
}

Page(Object.assign({
  data: {
    title: '',
    file: '',
    pages: [],
    currentIndex: 0,
    currentPage: 1,
    totalPages: 1,
    partIndex: 0,
    partCount: 1,
    canPrev: false,
    canNext: false
  },

  onLoad(options) {
    const file = decodeURIComponent(options.file || '');
    const title = decodeURIComponent(options.title || '文档');
    const meta = PREVIEWS[file];

    if (!meta || !Array.isArray(meta.ranges) || meta.ranges.length === 0) {
      wx.showModal({
        title: '预览不可用',
        content: '没有找到该文档的本地预览文件。',
        showCancel: false,
        success: () => wx.navigateBack()
      });
      return;
    }

    const requestedPart = parseInt(options.part || '0', 10);
    const partIndex = Math.min(Math.max(requestedPart, 0), meta.ranges.length - 1);
    const range = meta.ranges[partIndex];
    const from = range[1];
    const to = range[2];
    const localCount = to - from + 1;
    const offset = pageOffset(meta, partIndex);
    const globalTotal = totalPages(meta);
    const requestedPage = options.page === 'last'
      ? localCount - 1
      : Math.min(Math.max(parseInt(options.page || '0', 10), 0), localCount - 1);

    const pages = [];
    for (let index = 0; index < localCount; index += 1) {
      pages.push({
        number: from + index,
        display: offset + index + 1,
        src: Math.abs(index - requestedPage) <= WINDOW_RADIUS
          ? `../../${meta.dir}/page-${padPage(from + index)}.jpg`
          : ''
      });
    }

    this.previewMeta = meta;
    this.pageOffset = offset;

    wx.setNavigationBarTitle({
      title: title.length > 10 ? `${title.slice(0, 10)}…` : title
    });

    this.setData({
      title,
      file,
      pages,
      currentIndex: requestedPage,
      currentPage: offset + requestedPage + 1,
      totalPages: globalTotal,
      partIndex,
      partCount: meta.ranges.length,
      canPrev: offset + requestedPage > 0,
      canNext: offset + requestedPage + 1 < globalTotal
    });
  },

  onUnload() {
    this.previewMeta = null;
    this.pageOffset = 0;
  },

  onPageChange(e) {
    this.updateWindow(e.detail.current);
  },

  updateWindow(index) {
    const pages = this.data.pages.map((page, pageIndex) => ({
      ...page,
      src: Math.abs(pageIndex - index) <= WINDOW_RADIUS
        ? `../../${this.previewMeta.dir}/page-${padPage(page.number)}.jpg`
        : ''
    }));
    const globalIndex = this.pageOffset + index;

    this.setData({
      pages,
      currentIndex: index,
      currentPage: globalIndex + 1,
      canPrev: globalIndex > 0,
      canNext: globalIndex + 1 < this.data.totalPages
    });
  },

  goPrev() {
    if (!this.data.canPrev) return;

    if (this.data.currentIndex > 0) {
      this.updateWindow(this.data.currentIndex - 1);
      return;
    }

    this.navigatePart(this.data.partIndex - 1, 'last');
  },

  goNext() {
    if (!this.data.canNext) return;

    if (this.data.currentIndex < this.data.pages.length - 1) {
      this.updateWindow(this.data.currentIndex + 1);
      return;
    }

    this.navigatePart(this.data.partIndex + 1, '0');
  },

  navigatePart(partIndex, page) {
    const range = this.previewMeta.ranges[partIndex];
    if (!range) return;

    const root = range[0];
    wx.redirectTo({
      url: `${root}/pages/preview/preview` +
        `?file=${encodeURIComponent(this.data.file)}` +
        `&part=${partIndex}` +
        `&page=${page}` +
        `&title=${encodeURIComponent(this.data.title)}`
    });
  },

  previewCurrent() {
    const current = this.data.pages[this.data.currentIndex];
    if (!current || !current.src) return;

    wx.previewImage({
      current: current.src,
      urls: [current.src]
    });
  },

  onImageError() {
    if (this.imageErrorShown) return;
    this.imageErrorShown = true;
    wx.showToast({ title: '当前页加载失败', icon: 'none' });
  }
}, withShare()));
