// 统一分享配置：所有页面通过 withShare() 注入转发能力
// 用法：Page(Object.assign({ ...原有配置 }, withShare()))
// 可选：withShare({ shareApp: {...}, shareTimeline: {...} }) 覆盖默认标题/路径
function withShare(options) {
  const opts = options || {};
  return {
    // 分享给朋友：右上角"..."菜单 → 转发
    onShareAppMessage() {
      const route = this.route ? `/${this.route}` : '/pages/index/index';
      return Object.assign(
        { title: '沈化校园指南 · 新生入学必备', path: route },
        opts.shareApp || {}
      );
    },
    // 分享到朋友圈（基础库 2.11.3+）
    onShareTimeline() {
      return Object.assign(
        { title: '沈化校园指南 · 新生入学必备' },
        opts.shareTimeline || {}
      );
    }
  };
}

module.exports = { withShare };
