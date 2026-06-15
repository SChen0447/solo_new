import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'portfolio.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS works (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    project_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    work_id TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_id) REFERENCES works(id)
  );
`);

const sampleWorks = [
  {
    id: 'work-1',
    title: '品牌视觉设计',
    image_url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80',
    description: '为一家创新科技公司设计的完整品牌视觉系统，包括Logo、色彩规范、字体系统和应用场景示例。整个设计理念围绕"简约而不简单"展开，体现科技与人文的融合。',
    category: 'UI设计',
    project_url: 'https://example.com/project1',
  },
  {
    id: 'work-2',
    title: '城市夜景插画系列',
    image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
    description: '以城市夜景为主题的系列插画作品，运用大胆的色彩对比和简洁的几何图形，展现现代都市的独特魅力。每幅作品都讲述着城市中不同角落的故事。',
    category: '插画',
    project_url: 'https://example.com/project2',
  },
  {
    id: 'work-3',
    title: '自然生态摄影集',
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    description: '历时两年拍摄的自然生态摄影作品集，足迹遍布山川湖海，记录大自然的壮美瞬间与珍稀生物的灵动姿态。用镜头呼吁人们关注环保、热爱自然。',
    category: '摄影',
    project_url: 'https://example.com/project3',
  },
  {
    id: 'work-4',
    title: 'App动效设计',
    image_url: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=80',
    description: '为一款社交应用设计的全套交互动效，包括页面切换动画、按钮反馈效果、加载动画等。动效设计注重流畅感和节奏感，提升整体用户体验。',
    category: '动效',
    project_url: 'https://example.com/project4',
  },
  {
    id: 'work-5',
    title: '电商平台界面',
    image_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    description: '为一家时尚电商平台重新设计的用户界面，注重商品展示的视觉冲击力和购物流程的便捷性。新设计上线后用户转化率提升35%。',
    category: 'UI设计',
    project_url: 'https://example.com/project5',
  },
  {
    id: 'work-6',
    title: '童话绘本插画',
    image_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80',
    description: '为儿童童话绘本创作的系列插画作品，采用温暖的水彩风格和可爱的角色设计，让孩子们在阅读中感受美与想象的力量。',
    category: '插画',
    project_url: 'https://example.com/project6',
  },
];

const insertWork = db.prepare(
  'INSERT OR IGNORE INTO works (id, title, image_url, description, category, project_url) VALUES (?, ?, ?, ?, ?, ?)'
);

const insertMany = db.transaction((works: typeof sampleWorks) => {
  for (const work of works) {
    insertWork.run(work.id, work.title, work.image_url, work.description, work.category, work.project_url);
  }
});

insertMany(sampleWorks);

console.log('数据库初始化完成！');
console.log(`已插入 ${sampleWorks.length} 条示例作品数据`);
db.close();
