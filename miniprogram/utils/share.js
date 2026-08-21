// 统一分享配置：所有页面通过 withShare() 注入转发能力
// 用法：Page(Object.assign({ ...原有配置 }, withShare()))
// 可选：withShare({ shareApp: {...}, shareTimeline: {...} }) 覆盖默认标题/路径
// shareApp / shareTimeline 也可以传函数 (page) => ({...})，用于需要读页面实例上
// 运行时数据的场合——例如文档页要把当前文档的 query 带进分享路径。
function withShare(options) {
  const opts = options || {};
  const resolve = (value, page) => (typeof value === 'function' ? value(page) || {} : value || {});

  return {
    // 分享给朋友：右上角"..."菜单 → 转发
    onShareAppMessage() {
      const route = this.route ? `/${this.route}` : '/pages/index/index';
      return Object.assign(
        { title: '沈化校园指南 · 新生入学必备', path: route },
        resolve(opts.shareApp, this)
      );
    },
    // 分享到朋友圈（基础库 2.11.3+）
    onShareTimeline() {
      return Object.assign(
        { title: '沈化校园指南 · 新生入学必备' },
        resolve(opts.shareTimeline, this)
      );
    }
  };
}

module.exports = { withShare };
