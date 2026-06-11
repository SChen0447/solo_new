import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export interface AudioFileMetadata {
  id: string;
  name: string;
  size: number;
  duration: number;
  url: string;
  uploadedAt: number;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  }
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['audio/mpeg', 'audio/mp3'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 MP3 格式的音频文件'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

const metadataFile = path.join(__dirname, '..', 'uploads', 'metadata.json');

const loadMetadata = (): Record<string, AudioFileMetadata> => {
  if (fs.existsSync(metadataFile)) {
    try {
      return JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
};

const saveMetadata = (metadata: Record<string, AudioFileMetadata>) => {
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
};

export const saveFileMetadata = (file: Express.Multer.File, duration: number): AudioFileMetadata => {
  const metadata = loadMetadata();
  const id = path.basename(file.filename, path.extname(file.filename));
  const fileMetadata: AudioFileMetadata = {
    id,
    name: file.originalname,
    size: file.size,
    duration,
    url: `/uploads/${file.filename}`,
    uploadedAt: Date.now()
  };
  metadata[id] = fileMetadata;
  saveMetadata(metadata);
  return fileMetadata;
};

export const getAllFiles = (): AudioFileMetadata[] => {
  const metadata = loadMetadata();
  return Object.values(metadata).sort((a, b) => b.uploadedAt - a.uploadedAt);
};

export const getFileById = (id: string): AudioFileMetadata | null => {
  const metadata = loadMetadata();
  return metadata[id] || null;
};

export const getFilePath = (filename: string): string => {
  return path.join(uploadDir, filename);
};
