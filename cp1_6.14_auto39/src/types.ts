export interface HobbyFigure {
  id: string;
  workName: string;
  characterName: string;
  manufacturer: string;
  series: string;
  scale: string;
  material: string;
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string;
  condition: number;
  storageLocation: string;
  createdAt?: string;
}

export const MANUFACTURERS = [
  'Good Smile Company',
  'Aniplex',
  'Kotobukiya',
  'Alter',
  'Bandai Namco',
  'Megahouse',
  'Phat!',
  'Native',
  '其他'
] as const;

export type Manufacturer = typeof MANUFACTURERS[number];

export const SERIES = [
  '原神系列',
  '鬼灭系列',
  'EVA系列',
  '巨人系列',
  'Fate系列',
  '咒术系列',
  '初音系列',
  '东方系列',
  'LoveLive系列',
  '其他系列'
] as const;

export type Series = typeof SERIES[number];

export const MANUFACTURER_COLORS: Record<string, string> = {
  'Good Smile Company': '#e94560',
  'Aniplex': '#f59e0b',
  'Kotobukiya': '#3b82f6',
  'Alter': '#10b981',
  'Bandai Namco': '#8b5cf6',
  'Megahouse': '#ec4899',
  'Phat!': '#14b8a6',
  'Native': '#f97316',
  '其他': '#6b7280'
};

export const CHART_COLORS = [
  '#e94560',
  '#f59e0b',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16'
];
