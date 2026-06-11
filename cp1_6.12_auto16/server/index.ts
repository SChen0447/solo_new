import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { upload, saveFileMetadata, getAllFiles, getFileById, getFilePath, AudioFileMetadata } from './fileHandler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

let filesCache: Record<string, { path: string; metadata: AudioFileMetadata }> = {};

app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未上传文件' });
    }

    let duration = 0;
    try {
      duration = await estimateDuration(req.file.path);
    } catch (e) {
      duration = 0;
    }

    const metadata = saveFileMetadata(req.file, duration);
    filesCache[metadata.id] = {
      path: req.file.path,
      metadata
    };

    res.json({ success: true, data: metadata });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    });
  }
});

app.get('/api/files', (_req, res) => {
  try {
    const files = getAllFiles();
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取文件列表失败'
    });
  }
});

app.get('/api/files/:id', (req, res) => {
  try {
    const file = getFileById(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }

    const filename = path.basename(file.url);
    const filePath = getFilePath(filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg'
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取文件失败'
    });
  }
});

async function estimateDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    ffprobe.on('close', (code: number) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 0 : duration);
      } else {
        resolve(0);
      }
    });

    ffprobe.on('error', () => {
      resolve(0);
    });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
