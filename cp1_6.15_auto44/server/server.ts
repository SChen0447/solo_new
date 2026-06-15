import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3001;

app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4().slice(0, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

interface ImageAnalysis {
  id: string;
  filename: string;
  width: number;
  height: number;
  visualCenter: { x: number; y: number };
  subjectRatio: number;
}

async function analyzeImage(filepath: string, filename: string): Promise<ImageAnalysis> {
  const image = sharp(filepath);
  const metadata = await image.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  const { data, info } = await image
    .resize(200, 200, { fit: 'inside' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = info.width * info.height;
  let sumX = 0;
  let sumY = 0;
  let weightSum = 0;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = y * info.width + x;
      const val = data[idx];
      const weight = val;
      sumX += x * weight;
      sumY += y * weight;
      weightSum += weight;
    }
  }

  const vcx = weightSum > 0 ? sumX / weightSum / info.width : 0.5;
  const vcy = weightSum > 0 ? sumY / weightSum / info.height : 0.5;

  const { data: edgeData, info: edgeInfo } = await image
    .resize(200, 200, { fit: 'inside' })
    .grayscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const edgePixels = edgeInfo.width * edgeInfo.height;
  let edgeCount = 0;
  for (let i = 0; i < edgePixels; i++) {
    if (edgeData[i] > 30) edgeCount++;
  }

  const subjectRatio = Math.min(edgeCount / Math.max(edgePixels, 1) * 4, 1);

  return {
    id: uuidv4().slice(0, 8),
    filename,
    width,
    height,
    visualCenter: { x: Math.round(vcx * 100) / 100, y: Math.round(vcy * 100) / 100 },
    subjectRatio: Math.round(subjectRatio * 100) / 100,
  };
}

app.post('/api/upload', upload.array('images', 12), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const features: ImageAnalysis[] = [];
    for (const file of files) {
      const analysis = await analyzeImage(file.path, file.filename);
      features.push(analysis);
    }

    res.json({ features });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/api/export', async (req, res) => {
  try {
    const { cells, images } = req.body;
    if (!cells || !images) {
      res.status(400).json({ error: 'Missing layout data' });
      return;
    }

    const canvasWidth = 1200;
    const canvasHeight = 1600;

    const composites: sharp.OverlayOptions[] = [];
    for (const cell of cells) {
      const img = images.find((i: any) => i.id === cell.imageId);
      if (!img) continue;

      const imgPath = path.join(uploadDir, path.basename(img.url));
      if (!fs.existsSync(imgPath)) continue;

      const scaleX = canvasWidth / 800;
      const scaleY = canvasHeight / 600;

      try {
        const resized = await sharp(imgPath)
          .resize(
            Math.round(cell.width * scaleX),
            Math.round(cell.height * scaleY),
            { fit: 'inside', background: { r: 240, g: 240, b: 240 } }
          )
          .png()
          .toBuffer();

        composites.push({
          input: resized,
          left: Math.round(cell.x * scaleX),
          top: Math.round(cell.y * scaleY),
        });
      } catch {}
    }

    const canvas = sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    });

    const pdfBuffer = await canvas
      .composite(composites)
      .jpeg({ quality: 90 })
      .toBuffer();

    res.contentType('image/jpeg');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

const inviteCodes = new Map<string, { userId: string; createdAt: number }>();

app.post('/api/invite', (req, res) => {
  const { userId } = req.body;
  const code = uuidv4().slice(0, 6).toUpperCase();
  inviteCodes.set(code, { userId, createdAt: Date.now() });
  res.json({ code });
});

app.post('/api/invite/join', (req, res) => {
  const { code, userId, userName } = req.body;
  const invite = inviteCodes.get(code);
  if (!invite) {
    res.status(404).json({ error: 'Invalid invite code' });
    return;
  }
  res.json({ success: true, inviter: invite.userId });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientInfo {
  userId: string;
  userName: string;
  color: string;
  ws: WebSocket;
}

const clients = new Map<string, ClientInfo>();
const collabColors = ['#646cff', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];

wss.on('connection', (ws) => {
  let clientId = '';

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'join') {
        clientId = data.userId;
        const colorIndex = clients.size % collabColors.length;
        const clientInfo: ClientInfo = {
          userId: data.userId,
          userName: data.userName || '匿名',
          color: collabColors[colorIndex],
          ws,
        };
        clients.set(clientId, clientInfo);

        const joinMsg = JSON.stringify({
          type: 'join',
          userId: data.userId,
          userName: data.userName,
          color: clientInfo.color,
        });

        clients.forEach((c) => {
          if (c.ws !== ws && c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(joinMsg);
            ws.send(
              JSON.stringify({
                type: 'join',
                userId: c.userId,
                userName: c.userName,
                color: c.color,
              })
            );
          }
        });
      }

      if (data.type === 'cursor') {
        const broadcast = JSON.stringify({
          type: 'cursor',
          userId: data.userId,
          cursor: data.cursor,
        });
        clients.forEach((c) => {
          if (c.ws !== ws && c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(broadcast);
          }
        });
      }
    } catch {}
  });

  ws.on('close', () => {
    if (clientId) {
      const leaveMsg = JSON.stringify({
        type: 'leave',
        userId: clientId,
      });
      clients.delete(clientId);
      clients.forEach((c) => {
        if (c.ws.readyState === WebSocket.OPEN) {
          c.ws.send(leaveMsg);
        }
      });
    }
  });
});
