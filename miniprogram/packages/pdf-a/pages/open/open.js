const { createNativeDocumentPage } = require('../../../../utils/native-document');
const manifest = require('../../data/manifest');
const payload = require('../../data/payload');

Page(createNativeDocumentPage(manifest, payload));
