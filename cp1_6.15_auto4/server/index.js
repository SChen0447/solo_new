import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const INSPIRATIONS_FILE = path.join(DATA_DIR, 'inspirations.json');
const IDEAS_FILE = path.join(DATA_DIR, 'ideas.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const GRADIENT_COLORS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a8edea', '#fed6e3']
];

const INSPIRATIONS_DATA = [
  { id: '1', emoji: '🌱', text: '环保+科技', gradientIndex: 0 },
  { id: '2', emoji: '🚀', text: '复古未来主义', gradientIndex: 1 },
  { id: '3', emoji: '🎨', text: '极简艺术表达', gradientIndex: 2 },
  { id: '4', emoji: '🤖', text: 'AI辅助创作', gradientIndex: 3 },
  { id: '5', emoji: '🌍', text: '全球化思维', gradientIndex: 4 },
  { id: '6', emoji: '🎮', text: '游戏化体验', gradientIndex: 5 },
  { id: '7', emoji: '♻️', text: '循环经济模式', gradientIndex: 0 },
  { id: '8', emoji: '🧘', text: '正念与效率', gradientIndex: 1 },
  { id: '9', emoji: '🌈', text: '多元化包容', gradientIndex: 2 },
  { id: '10', emoji: '🏙️', text: '智慧城市', gradientIndex: 3 },
  { id: '11', emoji: '🎵', text: '音乐可视化', gradientIndex: 4 },
  { id: '12', emoji: '📚', text: '知识图谱', gradientIndex: 5 },
  { id: '13', emoji: '🌊', text: '海洋保护', gradientIndex: 0 },
  { id: '14', emoji: '⚡', text: '清洁能源', gradientIndex: 1 },
  { id: '15', emoji: '🎭', text: '沉浸式剧场', gradientIndex: 2 },
  { id: '16', emoji: '🌿', text: '生物仿生设计', gradientIndex: 3 },
  { id: '17', emoji: '🔗', text: '去中心化应用', gradientIndex: 4 },
  { id: '18', emoji: '🎯', text: '精准个性化', gradientIndex: 5 },
  { id: '19', emoji: '👥', text: '社区共建', gradientIndex: 0 },
  { id: '20', emoji: '🔬', text: '跨界融合创新', gradientIndex: 1 },
  { id: '21', emoji: '🏔️', text: '户外数字化', gradientIndex: 2 },
  { id: '22', emoji: '💡', text: '开放式创新', gradientIndex: 3 },
  { id: '23', emoji: '🎪', text: '互动展览', gradientIndex: 4 },
  { id: '24', emoji: '📱', text: '移动端优先', gradientIndex: 5 },
  { id: '25', emoji: '🌟', text: '太空探索主题', gradientIndex: 0 },
  { id: '26', emoji: '🍃', text: '可持续时尚', gradientIndex: 1 },
  { id: '27', emoji: '🧬', text: '健康科技', gradientIndex: 2 },
  { id: '28', emoji: '🎬', text: '叙事式设计', gradientIndex: 3 },
  { id: '29', emoji: '🌾', text: '农业智能化', gradientIndex: 4 },
  { id: '30', emoji: '🎨', text: '色彩心理学应用', gradientIndex: 5 }
];

function initJsonFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

