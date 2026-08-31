// data/documents.js — 全站文档唯一数据源
// 标题与分类同步自网页版 resources.html（v1.29 基线，2026-08-14）。
// 页面只引用文档 ID，不再重复维护 title/file/category。

const PREVIEWS = require('./previews.js');

const RESOURCE_CATEGORY_ORDER = [
  '新生入学',
  '数字校园',
  '校园生活',
  '学业资料',
  '培养方案',
  '毕业办事',
  '教务办事',
  '办事工具',
  '创新竞赛',
  '校园办事',
  '体育健康',
  '课程真题',
  '规章制度',
  '图书馆',
  '学生经验',
  '奖助办事'
];

const RAW_DOCUMENTS = [
  {
    id: '2026-new-student-guide',
    title: '2026 新生入学指南（抢先版）',
    file: 'docs/2026-new-student-guide.pdf',
    category: '新生入学',
    tags: ['新生', '报到', '入学', '军训', '材料']
  },
  {
    id: 'student-origin-credit-loan-liaoning-2026',
    title: '国家生源地信用助学贷款（国家开发银行辽宁分行）',
    file: 'docs/student-origin-credit-loan-liaoning-2026.pdf',
    category: '奖助办事',
    tags: ['国家生源地信用助学贷款', '国家开发银行', '辽宁分行', '2026', '助学贷款', '生源地贷款', '学费', '住宿费', '生活费', '申请', '95593', '新生入学']
  },
  {
    id: 'esports-club-recruit-2026',
    title: '电竞社招新通知',
    file: 'docs/esports-club-recruit-2026.doc',
    category: '校园生活',
    tags: ['电竞社', '电竞', '社团', '社团招新', '招新', '学生社团', '游戏', '赛事', '开黑', '综测加分', '骨干招募', '社长']
  },
  {
    id: 'campus-power-payment-guide',
    title: '校园电费缴费操作流程',
    file: 'docs/campus-power-payment-guide.pdf',
    category: '校园生活',
    tags: ['校园电费', '电费', '空调', '空调用电', '空调续费', '缴费', '充值', '后勤管理处', '微服务', '宿舍', '服务号', '公众号']
  },
  {
    id: 'unified-identity-guide',
    title: '统一身份认证使用指南',
    file: 'docs/unified-identity-guide.pdf',
    category: '数字校园',
    tags: ['统一身份认证', '账号激活', '密码', '企业微信', 'sso']
  },
  {
    id: 'hometown-groups',
    title: '老乡群汇总表',
    file: 'docs/hometown-groups.xlsx',
    category: '校园生活',
    tags: ['老乡群', '新生群', '交流群', '地区群']
  },
  {
    id: 'electives-2026-2027',
    title: '2026—2027 第一学期选修课一览表',
    file: 'docs/electives-2026-2027.xlsx',
    category: '学业资料',
    tags: ['选修课', '通识选修', '选课', '课程表']
  },
  {
    id: 'computer-science-plan-2025',
    title: '计算机科学与技术专业 2025 培养方案',
    file: 'docs/computer-science-plan-2025.pdf',
    category: '培养方案',
    tags: ['计算机', '计科', '培养方案', '学分', '课程']
  },
  {
    id: 'chemical-engineering-plan-2025',
    title: '化学工程与工艺（卓越）2025 培养方案',
    file: 'docs/chemical-engineering-plan-2025.pdf',
    category: '培养方案',
    tags: ['化学工程', '化工', '卓越', '培养方案', '学分']
  },
  {
    id: 'info-engineering-electives-2025',
    title: '信息工程学院 2025 版选修学分要求',
    file: 'docs/info-engineering-electives-2025.docx',
    category: '学业资料',
    tags: ['信息工程学院', '选修学分', '毕业要求', '选课']
  },
  {
    id: 'certificate-proxy',
    title: '证书代领委托书',
    file: 'docs/certificate-proxy.doc',
    category: '毕业办事',
    tags: ['证书', '代领', '委托书', '毕业']
  },
  {
    id: 'exam-review-form',
    title: '查卷申请表',
    file: 'docs/exam-review-form.doc',
    category: '教务办事',
    tags: ['查卷', '复核', '考试', '成绩']
  },
  {
    id: 'graduate-registration-form',
    title: '普通高等学校毕业生登记表模板',
    file: 'docs/graduate-registration-form.pdf',
    category: '毕业办事',
    tags: ['毕业生登记表', '毕业材料', '模板']
  },
  {
    id: 'party-activist-form',
    title: '入党积极分子报名表',
    file: 'docs/party-activist-form.xls',
    category: '校园生活',
    tags: ['入党', '积极分子', '报名表']
  },
  {
    id: 'code-tables',
    title: '各种代码表',
    file: 'docs/code-tables.xls',
    category: '办事工具',
    tags: ['代码表', '行政区划', '民族', '学籍']
  },
  {
    id: 'campus-run-exemption',
    title: '校园跑免跑申请表',
    file: 'docs/campus-run-exemption.doc',
    category: '体育健康',
    tags: ['校园跑', '免跑', '免修', '体育']
  },
  {
    id: 'special-course-selection-form',
    title: '非常规选课申请表',
    file: 'docs/special-course-selection-form.doc',
    category: '教务办事',
    tags: ['非常规选课', '选课申请', '教务']
  },
  {
    id: 'thesis-template-2023',
    title: '本科毕业设计（论文）模板及格式要求',
    file: 'docs/thesis-template-2023.doc',
    category: '毕业办事',
    tags: ['毕业论文', '毕业设计', '论文模板', '格式']
  },
  {
    id: 'calculus-2-final-2025-2026',
    title: '2025—2026（2）高等数学 2 期末真题',
    file: 'docs/calculus-2-final-2025-2026.pdf',
    category: '课程真题',
    tags: ['高等数学', '高数', '期末', '真题', '考试']
  },
  {
    id: 'physics-1-final-2025-2026',
    title: '2025—2026（2）大学物理 1 期末真题',
    file: 'docs/physics-1-final-2025-2026.pdf',
    category: '课程真题',
    tags: ['大学物理', '大物', '期末', '真题', '考试']
  },
  {
    id: 'student-regulations',
    title: '沈阳化工大学学生管理规定',
    file: 'docs/student-regulations.pdf',
    category: '规章制度',
    tags: ['学生管理规定', '校规', '纪律', '学籍']
  },
  {
    id: 'calendar-2026-2027',
    title: '2026—2027 学年度第一学期校历',
    file: 'docs/calendar-2026-2027.pdf',
    category: '校园生活',
    tags: ['校历', '开学', '放假', '教学周', '考试周']
  },
  {
    id: 'wifi7-transition-notice',
    title: '校园无线网络新旧系统切换通知',
    file: 'docs/wifi7-transition-notice.docx',
    category: '数字校园',
    tags: ['校园网', '无线网', 'wifi', 'wifi7', '网络切换']
  },
  {
    id: 'repeat-course-payment',
    title: '重修缴费流程',
    file: 'docs/repeat-course-payment.pdf',
    category: '教务办事',
    tags: ['重修', '缴费', '课程', '教务']
  },
  {
    id: 'graduation-self-check',
    title: '毕业与学位资格学生自查操作说明',
    file: 'docs/graduation-self-check.docx',
    category: '毕业办事',
    tags: ['毕业资格', '学位资格', '自查', '毕业要求']
  },
  {
    id: 'off-campus-e-resources',
    title: '假期如何在校外访问电子资源',
    file: 'docs/off-campus-e-resources.docx',
    category: '数字校园',
    tags: ['校外访问', '电子资源', '数据库', '假期', '图书馆']
  },
  {
    id: 'chaoxing-library-guide',
    title: '超星学习通查看借阅及超期信息说明',
    file: 'docs/chaoxing-library-guide.docx',
    category: '图书馆',
    tags: ['超星学习通', '借阅', '超期', '图书馆']
  },
  {
    id: 'thesis-plagiarism-check-2026',
    title: '2026 届毕业论文查重检测通知',
    file: 'docs/thesis-plagiarism-check-2026.docx',
    category: '毕业办事',
    tags: ['论文查重', '查重', '毕业论文', '检测']
  },
  {
    id: 'micro-majors-2026',
    title: '2026 年微专业报名通知',
    file: 'docs/micro-majors-2026.pdf',
    category: '学业资料',
    tags: ['微专业', '报名', '培养', '选课']
  },
  {
    id: 'physical-fitness-score-tables',
    title: '大学生体质测试单项指标评分表',
    file: 'docs/physical-fitness-score-tables.pdf',
    category: '体育健康',
    tags: ['体测', '体质测试', '评分表', '体育']
  },
  {
    id: 'pe-electives-experience',
    title: '体育、选修推荐 v1.2（学生经验）',
    file: 'docs/pe-electives-experience.pdf',
    category: '学生经验',
    tags: ['体育选课', '选修推荐', '学生经验', '选课']
  },
  {
    id: 'webvpn-guide',
    title: 'WebVPN 系统使用指南',
    file: 'docs/webvpn-guide.pdf',
    category: '数字校园',
    tags: ['webvpn', '校外访问', '校园网', '系统指南']
  },
  {
    id: 'carsi-guide',
    title: 'CARSI 服务使用方法',
    file: 'docs/carsi-guide.pdf',
    category: '数字校园',
    tags: ['carsi', '知网', '校外访问', '学术资源']
  },
  {
    id: 'scholarship-application-guide',
    title: '奖学金申请系统使用说明',
    file: 'docs/scholarship-application-guide.docx',
    category: '奖助办事',
    tags: ['奖学金', '申请系统', '评优', '奖助']
  },
  {
    id: 'engineering-management-plan-2025',
    title: '工程管理专业 2025 培养方案',
    file: 'docs/engineering-management-plan-2025.docx',
    category: '培养方案',
    tags: ['工程管理', '培养方案', '工程项目管理', '造价', '学分']
  },
  {
    id: 'elective-recommendations-2026',
    title: '2026 通识选修建议（学生经验）',
    file: 'docs/elective-recommendations-2026.pdf',
    category: '学生经验',
    tags: ['通识选修', '选课建议', '学生经验', '体育']
  },
  {
    id: 'competition-management-supplement-2025',
    title: '创新创业竞赛管理与奖励办法补充修订（2025）',
    file: 'docs/competition-management-supplement-2025.pdf',
    category: '创新竞赛',
    tags: ['创新创业', '竞赛', '奖励', '资助', '竞赛目录']
  },
  {
    id: 'competition-management-reward-2024',
    title: '创新创业竞赛管理与奖励办法（2024）',
    file: 'docs/competition-management-reward-2024.pdf',
    category: '创新竞赛',
    tags: ['创新创业', '竞赛', '奖励办法', '竞赛目录']
  },
  {
    id: 'open-lab-application',
    title: '学生进入开放实验室申请表',
    file: 'docs/open-lab-application.doc',
    category: '创新竞赛',
    tags: ['开放实验室', '实验室', '申请表', '项目']
  },
  {
    id: 'student-record-change-application-2020',
    title: '学信网学籍信息修改申请表（2020 版）',
    file: 'docs/student-record-change-application-2020.docx',
    category: '教务办事',
    tags: ['学信网', '学籍信息', '姓名', '身份证', '民族']
  },
  {
    id: 'deferred-exam-application',
    title: '缓考审批表',
    file: 'docs/deferred-exam-application.doc',
    category: '教务办事',
    tags: ['缓考', '审批表', '考试', '教务']
  },
  {
    id: 'classroom-video-review-application',
    title: '回放教室监控录像申请表',
    file: 'docs/classroom-video-review-application.docx',
    category: '校园办事',
    tags: ['监控调阅', '录像回放', '教室监控', '保卫处', '教务处']
  },
  {
    id: 'pe-health-course-application',
    title: '体育保健课修读申请表',
    file: 'docs/pe-health-course-application.docx',
    category: '体育健康',
    tags: ['体育保健课', '体育课', '校医院', '申请表']
  },
  {
    id: 'summer-campus-stay-2026',
    title: '2026 年暑期本科生留校工作方案',
    file: 'docs/summer-campus-stay-2026.pdf',
    category: '校园生活',
    tags: ['暑假留校', '暑期留校', '宿舍', '安全', '本科生']
  }
];

