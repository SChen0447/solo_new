export type Category = 'feature' | 'bug' | 'ux' | 'other';
export type Status = 'pending' | 'processing' | 'completed';

export interface Feedback {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  votes: number;
  created_at: string;
}

export interface FeedbackListResponse {
  feedbacks: Feedback[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateFeedbackData {
  title: string;
  description: string;
  category: Category;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  feature: '功能建议',
  bug: 'Bug报告',
  ux: '用户体验',
  other: '其他'
};

export const CATEGORY_COLORS: Record<Category, string> = {
  feature: '#2196F3',
  bug: '#F44336',
  ux: '#4CAF50',
  other: '#9E9E9E'
};

export const STATUS_LABELS: Record<Status, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成'
};

export const STATUS_COLORS: Record<Status, string> = {
  pending: '#FF9800',
  processing: '#2196F3',
  completed: '#4CAF50'
};

export const STATUS_ORDER: Status[] = ['pending', 'processing', 'completed'];
