import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OKR, Notification, TeamMember } from './types';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const OKRS_FILE = path.join(DATA_DIR, 'okrs.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

export const teamMembers: TeamMember[] = [
  { id: '1', name: '张明', avatar: 'ZM' },
  { id: '2', name: '李华', avatar: 'LH' },
  { id: '3', name: '王芳', avatar: 'WF' },
  { id: '4', name: '赵强', avatar: 'ZQ' },
  { id: '5', name: '陈静', avatar: 'CJ' },
];

const ensureDirs = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create directories:', err);
  }
};

const safeWriteFileSync = (filePath: string, data: unknown) => {
  ensureDirs();
  const jsonStr = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(filePath, jsonStr, 'utf-8');
    return true;
  } catch (primaryErr) {
    console.error(`Primary write failed for ${filePath}:`, primaryErr);
    try {
      const backupFile = path.join(
        BACKUP_DIR,
        path.basename(filePath).replace('.json', `_${Date.now()}.json`)
      );
      fs.writeFileSync(backupFile, jsonStr, 'utf-8');
      console.log(`Written to backup: ${backupFile}`);
      return true;
    } catch (backupErr) {
      console.error('Backup write also failed:', backupErr);
      return false;
    }
  }
};

const safeReadFileSync = <T>(filePath: string, fallback: T): T => {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err);
  }
  return fallback;
};

const getDefaultOKRs = (): OKR[] => {
  const now = Date.now();
  const day = 86400000;
  const okrs: OKR[] = [
    {
      id: uuidv4(),
      title: '提升产品用户体验',
      quarter: 'Q1',
      owner: '张明',
      ownerAvatar: 'ZM',
      keyResults: [
        { id: uuidv4(), description: '完成用户调研并输出报告', currentValue: 8, targetValue: 10 },
        { id: uuidv4(), description: '优化核心页面加载速度', currentValue: 60, targetValue: 100 },
        { id: uuidv4(), description: '用户满意度评分提升', currentValue: 4.2, targetValue: 5 },
      ],
      createdAt: now - day * 30,
      updatedAt: now - day * 2,
    },
    {
      id: uuidv4(),
      title: '推动技术架构升级',
      quarter: 'Q1',
      owner: '李华',
      ownerAvatar: 'LH',
      keyResults: [
        { id: uuidv4(), description: '完成微服务拆分设计', currentValue: 3, targetValue: 5 },
        { id: uuidv4(), description: '数据库迁移完成', currentValue: 1, targetValue: 2 },
      ],
      createdAt: now - day * 25,
      updatedAt: now - day * 5,
    },
    {
      id: uuidv4(),
      title: '拓展市场份额',
      quarter: 'Q1',
      owner: '王芳',
      ownerAvatar: 'WF',
      keyResults: [
        { id: uuidv4(), description: '新增企业客户数', currentValue: 15, targetValue: 20 },
        { id: uuidv4(), description: '市场活动参与人数', currentValue: 500, targetValue: 800 },
        { id: uuidv4(), description: '品牌曝光量提升', currentValue: 100000, targetValue: 150000 },
      ],
      createdAt: now - day * 20,
      updatedAt: now - day * 1,
    },
    {
      id: uuidv4(),
      title: '优化团队协作效率',
      quarter: 'Q2',
      owner: '赵强',
      ownerAvatar: 'ZQ',
      keyResults: [
        { id: uuidv4(), description: '引入敏捷开发流程', currentValue: 2, targetValue: 4 },
        { id: uuidv4(), description: '团队培训时长', currentValue: 20, targetValue: 40 },
      ],
      createdAt: now - day * 15,
      updatedAt: now - day * 3,
    },
    {
      id: uuidv4(),
      title: '产品功能迭代',
      quarter: 'Q2',
      owner: '陈静',
      ownerAvatar: 'CJ',
      keyResults: [
        { id: uuidv4(), description: '新功能上线数量', currentValue: 3, targetValue: 8 },
        { id: uuidv4(), description: 'Bug修复率', currentValue: 85, targetValue: 95 },
        { id: uuidv4(), description: '用户反馈响应时间', currentValue: 24, targetValue: 12 },
      ],
      createdAt: now - day * 10,
      updatedAt: now - day * 1,
    },
    {
      id: uuidv4(),
      title: '数据驱动决策',
      quarter: 'Q1',
      owner: '张明',
      ownerAvatar: 'ZM',
      keyResults: [
        { id: uuidv4(), description: '数据看板建设', currentValue: 5, targetValue: 10 },
        { id: uuidv4(), description: '数据分析报告输出', currentValue: 2, targetValue: 6 },
      ],
      createdAt: now - day * 12,
      updatedAt: now - day * 4,
    },
  ];
  return okrs;
};

