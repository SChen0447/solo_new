export type EnergyType = 'explosion' | 'jet' | 'pillar' | 'shockwave';

export interface EnergyData {
  type: EnergyType;
  intensity: number;
  radius: number;
  duration: number;
  particleCount: number;
  fireRatio: number;
  waterRatio: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: EnergyType;
}

export interface ChartDataPoint {
  frame: number;
  intensity: number;
  radius: number;
  duration: number;
}

export interface HistoryRecord {
  id: string;
  fireRatio: number;
  waterRatio: number;
  energyType: EnergyType;
  totalScore: number;
  energyData: EnergyData;
  timestamp: number;
}

export interface SimulationState {
  fireAmount: number;
  waterAmount: number;
  isSimulating: boolean;
  currentEnergyData: EnergyData | null;
  chartData: ChartDataPoint[];
  history: HistoryRecord[];
  currentFrame: number;
  setFireAmount: (amount: number) => void;
  setWaterAmount: (amount: number) => void;
  startSimulation: (energyData: EnergyData) => void;
  stopSimulation: () => void;
  addChartData: (point: ChartDataPoint) => void;
  addHistoryRecord: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => void;
  clearChartData: () => void;
  setCurrentFrame: (frame: number) => void;
  loadHistoryRecord: (record: HistoryRecord) => void;
}
