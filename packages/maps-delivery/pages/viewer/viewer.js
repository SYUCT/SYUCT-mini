const MAPS = {
  'delivery-pickup-overview': { id: 'delivery-pickup-overview', title: '快递取件位置总览', src: '/packages/maps-delivery/assets/delivery-pickup-overview.jpg', resolution: '1448 × 1086', format: 'JPG' },
  'delivery-haochijie-layout': { id: 'delivery-haochijie-layout', title: '化大好吃街内部点位', src: '/packages/maps-delivery/assets/delivery-haochijie-layout.jpg', resolution: '1672 × 941', format: 'JPG' }
};
const DEFAULT_MAP = MAPS['delivery-pickup-overview'];

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const SCALE_STEP = 0.5;

Page({
  data: {
    map: DEFAULT_MAP,
    scale: MIN_SCALE,
    scaleLabel: '100%',
    loading: true,
    loadError: false
  },

  onLoad(options) {
    this.currentScale = MIN_SCALE;
    const map = MAPS[options && options.id] || DEFAULT_MAP;
    this.setData({ map });
    wx.setNavigationBarTitle({ title: map.title });
  },

  onImageLoad() {
    this.setData({ loading: false, loadError: false });
  },

  onImageError() {
    this.setData({ loading: false, loadError: true });
  },

  onScale(e) {
    const scale = Number(e.detail.scale || MIN_SCALE);
    this.currentScale = scale;
    const scaleLabel = `${Math.round(scale * 100)}%`;
    if (scaleLabel !== this.data.scaleLabel) this.setData({ scaleLabel });
    clearTimeout(this.scaleSyncTimer);
    this.scaleSyncTimer = setTimeout(() => {
      const normalized = Math.round(this.currentScale * 100) / 100;
      if (Math.abs(normalized - this.data.scale) > 0.01) this.setData({ scale: normalized });
    }, 140);
  },

  zoomIn() {
    this.setScale(Math.min(MAX_SCALE, (this.currentScale || MIN_SCALE) + SCALE_STEP));
  },

  zoomOut() {
    this.setScale(Math.max(MIN_SCALE, (this.currentScale || MIN_SCALE) - SCALE_STEP));
  },

  resetScale() {
    this.setScale(MIN_SCALE);
  },

  setScale(scale) {
    clearTimeout(this.scaleSyncTimer);
    const normalized = Math.round(scale * 10) / 10;
    const actualBefore = this.currentScale || MIN_SCALE;
    const scaleLabel = `${Math.round(normalized * 100)}%`;
    this.currentScale = normalized;
    if (Math.abs(normalized - this.data.scale) < 0.01 && Math.abs(normalized - actualBefore) > 0.01) {
      const nudge = normalized >= MAX_SCALE ? normalized - 0.01 : normalized + 0.01;
      this.setData({ scale: nudge }, () => this.setData({ scale: normalized, scaleLabel }));
      return;
    }
    this.setData({ scale: normalized, scaleLabel });
  },

  onUnload() {
    clearTimeout(this.scaleSyncTimer);
  }
});