const DOC_DESCRIPTIONS = {
  '2026-new-student-guide': '含报到须知、缴费、住宿、银行业务与数字迎新说明。',
  'student-origin-credit-loan-liaoning-2026': '国家开发银行辽宁分行资料，集中说明申请对象、所需材料、办理渠道、办理时间与还款示例；实际要求以当地学生资助管理中心及贷款合同为准。',
  'unified-identity-guide': '第一次使用数字校园前，按指南绑定微信并激活账号。',
  'campus-power-payment-guide': '宿舍空调用电需自行充值。四步截图演示：微信搜索“沈阳化工大学后勤”服务号，进入微服务选择“空调用电续费”，登录核对户号后选择金额提交。',
  'esports-club-recruit-2026': '含社团活动介绍、报名条件与骨干招募要求，文末有负责人 QQ。招新时间与名额以社团最新通知为准。',
  'hometown-groups': '按需下载查看，群信息可能变化，加入前请核验群名与管理员。',
  'electives-2026-2027': '用于筛选课程名称、类别和开课信息。',
  'computer-science-plan-2025': '专业介绍、培养目标、毕业要求、课程体系与学分安排。',
  'chemical-engineering-plan-2025': '专业方向、核心课程、工程认证要求与教学进程。',
  'info-engineering-electives-2025': '适用于相关专业的通识与学科领域选修要求。',
  'certificate-proxy': '不能本人领取证书时使用，提交材料以学院要求为准。',
  'exam-review-form': '查卷需按学院审批流程办理，不等同于自行查看试卷。',
  'graduate-registration-form': '含填表说明、自我鉴定和院系意见页面。',
  'party-activist-form': '表格版本和提交要求请以学院当期通知为准。',
  'code-tables': '办事填表时可能使用的代码参考。',
  'campus-run-exemption': '符合条件者按要求提交申请及证明材料。',
  'special-course-selection-form': '用于符合条件的特殊选课申请。',
  'thesis-template-2023': '包含封面、摘要、目录、正文、图表、参考文献和装订要求。',
  'calculus-2-final-2025-2026': '2025—2026 学年第二学期试题，用于熟悉题型与时间分配。',
  'physics-1-final-2025-2026': '2025—2026 学年第二学期试题，用于熟悉题型与时间分配。',
  'student-regulations': '涵盖学籍、考核、转专业、休复学、退学与学生权利义务。',
  'calendar-2026-2027': '查看报到、军训、开课、节假日、寒假与上课节次。',
  'wifi7-transition-notice': '了解新无线系统试运行期间的认证与网络说明。',
  'repeat-course-payment': '中国银行手机银行缴费步骤；客户编号规则请以教务通知为准。',
  'graduation-self-check': '查看毕业资格、学位课程达成情况并生成审查明细。',
  'off-campus-e-resources': '列出假期可用数据库、图书馆入口与校外访问方式。',
  'chaoxing-library-guide': '含邀请码、账号绑定、借阅查看、续借和消息提醒。',
  'thesis-plagiarism-check-2026': '检测对象、流程、文件命名和相似度要求。',
  'micro-majors-2026': '含多个微专业招生简章、培养目标、课程设置与报名方式。',
  'physical-fitness-score-tables': 'BMI、肺活量、50 米、坐位体前屈、立定跳远、耐力跑等评分。',
  'pe-electives-experience': '学生个人经验，仅供参考，不代表学校评价或选课结论。',
  'webvpn-guide': '登录、资源访问、退出与账号安全提醒。',
  'carsi-guide': '电脑端与移动端访问流程。',
  'scholarship-application-guide': '申请资格核验、银行卡信息和系统操作说明。',
  'engineering-management-plan-2025': '含工程项目管理、投资与造价管理两个方向，以及课程体系、学分和实践环节。',
  'elective-recommendations-2026': '群内经验整理，时效性和主观性较强，只作选课前的信息补充。',
  'competition-management-supplement-2025': '调整竞赛认定目录、C/D 类赛事资助范围和指导教师奖励口径。',
  'competition-management-reward-2024': '含竞赛类别、组织管理、资助原则、奖励标准及认定目录。',
  'open-lab-application': '申请进入开放实验室参与项目，需学生工作办公室与承接实验室签署意见。',
  'student-record-change-application-2020': '用于姓名、身份证号或民族信息修改，需同时提交证明材料。',
  'deferred-exam-application': '因病等原因申请缓考，需按任课教师、辅导员、学院和教务处流程审批。',
  'classroom-video-review-application': '按流程申请现场查看教室监控回放，材料注明录像通常仅保存 7—10 天。',
  'pe-health-course-application': '申请修读体育保健课，需校医院、院系、任课教师及教研室审批。',
  'summer-campus-stay-2026': '2026 年留校时间为 7 月 6 日至 8 月 30 日，现作为当年流程与安全要求参考。'
};

