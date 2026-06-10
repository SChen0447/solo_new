/**
 * 前端共享类型定义
 * 与 server/types.ts 保持一致
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
  bubbleCount?: number; // 列表页附加字段
}

export interface Bubble {
  id: string;
  exhibitionId: string;
  x: number;
  y: number;
  text: string;
  createdAt: string;
}

/**
 * 主题渐变色配置
 * 怀旧：暖橙 #ff9a44 → #fecfef
 * 希望：青绿 #30cfd0 → #a8edea
 * 忧伤：雾蓝 #667eea → #764ba2
 * 狂喜：焰红 #f12711 → #f5af19
 */
export const THEME_GRADIENTS: Record<EmotionTheme, { from: string; to: string; label: string }> = {
  nostalgia: { from: '#ff9a44', to: '#fecfef', label: '怀旧' },
  hope: { from: '#30cfd0', to: '#a8edea', label: '希望' },
  sadness: { from: '#667eea', to: '#764ba2', label: '忧伤' },
  ecstasy: { from: '#f12711', to: '#f5af19', label: '狂喜' },
};
