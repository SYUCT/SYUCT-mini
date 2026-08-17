// data/content.js — 网页版同步的站点与非文档内容
// 内容基线：SYUCT 网页版 v260809。
// 文档标题、分类、文件路径及栏目分组统一维护在 data/documents.js。

const COMMUNITY_GROUPS = [
  {
    id: 'freshman-2026',
    icon: '👥',
    title: '2026 沈阳化工大学新生交流群',
    copyLabel: '新生群',
    number: '1170264357',
    desc: '新生日常交流、经验分享与资料互助。',
  },
  {
    id: 'tieba',
    icon: '📢',
    title: '沈阳化工大学百度贴吧官方群',
    copyLabel: '贴吧群',
    number: '596823406',
    desc: '沈阳化工大学百度贴吧官方群，用于校园日常、经验分享、贴吧话题与校友同学之间的交流。',
  }
];

const SITE = {
  version: 'v1.3.2-mini',
  sourceVersion: 'v260809',
  sourceRevision: '20260814',
  updatedAt: '2026-08-14',
  updatedMonth: '2026-08',
  siteUrl: 'https://www.syuct.top/',
  officialUrl: 'https://www.syuct.edu.cn/',
  repoUrl: 'https://github.com/SYUCT/SYUCT-web',
  teamUrl: 'https://github.com/SYUCT',
  panoramaUrl: 'https://www.720yun.com/t/f2vk69p9dqe?scene_id=100532629',
  qqGroup: COMMUNITY_GROUPS[0].number,
  tiebaGroup: COMMUNITY_GROUPS[1].number
};

const HOME = {
  heroKicker: '学生共建 · SYUCT CAMPUS GUIDE',
  heroTitle: '沈阳化工大学校园指南',
  heroDescription: '本公益小程序把分散的新生通知、学业资料、办事表格和校园经验，整理成一条更容易查找的路径。',
  heroSub: '由学生整理，为学生服务。',
  portalEyebrow: '核心入口',
  portalTitle: '按你的问题直接进入',
  portalLead: '每张卡片都可以点击，不必在几十份文件中反复翻找。',
  quickEyebrow: '2026 新生快速入口',
  quickTitle: '新生最常问的五件事',
  galleryEyebrow: '校园一览',
  galleryTitle: '在资料之外，也看看真实的校园',
  featuredGallery: [
    { label: '雨后晚霞广场', file: '/assets/gallery-thumbs/gallery-campus-dusk.jpg', viewerIndex: 1 },
    { label: '金字塔夜景', file: '/assets/gallery-thumbs/gallery-campus-night.jpg', viewerIndex: 12 },
    { label: '林荫小路', file: '/assets/gallery-thumbs/gallery-tree-path.jpg', viewerIndex: 0 },
    { label: '龙门雪景', file: '/assets/gallery-thumbs/gallery-snow-arch.jpg', viewerIndex: 4 },
    { label: '图书馆晚霞', file: '/assets/gallery-thumbs/gallery-library-sunset.jpg', viewerIndex: 3 }
  ]
};

const PORTALS = [
  { icon: '🎓', title: '新生入学', desc: '报到、缴费、账号激活、军训和新生材料。', action: '第一次来学校 →', page: '/pages/freshman/freshman' },
  { icon: '🗺️', title: '校园地图', desc: '校园总图、快递取件、体育课地图与官方全景。', action: '找楼、取快递、找场馆 →', page: '/pages/map-detail/map-detail' },
  { icon: '🔐', title: '数字校园', desc: '统一身份认证、WebVPN、CARSI 与图书馆服务。', action: '解决账号和网络 →', page: '/pages/digital/digital' },
  { icon: '📚', title: '学业资料', desc: '培养方案、选修要求、微专业与课程真题。', action: '查课程、找资料 →', page: '/pages/academics/academics' },
  { icon: '🏫', title: '办事大厅', desc: '重修、查卷、奖学金、毕业与论文手续。', action: '找表格、走流程 →', page: '/pages/services/services' },
  { icon: '🌿', title: '校园生活', desc: '校历、体育、图书馆、学生规定和校园相册。', action: '日常学习生活 →', page: '/pages/campus-detail/campus-detail' }
];

const STATS = [
  { value: '9 月 3 日', label: '2026 级新生报到' },
  { value: '9.5—9.18', label: '新生军训' },
  { value: '9 月 21 日', label: '新生开始上课' },
  { value: '44 项', label: '核心资料与地图' },
  { value: '4 张', label: '实用导航地图' },
  { value: '1170264357', label: '学生交流群' }
];

