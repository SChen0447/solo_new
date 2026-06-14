export type Category = '品牌' | 'UI' | '插画' | '3D' | '其他';
export type Urgency = '普通' | '加急' | '特急';
export type OrderStatus = '待确认' | '进行中' | '需修改' | '已完成' | '已关闭';

export const CATEGORIES: Category[] = ['品牌', 'UI', '插画', '3D', '其他'];
export const URGENCY_LEVELS: Urgency[] = ['普通', '加急', '特急'];
export const ORDER_STATUSES: OrderStatus[] = ['待确认', '进行中', '需修改', '已完成', '已关闭'];

export interface Portfolio {
  id: string;
  title: string;
  category: Category;
  description: string;
  imageUrl: string;
  createdAt: string;
  tags: string[];
}

export interface QuoteRequest {
  category: Category;
  description: string;
  estimatedHours: number;
  needsRevision: boolean;
  urgency: Urgency;
}

export interface QuoteResult {
  baseRate: number;
  categoryCoeff: number;
  basePrice: number;
  revisionSurcharge: number;
  urgencySurcharge: number;
  total: number;
  estimatedDays: number;
}

export interface OrderNote {
  id: string;
  content: string;
  createdAt: string;
  author: 'client' | 'designer';
}

export interface Order {
  id: string;
  category: Category;
  description: string;
  estimatedHours: number;
  needsRevision: boolean;
  urgency: Urgency;
  quote: QuoteResult;
  status: OrderStatus;
  notes: OrderNote[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