const getDefaultNotifications = (okrs: OKR[]): Notification[] => {
  const now = Date.now();
  return [
    {
      id: uuidv4(),
      type: 'edit',
      message: '张明更新了OKR"提升产品用户体验"的进度',
      okrId: okrs[0].id,
      okrTitle: '提升产品用户体验',
      timestamp: now - 3600000,
      read: false,
    },
    {
      id: uuidv4(),
      type: 'progress',
      message: 'OKR"拓展市场份额"进度已超过80%！',
      okrId: okrs[2].id,
      okrTitle: '拓展市场份额',
      timestamp: now - 7200000,
      read: false,
    },
  ];
};

ensureDirs();

let okrs: OKR[] = safeReadFileSync<OKR[]>(OKRS_FILE, []);
if (okrs.length === 0) {
  okrs = getDefaultOKRs();
  safeWriteFileSync(OKRS_FILE, okrs);
}

let notifications: Notification[] = safeReadFileSync<Notification[]>(NOTIFICATIONS_FILE, []);
if (notifications.length === 0) {
  notifications = getDefaultNotifications(okrs);
  safeWriteFileSync(NOTIFICATIONS_FILE, notifications);
}

const persistOKRs = () => safeWriteFileSync(OKRS_FILE, okrs);
const persistNotifications = () => safeWriteFileSync(NOTIFICATIONS_FILE, notifications);

export const getOKRs = () => [...okrs];

export const getOKRById = (id: string) => okrs.find((o) => o.id === id);

export const createOKR = (data: Omit<OKR, 'id' | 'createdAt' | 'updatedAt'>): OKR => {
  const newOKR: OKR = {
    ...data,
    id: uuidv4(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  okrs.push(newOKR);
  persistOKRs();
  return newOKR;
};

export const updateOKR = (id: string, data: Partial<OKR>): OKR | null => {
  const idx = okrs.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  okrs[idx] = { ...okrs[idx], ...data, updatedAt: Date.now() };
  persistOKRs();
  return okrs[idx];
};

export const deleteOKR = (id: string): boolean => {
  const idx = okrs.findIndex((o) => o.id === id);
  if (idx === -1) return false;
  okrs.splice(idx, 1);
  persistOKRs();
  return true;
};

export const getNotifications = () => [...notifications];

export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification => {
  const newNotification: Notification = {
    ...notification,
    id: uuidv4(),
    timestamp: Date.now(),
    read: false,
  };
  notifications.unshift(newNotification);
  if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
  }
  persistNotifications();
  return newNotification;
};

export const markNotificationRead = (id: string): boolean => {
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  notifications[idx].read = true;
  persistNotifications();
  return true;
};

export const markAllNotificationsRead = (): void => {
  notifications = notifications.map((n) => ({ ...n, read: true }));
  persistNotifications();
};

export const calculateOKRProgress = (okr: OKR): number => {
  if (okr.keyResults.length === 0) return 0;
  const totalProgress = okr.keyResults.reduce((sum, kr) => {
    const progress = Math.min((kr.currentValue / kr.targetValue) * 100, 100);
    return sum + progress;
  }, 0);
  return Math.round(totalProgress / okr.keyResults.length);
};

export { teamMembers as members };
