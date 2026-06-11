import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
const thumbsDir = path.join(__dirname, 'uploads', 'thumbnails');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

let works = [];
let likes = new Map();

function generateSampleData() {
  const sampleImages = [
    { seed: 'mountain', w: 800, h: 1200, title: '山间晨雾', username: '摄影师小王' },
    { seed: 'ocean', w: 1200, h: 800, title: '海平线', username: '海洋探索者' },
    { seed: 'city', w: 900, h: 1200, title: '城市夜景', username: '都市旅人' },
    { seed: 'forest', w: 1000, h: 800, title: '深林秘境', username: '自然摄影师' },
    { seed: 'portrait', w: 800, h: 1000, title: '光影人像', username: '人像达人' },
    { seed: 'architecture', w: 1200, h: 900, title: '建筑几何', username: '建筑美学' },
    { seed: 'food', w: 1000, h: 1000, title: '美食诱惑', username: '美食博主' },
    { seed: 'animal', w: 900, h: 1100, title: '野性之美', username: '动物观察者' },
    { seed: 'flower', w: 800, h: 1200, title: '花语', username: '微距世界' },
    { seed: 'sunset', w: 1200, h: 700, title: '日落时分', username: '追光者' },
    { seed: 'snow', w: 1000, h: 1300, title: '雪国', username: '极地旅行家' },
    { seed: 'desert', w: 1100, h: 900, title: '沙漠星空', username: '星空猎手' },
    { seed: 'waterfall', w: 900, h: 1200, title: '飞流直下', username: '风光摄影' },
    { seed: 'coffee', w: 1000, h: 1000, title: '午后咖啡', username: '生活美学' },
    { seed: 'bridge', w: 1200, h: 800, title: '城市之桥', username: '街拍记录' },
    { seed: 'island', w: 1000, h: 700, title: '孤岛', username: '旅行日记' },
    { seed: 'mist', w: 800, h: 1100, title: '迷雾森林', username: '氛围摄影师' },
    { seed: 'street', w: 900, h: 1200, title: '街头故事', username: '纪实摄影' },
    { seed: 'macro', w: 800, h: 1000, title: '微观世界', username: '微距达人' },
    { seed: 'sky', w: 1200, h: 600, title: '云端之上', username: '航拍大师' },
  ];

  const now = Date.now();
  works = sampleImages.map((img, i) => {
    const id = uuidv4();
    const createdAt = new Date(now - i * 2 * 60 * 60 * 1000).toISOString();
    const likeCount = Math.floor(Math.random() * 200) + 10;

    const likeTimes = [];
    for (let j = 0; j < likeCount; j++) {
      likeTimes.push(now - Math.floor(Math.random() * 24 * 60 * 60 * 1000));
    }
    likes.set(id, likeTimes);

    return {
      id,
      title: img.title,
      username: img.username,
      thumbnailUrl: `https://picsum.photos/seed/${img.seed}/400`,
      imageUrl: `https://picsum.photos/seed/${img.seed}/${img.w}/${img.h}`,
      likes: likeCount,
      liked: false,
      comments: [
        {
          id: uuidv4(),
          username: '游客A',
          text: '太美了！构图很棒',
          createdAt: new Date(now - i * 3600000).toISOString(),
        },
        {
          id: uuidv4(),
          username: '设计师B',
          text: '色彩很有感觉，收藏了',
          createdAt: new Date(now - i * 7200000).toISOString(),
        },
      ].slice(0, Math.floor(Math.random() * 3)),
      createdAt,
      width: img.w,
      height: img.h,
    };
  });
}

generateSampleData();

app.get('/api/works', (req, res) => {
  res.json(works);
});

app.get('/api/works/:id', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) return res.status(404).json({ error: 'Not found' });
  res.json(work);
});

app.post('/api/works', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { title, username } = req.body;
    const id = uuidv4();
    const ext = path.extname(req.file.filename);
    const thumbName = `${id}_thumb${ext}`;
    const thumbPath = path.join(thumbsDir, thumbName);

    let metadata;
    try {
      metadata = await sharp(req.file.path).metadata();
      await sharp(req.file.path)
        .resize(400, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);
    } catch (sharpErr) {
      console.error('Sharp error:', sharpErr);
      metadata = { width: 800, height: 600 };
      try {
        fs.copyFileSync(req.file.path, thumbPath);
      } catch {}
    }

    const work = {
      id,
      title: title || '未命名作品',
      username: username || '匿名',
      thumbnailUrl: `/uploads/thumbnails/${thumbName}`,
      imageUrl: `/uploads/${req.file.filename}`,
      likes: 0,
      liked: false,
      comments: [],
      createdAt: new Date().toISOString(),
      width: metadata?.width || 800,
      height: metadata?.height || 600,
    };

    likes.set(id, []);
    works.unshift(work);
    res.status(201).json(work);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/works/:id/like', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) return res.status(404).json({ error: 'Not found' });

  const likeTimes = likes.get(req.params.id) || [];
  likeTimes.push(Date.now());
  likes.set(req.params.id, likeTimes);

  work.likes = likeTimes.length;
  res.json({ likes: work.likes, liked: true });
});

app.post('/api/works/:id/unlike', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) return res.status(404).json({ error: 'Not found' });

  const likeTimes = likes.get(req.params.id) || [];
  if (likeTimes.length > 0) likeTimes.pop();
  likes.set(req.params.id, likeTimes);

  work.likes = likeTimes.length;
  res.json({ likes: work.likes, liked: false });
});

app.get('/api/works/:id/comments', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) return res.status(404).json({ error: 'Not found' });
  res.json(work.comments);
});

app.post('/api/works/:id/comments', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) return res.status(404).json({ error: 'Not found' });

  const comment = {
    id: uuidv4(),
    username: req.body.username || '匿名',
    text: req.body.text || '',
    createdAt: new Date().toISOString(),
  };

  work.comments.push(comment);
  res.status(201).json(comment);
});

app.get('/api/trending', (req, res) => {
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

  const trending = works.map((work) => {
    const likeTimes = likes.get(work.id) || [];
    const recentLikes = likeTimes.filter((t) => t >= twentyFourHoursAgo).length;
    return {
      id: work.id,
      title: work.title,
      username: work.username,
      thumbnailUrl: work.thumbnailUrl,
      likes24h: recentLikes,
      totalLikes: work.likes,
      rank: 0,
      prevRank: 0,
    };
  });

  trending.sort((a, b) => b.likes24h - a.likes24h);
  trending.forEach((item, i) => (item.rank = i + 1));

  res.json(trending.slice(0, 10));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API base: http://localhost:${PORT}/api`);
});
