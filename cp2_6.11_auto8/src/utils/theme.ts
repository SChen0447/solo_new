/**
 * 主题配色工具函数
 */

import { EmotionTheme, THEME_GRADIENTS } from '../types';

/**
 * 获取主题的 CSS linear-gradient 字符串
 */
export function getThemeGradient(theme: EmotionTheme): string {
  const { from, to } = THEME_GRADIENTS[theme];
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}

/**
 * 获取主题的主色调（用于卡片发光效果）
 */
export function getThemeGlowColor(theme: EmotionTheme): string {
  return THEME_GRADIENTS[theme].from;
}

/**
 * 格式化时间戳为可读字符串
 */
export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}
