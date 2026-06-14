export interface ElementInfo {
  symbol: string;
  name: string;
  color: string;
  radius: number;
  atomicNumber: number;
}

export const ELEMENT_COLORS: Record<string, ElementInfo> = {
  H: {
    symbol: 'H',
    name: '氢',
    color: '#FFFFFF',
    radius: 0.35,
    atomicNumber: 1,
  },
  C: {
    symbol: 'C',
    name: '碳',
    color: '#333333',
    radius: 0.5,
    atomicNumber: 6,
  },
  N: {
    symbol: 'N',
    name: '氮',
    color: '#3050F8',
    radius: 0.45,
    atomicNumber: 7,
  },
  O: {
    symbol: 'O',
    name: '氧',
    color: '#FF0D0D',
    radius: 0.42,
    atomicNumber: 8,
  },
  F: {
    symbol: 'F',
    name: '氟',
    color: '#90E050',
    radius: 0.4,
    atomicNumber: 9,
  },
  Cl: {
    symbol: 'Cl',
    name: '氯',
    color: '#1FF01F',
    radius: 0.5,
    atomicNumber: 17,
  },
  Br: {
    symbol: 'Br',
    name: '溴',
    color: '#A62929',
    radius: 0.55,
    atomicNumber: 35,
  },
  I: {
    symbol: 'I',
    name: '碘',
    color: '#940094',
    radius: 0.6,
    atomicNumber: 53,
  },
  S: {
    symbol: 'S',
    name: '硫',
    color: '#FFFF30',
    radius: 0.52,
    atomicNumber: 16,
  },
  P: {
    symbol: 'P',
    name: '磷',
    color: '#FF8000',
    radius: 0.5,
    atomicNumber: 15,
  },
  B: {
    symbol: 'B',
    name: '硼',
    color: '#FFB5B5',
    radius: 0.48,
    atomicNumber: 5,
  },
  Na: {
    symbol: 'Na',
    name: '钠',
    color: '#AB5CF2',
    radius: 0.6,
    atomicNumber: 11,
  },
  Mg: {
    symbol: 'Mg',
    name: '镁',
    color: '#8AFF00',
    radius: 0.58,
    atomicNumber: 12,
  },
  Ca: {
    symbol: 'Ca',
    name: '钙',
    color: '#3DFF00',
    radius: 0.62,
    atomicNumber: 20,
  },
  Fe: {
    symbol: 'Fe',
    name: '铁',
    color: '#E06633',
    radius: 0.56,
    atomicNumber: 26,
  },
};

export const DEFAULT_ELEMENTS: string[] = [
  'H', 'C', 'N', 'O', 'F', 'Cl', 'S', 'P', 'B', 'Br', 'I', 'Na', 'Mg', 'Ca', 'Fe'
];

export const BOND_COLOR = '#C8C8C8';
export const WARNING_COLOR = '#FF4444';
export const HIGHLIGHT_COLOR = '#FFD700';
export const MAX_BOND_DISTANCE = 3.0;
