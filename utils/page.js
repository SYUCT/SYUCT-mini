// 页面锚点跳转辅助：用于首页“新生常问”直达具体栏目。
function captureTarget(page, options) {
  page.__scrollTarget = options && options.target ? String(options.target) : '';
}

function scrollToTarget(page) {
  const target = page.__scrollTarget;
  if (!target) return;
  setTimeout(() => {
    wx.pageScrollTo({ selector: `#${target}`, duration: 280 });
  }, 80);
}

module.exports = {
  captureTarget,
  scrollToTarget
};
