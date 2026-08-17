const { createZoomableMapPage } = require('../../../../utils/zoomable-map-page');

const MAPS = {
  'delivery-pickup-overview': {
    id: 'delivery-pickup-overview',
    title: '快递取件位置总览',
    src: '/packages/maps-delivery/assets/delivery-pickup-overview.jpg',
    resolution: '1448 × 1086',
    format: 'JPG'
  },
  'delivery-haochijie-layout': {
    id: 'delivery-haochijie-layout',
    title: '化大好吃街内部点位',
    src: '/packages/maps-delivery/assets/delivery-haochijie-layout.jpg',
    resolution: '1672 × 941',
    format: 'JPG'
  }
};

Page(createZoomableMapPage(MAPS, 'delivery-pickup-overview'));
