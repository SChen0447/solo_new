import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'recordings.json');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

let recordingsDB = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    recordingsDB = JSON.parse(data);
  } catch (e) {
    recordingsDB = [];
  }
}

const saveDB = () => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(recordingsDB, null, 2));
};

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.post('/api/recordings', upload.single('audio'), (req, res) => {
  try {
    const { mood, note, duration, avgDb, timestamp } = req.body;
    const id = uuidv4();
    const recording = {
      id,
      mood: mood || 'calm',
      note: note || '',
      duration: parseFloat(duration) || 0,
      avgDb: parseFloat(avgDb) || 0,
      timestamp: timestamp || new Date().toISOString(),
      filename: req.file ? req.file.filename : null,
      url: req.file ? `/uploads/${req.file.filename}` : null,
    };
    recordingsDB.unshift(recording);
    saveDB();
    res.json(recording);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/recordings', (req, res) => {
  res.json(recordingsDB);
});

app.get('/api/recordings/:id', (req, res) => {
  const recording = recordingsDB.find((r) => r.id === req.params.id);
  if (!recording) {
    return res.status(404).json({ error: 'Recording not found' });
  }
  res.json(recording);
});

app.delete('/api/recordings/:id', (req, res) => {
  const index = recordingsDB.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Recording not found' });
  }
  const deleted = recordingsDB[index];
  if (deleted.filename) {
    const filePath = path.join(UPLOAD_DIR, deleted.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  recordingsDB.splice(index, 1);
  saveDB();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
