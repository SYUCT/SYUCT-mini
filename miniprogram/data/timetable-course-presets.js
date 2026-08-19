'use strict';

// 课程名输入辅助：根据沈阳化工大学官网公开培养方案、课程页面和选课通知整理。
// 这里只用于本地自动补全，不代表学校当前学期的完整/实时开课清单；用户始终可以自由输入任意课程名称。
const COURSE_PRESETS = [
  // 通识与公共基础
  '高等数学（一）',
  '高等数学（二）',
  '大学外语',
  '形势与政策',
  '思想道德与法治',
  '中国近现代史纲要',
  '马克思主义基本原理',
  '毛泽东思想和中国特色社会主义理论体系概论',
  '习近平新时代中国特色社会主义思想概论',
  '线性代数',
  '概率论与数理统计',
  '大学物理（一）',
  '大学物理（二）',
  '大学物理实验',
  '进阶英语',
  '跨文化交际',
  '军事理论',
  '大学生心理健康教育',
  '大学生职业发展与就业指导',

  // 体育项目（不使用“体育一/二/三/四”这类泛化名称）
  '羽毛球',
  '篮球',
  '足球',
  '乒乓球',
  '网球',
  '排球',
  '轮滑',
  '健美操',

  // 化学、化工与制药
  '无机化学',
  '分析化学',
  '有机化学',
  '物理化学',
  '无机与分析化学',
  '化工原理（一）',
  '化工原理（二）',
  '化工热力学',
  '化学反应工程',
  '化学工艺学',
  '分离工程',
  '化工设计',
  '工程热力学',
  '生物制药',
  '波谱分析',
  '色谱分析',
  '电分析化学',
  '精细有机合成化学及工艺学',
  '精细化学品化学',

  // 计算机、软件与人工智能
  'C语言程序设计',
  'Python程序设计',
  'Java语言程序设计',
  '离散数学',
  '面向对象程序设计',
  '算法与数据结构',
  '计算机组成原理',
  '编译原理',
  '数据库系统原理',
  '计算机网络',
  '操作系统基础',
  '单片机原理及应用',
  '嵌入式系统',
  '数学分析',
  '高等代数',
  '常微分方程',
  '概率统计',
  '数值计算方法',
  '数据库基础',
  '人工智能基础',
  '机器学习',
  '自然语言处理',
  '计算机视觉与模式识别',
  '数字图像处理',
  '神经网络与深度学习',
  '智能系统设计',
  '认知心理学',
  '神经生物学概论',

  // 自动化、电气与电子信息
  '电路分析基础',
  '数字电子技术',
  '模拟电子技术',
  '微机原理及应用',
  '自动控制原理',
  '现代控制理论',
  '过程检测技术与传感器',
  '过程建模技术',
  '过程控制工程',
  '计算机控制技术',
  '仿真技术',

  // 机械与工程基础
  '画法几何与机械制图',
  '理论力学',
  '材料力学',
  '机械原理',
  '机械设计',
  '电工与电子技术',
  '液压与气压传动',
  '机械制造工艺学',
  '数控机床及应用',
  '机电一体化设计',

  // 经管类
  '微积分（一）',
  '微积分（二）',
  '管理学原理',
  '微观经济学',
  '宏观经济学',
  '市场营销学',
  '人力资源管理',
  '生产运作管理',
  '财务管理学',
  '运筹学',
  '电子商务',
  '国际金融',
  '国际贸易',
  '国际经济学',
  '企业外贸实务',
  '国际货物运输与保险',
  '海关报关实务',
  '现代物流与实务'
];

function normalizeCourseSearch(value) {
  let text = String(value || '').trim().toLowerCase();
  text = text.replace(/[\s（）()【】\[\]·•_\-—–]/g, '');
  text = text
    .replace(/ⅳ/g, '四')
    .replace(/ⅲ/g, '三')
    .replace(/ⅱ/g, '二')
    .replace(/ⅰ/g, '一');
  text = text
    .replace(/4$/g, '四')
    .replace(/3$/g, '三')
    .replace(/2$/g, '二')
    .replace(/1$/g, '一');
  return text;
}

function searchCoursePresets(query, limit) {
  const normalizedQuery = normalizeCourseSearch(query);
  if (!normalizedQuery) return [];
  const max = Math.max(1, Math.min(Number(limit) || 4, 4));

  return COURSE_PRESETS
    .map((name, index) => {
      const normalizedName = normalizeCourseSearch(name);
      const starts = normalizedName.startsWith(normalizedQuery);
      const contains = !starts && normalizedName.includes(normalizedQuery);
      if (!starts && !contains) return null;
      return { name, index, rank: starts ? 0 : 1 };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, max)
    .map((item) => item.name);
}

module.exports = {
  COURSE_PRESETS,
  normalizeCourseSearch,
  searchCoursePresets
};