const QUICK_QUESTIONS = [
  { num: '01', title: '报到时间与材料准备', desc: '关键日期与证件清单', page: '/pages/freshman/freshman?target=timeline' },
  { num: '02', title: '缴费安全与到校安排', desc: '缴费提醒与第一周事项', page: '/pages/freshman/freshman?target=payment' },
  { num: '03', title: '选课、竞赛与部分培养方案', desc: '选修学分、竞赛与方案资料', page: '/pages/academics/academics?target=electives' },
  { num: '04', title: '统一身份认证与校园账号', desc: '企业微信与数字服务', page: '/pages/digital/digital?target=identity' },
  { num: '05', title: '校园地图与快递取件', desc: '宿舍、食堂、场馆与取件点', page: '/pages/map-detail/map-detail?target=delivery' }
];


const LANDMARKS = {
  freshman: {
    name: '校训石',
    image: '/assets/landmark-motto-stone.png',
    alt: '沈阳化工大学校训石地标插画'
  },
  map: {
    name: '龙门',
    image: '/assets/landmark-dragon-gate.png',
    alt: '沈阳化工大学龙门地标插画'
  },
  digital: {
    name: '槐德广场',
    image: '/assets/landmark-huaide-square.png',
    alt: '沈阳化工大学槐德广场地标插画'
  },
  academics: {
    name: '图书馆',
    image: '/assets/landmark-library.png',
    alt: '沈阳化工大学图书馆地标插画'
  },
  services: {
    name: '老校门',
    image: '/assets/landmark-old-school-gate.png',
    alt: '沈阳化工学院老校门地标插画'
  },
  campus: {
    name: '化学金字塔',
    image: '/assets/landmark-chemical-pyramid.png',
    alt: '沈阳化工大学化学金字塔地标插画'
  }
};

const FRESHMAN = {
  landmark: LANDMARKS.freshman,
  title: '2026 新生入学指南',
  subtitle: '把报到前、报到当天和开学后的关键步骤，压缩成一条可执行的时间线。',
  scope: '当前入学时间线与《2026 新生入学指南》以本科新生信息为主；硕士新生可直接参考统一身份认证、校园地图和公共服务入口，报到、住宿与培养安排请以研究生院及所在学院通知为准。',
  warning: '本站做的是索引和提炼，报到时间、材料与缴费安排出现变动时，以学校和学院最新通知为准。',
  timeline: [
    { date: '8 月 29—30 日', event: '老生报到注册' },
    { date: '8 月 31 日', event: '老生开始上课' },
    { date: '9 月 3 日', event: '2026 级新生报到注册', highlight: true },
    { date: '9 月 5—18 日', event: '新生军训' },
    { date: '9 月 21 日', event: '新生开始上课', highlight: true }
  ],
  preparation: [
    { title: '确认报到信息', desc: '查学院通知、报到地点和辅导员联系方式。' },
    { title: '整理证件材料', desc: '录取通知书、身份证等材料按入学指南要求准备，重要证件不要托运。' },
    { title: '完成数字迎新', desc: '按学校通知完成信息采集、缴费与相关确认。' },
    { title: '激活校园账号', desc: '统一身份认证会关联后续的教务、网络与消息通知。', link: '/pages/digital/digital' },
    { title: '保存校园导航', desc: '提前确认宿舍、食堂、学院、报到点和快递取件位置。', link: '/pages/map-detail/map-detail' }
  ],
  paymentText: '新生缴费方式、时间和项目以入学指南及学校财务通知为准。有生源地信用助学贷款需求的同学，可查看下方辽宁分行参考资料；实际办理以当地学生资助管理中心和贷款合同为准。',
  paymentWarning: '谨防“代缴费、提前选宿舍、内部绿色通道”等诈骗。学校收费应以正式平台与通知为准。',
  firstWeek: [
    { step: '1', title: '完成报到', desc: '按学院安排核验身份、提交材料、领取物品。' },
    { step: '2', title: '熟悉生活区', desc: '确认宿舍、食堂、校医院、生活城和快递取件点。' },
    { step: '3', title: '检查校园账号', desc: '测试统一身份认证、企业微信和校园网络。' },
    { step: '4', title: '保存联系渠道', desc: '关注学院通知群、辅导员通知和学校官方平台。' }
  ]
};

