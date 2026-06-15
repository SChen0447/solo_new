export type Language = 'javascript' | 'typescript' | 'html' | 'css'

export type Theme = 'dark' | 'light' | 'monokai' | 'dracula' | 'github'

export type Gradient = 'sunset' | 'ocean' | 'forest' | 'purple' | 'warm'

export interface EditorConfig {
  language: Language
  theme: Theme
  fontSize: number
  borderRadius: number
  gradient: Gradient
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  html: 'HTML',
  css: 'CSS',
}

export const LANGUAGE_COLORS: Record<Language, string> = {
  javascript: '#F7DF1E',
  typescript: '#3178C6',
  html: '#E34F26',
  css: '#1572B6',
}

export interface ThemeConfig {
  name: string
  bg: string
  text: string
  lineNumbersBg: string
  lineNumbersColor: string
  headerBg: string
  borderColor: string
  watermarkColor: string
}

export const THEMES: Record<Theme, ThemeConfig> = {
  dark: {
    name: 'Dark',
    bg: '#1e1e1e',
    text: '#d4d4d4',
    lineNumbersBg: '#252526',
    lineNumbersColor: '#858585',
    headerBg: '#2d2d2d',
    borderColor: '#404040',
    watermarkColor: '#666',
  },
  light: {
    name: 'Light',
    bg: '#ffffff',
    text: '#333333',
    lineNumbersBg: '#f5f5f5',
    lineNumbersColor: '#999999',
    headerBg: '#eaeaea',
    borderColor: '#d0d0d0',
    watermarkColor: '#999',
  },
  monokai: {
    name: 'Monokai',
    bg: '#272822',
    text: '#f8f8f2',
    lineNumbersBg: '#1e1f1c',
    lineNumbersColor: '#90908a',
    headerBg: '#3e3d32',
    borderColor: '#49483e',
    watermarkColor: '#75715e',
  },
  dracula: {
    name: 'Dracula',
    bg: '#282a36',
    text: '#f8f8f2',
    lineNumbersBg: '#21222c',
    lineNumbersColor: '#6272a4',
    headerBg: '#343746',
    borderColor: '#44475a',
    watermarkColor: '#6272a4',
  },
  github: {
    name: 'GitHub',
    bg: '#0d1117',
    text: '#c9d1d9',
    lineNumbersBg: '#161b22',
    lineNumbersColor: '#484f58',
    headerBg: '#21262d',
    borderColor: '#30363d',
    watermarkColor: '#6e7681',
  },
}

export const GRADIENTS: Record<Gradient, string> = {
  sunset: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
  ocean: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  forest: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  purple: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  warm: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
}

export const GRADIENT_NAMES: Record<Gradient, string> = {
  sunset: '日落',
  ocean: '海洋',
  forest: '森林',
  purple: '紫色',
  warm: '暖调',
}
