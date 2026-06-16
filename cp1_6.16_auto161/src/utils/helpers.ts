import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

export interface Project {
  id: string;
  name: string;
  description: string;
  totalSeconds: number;
  todaySeconds: number;
  todayDate: string;
  createdAt: string;
}

export type TaskStatus = 'todo' | 'inProgress' | 'done';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  priority: number;
  accumulatedSeconds: number;
  createdAt: string;
}

export type InspirationTag = '视觉' | '声音' | '文字' | '交互' | '其他';

export interface Inspiration {
  id: string;
  projectId: string;
  content: string;
  tag: InspirationTag;
  createdAt: string;
}

export const TAG_COLORS: Record<InspirationTag, string> = {
  '视觉': '#FF6B6B',
  '声音': '#4ECDC4',
  '文字': '#FFE66D',
  '交互': '#95E1D3',
  '其他': '#F38181',
};

export const TAG_LIST: InspirationTag[] = ['视觉', '声音', '文字', '交互', '其他'];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待开始',
  inProgress: '进行中',
  done: '已完成',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#8B8FA3',
  inProgress: '#4ECDC4',
  done: '#95E1D3',
};

export function generateId(): string {
  return uuidv4();
}

export function formatTime(totalSeconds: number): string {
  const total = Math.max(0, totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatTimestamp(isoString: string): string {
  try {
    return format(new Date(isoString), 'MM/dd HH:mm');
  } catch {
    return '';
  }
}

export function parseSimpleMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#4ECDC4;text-decoration:underline;">$1</a>')
    .replace(/\n/g, '<br/>');
}

export function getTodayString(): string {
  return new Date().toDateString();
}
