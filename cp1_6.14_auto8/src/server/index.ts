import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'achievements.json');

app.use(cors());
app.use(express.json());

interface Achievement {
  id: string;
  gameName: string;
  achievementName: string;
  description: string;
  platform: 'Steam' | 'Xbox' | 'PlayStation' | 'Nintendo';
  unlockDate: string;
  difficulty: number;
  unlocked: boolean;
  createdAt: string;
}

function ensureDataFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readAchievements(): Achievement[] {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeAchievements(data: Achievement[]): void {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/achievements', (_req, res) => {
  try {
    const achievements = readAchievements();
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read achievements' });
  }
});

app.post('/api/achievements', (req, res) => {
  try {
    const achievements = readAchievements();
    const newAchievement: Achievement = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      gameName: req.body.gameName || '',
      achievementName: req.body.achievementName || '',
      description: req.body.description || '',
      platform: req.body.platform || 'Steam',
      unlockDate: req.body.unlockDate || new Date().toISOString().slice(0, 10),
      difficulty: Math.min(5, Math.max(1, Number(req.body.difficulty) || 1)),
      unlocked: req.body.unlocked !== undefined ? req.body.unlocked : true,
      createdAt: new Date().toISOString(),
    };
    achievements.unshift(newAchievement);
    writeAchievements(achievements);
    res.status(201).json(newAchievement);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create achievement' });
  }
});

app.delete('/api/achievements/:id', (req, res) => {
  try {
    const achievements = readAchievements();
    const index = achievements.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Achievement not found' });
      return;
    }
    const removed = achievements.splice(index, 1)[0];
    writeAchievements(achievements);
    res.json(removed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
});

app.patch('/api/achievements/:id', (req, res) => {
  try {
    const achievements = readAchievements();
    const index = achievements.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Achievement not found' });
      return;
    }
    achievements[index] = { ...achievements[index], ...req.body, id: achievements[index].id };
    writeAchievements(achievements);
    res.json(achievements[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update achievement' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