const LEGACY_ALIASES = {
  'student-origin-credit-loan-liaoning-2026': ['助学贷款', '生源地贷款', '国开行助学贷款', '辽宁助学贷款'],
  'calendar-2026-2027': ['2026—2027 第一学期校历'],
  'wifi7-transition-notice': ['校园 WiFi7 切换通知'],
  'repeat-course-payment': ['重修缴费说明'],
  'graduation-self-check': ['毕业自查清单'],
  'off-campus-e-resources': ['校外电子资源访问'],
  'chaoxing-library-guide': ['超星学习通使用指南'],
  'thesis-plagiarism-check-2026': ['论文查重说明（2026）'],
  'micro-majors-2026': ['微专业 2026'],
  'physical-fitness-score-tables': ['体测成绩评分表'],
  'webvpn-guide': ['WebVPN 使用指南'],
  'carsi-guide': ['CARSI 使用指南'],
  'scholarship-application-guide': ['奖学金申请指南'],
  'elective-recommendations-2026': ['选修推荐 2026'],
  'competition-management-supplement-2025': ['竞赛管理补充（2025）'],
  'competition-management-reward-2024': ['竞赛管理办法与奖励（2024）'],
  'open-lab-application': ['开放实验室申请'],
  'student-record-change-application-2020': ['学籍信息修改申请'],
  'deferred-exam-application': ['缓考申请表'],
  'classroom-video-review-application': ['监控调阅申请'],
  'pe-health-course-application': ['体育保健课申请'],
  'summer-campus-stay-2026': ['暑假留校申请'],
  'campus-run-exemption': ['校园跑免修申请'],
  'student-regulations': ['学生管理规定'],
  'calculus-2-final-2025-2026': ['高等数学 2 期末真题（2025-2026-2）'],
  'physics-1-final-2025-2026': ['大学物理 1 期末真题（2025-2026-2）']
};

