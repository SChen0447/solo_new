import { KeywordEntry, TemplateEntry } from './types';

export const keywordDatabase: KeywordEntry[] = [
  { word: '远程办公工具', related: ['视频会议', '项目管理', '文档协作', '即时通讯', '云存储', '任务跟踪', '日程管理', '屏幕共享'] },
  { word: '视频会议', related: ['Zoom', '腾讯会议', '飞书会议', '钉钉会议', 'Webex', 'Google Meet'] },
  { word: '项目管理', related: ['Trello', 'Asana', 'Jira', '飞书项目', '钉钉项目', 'Monday'] },
  { word: '文档协作', related: ['Google Docs', '飞书文档', 'Notion', '语雀', 'Confluence', '石墨文档'] },
  { word: '即时通讯', related: ['Slack', '钉钉', '企业微信', '飞书', 'Teams', 'Discord'] },
  { word: '云存储', related: ['Google Drive', 'OneDrive', 'Dropbox', '坚果云', '阿里云盘', '腾讯微云'] },
  { word: '任务跟踪', related: ['Todoist', '滴答清单', 'Things', 'OmniFocus', 'Todo.txt', 'Microsoft To Do'] },
  { word: '日程管理', related: ['Google Calendar', ' Outlook日历', '飞书日历', 'Calendly', 'Fantastical', 'Calendars'] },
  { word: '产品设计', related: ['用户研究', '原型设计', 'UI设计', '交互设计', '视觉设计', '可用性测试'] },
  { word: '用户研究', related: ['用户访谈', '问卷调查', '数据分析', '竞品分析', '用户画像', '场景分析'] },
  { word: '原型设计', related: ['Figma', 'Sketch', 'Axure', '墨刀', 'Mockplus', 'ProtoPie'] },
  { word: 'UI设计', related: ['色彩理论', '排版设计', '图标设计', '组件库', '设计系统', '视觉规范'] },
  { word: '交互设计', related: ['用户流程', '信息架构', '动效设计', '微交互', '手势设计', '反馈设计'] },
  { word: '市场营销', related: ['内容营销', '社交媒体', 'SEO优化', '广告投放', '品牌建设', '用户增长'] },
  { word: '内容营销', related: ['博客文章', '视频内容', '信息图表', '案例研究', '白皮书', '电子书'] },
  { word: '社交媒体', related: ['微信公众号', '微博', '抖音', '小红书', 'B站', '知乎'] },
  { word: 'SEO优化', related: ['关键词研究', '页面优化', '外链建设', '技术SEO', '本地SEO', '移动SEO'] },
  { word: '广告投放', related: ['Google Ads', '百度推广', '信息流广告', '搜索广告', '展示广告', '视频广告'] },
  { word: '软件开发', related: ['前端开发', '后端开发', '数据库', '测试', 'DevOps', '安全'] },
  { word: '前端开发', related: ['React', 'Vue', 'Angular', 'TypeScript', 'Webpack', 'Vite'] },
  { word: '后端开发', related: ['Node.js', 'Python', 'Java', 'Go', 'Ruby', 'PHP'] },
  { word: '数据库', related: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server'] },
  { word: 'DevOps', related: ['Docker', 'Kubernetes', 'CI/CD', '监控告警', '日志管理', '配置管理'] },
  { word: '人工智能', related: ['机器学习', '深度学习', '自然语言处理', '计算机视觉', '语音识别', '推荐系统'] },
  { word: '机器学习', related: ['监督学习', '无监督学习', '强化学习', '特征工程', '模型评估', '超参数调优'] },
  { word: '深度学习', related: ['神经网络', 'CNN', 'RNN', 'Transformer', 'GAN', '迁移学习'] },
  { word: '自然语言处理', related: ['文本分类', '情感分析', '机器翻译', '问答系统', '文本生成', '命名实体识别'] },
  { word: '健康生活', related: ['运动健身', '饮食营养', '睡眠管理', '心理健康', '体检保健', '运动装备'] },
  { word: '运动健身', related: ['有氧运动', '力量训练', '瑜伽冥想', '跑步', '游泳', '骑行'] },
  { word: '饮食营养', related: ['均衡膳食', '蛋白质', '维生素', '矿物质', '膳食纤维', '水分摄入'] },
  { word: '睡眠管理', related: ['睡眠周期', '睡眠质量', '作息规律', '睡眠环境', '助眠方法', '睡眠监测'] },
  { word: '心理健康', related: ['情绪管理', '压力调节', '心理咨询', '正念冥想', '心理测试', '心理自助'] },
  { word: '学习方法', related: ['费曼学习法', '番茄工作法', '思维导图', '卡片笔记法', '主动回忆', '间隔重复'] },
  { word: '费曼学习法', related: ['选择主题', '教给他人', '发现漏洞', '简化语言', '类比举例', '反复练习'] },
  { word: '番茄工作法', related: ['25分钟专注', '5分钟休息', '任务清单', '时间块', '打断处理', '长期规划'] },
  { word: '创业', related: ['商业模式', '融资', '团队建设', '产品开发', '市场营销', '财务管理'] },
  { word: '商业模式', related: ['价值主张', '客户细分', '渠道通路', '客户关系', '收入来源', '成本结构'] },
  { word: '融资', related: ['天使轮', 'A轮', 'B轮', 'C轮', 'IPO', '并购'] },
  { word: '团队建设', related: ['招聘', '培训', '激励', '沟通', '协作', '文化'] },
];

export const templateDatabase: TemplateEntry[] = [
  {
    category: '工具',
    levels: [
      ['分类维度1', '分类维度2', '分类维度3'],
      ['具体工具1', '具体工具2', '具体工具3'],
      ['特点1', '特点2', '特点3'],
    ],
  },
  {
    category: '产品',
    levels: [
      ['核心功能', '用户体验', '技术实现', '商业模式'],
      ['功能模块1', '功能模块2', '功能模块3'],
      ['细节1', '细节2', '细节3'],
    ],
  },
  {
    category: '项目',
    levels: [
      ['目标', '范围', '时间', '成本', '质量'],
      ['任务1', '任务2', '任务3'],
      ['子任务1', '子任务2'],
    ],
  },
];

export function getRelatedKeywords(topic: string): string[] {
  const entry = keywordDatabase.find(
    (item) => item.word.toLowerCase() === topic.toLowerCase()
  );
  if (entry) {
    return entry.related;
  }

  const partialMatches = keywordDatabase.filter((item) =>
    item.word.toLowerCase().includes(topic.toLowerCase()) ||
    topic.toLowerCase().includes(item.word.toLowerCase())
  );

  if (partialMatches.length > 0) {
    const allRelated = new Set<string>();
    partialMatches.forEach((match) => {
      match.related.forEach((r) => allRelated.add(r));
    });
    return Array.from(allRelated).slice(0, 8);
  }

  return [
    `${topic}特点`,
    `${topic}应用`,
    `${topic}工具`,
    `${topic}方法`,
    `${topic}案例`,
    `${topic}优势`,
    `${topic}挑战`,
    `${topic}发展`,
  ];
}

export function buildTreeFromTemplate(
  rootTopic: string,
  level: number = 0
): string[] {
  if (level >= 2) {
    return [];
  }

  const relatedKeywords = getRelatedKeywords(rootTopic);
  const count = Math.min(6 - level * 2, relatedKeywords.length);
  return relatedKeywords.slice(0, Math.max(count, 3));
}
