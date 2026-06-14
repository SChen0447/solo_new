import { Category, CATEGORY_LABELS } from '@/types';

export const CATEGORY_COLORS: Record<Category, string> = {
  sulfide: '#e94560',
  oxide: '#f39c12',
  silicate: '#2ecc71',
  carbonate: '#3498db',
  halide: '#9b59b6',
  native: '#f1c40f',
  phosphate: '#1abc9c',
};

export const ORIGIN_COLORS: Record<string, string> = {
  '中国': '#e74c3c',
  '巴西': '#f39c12',
  '刚果': '#27ae60',
  '澳大利亚': '#3498db',
  '美国': '#9b59b6',
  '墨西哥': '#e67e22',
  '南非': '#1abc9c',
  '俄罗斯': '#e91e63',
};

export function getCategoryColor(category: Category): string {
  return CATEGORY_COLORS[category] || '#888888';
}

export function getOriginColor(origin: string): string {
  return ORIGIN_COLORS[origin] || '#888888';
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0.5, g: 0.5, b: 0.5 };
}

export function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export const BACKGROUND_COLORS = {
  specimen: {
    start: '#1a1a2e',
    end: '#16213e',
  },
  relation: {
    start: '#0a0a1a',
    end: '#000000',
  },
};
