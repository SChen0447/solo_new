import { ThemeKey, ThemeConfig } from '../types';

export const themes: Record<ThemeKey, ThemeConfig> = {
  minimalWhite: {
    name: '极简白',
    dotColor: '#ffffff',
    bgColor: '#ffffff',
    textColor: '#222222',
    accentColor: '#333333',
    buttonGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderColor: '#e0e0e0',
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  neonBlack: {
    name: '霓虹黑',
    dotColor: '#00ffcc',
    bgColor: '#0a0a0a',
    textColor: '#00ffcc',
    accentColor: '#ff00ff',
    buttonGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderColor: '#00ffcc',
    fontFamily: "'Courier New', monospace",
  },
  retroYellow: {
    name: '复古黄',
    dotColor: '#f4d03f',
    bgColor: '#fef9e7',
    textColor: '#7d6608',
    accentColor: '#b7950b',
    buttonGradient: 'linear-gradient(135deg, #f4d03f 0%, #d4ac0d 100%)',
    borderColor: '#d4ac0d',
    fontFamily: "'Georgia', serif",
  },
  natureGreen: {
    name: '自然绿',
    dotColor: '#2ecc71',
    bgColor: '#eafaf1',
    textColor: '#1e8449',
    accentColor: '#27ae60',
    buttonGradient: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
    borderColor: '#27ae60',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  },
  oceanBlue: {
    name: '海洋蓝',
    dotColor: '#3498db',
    bgColor: '#ebf5fb',
    textColor: '#1b4f72',
    accentColor: '#2980b9',
    buttonGradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    borderColor: '#2980b9',
    fontFamily: "'Arial', sans-serif",
  },
};

export const themeKeys = Object.keys(themes) as ThemeKey[];
