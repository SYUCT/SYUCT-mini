const GALLERY = [
  { title: '林荫小路', src: '/packages/gallery/assets/gallery-tree-path.jpg' },
  { title: '雨后晚霞广场', src: '/packages/gallery/assets/gallery-campus-dusk.jpg' },
  { title: '雨后操场', src: '/packages/gallery/assets/gallery-stadium-reflection.jpg' },
  { title: '图书馆晚霞', src: '/packages/gallery/assets/gallery-library-sunset.jpg' },
  { title: '龙门雪景', src: '/packages/gallery/assets/gallery-snow-arch.jpg' },
  { title: '校园白猫', src: '/packages/gallery/assets/gallery-campus-cat.jpg' },
  { title: '草坪小狗', src: '/packages/gallery/assets/gallery-campus-dogs.jpg' },
  { title: '雪中红亭', src: '/packages/gallery/assets/gallery-snow-pavilion.jpg' },
  { title: '图书馆中庭', src: '/packages/gallery/assets/gallery-library-interior.jpg' },
  { title: '校园主路', src: '/assets/hero-campus.jpg' },
  { title: '宿舍夜色', src: '/packages/gallery/assets/gallery-dorm-night.jpg' },
  { title: '校园学习空间', src: '/packages/gallery/assets/gallery-study-room.jpg' },
  { title: '金字塔夜景', src: '/packages/gallery/assets/gallery-campus-night.jpg' }
];

Page({
  data: {
    gallery: GALLERY,
    current: 0,
    currentNumber: 1,
    total: GALLERY.length,
    currentTitle: GALLERY[0].title
  },

  onLoad(options) {
    const requested = Number.parseInt(options && options.index, 10);
    const current = Number.isFinite(requested)
      ? Math.min(Math.max(requested, 0), GALLERY.length - 1)
      : 0;
    this.setData({
      current,
      currentNumber: current + 1,
      currentTitle: GALLERY[current].title
    });
    wx.setNavigationBarTitle({ title: '校园相册' });
  },

  onChange(e) {
    const current = Number(e.detail.current || 0);
    this.setData({
      current,
      currentNumber: current + 1,
      currentTitle: GALLERY[current].title
    });
  },

  previewCurrent(e) {
    const index = Number(e.currentTarget.dataset.index || this.data.current || 0);
    const item = GALLERY[index];
    if (!item) return;
    wx.previewImage({
      current: item.src,
      urls: GALLERY.map(image => image.src)
    });
  }
});
