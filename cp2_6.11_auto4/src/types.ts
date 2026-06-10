export type Frequency = 'low' | 'mid' | 'high';

export interface CrystalData {
  id: string;
  position: [number, number, number];
  frequency: Frequency;
  color: string;
}

export interface ConnectionData {
  id: string;
  from: string;
  to: string;
}

const FREQUENCY_CONFIG: Record<Frequency, { color: string; scale: number; rotationSpeed: number; glowRadius: number }> = {
  low: { color: '#6b4eff', scale: 1.4, rotationSpeed: 8, glowRadius: 4 },
  mid: { color: '#2a9d8f', scale: 1.0, rotationSpeed: 6, glowRadius: 6 },
  high: { color: '#ff6b35', scale: 0.7, rotationSpeed: 4, glowRadius: 8 }
};

const generateId = (): string => Math.random().toString(36).substr(2, 9);

export { FREQUENCY_CONFIG, generateId };
