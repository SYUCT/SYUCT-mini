// Native document page factory.
// Keeps the document-opening runtime in the main package so every PDF subpackage
// only carries its own manifest/payload plus a tiny page entry.
const { withShare } = require('./share');
const BROWSER_LINK_BASE = 'https://www.syuct.top/';

function browserUrlFor(file) {
  const clean = String(file || '').replace(/^\/+/, '');
  return clean ? BROWSER_LINK_BASE + clean : '';
}

const Z85_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#';
const Z85_MAP = (() => {
  const map = {};
  for (let i = 0; i < Z85_ALPHABET.length; i += 1) map[Z85_ALPHABET.charAt(i)] = i;
  return map;
})();

function safeTitle(title) {
  const value = String(title || '文档');
  return value.length > 10 ? `${value.slice(0, 10)}…` : value;
}

function decodeZ85(text, byteLength) {
  const value = String(text || '');
  if (!value || value.length % 5 !== 0) throw new Error('invalid Z85 payload');

  const fullLength = (value.length / 5) * 4;
  const targetLength = Math.min(Number(byteLength) || fullLength, fullLength);
  const out = new Uint8Array(targetLength);
  let offset = 0;

  for (let i = 0; i < value.length; i += 5) {
    let block = 0;
    for (let j = 0; j < 5; j += 1) {
      const digit = Z85_MAP[value.charAt(i + j)];
      if (digit === undefined) throw new Error('invalid Z85 character');
      block = block * 85 + digit;
    }

    const bytes = [
      Math.floor(block / 16777216) & 255,
      Math.floor(block / 65536) & 255,
      Math.floor(block / 256) & 255,
      block & 255
    ];
    for (let k = 0; k < 4 && offset < targetLength; k += 1) out[offset++] = bytes[k];
  }

  return out.buffer;
}

