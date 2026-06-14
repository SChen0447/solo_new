import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbFiles = {
  routes: path.join(DATA_DIR, 'routes.json'),
  activities: path.join(DATA_DIR, 'activities.json'),
  reports: path.join(DATA_DIR, 'reports.json'),
  profiles: path.join(DATA_DIR, 'profiles.json'),
  achievements: path.join(DATA_DIR, 'achievements.json')
};

function readDB(file) {
  try {
    if (!fs.existsSync(file)) return [];
    const data = fs.readFileSync(file, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeDB(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function seedData() {
  if (!fs.existsSync(dbFiles.routes) {
    const seedRoutes = [
      {
        id: 'r1',
        name: '西湖环山经典路线',
        waypoints: [
          { lat: 30.25918, lng: 120.13234, elevation: 25, type: 'start' },
          { lat: 30.24218, lng: 120.13834, elevation: 58, type: 'normal' },
          { lat: 30.23518, lng: 120.14834, elevation: 125, type: 'normal' },
          { lat: 30.22918, lng: 120.15834, elevation: 210, type: 'normal' },
          { lat: 30.22518, lng: 120.16834, elevation: 350, type: 'normal' },
          { lat: 30.23118, lng: 120.17834, elevation: 280, type: 'normal' },
          { lat: 30.23818, lng: 120.18834, elevation: 180, type: 'normal' },
          { lat: 30.24518, lng: 120.17834, elevation: 95, type: 'normal' },
          { lat: 30.25218, lng: 120.16834, elevation: 42, type: 'end' }
        ],
        markers: [
          { id: 'm1', lat: 30.23218, lng: 120.15234, type: 'water', name: '补给点1' },
          { id: 'm2', lat: 30.22818, lng: 120.16534, type: 'photo', name: '山顶观景台' }
        ],
        distance: 18.5,
        duration: 95,
        elevation: 420,
        difficulty: 3,
        createdAt: '2026-06-01T10:00:00Z'
      },
      {
        id: 'r2',
        name: '运河绿道休闲骑',
        waypoints: [
          { lat: 30.31918, lng: 120.14234, elevation: 15, type: 'start' },
          { lat: 30.32518, lng: 120.15234, elevation: 18, type: 'normal' },
          { lat: 30.33118, lng: 120.16234, elevation: 22, type: 'normal' },
          { lat: 30.33718, lng: 120.17234, elevation: 20, type: 'normal' },
          { lat: 30.34318, lng: 120.18234, elevation: 25, type: 'end' }
        ],
        markers: [
          { id: 'm3', lat: 30.33318, lng: 120.16634, type: 'photo', name: '运河古桥' }
        ],
        distance: 12.3,
        duration: 55,
        elevation: 45,
        difficulty: 1,
        createdAt: '2026-06-05T14:00:00Z'
      },
      {
        id: 'r3',
        name: '龙井爬坡挑战',
        waypoints: [
          { lat: 30.22518, lng: 120.11834, elevation: 30, type: 'start' },
          { lat: 30.22118, lng: 120.11534, elevation: 85, type: 'normal' },
          { lat: 30.21718, lng: 120.11234, elevation: 155, type: 'normal' },
          { lat: 30.21318, lng: 120.10934, elevation: 240, type: 'normal' },
          { lat: 30.20918, lng: 120.10634, elevation: 310, type: 'normal' },
          { lat: 30.20518, lng: 120.10334, elevation: 395, type: 'normal' },
          { lat: 30.20118, lng: 120.10034, elevation: 410, type: 'end' }
        ],
        markers: [
          { id: 'm4', lat: 30.21518, lng: 120.11034, type: 'water', name: '半山泉眼' },
          { id: 'm5', lat: 30.20318, lng: 120.10434, type: 'photo', name: '龙井茶园' }
        ],
        distance: 9.8,
        duration: 70,
        elevation: 520,
        difficulty: 4,
        createdAt: '2026-06-08T08:00:00Z'
      }
    ];
    writeDB(dbFiles.routes, seedRoutes);
  }

  if (!fs.existsSync(dbFiles.activities)) {
    const seedActivities = [
      {
        id: 'a1',
        name: '周末西湖环山游',
        routeId: 'r1',
        routeName: '西湖环山经典路线',
        startTime: '2026-06-15T07:00:00Z',
        meetingPoint: '少年宫广场',
        members: [
          { id: 'u1', nickname: '单车老王', speedLevel: 'standard', stamina: 78, avatar: '🚴' },
          { id: 'u2', nickname: '风一样的男子', speedLevel: 'competitive', stamina: 92, avatar: '💪' },
          { id: 'u3', nickname: '小骑手', speedLevel: 'leisure', stamina: 56, avatar: '😊' },
          { id: 'u4', nickname: '骑行爱好者', speedLevel: 'standard', stamina: 85, avatar: '🌟' }
        ],
        leaderId: 'u1',
        status: 'upcoming',
        weather: { temp: 24, wind: 12, rain: 10, icon: '☀️' }
      },
      {
        id: 'a2',
        name: '龙井爬坡训练',
        routeId: 'r3',
        routeName: '龙井爬坡挑战',
        startTime: '2026-06-14T06:30:00Z',
        meetingPoint: '龙井村口',
        members: [
          { id: 'u1', nickname: '单车老王', speedLevel: 'standard', stamina: 100, avatar: '🚴' },
          { id: 'u5', nickname: '爬坡王', speedLevel: 'competitive', stamina: 98, avatar: '🏔️' }
        ],
        leaderId: 'u5',
        status: 'ongoing',
        weather: { temp: 22, wind: 8, rain: 5, icon: '🌤️' }
      }
    ];
    writeDB(dbFiles.activities, seedActivities);
  }

  if (!fs.existsSync(dbFiles.reports)) {
    const seedReports = [
      {
        id: 'rep1',
        activityId: null,
        routeId: 'r2',
        routeName: '运河绿道休闲骑',
        date: '2026-06-10T08:00:00Z',
        distance: 12.5,
        duration: 62,
        avgSpeed: 12.1,
        elevation: 52,
        maxSpeed: 22.8,
        avgHeartRate: 128,
        radar: { endurance: 68, speed: 52, climb: 30, descent: 65, stability: 85 },
        photos: [
          { id: 'p1', url: 'https://picsum.photos/seed/cycling1/600/400', location: '运河古桥', timeOffset: 18, lat: 30.33318, lng: 120.16634 },
          { id: 'p2', url: 'https://picsum.photos/seed/cycling2/600/400', location: '河畔花海', timeOffset: 35, lat: 30.33518, lng: 120.17034 }
        ],
        difficulty: 1
      },
      {
        id: 'rep2',
        activityId: null,
        routeId: 'r1',
        routeName: '西湖环山经典路线',
        date: '2026-06-08T07:30:00Z',
        distance: 19.2,
        duration: 108,
        avgSpeed: 10.7,
        elevation: 445,
        maxSpeed: 35.6,
        avgHeartRate: 142,
        radar: { endurance: 82, speed: 58, climb: 72, descent: 78, stability: 70 },
        photos: [
          { id: 'p3', url: 'https://picsum.photos/seed/cycling3/600/400', location: '山顶观景台', timeOffset: 52, lat: 30.22818, lng: 120.16534 },
          { id: 'p4', url: 'https://picsum.photos/seed/cycling4/600/400', location: '下山弯道', timeOffset: 78, lat: 30.23518, lng: 120.18234 },
          { id: 'p5', url: 'https://picsum.photos/seed/cycling5/600/400', location: '西湖日落', timeOffset: 95, lat: 30.24818, lng: 120.17234 }
        ],
        difficulty: 3
      }
    ];
    writeDB(dbFiles.reports, seedReports);
  }

  if (!fs.existsSync(dbFiles.profiles)) {
    const seedProfiles = [
      {
        id: 'u1',
        nickname: '单车老王',
        avatar: '🚴',
        totalDistance: 428.6,
        totalDays: 32,
        bestDistance: 45.2,
        bestTime: 185,
        monthlyStats: [68, 52, 78, 45, 92, 88, 105, 72, 58, 65, 82, 98],
        level: 3,
        unlockedAchievements: ['ach1', 'ach2', 'ach3', 'ach5', 'ach6'],
        createdAt: '2025-11-15T00:00:00Z'
      }
    ];
    writeDB(dbFiles.profiles, seedProfiles);
  }

  if (!fs.existsSync(dbFiles.achievements)) {
    const seedAchievements = [
      { id: 'ach1', name: '初出茅庐', description: '第一次完成20公里骑行', icon: '🌟', unlocked: true, date: '2025-11-20' },
      { id: 'ach2', name: '坚持不懈', description: '累计骑行里程达100公里', icon: '💪', unlocked: true, date: '2025-12-05' },
      { id: 'ach3', name: '攀登者', description: '累计爬升达1000米', icon: '🏔️', unlocked: true, date: '2025-12-28' },
      { id: 'ach4', name: '社交达人', description: '参加5次以上骑行活动', icon: '👥', unlocked: false, date: null },
      { id: 'ach5', name: '风驰电掣', description: '最快下山速度超过40km/h', icon: '⚡', unlocked: true, date: '2026-01-12' },
      { id: 'ach6', name: '周末勇士', description: '连续4个周末骑行', icon: '🚴', unlocked: true, date: '2026-02-15' },
      { id: 'ach7', name: '百折不挠', description: '单月骑行超过200公里', icon: '🔥', unlocked: false, date: null },
      { id: 'ach8', name: '远行者', description: '单次骑行超过50公里', icon: '🗺️', unlocked: false, date: null },
      { id: 'ach9', name: '团体领袖', description: '作为领队组织3次活动', icon: '👑', unlocked: false, date: null },
      { id: 'ach10', name: '传奇骑手', description: '累计里程超过500公里', icon: '🏆', unlocked: false, date: null }
    ];
    writeDB(dbFiles.achievements, seedAchievements);
  }
}

seedData();

app.get('/api/routes', (req, res) => {
  res.json(readDB(dbFiles.routes));
});

app.get('/api/routes/:id', (req, res) => {
  const routes = readDB(dbFiles.routes);
  const route = routes.find(r => r.id === req.params.id);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json(route);
});

app.post('/api/routes', (req, res) => {
  const routes = readDB(dbFiles.routes);
  const newRoute = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  routes.push(newRoute);
  writeDB(dbFiles.routes, routes);
  res.status(201).json(newRoute);
});

app.put('/api/routes/:id', (req, res) => {
  const routes = readDB(dbFiles.routes);
  const idx = routes.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Route not found' });
  routes[idx] = { ...routes[idx], ...req.body };
  writeDB(dbFiles.routes, routes);
  res.json(routes[idx]);
});

app.delete('/api/routes/:id', (req, res) => {
  const routes = readDB(dbFiles.routes);
  const filtered = routes.filter(r => r.id !== req.params.id);
  writeDB(dbFiles.routes, filtered);
  res.json({ success: true });
});

app.get('/api/activities', (req, res) => {
  res.json(readDB(dbFiles.activities));
});

app.get('/api/activities/:id', (req, res) => {
  const activities = readDB(dbFiles.activities);
  const activity = activities.find(a => a.id === req.params.id);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });
  res.json(activity);
});

app.post('/api/activities', (req, res) => {
  const activities = readDB(dbFiles.activities);
  const newActivity = { id: uuidv4(), ...req.body };
  activities.push(newActivity);
  writeDB(dbFiles.activities, activities);
  res.status(201).json(newActivity);
});

app.put('/api/activities/:id', (req, res) => {
  const activities = readDB(dbFiles.activities);
  const idx = activities.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Activity not found' });
  activities[idx] = { ...activities[idx], ...req.body };
  writeDB(dbFiles.activities, activities);
  res.json(activities[idx]);
});

app.delete('/api/activities/:id', (req, res) => {
  const activities = readDB(dbFiles.activities);
  const filtered = activities.filter(a => a.id !== req.params.id);
  writeDB(dbFiles.activities, filtered);
  res.json({ success: true });
});

app.get('/api/reports', (req, res) => {
  res.json(readDB(dbFiles.reports));
});

app.get('/api/reports/:id', (req, res) => {
  const reports = readDB(dbFiles.reports);
  const report = reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
});

app.post('/api/reports', (req, res) => {
  const reports = readDB(dbFiles.reports);
  const newReport = { id: uuidv4(), ...req.body };
  reports.push(newReport);
  writeDB(dbFiles.reports, reports);
  res.status(201).json(newReport);
});

app.get('/api/profiles/:id', (req, res) => {
  const profiles = readDB(dbFiles.profiles);
  const profile = profiles.find(p => p.id === req.params.id) || profiles[0];
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

app.put('/api/profiles/:id', (req, res) => {
  const profiles = readDB(dbFiles.profiles);
  const idx = profiles.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Profile not found' });
  profiles[idx] = { ...profiles[idx], ...req.body };
  writeDB(dbFiles.profiles, profiles);
  res.json(profiles[idx]);
});

app.get('/api/achievements', (req, res) => {
  res.json(readDB(dbFiles.achievements));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