const SECTION_GROUPS = {
  freshman: [
    {
      id: 'guide',
      name: '新生必备资料',
      icon: '📋',
      lead: '先看入学指南和校历，再处理账号激活与群信息。',
      ids: ['2026-new-student-guide', 'calendar-2026-2027', 'unified-identity-guide', 'hometown-groups']
    }
  ],
  digital: [
    {
      id: 'identity',
      name: '统一身份认证',
      icon: '🔑',
      lead: '统一身份认证相当于数字校园的“网上通行证”。第一次使用需要完成账号激活，并确保企业微信消息可以正常接收。',
      ids: ['unified-identity-guide']
    },
    {
      id: 'webvpn',
      name: 'WebVPN：访问校内系统',
      icon: '🌐',
      lead: 'WebVPN 适合在校外通过浏览器访问部分校内应用与资源，无需安装客户端。已激活统一身份认证后，可以使用账号密码或扫码登录。',
      ids: ['webvpn-guide', 'wifi7-transition-notice']
    },
    {
      id: 'carsi',
      name: 'CARSI：校外访问学术资源',
      icon: '🎓',
      lead: 'CARSI 主要用于校外访问学校已购买或已接入的电子资源。登录成功后，应能看到“沈阳化工大学教师/同学”身份提示。',
      ids: ['carsi-guide', 'off-campus-e-resources']
    },
    {
      id: 'library',
      name: '图书馆移动服务',
      icon: '📚',
      lead: '学习通可绑定个人借阅信息，用于查看借阅、续借和接收超期提醒。',
      ids: ['chaoxing-library-guide']
    }
  ],
  academics: [
    {
      id: 'plans',
      name: '专业培养方案',
      icon: '📋',
      postCallout: '怎么看培养方案：优先找“毕业总学分、必修与选修模块、核心课程、开课学期、实践环节”五类信息。',
      ids: ['computer-science-plan-2025', 'chemical-engineering-plan-2025', 'engineering-management-plan-2025']
    },
    {
      id: 'electives',
      name: '选修课与学分',
      icon: '🗂️',
      postWarning: '经验资料使用边界：教师、课程内容和考核方式会变化。主观经验只用于了解差异，最终应结合培养方案、课表和自己的学习目标。',
      ids: ['electives-2026-2027', 'info-engineering-electives-2025', 'pe-electives-experience', 'elective-recommendations-2026']
    },
    {
      id: 'innovation',
      name: '创新竞赛与开放实验室',
      icon: '🏆',
      preCallout: '阅读顺序：先看 2025 年补充修订，再结合 2024 年原办法。补充修订调整了竞赛分级和部分资助口径，获奖奖励标准保持不变。',
      ids: ['competition-management-supplement-2025', 'competition-management-reward-2024', 'open-lab-application']
    },
    {
      id: 'exams',
      name: '课程真题',
      icon: '📝',
      postNote: '真题适合用于熟悉题型与时间分配，不建议只背答案。复习时应回到课程大纲和任课教师明确的考试范围。',
      ids: ['calculus-2-final-2025-2026', 'physics-1-final-2025-2026']
    },
    {
      id: 'micro-major',
      name: '微专业',
      icon: '🧭',
      lead: '2026 年微专业通知涵盖材料、环境、机械、计算机、经管、体育、外语和化工等方向。报名对象、学分要求和截止时间以各专业简章为准。',
      ids: ['micro-majors-2026']
    }
  ],
  services: [
    {
      id: 'teaching',
      name: '教务与选课',
      icon: '✍️',
      ids: ['repeat-course-payment', 'special-course-selection-form', 'exam-review-form', 'code-tables', 'deferred-exam-application', 'student-record-change-application-2020']
    },
    {
      id: 'scholarship',
      name: '奖学金与学生事务',
      icon: '🏅',
      postCallout: '奖学金提示：系统申请窗口、资格条件和所需银行卡信息可能按年度调整，请先看学院或学生处当期通知。',
      ids: ['scholarship-application-guide', 'party-activist-form']
    },
    {
      id: 'campus-affairs',
      name: '校园事务与录像调阅',
      icon: '🏫',
      ids: ['classroom-video-review-application']
    },
    {
      id: 'graduation',
      name: '毕业与论文',
      icon: '🎓',
      postWarning: '论文查重：2026 届通知中学校总体要求正文重复比率不得高于 30%，申优论文不得高于 20%；各学院可能执行更严格标准。',
      ids: ['graduation-self-check', 'thesis-template-2023', 'thesis-plagiarism-check-2026', 'graduate-registration-form', 'certificate-proxy']
    }
  ],
  campus: [
    {
      id: 'clubs',
      name: '社团招新',
      icon: '🎪',
      lead: '每年 9–10 月为集中招新期。收到的社团招新简章会陆续汇总到这里，可以直接在小程序里打开。',
      emptyTitle: '招新简章征集中',
      emptyDesc: '网页版校园社区有社团招新汇总帖，目前已有社团在里面发布招新信息，可以先去那边看看。社团负责人也可以把招新文档发给共建团队，一起汇总到小程序里。',
      postNote: '想让自己社团的招新简章出现在这里，可以把文档发给共建团队，或先到网页版校园社区的招新汇总帖回复。',
      ids: ['esports-club-recruit-2026']
    },
    {
      id: 'calendar',
      name: '校历与作息',
      icon: '📅',
      ids: ['calendar-2026-2027', 'student-regulations']
    },
    {
      id: 'sports',
      name: '体育、校园跑与体测',
      icon: '🏃',
      lead: '校园跑属于课外体育锻炼环节。现有材料显示，男生每周两次、每次 2 公里，最低 48 公里；女生每周两次、每次 1.5 公里，最低 36 公里。执行口径以当学期体育部通知为准。',
      ids: ['physical-fitness-score-tables', 'campus-run-exemption', 'pe-electives-experience', 'pe-health-course-application']
    },
    {
      id: 'library',
      name: '图书馆与学习',
      icon: '📚',
      postNote: '校外访问数据库可使用 CARSI 或 WebVPN，具体入口和适用资源见“数字校园”页面。',
      ids: ['chaoxing-library-guide']
    },
    {
      id: 'groups',
      name: '群与校园信息',
      icon: '💬',
      ids: ['hometown-groups', 'wifi7-transition-notice']
    },
    {
      id: 'vacation',
      name: '假期留校',
      icon: '🏠',
      postWarning: '时效提醒：暑期留校方案按年度发布。后续年份请优先查看学生工作处和学院最新通知，不要直接沿用 2026 年时间节点。',
      ids: ['summer-campus-stay-2026']
    }
  ]
};

