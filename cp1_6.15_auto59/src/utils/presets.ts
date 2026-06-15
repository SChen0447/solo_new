import type { PresetStyle } from './constants';

export const PRESET_STYLES: PresetStyle[] = [
  {
    name: '火热情感',
    color: '#ff6b6b',
    params: {
      hueShift: 0.8,
      motionIntensity: 1.2,
      aggregation: 0.9
    },
    emotionIntensity: 90,
    particleSize: 5,
    backgroundBrightness: 0.7
  },
  {
    name: '柔和浪漫',
    color: '#ffd93d',
    params: {
      hueShift: 0.3,
      motionIntensity: 0.4,
      aggregation: 1.05
    },
    emotionIntensity: 40,
    particleSize: 4,
    backgroundBrightness: 0.4
  },
  {
    name: '未来科技',
    color: '#6c5ce7',
    params: {
      hueShift: -0.5,
      motionIntensity: 0.8,
      aggregation: 1.0
    },
    emotionIntensity: 70,
    particleSize: 6,
    backgroundBrightness: 0.6
  },
  {
    name: '自然生态',
    color: '#00b894',
    params: {
      hueShift: 0.0,
      motionIntensity: 0.5,
      aggregation: 1.1
    },
    emotionIntensity: 50,
    particleSize: 4,
    backgroundBrightness: 0.5
  }
];

export function applyPreset(index: number): PresetStyle | null {
  if (index >= 0 && index < PRESET_STYLES.length) {
    return PRESET_STYLES[index];
  }
  return null;
}
