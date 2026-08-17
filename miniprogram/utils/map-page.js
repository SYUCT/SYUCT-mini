const { MAP, MAPS, PLACES, SITE } = require('../data/content');
const { openUrl } = require('./doc');
const { captureTarget, scrollToTarget } = require('./page');
const { withShare } = require('./share');

const VIEWER_ROUTES = {
  'campus-map': '/packages/maps-main/pages/viewer/viewer',
  'sports-map': '/packages/maps-main/pages/viewer/viewer',
  'delivery-pickup-overview': '/packages/maps-delivery/pages/viewer/viewer',
  'delivery-haochijie-layout': '/packages/maps-delivery/pages/viewer/viewer'
};

const FALLBACK_IMAGES = {
  'campus-map': '/assets/campus-map.jpg',
  'sports-map': '/assets/sports-map.jpg',
  'delivery-pickup-overview': '/assets/delivery-pickup-overview.jpg',
  'delivery-haochijie-layout': '/assets/delivery-haochijie-layout.jpg'
};

function createMapPage() {
  return Object.assign({
    data: {
      pageInfo: MAP,
      maps: MAPS,
      places: PLACES,
      site: SITE
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

    openMapViewer(e) {
      const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
      const route = VIEWER_ROUTES[id];
      if (!id || !route) return;

      wx.navigateTo({
        url: `${route}?id=${encodeURIComponent(id)}`,
        fail: () => {
          const current = FALLBACK_IMAGES[id];
          if (!current) return;
          wx.previewImage({ current, urls: [current] });
        }
      });
    },

    openPanorama() {
      openUrl(this.data.site.panoramaUrl, '学校官方校园全景需要在浏览器中打开。是否复制链接？');
    }
  }, withShare());
}

module.exports = { createMapPage };