function extOf(file) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file || '');
  return match ? match[1].toLowerCase() : '';
}

function formatOf(ext) {
  const formats = {
    pdf: 'PDF',
    doc: 'DOC',
    docx: 'DOCX',
    xls: 'XLS',
    xlsx: 'XLSX'
  };
  return formats[ext] || (ext ? ext.toUpperCase() : '文件');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s（）()《》【】\[\]·,，。.!！?？:：;；/\\_\-—–]+/g, '');
}

function baseNameOf(file) {
  return String(file || '').split('/').pop();
}

const DOCUMENTS = RAW_DOCUMENTS.map((doc, index) => {
  const ext = extOf(doc.file);
  const format = formatOf(ext);
  const aliases = LEGACY_ALIASES[doc.id] || [];
  const description = DOC_DESCRIPTIONS[doc.id] || '';
  const hasLocalPreview = Boolean(PREVIEWS[baseNameOf(doc.file)]);
  const accessLabel = hasLocalPreview ? '微信原生打开' : '复制链接后浏览器打开';
  const searchText = normalizeText([
    doc.title,
    doc.category,
    format,
    doc.file,
    ...(doc.tags || []),
    ...aliases,
    description
  ].join(' '));

  return Object.freeze({
    ...doc,
    order: index + 1,
    ext,
    format,
    aliases,
    description,
    hasLocalPreview,
    accessLabel,
    note: `${format} · ${accessLabel}`,
    summary: description || `${format} 文件`,
    searchText
  });
});

