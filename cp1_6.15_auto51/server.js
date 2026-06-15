import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const JWT_SECRET = 'avatar-studio-secret-key-2024';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DATA_FILE = path.join(dataDir, 'avatars.json');
const USERS_FILE = path.join(dataDir, 'users.json');

function readData(file) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading data file:', e);
  }
  return [];
}

function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/auth/login', (req, res) => {
  const { nickname, password } = req.body;
  if (!nickname || !password) {
    return res.status(400).json({ error: 'Nickname and password are required' });
  }
  const users = readData(USERS_FILE);
  let user = users.find(u => u.nickname === nickname);
  if (!user) {
    user = { id: uuidv4(), nickname, password, createdAt: new Date().toISOString() };
    users.push(user);
    writeData(USERS_FILE, users);
  }
  const token = jwt.sign({ id: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, nickname: user.nickname } });
});

app.post('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: { id: req.user.id, nickname: req.user.nickname } });
});

app.post('/api/avatars', authMiddleware, async (req, res) => {
  const { components, author } = req.body;
  if (!components) {
    return res.status(400).json({ error: 'Components data is required' });
  }
  const avatarId = uuidv4();
  const thumbnailFilename = `${avatarId}.png`;
  const thumbnailPath = path.join(uploadsDir, thumbnailFilename);

  try {
    const svgString = generateAvatarSVG(components);
    const svgBuffer = Buffer.from(svgString);
    await sharp(svgBuffer)
      .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(thumbnailPath);
  } catch (e) {
    console.error('Error generating thumbnail:', e);
    const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#16213e"/><text x="60" y="65" text-anchor="middle" fill="#e94560" font-size="40">?</text></svg>`;
    await sharp(Buffer.from(placeholderSvg)).png().toFile(thumbnailPath);
  }

  const avatar = {
    id: avatarId,
    components,
    author: author || req.user.nickname,
    userId: req.user.id,
    thumbnailUrl: `/uploads/${thumbnailFilename}`,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const avatars = readData(DATA_FILE);
  avatars.push(avatar);
  writeData(DATA_FILE, avatars);

  res.status(201).json(avatar);
});

app.get('/api/avatars', (req, res) => {
  const { page = 1, limit = 12 } = req.query;
  const avatars = readData(DATA_FILE);
  const sorted = [...avatars].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const start = (Number(page) - 1) * Number(limit);
  const paginated = sorted.slice(start, start + Number(limit));
  const result = paginated.map(a => ({
    ...a,
    likes: a.likes?.length || 0,
    comments: a.comments?.length || 0,
  }));
  res.json({ avatars: result, total: avatars.length, page: Number(page), limit: Number(limit) });
});

app.get('/api/avatars/:id', (req, res) => {
  const avatars = readData(DATA_FILE);
  const avatar = avatars.find(a => a.id === req.params.id);
  if (!avatar) return res.status(404).json({ error: 'Avatar not found' });
  res.json(avatar);
});

app.put('/api/avatars/:id', authMiddleware, async (req, res) => {
  const avatars = readData(DATA_FILE);
  const idx = avatars.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Avatar not found' });
  if (avatars[idx].userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { components } = req.body;
  if (components) {
    avatars[idx].components = components;
    avatars[idx].updatedAt = new Date().toISOString();

    try {
      const svgString = generateAvatarSVG(components);
      const thumbnailPath = path.join(uploadsDir, `${avatars[idx].id}.png`);
      await sharp(Buffer.from(svgString))
        .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(thumbnailPath);
    } catch (e) {
      console.error('Error regenerating thumbnail:', e);
    }
  }

  writeData(DATA_FILE, avatars);
  res.json(avatars[idx]);
});

app.delete('/api/avatars/:id', authMiddleware, (req, res) => {
  let avatars = readData(DATA_FILE);
  const idx = avatars.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Avatar not found' });
  if (avatars[idx].userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const thumbnailPath = path.join(uploadsDir, `${avatars[idx].id}.png`);
  try { fs.unlinkSync(thumbnailPath); } catch (e) {}

  avatars.splice(idx, 1);
  writeData(DATA_FILE, avatars);
  res.json({ success: true });
});

app.post('/api/avatars/:id/like', authMiddleware, (req, res) => {
  const avatars = readData(DATA_FILE);
  const avatar = avatars.find(a => a.id === req.params.id);
  if (!avatar) return res.status(404).json({ error: 'Avatar not found' });

  if (!avatar.likes) avatar.likes = [];
  const userId = req.user.id;
  const likeIdx = avatar.likes.indexOf(userId);
  if (likeIdx > -1) {
    avatar.likes.splice(likeIdx, 1);
  } else {
    avatar.likes.push(userId);
  }

  writeData(DATA_FILE, avatars);
  res.json({ likes: avatar.likes.length, liked: likeIdx === -1 });
});

app.post('/api/avatars/:id/comments', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment content is required' });

  const avatars = readData(DATA_FILE);
  const avatar = avatars.find(a => a.id === req.params.id);
  if (!avatar) return res.status(404).json({ error: 'Avatar not found' });

  if (!avatar.comments) avatar.comments = [];
  const comment = {
    id: uuidv4(),
    userId: req.user.id,
    username: req.user.nickname,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  avatar.comments.unshift(comment);

  writeData(DATA_FILE, avatars);
  res.status(201).json(comment);
});

app.get('/api/users/:id/avatars', (req, res) => {
  const avatars = readData(DATA_FILE);
  const userAvatars = avatars.filter(a => a.userId === req.params.id);
  res.json(userAvatars);
});

function generateAvatarSVG(components) {
  const c = components || {};
  const headColor = c.headColor || '#fdbcb4';
  const eyeColor = c.eyeColor || '#2c3e50';
  const browColor = c.browColor || '#5d4037';
  const noseColor = c.noseColor || '#e8a88a';
  const mouthColor = c.mouthColor || '#e74c3c';
  const hairColor = c.hairColor || '#3e2723';
  const topColor = c.topColor || '#4a90d9';
  const bottomColor = c.bottomColor || '#2c3e50';
  const accColor = c.accColor || '#f1c40f';

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">`;

  const headShapes = [
    `<ellipse cx="128" cy="110" rx="72" ry="82" fill="${headColor}"/>`,
    `<rect x="56" y="28" width="144" height="164" rx="72" fill="${headColor}"/>`,
    `<ellipse cx="128" cy="108" rx="78" ry="76" fill="${headColor}"/>`,
    `<path d="M128 24 C68 24 40 80 40 120 C40 168 76 192 128 192 C180 192 216 168 216 120 C216 80 188 24 128 24Z" fill="${headColor}"/>`,
    `<path d="M128 20 C60 20 48 76 48 116 C48 160 80 196 128 196 C176 196 208 160 208 116 C208 76 196 20 128 20Z" fill="${headColor}"/>`,
  ];
  svg += headShapes[c.headShape || 0];

  const ears = `<ellipse cx="52" cy="108" rx="12" ry="18" fill="${headColor}"/><ellipse cx="204" cy="108" rx="12" ry="18" fill="${headColor}"/>`;
  svg += ears;

  const eyes = [
    `<ellipse cx="100" cy="102" rx="14" ry="16" fill="white"/><ellipse cx="156" cy="102" rx="14" ry="16" fill="white"/><circle cx="102" cy="104" r="8" fill="${eyeColor}"/><circle cx="158" cy="104" r="8" fill="${eyeColor}"/><circle cx="104" cy="100" r="3" fill="white"/><circle cx="160" cy="100" r="3" fill="white"/>`,
    `<path d="M86 98 Q100 88 114 98" stroke="${eyeColor}" stroke-width="4" fill="none"/><path d="M142 98 Q156 88 170 98" stroke="${eyeColor}" stroke-width="4" fill="none"/>`,
    `<ellipse cx="100" cy="102" rx="18" ry="12" fill="white"/><ellipse cx="156" cy="102" rx="18" ry="12" fill="white"/><circle cx="100" cy="102" r="7" fill="${eyeColor}"/><circle cx="156" cy="102" r="7" fill="${eyeColor}"/>`,
    `<path d="M86 94 L114 94 L114 108 Q100 118 86 108 Z" fill="white"/><path d="M142 94 L170 94 L170 108 Q156 118 142 108 Z" fill="white"/><circle cx="100" cy="102" r="6" fill="${eyeColor}"/><circle cx="156" cy="102" r="6" fill="${eyeColor}"/>`,
    `<line x1="86" y1="100" x2="114" y2="100" stroke="${eyeColor}" stroke-width="5" stroke-linecap="round"/><line x1="142" y1="100" x2="170" y2="100" stroke="${eyeColor}" stroke-width="5" stroke-linecap="round"/>`,
  ];
  svg += eyes[c.eyes || 0];

  const brows = [
    `<path d="M86 86 Q100 78 114 84" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M142 84 Q156 78 170 86" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<path d="M86 84 L114 84" stroke="${browColor}" stroke-width="4" stroke-linecap="round"/><path d="M142 84 L170 84" stroke="${browColor}" stroke-width="4" stroke-linecap="round"/>`,
    `<path d="M86 88 Q100 76 114 82" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M142 82 Q156 76 170 88" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<path d="M86 82 Q100 90 114 86" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M142 86 Q156 90 170 82" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<path d="M86 86 Q100 74 114 80" stroke="${browColor}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M142 80 Q156 74 170 86" stroke="${browColor}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  ];
  svg += brows[c.brows || 0];

  const noses = [
    `<path d="M124 112 Q128 124 132 112" stroke="${noseColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<circle cx="128" cy="118" r="4" fill="${noseColor}"/>`,
    `<path d="M122 116 Q128 126 134 116" stroke="${noseColor}" stroke-width="2" fill="none"/>`,
    `<line x1="128" y1="108" x2="128" y2="120" stroke="${noseColor}" stroke-width="2.5" stroke-linecap="round"/><circle cx="124" cy="122" r="2" fill="${noseColor}"/><circle cx="132" cy="122" r="2" fill="${noseColor}"/>`,
    `<path d="M124 114 Q128 126 132 114" stroke="${noseColor}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ];
  svg += noses[c.nose || 0];

  const mouths = [
    `<path d="M108 138 Q128 156 148 138" stroke="${mouthColor}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    `<path d="M108 136 Q128 150 148 136" fill="${mouthColor}"/><path d="M108 136 Q128 142 148 136" fill="#c0392b"/>`,
    `<ellipse cx="128" cy="140" rx="12" ry="8" fill="${mouthColor}"/>`,
    `<path d="M108 140 L148 140" stroke="${mouthColor}" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M108 140 Q118 150 128 140 Q138 130 148 140" stroke="${mouthColor}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ];
  svg += mouths[c.mouth || 0];

  const hairs = [
    `<path d="M56 80 Q56 20 128 20 Q200 20 200 80 L200 70 Q200 28 128 28 Q56 28 56 70 Z" fill="${hairColor}"/><path d="M48 86 Q48 16 128 16 Q208 16 208 86 L208 76 Q208 20 128 20 Q48 20 48 76 Z" fill="${hairColor}"/>`,
    `<path d="M52 90 Q52 22 128 22 Q204 22 204 90" fill="${hairColor}"/><path d="M52 90 Q80 70 100 90 Q120 70 140 90 Q160 70 180 90 Q204 70 204 90" fill="${hairColor}"/>`,
    `<path d="M56 78 Q56 18 128 18 Q200 18 200 78" fill="${hairColor}"/><rect x="192" y="40" width="24" height="100" rx="12" fill="${hairColor}"/>`,
    `<path d="M56 82 Q56 24 128 24 Q200 24 200 82" fill="${hairColor}"/><path d="M52 82 C60 82 64 60 80 55 C70 72 76 82 92 80 C82 68 86 50 104 46 C96 64 100 78 116 76 C108 60 110 42 128 38 C146 42 148 60 140 76 C156 78 160 64 152 46 C170 50 174 68 164 80 C180 82 186 72 176 55 C192 60 196 82 204 82 Q204 24 128 24 Q56 24 52 82Z" fill="${hairColor}"/>`,
    `<path d="M56 80 Q56 16 128 16 Q200 16 200 80" fill="${hairColor}"/><rect x="44" y="40" width="24" height="120" rx="12" fill="${hairColor}"/><rect x="188" y="40" width="24" height="120" rx="12" fill="${hairColor}"/>`,
  ];
  svg += hairs[c.hair || 0];

  const tops = [
    `<path d="M60 196 Q60 180 88 172 Q108 166 128 166 Q148 166 168 172 Q196 180 196 196 L196 256 L60 256 Z" fill="${topColor}"/>`,
    `<path d="M60 196 Q60 180 88 172 Q108 166 128 166 Q148 166 168 172 Q196 180 196 196 L196 256 L60 256 Z" fill="${topColor}"/><line x1="128" y1="166" x2="128" y2="256" stroke="rgba(0,0,0,0.15)" stroke-width="2"/><circle cx="128" cy="186" r="4" fill="#f1c40f"/>`,
    `<path d="M60 196 Q60 180 88 172 Q108 166 128 166 Q148 166 168 172 Q196 180 196 196 L196 256 L60 256 Z" fill="${topColor}"/><path d="M88 172 L68 210 L96 210 Z" fill="${topColor}" opacity="0.8"/><path d="M168 172 L188 210 L160 210 Z" fill="${topColor}" opacity="0.8"/>`,
    `<path d="M60 196 Q60 180 88 172 Q108 166 128 166 Q148 166 168 172 Q196 180 196 196 L196 256 L60 256 Z" fill="${topColor}"/><path d="M80 196 Q128 176 176 196" stroke="rgba(255,255,255,0.3)" stroke-width="3" fill="none"/>`,
    `<path d="M56 196 Q56 178 86 170 Q108 164 128 164 Q148 164 170 170 Q200 178 200 196 L200 256 L56 256 Z" fill="${topColor}"/><rect x="112" y="168" width="32" height="8" rx="4" fill="rgba(255,255,255,0.2)"/>`,
  ];
  svg += tops[c.top || 0];

  const bottoms = [
    `<rect x="60" y="244" width="56" height="12" rx="4" fill="${bottomColor}"/><rect x="140" y="244" width="56" height="12" rx="4" fill="${bottomColor}"/>`,
    `<rect x="68" y="242" width="120" height="14" rx="4" fill="${bottomColor}"/>`,
    `<path d="M68 240 L68 256 L120 256 L120 240 Z" fill="${bottomColor}"/><path d="M136 240 L136 256 L188 256 L188 240 Z" fill="${bottomColor}"/>`,
    `<rect x="64" y="242" width="128" height="14" rx="4" fill="${bottomColor}"/><line x1="128" y1="242" x2="128" y2="256" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>`,
    `<rect x="66" y="241" width="124" height="15" rx="5" fill="${bottomColor}"/><circle cx="128" cy="248" r="3" fill="rgba(255,255,255,0.3)"/>`,
  ];
  svg += bottoms[c.bottom || 0];

  const accessories = [
    ``,
    `<circle cx="100" cy="102" r="20" fill="none" stroke="${accColor}" stroke-width="3"/><circle cx="156" cy="102" r="20" fill="none" stroke="${accColor}" stroke-width="3"/><line x1="120" y1="100" x2="136" y2="100" stroke="${accColor}" stroke-width="3"/>`,
    `<path d="M80 74 Q128 56 176 74" fill="none" stroke="${accColor}" stroke-width="4" stroke-linecap="round"/><circle cx="80" cy="74" r="5" fill="${accColor}"/><circle cx="176" cy="74" r="5" fill="${accColor}"/>`,
    `<circle cx="128" cy="132" r="8" fill="${accColor}"/><line x1="128" y1="124" x2="128" y2="118" stroke="${accColor}" stroke-width="2"/>`,
    `<path d="M60 90 Q40 100 44 120" stroke="${accColor}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M196 90 Q216 100 212 120" stroke="${accColor}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ];
  svg += accessories[c.accessory || 0];

  svg += `</svg>`;
  return svg;
}

app.listen(PORT, () => {
  console.log(`Avatar Studio API server running on http://localhost:${PORT}`);
});