const DIGITAL = {
  landmark: LANDMARKS.digital,
  title: '账号、网络与电子资源',
  subtitle: '从统一身份认证开始，串起 WebVPN、CARSI、企业微信和图书馆服务。',
  warning: '不要把统一身份认证密码交给他人，也不要在非学校或非可信页面输入账号。',
  identitySteps: [
    { step: '1', title: '关联微信', desc: '按指南扫描二维码，填写学号、手机号等身份信息。' },
    { step: '2', title: '关注企业号', desc: '关注“沈阳化工大学”企业号，并打开企业消息接收。' },
    { step: '3', title: '等待同步', desc: '账号数据同步通常需要一定时间，出现相关应用后继续。' },
    { step: '4', title: '完善密码', desc: '登录统一身份认证系统，完成个人信息和密码设置。' }
  ],
  actions: {
    identity: { title: '打开统一身份认证', url: 'https://sso.syuct.edu.cn/sso' },
    webvpn: { title: '打开 WebVPN', url: 'https://webvpn.syuct.edu.cn' },
    carsi: { title: '打开 CARSI 联盟登录', url: 'https://ds.carsi.edu.cn/login/index.html' }
  }
};

const ACADEMICS = {
  landmark: LANDMARKS.academics,
  title: '培养方案、选修与课程资料',
  subtitle: '先理解培养方案，再安排选修、微专业和考试复习。',
  contribution: '当前只收录了部分专业的培养方案、选修建议和课程资料，仍需要同学们投稿补充，一同完善。'
};

const SERVICES = {
  landmark: LANDMARKS.services,
  title: '表格、流程与学生事务',
  subtitle: '按教务、奖助、校园事务和毕业四个场景整理，减少临时找表的时间。',
  finalTip: '办事表格需以学院、教务处或学生工作部门当年最新版本为准，下载后请核对表头年份和提交要求。'
};

const CAMPUS = {
  landmark: LANDMARKS.campus,
  title: '校历、体育、图书馆与规章',
  subtitle: '把每天会遇到的学习生活信息集中到一个页面，也保留几处属于沈化校园的真实印象。',
  gallery: [
    { img: 'gallery-tree-path.jpg', label: '林荫小路', file: '/assets/gallery-thumbs/gallery-tree-path.jpg', viewerIndex: 0 },
    { img: 'gallery-campus-dusk.jpg', label: '雨后晚霞广场', file: '/assets/gallery-thumbs/gallery-campus-dusk.jpg', viewerIndex: 1 },
    { img: 'gallery-stadium-reflection.jpg', label: '雨后操场', file: '/assets/gallery-thumbs/gallery-stadium-reflection.jpg', viewerIndex: 2 },
    { img: 'gallery-library-sunset.jpg', label: '图书馆晚霞', file: '/assets/gallery-thumbs/gallery-library-sunset.jpg', viewerIndex: 3 },
    { img: 'gallery-snow-arch.jpg', label: '龙门雪景', file: '/assets/gallery-thumbs/gallery-snow-arch.jpg', viewerIndex: 4 },
    { img: 'gallery-campus-cat.jpg', label: '校园白猫', file: '/assets/gallery-thumbs/gallery-campus-cat.jpg', viewerIndex: 5 },
    { img: 'gallery-campus-dogs.jpg', label: '草坪小狗', file: '/assets/gallery-thumbs/gallery-campus-dogs.jpg', viewerIndex: 6 },
    { img: 'gallery-snow-pavilion.jpg', label: '雪中红亭', file: '/assets/gallery-thumbs/gallery-snow-pavilion.jpg', viewerIndex: 7 },
    { img: 'gallery-library-interior.jpg', label: '图书馆中庭', file: '/assets/gallery-thumbs/gallery-library-interior.jpg', viewerIndex: 8 },
    { img: 'hero-campus.jpg', label: '校园主路', file: '/assets/hero-campus.jpg', viewerIndex: 9 },
    { img: 'gallery-dorm-night.jpg', label: '宿舍夜色', file: '/assets/gallery-thumbs/gallery-dorm-night.jpg', viewerIndex: 10 },
    { img: 'gallery-study-room.jpg', label: '校园学习空间', file: '/assets/gallery-thumbs/gallery-study-room.jpg', viewerIndex: 11 },
    { img: 'gallery-campus-night.jpg', label: '金字塔夜景', file: '/assets/gallery-thumbs/gallery-campus-night.jpg', viewerIndex: 12 }
  ]
};