const DOCUMENT_INDEX = DOCUMENTS.reduce((map, doc) => {
  map[doc.id] = doc;
  return map;
}, Object.create(null));

function getDocumentsByIds(ids) {
  return (ids || []).map(id => DOCUMENT_INDEX[id]).filter(Boolean);
}

function getSectionGroups(section) {
  return (SECTION_GROUPS[section] || []).map(group => ({
    id: group.id,
    name: group.name,
    icon: group.icon,
    lead: group.lead || '',
    preCallout: group.preCallout || '',
    postCallout: group.postCallout || '',
    postWarning: group.postWarning || '',
    postNote: group.postNote || '',
    emptyTitle: group.emptyTitle || '',
    emptyDesc: group.emptyDesc || '',
    items: getDocumentsByIds(group.ids)
  }));
}

function getGroupItems(section, groupName) {
  const group = (SECTION_GROUPS[section] || []).find(item => item.name === groupName);
  return group ? getDocumentsByIds(group.ids) : [];
}

function getResourceGroups() {
  return RESOURCE_CATEGORY_ORDER.map(category => ({
    cat: category,
    items: DOCUMENTS.filter(doc => doc.category === category)
  })).filter(group => group.items.length > 0);
}

function documentMatches(doc, keyword) {
  const normalized = normalizeText(keyword);
  return !normalized || doc.searchText.includes(normalized);
}

module.exports = {
  DOCUMENTS,
  DOCUMENT_INDEX,
  RESOURCE_CATEGORY_ORDER,
  SECTION_GROUPS,
  normalizeText,
  documentMatches,
  getDocumentsByIds,
  getSectionGroups,
  getGroupItems,
  getResourceGroups
};
