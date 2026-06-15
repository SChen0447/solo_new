import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { SimulationState, EnergyData, ChartDataPoint, HistoryRecord } from '../types';

export const useSimulationStore = create<SimulationState>((set) => ({
  fireAmount: 50,
  waterAmount: 50,
  isSimulating: false,
  currentEnergyData: null,
  chartData: [],
  history: [],
  currentFrame: 0,

  setFireAmount: (amount: number) => set({ fireAmount: amount }),
  setWaterAmount: (amount: number) => set({ waterAmount: amount }),

  startSimulation: (energyData: EnergyData) => set({
    isSimulating: true,
    currentEnergyData: energyData,
    currentFrame: 0,
    chartData: []
  }),

  stopSimulation: () => set({ isSimulating: false }),

  addChartData: (point: ChartDataPoint) => set((state) => ({
    chartData: [...state.chartData, point].slice(-200)
  })),

  addHistoryRecord: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => set((state) => {
    const newRecord: HistoryRecord = {
      ...record,
      id: uuidv4(),
      timestamp: Date.now()
    };
    return {
      history: [newRecord, ...state.history].slice(0, 10)
    };
  }),

  clearChartData: () => set({ chartData: [], currentFrame: 0 }),

  setCurrentFrame: (frame: number) => set({ currentFrame: frame }),

  loadHistoryRecord: (record: HistoryRecord) => set({
    fireAmount: record.fireRatio,
    waterAmount: record.waterRatio,
    isSimulating: false,
    currentEnergyData: record.energyData,
    chartData: []
  })
}));
