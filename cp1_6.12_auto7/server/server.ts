import express, { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3001;
export default app;

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'dist')));

export interface ImageData {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  createdAt: number;
}

export interface AnnotationData {
  id: string;
  type: 'rectangle' | 'circle' | 'arrow' | 'brush';
  x: number;
  y: number;
  width: number;
  height: number;
  points?: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  note?: string;
}

export interface ShareData {
  id: string;
  shortId: string;
  imageId: string;
  annotations: AnnotationData[];
  createdAt: number;
}

export interface PersistedData {
  images: [string, ImageData][];
  annotations: [string, AnnotationData[]][];
  shares: [string, ShareData][];
  shortIdMap: [string, string][];
}

const uploadsDir = path.join(__dirname, '..', 'uploads');
const dataDir = path.join(__dirname, '..', 'data');
const persistFile = path.join(dataDir, 'store.json');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const imagesStore: Map<string, ImageData> = new Map();
export const annotationsStore: Map<string, AnnotationData[]> = new Map();
export const sharesStore: Map<string, ShareData> = new Map();
export const shortIdToShareId: Map<string, string> = new Map();

let saveTimer: NodeJS.Timeout | null = null;
export function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data: PersistedData = {
        images: Array.from(imagesStore.entries()),
        annotations: Array.from(annotationsStore.entries()),
        shares: Array.from(sharesStore.entries()),
        shortIdMap: Array.from(shortIdToShareId.entries()),
      };
      fs.writeFileSync(persistFile, JSON.stringify(data), 'utf8');
    } catch (e) {
      console.error('Persist failed:', e);
    }
  }, 200);
}

export function loadPersisted() {
  try {
    if (!fs.existsSync(persistFile)) return;
    const raw = fs.readFileSync(persistFile, 'utf8');
    const data: PersistedData = JSON.parse(raw);
    data.images.forEach(([k, v]) => imagesStore.set(k, v));
    data.annotations.forEach(([k, v]) => annotationsStore.set(k, v));
    data.shares.forEach(([k, v]) => sharesStore.set(k, v));
    data.shortIdMap.forEach(([k, v]) => shortIdToShareId.set(k, v));
  } catch (e) {
    console.error('Load persisted failed:', e);
  }
}

loadPersisted();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = uuidv4();
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PNG、JPEG、WebP 格式图片'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const SHORT_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SHORT_LENGTH = 7;
const MAX_SHORT_ATTEMPTS = 50;

export function generateShortId(): string {
  for (let i = 0; i < MAX_SHORT_ATTEMPTS; i++) {
    let id = '';
    for (let j = 0; j < SHORT_LENGTH; j++) {
      id += SHORT_CHARS[Math.floor(Math.random() * SHORT_CHARS.length)];
    }
    if (!shortIdToShareId.has(id)) return id;
  }
  let fallback = uuidv4().slice(0, SHORT_LENGTH);
  let n = 0;
  while (shortIdToShareId.has(fallback)) {
    fallback = `${uuidv4().slice(0, SHORT_LENGTH - 2)}${n++}`;
  }
  return fallback;
}

export function compressAnnotations(annotations: AnnotationData[]): any[] {
  return annotations.map((a) => {
    const compressed: any = {
      _t: a.type[0],
      _x: Math.round(a.x * 100) / 100,
      _y: Math.round(a.y * 100) / 100,
      _w: Math.round(a.width * 100) / 100,
      _h: Math.round(a.height * 100) / 100,
      _c: a.color,
      _s: a.strokeWidth,
    };
    if (a.points) {
      compressed._p = a.points.map((p) => [
        Math.round(p.x * 100) / 100,
        Math.round(p.y * 100) / 100,
      ]);
    }
    if (a.note) compressed._n = a.note;
    compressed._id = a.id;
    return compressed;
  });
}

export function decompressAnnotations(compressed: any[]): AnnotationData[] {
  const typeMap: Record<string, AnnotationData['type']> = {
    r: 'rectangle', c: 'circle', a: 'arrow', b: 'brush',
  };
  return compressed.map((c) => ({
    id: c._id,
    type: typeMap[c._t] || 'rectangle',
    x: c._x,
    y: c._y,
    width: c._w,
    height: c._h,
    points: c._p ? c._p.map((p: number[]) => ({ x: p[0], y: p[1] })) : undefined,
    color: c._c,
    strokeWidth: c._s,
    note: c._n,
  }));
}

app.post('/api/images', upload.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '未上传图片' });
      return;
    }
    const id = path.parse(req.file.filename).name;
    const imageData: ImageData = {
      id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      createdAt: Date.now(),
    };
    imagesStore.set(id, imageData);
    annotationsStore.set(id, []);
    persist();
    res.json(imageData);
  } catch (err) {
    res.status(500).json({ error: '上传失败' });
  }
});

app.get('/api/images', (_req: Request, res: Response) => {
  const images = Array.from(imagesStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json(images);
});

app.get('/api/images/:id', (req: Request, res: Response) => {
  const image = imagesStore.get(req.params.id);
  if (!image) {
    res.status(404).json({ error: '图片不存在' });
    return;
  }
  res.json(image);
});

app.get('/api/images/:id/annotations', (req: Request, res: Response) => {
  const annotations = annotationsStore.get(req.params.id) || [];
  res.json(annotations);
});

app.put('/api/images/:id/annotations', (req: Request, res: Response) => {
  if (!imagesStore.has(req.params.id)) {
    res.status(404).json({ error: '图片不存在' });
    return;
  }
  const annotations: AnnotationData[] = req.body.annotations || [];
  annotationsStore.set(req.params.id, annotations);
  persist();
  res.json({ success: true });
});

app.post('/api/share', (req: Request, res: Response) => {
  const { imageId, annotations } = req.body;
  if (!imageId || !imagesStore.has(imageId)) {
    res.status(400).json({ error: '无效的图片ID' });
    return;
  }
  const shareId = uuidv4();
  const shortId = generateShortId();
  const shareData: ShareData = {
    id: shareId,
    shortId,
    imageId,
    annotations: annotations || [],
    createdAt: Date.now(),
  };
  sharesStore.set(shareId, shareData);
  shortIdToShareId.set(shortId, shareId);
  persist();
  res.json({ shareId, shortId, shareUrl: `/s/${shortId}` });
});

app.get('/api/share/:id', (req: Request, res: Response) => {
  let share: ShareData | undefined;
  if (req.params.id.length === SHORT_LENGTH) {
    const fullId = shortIdToShareId.get(req.params.id);
    share = fullId ? sharesStore.get(fullId) : undefined;
  } else {
    share = sharesStore.get(req.params.id);
  }
  if (!share) {
    res.status(404).json({ error: '分享链接不存在或已过期' });
    return;
  }
  const image = imagesStore.get(share.imageId);
  if (!image) {
    res.status(404).json({ error: '关联图片不存在' });
    return;
  }
  res.json({ image, annotations: share.annotations });
});

app.get(['/s/:shortId', '/share/:id', '/annotate/:id'], (req, res) => {
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
});

app.get('*', (_req, res) => {
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