initJsonFile(INSPIRATIONS_FILE, INSPIRATIONS_DATA);
initJsonFile(IDEAS_FILE, []);
initJsonFile(PROJECTS_FILE, []);

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateIdeaTitle(cards, texts) {
  const keywords = [];
  cards.forEach(c => keywords.push(c.text.split('+')[0] || c.text));
  texts.forEach(t => {
    const words = t.content.split(/[，,。.!！?？\s]+/).filter(w => w.length > 1);
    keywords.push(...words.slice(0, 2));
  });
  
  const uniqueKeywords = [...new Set(keywords)].slice(0, 4);
  const templates = [
    `${uniqueKeywords[0] || '创新'}驱动的${uniqueKeywords[1] || '项目'}方案`,
    `${uniqueKeywords[0] || '智能'}${uniqueKeywords[1] || '体验'}：${uniqueKeywords[2] || '未来'}新范式`,
    `基于${uniqueKeywords[0] || '科技'}的${uniqueKeywords[1] || '创意'}平台`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateIdeaSummary(cards, texts) {
  const cardTexts = cards.map(c => c.text).join('、');
  const textContents = texts.map(t => t.content).join('，');
  const base = `本项目融合了${cardTexts || '多种创新元素'}的核心理念`;
  const details = textContents ? `，重点关注${textContents}` : '';
  const endings = [
    '，旨在打造具有突破性的创新体验，为用户带来全新的价值与感受。',
    '，通过跨界融合的方式，探索全新的商业模式与用户体验。',
    '，构建可持续发展的生态系统，实现多方共赢的目标。'
  ];
  return base + details + endings[Math.floor(Math.random() * endings.length)];
}

app.get('/api/inspirations', (req, res) => {
  setTimeout(() => {
    const inspirations = readJsonFile(INSPIRATIONS_FILE);
    const selected = shuffleArray(inspirations).slice(0, 6).map(item => ({
      ...item,
      gradient: GRADIENT_COLORS[item.gradientIndex % GRADIENT_COLORS.length]
    }));
    res.json(selected);
  }, 50);
});

app.get('/api/inspirations/all', (req, res) => {
  const inspirations = readJsonFile(INSPIRATIONS_FILE).map(item => ({
    ...item,
    gradient: GRADIENT_COLORS[item.gradientIndex % GRADIENT_COLORS.length]
  }));
  res.json(inspirations);
});

app.post('/api/save-ideas', (req, res) => {
  const { cards, texts, connections } = req.body;
  const ideas = readJsonFile(IDEAS_FILE);
  const newEntry = {
    id: uuidv4(),
    cards: cards || [],
    texts: texts || [],
    connections: connections || [],
    createdAt: new Date().toISOString()
  };
  ideas.push(newEntry);
  writeJsonFile(IDEAS_FILE, ideas);
  res.json({ success: true, id: newEntry.id });
});

app.get('/api/load-ideas', (req, res) => {
  const ideas = readJsonFile(IDEAS_FILE);
  if (ideas.length === 0) {
    return res.json(null);
  }
  const latest = ideas[ideas.length - 1];
  res.json(latest);
});

app.post('/api/generate-idea', (req, res) => {
  const { cards, texts } = req.body;
  setTimeout(() => {
    const title = generateIdeaTitle(cards || [], texts || []);
    const summary = generateIdeaSummary(cards || [], texts || []);
    res.json({ title, summary });
  }, 100);
});

app.post('/api/projects', (req, res) => {
  const { id, title, summary, tasks } = req.body;
  const projects = readJsonFile(PROJECTS_FILE);
  const newProject = {
    id: id || uuidv4(),
    title,
    summary,
    tasks: tasks || [
      { id: uuidv4(), name: '需求分析', status: 'todo', assignee: '小明', avatar: '👨‍💻', dueDate: '2026-06-20', colorIndex: 0 },
      { id: uuidv4(), name: '原型设计', status: 'todo', assignee: '小红', avatar: '👩‍🎨', dueDate: '2026-06-22', colorIndex: 1 },
      { id: uuidv4(), name: '开发实现', status: 'in-progress', assignee: '小李', avatar: '👨‍🔧', dueDate: '2026-06-25', colorIndex: 2 },
      { id: uuidv4(), name: '用户测试', status: 'in-progress', assignee: '小王', avatar: '🧪', dueDate: '2026-06-28', colorIndex: 3 },
      { id: uuidv4(), name: '上线发布', status: 'done', assignee: '小张', avatar: '🚀', dueDate: '2026-06-30', colorIndex: 4 }
    ],
    createdAt: new Date().toISOString()
  };
  projects.push(newProject);
  writeJsonFile(PROJECTS_FILE, projects);
  res.json({ success: true, project: newProject });
});

app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const { tasks } = req.body;
  const projects = readJsonFile(PROJECTS_FILE);
  const projectIndex = projects.findIndex(p => p.id === id);
  if (projectIndex === -1) {
    return res.status(404).json({ error: '项目不存在' });
  }
  projects[projectIndex].tasks = tasks || projects[projectIndex].tasks;
  writeJsonFile(PROJECTS_FILE, projects);
  res.json({ success: true, project: projects[projectIndex] });
});

app.get('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const projects = readJsonFile(PROJECTS_FILE);
  const project = projects.find(p => p.id === id);
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  res.json(project);
});

app.get('/api/projects', (req, res) => {
  const projects = readJsonFile(PROJECTS_FILE);
  res.json(projects);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
