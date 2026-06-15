import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Artwork, VersionSnapshot } from '../types';

const app = express();
const PORT = 3001;

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const uploadsDir = path.join(__dirname, '../../uploads');
const dataDir = path.join(__dirname, '../../data');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dataFile = path.join(dataDir, 'artworks.json');

const loadData = (): Artwork[] => {
  if (!fs.existsSync(dataFile)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(dataFile, 'utf-8');
    return JSON.parse(raw) as Artwork[];
  } catch {
    return [];
  }
};

const saveData = (artworks: Artwork[]) => {
  fs.writeFileSync(dataFile, JSON.stringify(artworks, null, 2));
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG are allowed'));
    }
  },
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ url: imageUrl, filename: req.file.originalname });
});

app.get('/api/artworks', (_req, res) => {
  const artworks = loadData();
  res.json(artworks);
});

app.post('/api/artworks', (req, res) => {
  const artworks = loadData();
  const { name, originalImageUrl } = req.body;
  const newArtwork: Artwork = {
    id: uuidv4(),
    name,
    createdAt: Date.now(),
    originalImageUrl,
    versions: [],
  };
  artworks.push(newArtwork);
  saveData(artworks);
  res.json(newArtwork);
});

app.get('/api/artworks/:id', (req, res) => {
  const artworks = loadData();
  const artwork = artworks.find((a) => a.id === req.params.id);
  if (!artwork) {
    res.status(404).json({ error: 'Artwork not found' });
    return;
  }
  res.json(artwork);
});

app.delete('/api/artworks/:id', (req, res) => {
  let artworks = loadData();
  artworks = artworks.filter((a) => a.id !== req.params.id);
  saveData(artworks);
  res.json({ success: true });
});

app.get('/api/artworks/:artworkId/versions', (req, res) => {
  const artworks = loadData();
  const artwork = artworks.find((a) => a.id === req.params.artworkId);
  if (!artwork) {
    res.status(404).json({ error: 'Artwork not found' });
    return;
  }
  res.json(artwork.versions);
});

app.post('/api/artworks/:artworkId/versions', (req, res) => {
  const artworks = loadData();
  const artwork = artworks.find((a) => a.id === req.params.artworkId);
  if (!artwork) {
    res.status(404).json({ error: 'Artwork not found' });
    return;
  }
  const newVersion: VersionSnapshot = {
    id: uuidv4(),
    artworkId: req.params.artworkId,
    name: req.body.name || `版本 ${artwork.versions.length + 1}`,
    createdAt: Date.now(),
    imageUrl: req.body.imageUrl,
    annotations: req.body.annotations || [],
    thumbnail: req.body.thumbnail || '',
  };
  artwork.versions.push(newVersion);
  saveData(artworks);
  res.json(newVersion);
});

app.put('/api/artworks/:artworkId/versions/:versionId', (req, res) => {
  const artworks = loadData();
  const artwork = artworks.find((a) => a.id === req.params.artworkId);
  if (!artwork) {
    res.status(404).json({ error: 'Artwork not found' });
    return;
  }
  const versionIndex = artwork.versions.findIndex((v) => v.id === req.params.versionId);
  if (versionIndex === -1) {
    res.status(404).json({ error: 'Version not found' });
    return;
  }
  artwork.versions[versionIndex] = {
    ...artwork.versions[versionIndex],
    ...req.body,
  };
  saveData(artworks);
  res.json(artwork.versions[versionIndex]);
});

app.delete('/api/artworks/:artworkId/versions/:versionId', (req, res) => {
  const artworks = loadData();
  const artwork = artworks.find((a) => a.id === req.params.artworkId);
  if (!artwork) {
    res.status(404).json({ error: 'Artwork not found' });
    return;
  }
  artwork.versions = artwork.versions.filter((v) => v.id !== req.params.versionId);
  saveData(artworks);
  res.json({ success: true });
});

app.get('/api/artworks/:artworkId/versions/:versionId', (req, res) => {
  const artworks = loadData();
  const artwork = artworks.find((a) => a.id === req.params.artworkId);
  if (!artwork) {
    res.status(404).json({ error: 'Artwork not found' });
    return;
  }
  const version = artwork.versions.find((v) => v.id === req.params.versionId);
  if (!version) {
    res.status(404).json({ error: 'Version not found' });
    return;
  }
  res.json(version);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
