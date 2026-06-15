export interface Work {
  id: string;
  title: string;
  image_url: string;
  description: string;
  category: 'UI设计' | '插画' | '摄影' | '动效';
  project_url?: string;
  created_at?: string;
}

export interface Message {
  id: string;
  work_id?: string;
  work_title?: string;
  name: string;
  email: string;
  content: string;
  is_read: number;
  created_at: string;
}

export interface CreateWorkPayload {
  title: string;
  image_url: string;
  description: string;
  category: Work['category'];
  project_url?: string;
}

export interface CreateMessagePayload {
  work_id?: string;
  name: string;
  email: string;
  content: string;
}

export const CATEGORIES = ['UI设计', '插画', '摄影', '动效'] as const;

export const TAG_COLORS = [
  { bg: '#e8d5f5', text: '#7c3aed' },
  { bg: '#d5f0e8', text: '#059669' },
  { bg: '#fde4e4', text: '#dc2626' },
  { bg: '#e0ecff', text: '#2563eb' },
  { bg: '#fef3c7', text: '#d97706' },
  { bg: '#fce7f3', text: '#db2777' },
  { bg: '#e0e7ff', text: '#4f46e5' },
  { bg: '#d1fae5', text: '#047857' },
];
