const { SITE, ABOUT, COMMUNITY_GROUPS } = require('../../data/content');
const { openDoc } = require('../../utils/doc');

const { withShare } = require('../../utils/share');

Page(Object.assign({
  data: {
    site: SITE,
    about: ABOUT,
    communityGroups: COMMUNITY_GROUPS
  },

  copyCommunityGroup(e) {
    const { number, label } = e.currentTarget.dataset;
    getApp().copyText(number, `${label || '群'}号已复制`);
  },

  openAcknowledgements() {
    const doc = this.data.about.acknowledgements;
    openDoc(doc.file, doc.title);
  },

  openSite() {
    getApp().openWeb(this.data.site.siteUrl, '是否复制网页版链接到浏览器打开？');
  },

  openOfficial() {
    getApp().openWeb(this.data.site.officialUrl, '是否复制学校官网链接到浏览器打开？');
  },

  openRepo() {
    getApp().openWeb(this.data.site.repoUrl, '是否复制 GitHub 仓库链接到浏览器打开？');
  },

  openTeam() {
    getApp().openWeb(this.data.site.teamUrl, '是否复制 SYUCT 学生团队官网链接到浏览器打开？');
  }
}, withShare()));