function createNativeDocumentPage(manifest, payload) {
  const documentManifest = manifest || {};
  const documentPayload = String(payload || '');

  return Object.assign({
    data: {
      status: '正在准备文档…',
      detail: '文档已内置在小程序中，请稍候。',
      opening: true,
      canRetry: false,
      canBrowserDownload: false
    },

    onLoad(options) {
      this.file = decodeURIComponent((options && options.file) || '');
      this.documentTitle = decodeURIComponent((options && options.title) || '文档');
      this.sourceFile = decodeURIComponent((options && options.source) || '');
      if (!this.sourceFile && this.file) this.sourceFile = `docs/${this.file}`;
      this.browserDownloadUrl = browserUrlFor(this.sourceFile);
      this.setData({ canBrowserDownload: Boolean(this.browserDownloadUrl) });
      this.opening = false;
      wx.setNavigationBarTitle({ title: safeTitle(this.documentTitle) });
      this.openNativeDocument();
    },

    reopen() {
      this.openNativeDocument();
    },

    copyBrowserDownloadLink() {
      if (!this.browserDownloadUrl) {
        wx.showToast({ title: '下载链接不可用', icon: 'none' });
        return;
      }
      wx.setClipboardData({
        data: this.browserDownloadUrl,
        success: () => {
          wx.showModal({
            title: '浏览器下载',
            content: '下载链接已复制。请打开系统浏览器，粘贴访问该链接进行下载。',
            showCancel: false,
            confirmText: '知道了'
          });
        },
        fail: error => {
          console.error('copy browser download link failed:', error);
          wx.showToast({ title: '复制失败，请重试', icon: 'none' });
        }
      });
    },

    openNativeDocument() {
      if (this.opening) return;
      const meta = documentManifest[this.file];
      if (!meta) {
        this.failOpen('文档不可用', '没有找到这份文档的内置数据。');
        return;
      }

      const fs = wx.getFileSystemManager();
      if (!fs || typeof fs.readCompressedFile !== 'function') {
        this.failOpen('当前微信版本过低', '请升级微信后重新打开文档。');
        return;
      }

      this.opening = true;
      this.setData({
        status: '正在准备文档…',
        detail: '文档已内置在小程序中，不需要联网下载。',
        opening: true,
        canRetry: false
      });

      let packed;
      try {
        const start = Number(meta.offset) || 0;
        const count = Number(meta.chars) || 0;
        const packedText = documentPayload.slice(start, start + count);
        if (packedText.length !== count) throw new Error('payload truncated');
        packed = decodeZ85(packedText, meta.compressedLength);
      } catch (error) {
        console.error('decode embedded document failed:', error);
        this.failOpen('文档解析失败', '内置文档数据不完整，请重新打开。');
        return;
      }

      this.inflateAndOpen(fs, packed, meta);
    },

    inflateAndOpen(fs, packed, meta) {
      const safeName = String(meta.cacheName || 'syuct-document.bin').replace(/[^a-zA-Z0-9._-]/g, '-');
      const documentPath = `${wx.env.USER_DATA_PATH}/${safeName}`;
      const brPath = `${documentPath}.br`;
      const removePacked = () => {
        try {
          fs.unlink({ filePath: brPath, fail: () => {} });
        } catch (error) {
          // Temporary cleanup failure does not block opening the document.
        }
      };

      fs.writeFile({
        filePath: brPath,
        data: packed,
        success: () => {
          fs.readCompressedFile({
            filePath: brPath,
            compressionAlgorithm: 'br',
            success: res => {
              removePacked();
              if (!res || !res.data || res.data.byteLength !== meta.byteLength) {
                this.failOpen('文档解压失败', '文档数据不完整，请重新打开。');
                return;
              }
              fs.writeFile({
                filePath: documentPath,
                data: res.data,
                success: () => this.launchDocument(documentPath, meta.fileType),
                fail: error => {
                  console.error('write local document failed:', error);
                  this.failOpen('文档准备失败', '本地文档写入失败，请重试。');
                }
              });
            },
            fail: error => {
              removePacked();
              console.error('readCompressedFile failed:', error);
              this.failOpen('文档解压失败', '本地文档解压失败，请重新打开。');
            }
          });
        },
        fail: error => {
          console.error('write packed document failed:', error);
          this.failOpen('文档准备失败', '本地压缩数据写入失败，请重试。');
        }
      });
    },

    launchDocument(filePath, fileType) {
      wx.openDocument({
        filePath,
        fileType: fileType || undefined,
        showMenu: false,
        success: () => {
          this.opening = false;
          this.setData({
            status: '文档已打开',
            detail: '从微信原生文档页返回后，可再次打开；如需保存文件，可复制链接到系统浏览器下载。',
            opening: false,
            canRetry: true
          });
        },
        fail: error => {
          console.error('wx.openDocument failed:', error);
          this.failOpen('无法打开文档', '微信原生文档阅读器打开失败，请重试。');
        }
      });
    },

    failOpen(status, detail) {
      this.opening = false;
      this.setData({ status, detail, opening: false, canRetry: true });
    },

    onUnload() {
      this.opening = false;
      this.file = '';
      this.documentTitle = '';
      this.sourceFile = '';
      this.browserDownloadUrl = '';
    }
  }, withShare({
    // 分享路径必须带上 file/title/source：this.route 不含 query，
    // 少了这些参数接收方会落在"文档不可用"且「浏览器下载」按钮被隐藏的死页面上。
    shareApp: (page) => {
      const route = page.route ? `/${page.route}` : '';
      // 自己就是从坏链接进来的（file 为空）时指向首页，别再传播一个死链接。
      if (!route || !page.file) return { path: '/pages/index/index' };
      const query = `file=${encodeURIComponent(page.file)}` +
        `&title=${encodeURIComponent(page.documentTitle || page.file)}` +
        `&source=${encodeURIComponent(page.sourceFile || '')}`;
      return {
        title: `沈化校园指南 · ${page.documentTitle || '资料'}`,
        path: `${route}?${query}`
      };
    },
    shareTimeline: (page) => {
      if (!page.file) return {};
      return {
        title: `沈化校园指南 · ${page.documentTitle || '资料'}`,
        query: `file=${encodeURIComponent(page.file)}` +
          `&title=${encodeURIComponent(page.documentTitle || page.file)}` +
          `&source=${encodeURIComponent(page.sourceFile || '')}`
      };
    }
  }));
}

module.exports = {
  createNativeDocumentPage,
  decodeZ85
};
