export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  children: string[];
}

export interface Snapshot {
  id: string;
  version: number;
  action: string;
  operator: string;
  timestamp: number;
  nodes: Record<string, MindMapNode>;
  theme: string;
}

export type ThemeName = 'default' | 'ocean' | 'forest' | 'sunset' | 'aurora';

export interface ThemeColors {
  nodeFill: string;
  nodeBorder: string;
  lineColor: string;
  glowColor: string;
}

export const THEME_MAP: Record<ThemeName, ThemeColors> = {
  default: { nodeFill: '#2E2E4E', nodeBorder: '#3E3E5E', lineColor: '#4A4A6A', glowColor: '#7C3AED' },
  ocean: { nodeFill: '#1A3A4A', nodeBorder: '#2A5A6A', lineColor: '#3A7A8A', glowColor: '#0EA5E9' },
  forest: { nodeFill: '#1A3A1A', nodeBorder: '#2A5A2A', lineColor: '#4A6A3A', glowColor: '#22C55E' },
  sunset: { nodeFill: '#4A2A1A', nodeBorder: '#6A3A2A', lineColor: '#8A5A3A', glowColor: '#F97316' },
  aurora: { nodeFill: '#2A1A4A', nodeBorder: '#4A2A6A', lineColor: '#6A3A8A', glowColor: '#A855F7' },
};
