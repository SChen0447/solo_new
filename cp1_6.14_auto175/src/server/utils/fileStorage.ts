import fs from 'fs';
import path from 'path';
import type { Database, Tour, Show, Budget, Member, Category } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.resolve(__dirname, '../../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultCategories: Record<Category, number> = {
  transport: 20000,
  accommodation: 20000,
  food: 10000,
  equipment: 15000,
  promotion: 15000,
};

const initialData: Database = {
  tours: [
    {
      id: 'tour-001',
      name: '2026 夏季全国巡演',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      venueCount: 8,
      createdAt: '2026-06-01T10:00:00.000Z',
    },
  ],
  shows: [
    {
      id: 'show-001',
      tourId: 'tour-001',
      venue: '北京 MAO Livehouse',
      date: '2026-07-05',
      time: '20:00',
      ticketPrice: 180,
      contactName: '王经理',
      contactPhone: '13812348888',
      status: 'confirmed',
      stats: {
        audience: 520,
        merchandise: [
          { name: 'T恤', revenue: 8800 },
          { name: 'CD专辑', revenue: 4500 },
          { name: '海报', revenue: 1200 },
        ],
        equipmentIssues: 1,
      },
    },
    {
      id: 'show-002',
      tourId: 'tour-001',
      venue: '上海 Arkham',
      date: '2026-07-12',
      time: '20:30',
      ticketPrice: 200,
      contactName: '李总监',
      contactPhone: '13987656666',
      status: 'confirmed',
      stats: {
        audience: 680,
        merchandise: [
          { name: 'T恤', revenue: 12000 },
          { name: 'CD专辑', revenue: 6200 },
          { name: '黑胶唱片', revenue: 9800 },
        ],
        equipmentIssues: 0,
      },
    },
    {
      id: 'show-003',
      tourId: 'tour-001',
      venue: '广州 SD Livehouse',
      date: '2026-07-18',
      time: '20:00',
      ticketPrice: 160,
      contactName: '张老板',
      contactPhone: '13755554444',
      status: 'pending',
    },
    {
      id: 'show-004',
      tourId: 'tour-001',
      venue: '成都 小酒馆',
      date: '2026-07-25',
      time: '19:30',
      ticketPrice: 150,
      contactName: '陈主管',
      contactPhone: '13611112222',
      status: 'pending',
    },
    {
      id: 'show-005',
      tourId: 'tour-001',
      venue: '武汉 VOX',
      date: '2026-07-08',
      time: '20:00',
      ticketPrice: 170,
      contactName: '赵策划',
      contactPhone: '13533339999',
      status: 'cancelled',
    },
    {
      id: 'show-006',
      tourId: 'tour-001',
      venue: '西安 光圈CLUB',
      date: '2026-07-15',
      time: '20:00',
      ticketPrice: 160,
      contactName: '周经理',
      contactPhone: '13466667777',
      status: 'confirmed',
      stats: {
        audience: 430,
        merchandise: [
          { name: 'T恤', revenue: 6200 },
          { name: 'CD专辑', revenue: 3200 },
          { name: '徽章套装', revenue: 800 },
        ],
        equipmentIssues: 2,
      },
    },
  ],
  budget: {
    'tour-001': {
      tourId: 'tour-001',
      totalBudget: 80000,
      categoryBudgets: { ...defaultCategories },
      expenses: [
        { id: 'exp-001', category: 'transport', amount: 8500, description: '巡演巴士-城际包车', date: '2026-07-02' },
        { id: 'exp-002', category: 'accommodation', amount: 6200, description: '北京3晚酒店住宿', date: '2026-07-05' },
        { id: 'exp-003', category: 'food', amount: 2800, description: '团队餐费', date: '2026-07-06' },
        { id: 'exp-004', category: 'equipment', amount: 12000, description: '音响设备租赁', date: '2026-07-01' },
        { id: 'exp-005', category: 'promotion', amount: 5800, description: '社交媒体推广投放', date: '2026-06-25' },
        { id: 'exp-006', category: 'transport', amount: 3200, description: '乐队成员机票', date: '2026-06-30' },
        { id: 'exp-007', category: 'accommodation', amount: 4500, description: '西安2晚酒店', date: '2026-07-14' },
      ],
    },
  },
  members: [
    { id: 'member-001', tourId: 'tour-001', email: 'artist@band.com', name: '主唱小明', role: 'admin', online: true, avatar: '🎤' },
    { id: 'member-002', tourId: 'tour-001', email: 'guitar@band.com', name: '吉他手阿杰', role: 'member', online: true, avatar: '🎸' },
    { id: 'member-003', tourId: 'tour-001', email: 'drum@band.com', name: '鼓手老王', role: 'member', online: false, avatar: '🥁' },
    { id: 'member-004', tourId: 'tour-001', email: 'bass@band.com', name: '贝斯阿磊', role: 'member', online: true, avatar: '🎻' },
    { id: 'member-005', tourId: 'tour-001', email: 'manager@agency.com', name: '经纪人Lisa', role: 'viewer', online: false, avatar: '👩‍💼' },
    { id: 'member-006', tourId: 'tour-001', email: 'sound@crew.com', name: '音效师Tony', role: 'member', online: true, avatar: '🎚️' },
  ],
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDatabase(): Database {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content) as Database;
  } catch {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

export function writeDatabase(db: Database): void {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export function generateId(prefix: string = ''): string {
  return prefix ? `${prefix}-${uuidv4().slice(0, 8)}` : uuidv4();
}

export function ensureBudgetForTour(db: Database, tourId: string): Budget {
  if (!db.budget[tourId]) {
    db.budget[tourId] = {
      tourId,
      totalBudget: 80000,
      categoryBudgets: { ...defaultCategories },
      expenses: [],
    };
  }
  return db.budget[tourId];
}

export { defaultCategories };
