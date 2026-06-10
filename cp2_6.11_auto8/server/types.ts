/**
 * 后端共享类型定义
 * 与前端 types/index.ts 保持一致
 */

export type EmotionTheme = 'nostalgia' | 'hope' | 'sadness' | 'ecstasy';

export interface ImageItem {
  id: string;
  url: string;
  description: string;
  position: number;
}

export interface Exhibition {
  id: string;
  name: string;
  theme: EmotionTheme;
  images: ImageItem[];
  createdAt: string;
}

export interface Bubble {
  id: string;
  exhibitionId: string;
  x: number;
  y: number;
  text: string;
  createdAt: string;
}

export interface CreateExhibitionRequest {
  name: string;
  theme: EmotionTheme;
  images: Omit<ImageItem, 'id'>[];
}

export interface SaveBubbleRequest {
  exhibitionId: string;
  x: number;
  y: number;
  text: string;
}

/**
 * 持久化数据结构
 * 完整写入 data/data.json 文件
 */
export interface PersistedData {
  exhibitions: Exhibition[];
  bubbles: Record<string, Bubble[]>;
}
