export interface Task {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  estimatedHours: number;
  actualHours: number;
  assignee: string;
  colorTag: string;
  dependencies: string[];
  progress: number;
}

export interface Dependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: 'FS';
}

export interface TimeEntry {
  id: string;
  taskId: string;
  date: string;
  hours: number;
  assignee: string;
}

export interface DailySummary {
  date: string;
  totalHours: number;
  byAssignee: Record<string, number>;
}

export interface ComparisonItem {
  taskId: string;
  taskName: string;
  estimated: number;
  actual: number;
}

export interface CumulativePoint {
  date: string;
  cumulativeHours: number;
}

export type ZoomLevel = 'day' | 'week' | 'month';

export const COLOR_TAGS = [
  '#3498DB',
  '#E67E22',
  '#2ECC71',
  '#9B59B6',
  '#E74C3C',
  '#1ABC9C',
  '#F39C12',
  '#34495E',
];
