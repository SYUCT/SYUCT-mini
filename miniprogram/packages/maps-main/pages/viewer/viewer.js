const { createZoomableMapPage } = require('../../../../utils/zoomable-map-page');

const MAPS = {
  'campus-map': {
    id: 'campus-map',
    title: '高清校园总图',
    src: '/packages/maps-main/assets/campus-map.jpg',
    resolution: '1453 × 2048',
    format: 'JPG'
  },
  'sports-map': {
    id: 'sports-map',
    title: '体育课专用地图',
    src: '/packages/maps-main/assets/sports-map.webp',
    resolution: '1455 × 2048',
    format: 'WebP'
  }
};

Page(createZoomableMapPage(MAPS, 'campus-map'));
