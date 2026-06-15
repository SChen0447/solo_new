import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import type { AudioFile, ApiResponse } from '../shared/types.js';
import { ensureDirectories, saveAudioFile as saveAudioToDisk, AUDIO_FILES_PATH } from './storage.js';
import { saveAudioFile as saveAudioMetadata } from './annotationService.js';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave'];
    const allowedExtensions = ['.mp3', '.wav'];
    const ext = file.originalname.toLowerCase().slice(-4);
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持MP3和WAV格式'));
    }
  },
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response<ApiResponse<AudioFile>>) => {
  try {
    await ensureDirectories();

    if (!req.file) {
      return res.status(400).json({ success: false, error: '未上传文件' });
    }

    const { duration } = req.body;
    const audioDuration = duration ? parseFloat(duration) : 0;

    const originalName = req.file.originalname;
    const ext = originalName.toLowerCase().slice(-3) as 'mp3' | 'wav';
    const format = ext === 'mp3' ? 'mp3' : 'wav';
    
    const audioId = uuidv4();
    const filePath = await saveAudioToDisk(audioId, format, req.file.buffer);

    const audioFile: AudioFile = {
      id: audioId,
      name: originalName,
      duration: audioDuration,
      size: req.file.size,
      format,
      createdAt: new Date().toISOString(),
      filePath,
    };

    await saveAudioMetadata(audioFile);

    res.json({ success: true, data: audioFile });
  } catch (error) {
    console.error('上传失败:', error);
    const message = error instanceof Error ? error.message : '上传失败';
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/audio/:id', async (req: Request, res: Response<ApiResponse<AudioFile>>) => {
  try {
    const { id } = req.params;
    const { getAudioFileById } = await import('./annotationService.js');
    const audioFile = await getAudioFileById(id);

    if (!audioFile) {
      return res.status(404).json({ success: false, error: '音频文件不存在' });
    }

    res.json({ success: true, data: audioFile });
  } catch (error) {
    console.error('获取音频信息失败:', error);
    res.status(500).json({ success: false, error: '获取音频信息失败' });
  }
});

router.get('/audio/:id/stream', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { getAudioFileById } = await import('./annotationService.js');
    const audioFile = await getAudioFileById(id);

    if (!audioFile) {
      return res.status(404).json({ success: false, error: '音频文件不存在' });
    }

    const { readAudioFile } = await import('./storage.js');
    const buffer = await readAudioFile(audioFile.filePath);
    
    const contentType = audioFile.format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', audioFile.size.toString());
    res.setHeader('Accept-Ranges', 'bytes');
    
    res.send(buffer);
  } catch (error) {
    console.error('流式播放失败:', error);
    res.status(500).json({ success: false, error: '流式播放失败' });
  }
});

export default router;
