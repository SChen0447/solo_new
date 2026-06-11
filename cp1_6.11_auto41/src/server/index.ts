import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Project, Chapter, ComicPage, Bubble, Like, Comment, Reply } from './models.js';
import { projects, likes, comments } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage });

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }
  return days;
}

function findProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

function findChapter(project: Project, chapterId: string): Chapter | undefined {
  return project.chapters.find((c) => c.id === chapterId);
}

app.post('/api/projects', upload.single('coverImage'), (req, res) => {
  const { title, description, artistName } = req.body;
  const coverImage = req.file ? `/uploads/${req.file.filename}` : '';
  const project: Project = {
    id: uuidv4(),
    title: title || '未命名漫画',
    description: description || '',
    coverImage,
    artistId: uuidv4(),
    artistName: artistName || '匿名画师',
    chapters: [],
    isPublished: false,
    createdAt: new Date().toISOString(),
  };
  projects.push(project);
  res.json(project);
});

app.get('/api/projects', (_req, res) => {
  const published = projects.filter((p) => p.isPublished);
  res.json(published);
});

app.get('/api/projects/all', (_req, res) => {
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = findProject(req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  res.json(project);
});

app.put('/api/projects/:id', upload.single('coverImage'), (req, res) => {
  const project = findProject(req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const { title, description, artistName, isPublished } = req.body;
  if (title) project.title = title;
  if (description) project.description = description;
  if (artistName) project.artistName = artistName;
  if (req.file) project.coverImage = `/uploads/${req.file.filename}`;
  if (isPublished !== undefined) project.isPublished = isPublished === 'true';
  res.json(project);
});

app.post('/api/projects/:id/chapters', (req, res) => {
  const project = findProject(req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const { title } = req.body;
  const chapter: Chapter = {
    id: uuidv4(),
    projectId: project.id,
    title: title || `第${project.chapters.length + 1}章`,
    chapterNumber: project.chapters.length + 1,
    pages: [],
    createdAt: new Date().toISOString(),
  };
  project.chapters.push(chapter);
  res.json(chapter);
});

app.post(
  '/api/projects/:projectId/chapters/:chapterId/pages',
  upload.single('image'),
  (req, res) => {
    const project = findProject(req.params.projectId);
    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    const chapter = findChapter(project, req.params.chapterId);
    if (!chapter) {
      res.status(404).json({ error: '章节不存在' });
      return;
    }
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const page: ComicPage = {
      id: uuidv4(),
      chapterId: chapter.id,
      pageNumber: chapter.pages.length + 1,
      imageUrl,
      bubbles: [],
      createdAt: new Date().toISOString(),
    };
    chapter.pages.push(page);
    res.json(page);
  }
);

app.put('/api/pages/:pageId/bubbles', (req, res) => {
  const { projectId, chapterId } = req.body;
  const project = findProject(projectId);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const chapter = findChapter(project, chapterId);
  if (!chapter) {
    res.status(404).json({ error: '章节不存在' });
    return;
  }
  const page = chapter.pages.find((p) => p.id === req.params.pageId);
  if (!page) {
    res.status(404).json({ error: '页面不存在' });
    return;
  }
  const bubbles: Bubble[] = (req.body.bubbles || []).map((b: Bubble) => ({
    id: b.id || uuidv4(),
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    text: b.text,
    style: b.style,
  }));
  page.bubbles = bubbles;
  res.json(page);
});

app.post('/api/pages/:pageId/like', (req, res) => {
  const { readerId } = req.body;
  const existing = likes.find(
    (l) => l.pageId === req.params.pageId && l.readerId === readerId
  );
  if (existing) {
    res.json({ liked: true, already: true });
    return;
  }
  const like: Like = {
    id: uuidv4(),
    pageId: req.params.pageId,
    readerId: readerId || uuidv4(),
    createdAt: new Date().toISOString(),
  };
  likes.push(like);
  res.json({ liked: true, already: false });
});

app.get('/api/pages/:pageId/likes', (req, res) => {
  const pageLikes = likes.filter((l) => l.pageId === req.params.pageId);
  res.json({ count: pageLikes.length });
});

app.post('/api/pages/:pageId/comments', (req, res) => {
  const { readerName, content } = req.body;
  if (!content || !content.trim()) {
    res.status(400).json({ error: '留言内容不能为空' });
    return;
  }
  const comment: Comment = {
    id: uuidv4(),
    pageId: req.params.pageId,
    readerName: readerName || '匿名读者',
    content: content.trim(),
    createdAt: new Date().toISOString(),
    replies: [],
  };
  comments.push(comment);
  res.json(comment);
});

app.get('/api/pages/:pageId/comments', (req, res) => {
  const pageComments = comments
    .filter((c) => c.pageId === req.params.pageId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(pageComments);
});

app.post('/api/comments/:commentId/reply', (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    res.status(400).json({ error: '回复内容不能为空' });
    return;
  }
  const comment = comments.find((c) => c.id === req.params.commentId);
  if (!comment) {
    res.status(404).json({ error: '留言不存在' });
    return;
  }
  const reply: Reply = {
    id: uuidv4(),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  comment.replies.push(reply);
  res.json(reply);
});

app.get('/api/projects/:id/analytics', (req, res) => {
  const project = findProject(req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const allPageIds: string[] = [];
  project.chapters.forEach((ch) => {
    ch.pages.forEach((p) => allPageIds.push(p.id));
  });
  const last7 = getLast7Days();
  const dailyData = last7.map((date) => {
    const count = likes.filter((l) => {
      const likeDate = new Date(l.createdAt).toISOString().split('T')[0];
      return likeDate === date && allPageIds.includes(l.pageId);
    }).length;
    return { date, count };
  });
  const pageStats = allPageIds.map((pageId) => {
    const count = likes.filter((l) => l.pageId === pageId).length;
    let pageInfo = '';
    project.chapters.forEach((ch) => {
      ch.pages.forEach((p) => {
        if (p.id === pageId) {
          pageInfo = `${ch.title} - 第${p.pageNumber}页`;
        }
      });
    });
    return { pageId, pageInfo, count };
  });
  const allComments: Comment[] = [];
  project.chapters.forEach((ch) => {
    ch.pages.forEach((p) => {
      comments
        .filter((c) => c.pageId === p.id)
        .forEach((c) => {
          allComments.push({
            ...c,
            replies: [...c.replies],
          });
        });
    });
  });
  allComments.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ dailyData, pageStats, comments: allComments });
});

app.listen(PORT, () => {
  console.log(`后端服务已启动: http://localhost:${PORT}`);
});