const MAP = {
  landmark: LANDMARKS.map,
  title: '校园地图与快递取件导航',
  subtitle: '用地图解决“楼在哪”和“体育课去哪”，再用快递取件图解决“去哪取件”这个高频问题，并提供学校官方校园全景入口。',
  advice: '点击地图进入高清查看器，可双指缩放、拖动查看细节，也可使用加减按钮放大；官方全景由 720 云加载，建议在网络稳定时打开。',
  deliveryAddress: '辽宁省沈阳市铁西区经济技术开发区 11 号街 11 号沈阳化工大学',
  deliveryHours: '9:00–18:00',
  deliveryDeadline: '快递需要在一个月内自取，否则按弃件处理。',
  deliveryNote: '驿站和快递品牌位置可能临时调整，请优先以物流通知、取件短信和现场标识为准。',
  deliveryPoints: [
    { name: '生活城菜鸟驿站', desc: '三食堂隔壁 · 顺丰 / 京东 / 邮政' },
    { name: '好吃街可取快递', desc: '中通 / 圆通 / 申通 / 韵达 / 极兔' }
  ],
  sportsChecklist: [
    { title: '看课程名称', desc: '篮球、羽毛球、健美操等课程可能在不同场馆。' },
    { title: '看老师通知', desc: '雨雪、场地占用或考试周可能临时换场。' },
    { title: '提前出发', desc: '生活城到网羽中心的距离不容小觑。' }
  ],
  sportsScoreNote: '体育课考核由专项技术考核、平时成绩、身体素质等三部分组成。其中：平时成绩100分（课堂表现）占比10%；校园跑成绩100分（通过满分不通过0分），占比20%；体测四项成绩100分，占比30%；专项考评100分，占比40%。',
  panoramaTitle: '沈阳化工大学校园全景',
  panoramaDesc: '通过可交互的全景画面提前熟悉校门、道路、教学区和校园环境。拖动画面可以转动视角，点击场景热点可以继续漫游。',
  panoramaNote: '内容来源于学校官网的校园全景入口，实际展示与可用性以原页面为准。'
};

const MAPS = [
  { id: 'campus-map', name: '高清校园总图', file: '/assets/campus-map.jpg', desc: '涵盖教学楼、实验楼、宿舍、食堂、体育场馆、图书馆及校门。', resolution: '1453 × 2048' },
  { id: 'sports-map', name: '体育课专用地图', file: '/assets/sports-map.jpg', desc: '标注主田径场、东田径场、网球场、篮球场、体育馆、网羽中心等场地。', resolution: '1455 × 2048' }
];

const PLACES = [
  { name: '图书馆', num: '21' },
  { name: '体育馆', num: '22' },
  { name: '大学生活动中心', num: '26' },
  { name: '主校区学生宿舍', num: '31' },
  { name: '1 号食堂', num: '36' },
  { name: '2 号食堂', num: '37' },
  { name: '3 号食堂', num: '38' },
  { name: '网羽中心', num: '23' }
];

const ABOUT = {
  title: '本项目与资料共建',
  subtitle: '一个非官方的、公益的校园信息汇总项目',
  subtitle2: '由学生整理，为学生服务',
  purpose: '大学作为一个正厅架构的巨型单位，学校通知、学院通知、各种培养方案和信息庞杂，难寻出处。我们这个项目结合了群友的经验和对文件的整理，让新生和在校生更方便的获得资料，知道下一步该做什么。',
  sources: [
    '学校与学院公开发布的通知、指南、培养方案和表格。',
    '群友投稿的课程、体育和校园经验。',
    '用户上传并授权用于整理的校园地图与风景照片。',
    '政策、收费、考试、学籍和毕业要求均以当年正式通知为准。'
  ],
  contribution: [
    { step: '1', title: '纠错', desc: '指出过期链接、错误日期或不准确描述。' },
    { step: '2', title: '补充', desc: '提交培养方案、流程、表格、真题或校园地图。' },
    { step: '3', title: '经验', desc: '分享选课、考试、竞赛、考研、保研和就业经验。' },
    { step: '4', title: '维护', desc: '通过 GitHub 提交修改，帮助持续更新网站。' }
  ],
  acknowledgements: {
    title: '致谢名单',
    desc: '感谢参与功能建议、内容完善、资料补充与社群支持的共建者。',
    note: 'PDF · 微信原生打开',
    file: 'docs/syuct-acknowledgements.pdf'
  }
};

module.exports = {
  COMMUNITY_GROUPS,
  LANDMARKS,
  SITE,
  HOME,
  PORTALS,
  STATS,
  QUICK_QUESTIONS,
  FRESHMAN,
  DIGITAL,
  ACADEMICS,
  SERVICES,
  CAMPUS,
  MAP,
  MAPS,
  PLACES,
  ABOUT
};
