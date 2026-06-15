export type ElementCategory = 'tree' | 'flowerbed' | 'pool' | 'paving' | 'lighting';

export interface LandscapeElement {
  id: string;
  category: ElementCategory;
  name: string;
  icon: string;
  x: number;
  y: number;
}

export interface ElementTemplate {
  category: ElementCategory;
  name: string;
  icon: string;
}

export interface AnalysisResult {
  score: number;
  tip: string;
  warnings: string[];
}

export interface RippleEffect {
  id: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface CanvasState {
  width: number;
  height: number;
  gridSize: number;
}

export const GRID_SIZE = 20;

export const ELEMENT_TEMPLATES: ElementTemplate[] = [
  { category: 'tree', name: '银杏树', icon: '🌳' },
  { category: 'tree', name: '樱花树', icon: '🌸' },
  { category: 'tree', name: '松树', icon: '🌲' },
  { category: 'flowerbed', name: '玫瑰花坛', icon: '🌹' },
  { category: 'flowerbed', name: '薰衣草圃', icon: '💜' },
  { category: 'pool', name: '锦鲤池', icon: '🐟' },
  { category: 'pool', name: '喷泉', icon: '⛲' },
  { category: 'paving', name: '石板路', icon: '🪨' },
  { category: 'paving', name: '鹅卵石径', icon: '🟤' },
  { category: 'lighting', name: '草坪灯', icon: '💡' },
  { category: 'lighting', name: '庭院壁灯', icon: '🏮' },
  { category: 'lighting', name: '地灯', icon: '✨' },
];

export const COMPATIBILITY_MAP: Record<string, Record<string, string>> = {
  tree: {
    pool: '树木与水池相邻有利于调节湿度，是绝佳搭配',
    flowerbed: '树木为花坛提供半阴环境，适合耐阴植物',
    lighting: '树下安装灯光可营造树影婆娑的效果',
    paving: '注意树根可能拱起铺地，建议保持间距',
    tree: '树木之间保持足够间距，避免争夺阳光和养分',
  },
  flowerbed: {
    pool: '花坛靠近水池可方便浇灌，但注意排水',
    lighting: '灯光可以夜间照亮花坛，增加观赏性',
    paving: '花坛旁设步道便于修剪养护',
    tree: '大树旁的花坛需选择耐阴植物',
    flowerbed: '不同花坛间留出步道空间便于通行',
  },
  pool: {
    tree: '树木与水池相邻有利于调节湿度，是绝佳搭配',
    flowerbed: '花坛靠近水池可方便浇灌，但注意排水',
    lighting: '水池旁的灯光可以创造美丽的倒影效果',
    paving: '水池周围铺设防滑地面非常重要',
    pool: '多个水池应保持风格统一',
  },
  paving: {
    lighting: '铺地旁的地灯或草坪灯兼具照明与引导功能',
    pool: '水池周围铺设防滑地面非常重要',
    flowerbed: '花坛旁设步道便于修剪养护',
    tree: '注意树根可能拱起铺地，建议保持间距',
    paving: '铺地区域之间保持材质和风格的连贯性',
  },
  lighting: {
    tree: '树下安装灯光可营造树影婆娑的效果',
    flowerbed: '灯光可以夜间照亮花坛，增加观赏性',
    pool: '水池旁的灯光可以创造美丽的倒影效果',
    paving: '铺地旁的地灯或草坪灯兼具照明与引导功能',
    lighting: '灯光布局应层次分明，避免光污染',
  },
};
