import { create } from 'zustand';
import { GameState, EnvironmentParams, OrganismData, TrendRecord, EventType } from '../types';
import { DEFAULT_ENVIRONMENT, SIMULATION_CONFIG, GENETIC_CONFIG } from '../config/envConfig';
import eventBus from '../event/EventBus';
import { calculateGeneticDiversity } from '../utils/helpers';

export const useGameStore = create<GameState & {
  setEnvironment: (params: Partial<EnvironmentParams>) => void;
  updateOrganism: (id: string, data: Partial<OrganismData>) => void;
  addOrganism: (organism: OrganismData) => void;
  removeOrganism: (id: string) => void;
  selectOrganism: (id: string | null) => void;
  nextGeneration: () => void;
  recordTrend: () => void;
  updateStatistics: () => void;
  setFps: (fps: number) => void;
  resetSimulation: () => void;
  setSimulationData: (data: Partial<GameState['simulation']>) => void;
}>((set, get) => ({
  environment: { ...DEFAULT_ENVIRONMENT },
  
  simulation: {
    generation: 1,
    totalPopulation: GENETIC_CONFIG.INITIAL_POPULATION,
    organisms: [],
    foods: [],
    obstacles: [],
    fps: 60,
    timeScale: 1,
    isPaused: false,
  },
  
  statistics: {
    averageSpeed: 0,
    averageSize: 0,
    geneticDiversity: 0,
    trendHistory: [],
  },
  
  selectedOrganismId: null,

  setEnvironment: (params) => {
    const newEnv = { ...get().environment, ...params };
    set({ environment: newEnv });
    eventBus.emit(EventType.ENVIRONMENT_CHANGED, newEnv);
  },

  updateOrganism: (id, data) => {
    set((state) => ({
      simulation: {
        ...state.simulation,
        organisms: state.simulation.organisms.map((org) =>
          org.id === id ? { ...org, ...data } : org
        ),
      },
    }));
  },

  addOrganism: (organism) => {
    set((state) => ({
      simulation: {
        ...state.simulation,
        organisms: [...state.simulation.organisms, organism],
        totalPopulation: state.simulation.totalPopulation + 1,
      },
    }));
  },

  removeOrganism: (id) => {
    set((state) => ({
      simulation: {
        ...state.simulation,
        organisms: state.simulation.organisms.filter((org) => org.id !== id),
      },
    }));
  },

  selectOrganism: (id) => {
    const { selectedOrganismId } = get();
    if (selectedOrganismId) {
      get().updateOrganism(selectedOrganismId, { isSelected: false });
    }
    if (id) {
      get().updateOrganism(id, { isSelected: true });
    }
    set({ selectedOrganismId: id });
    eventBus.emit(EventType.ORGANISM_SELECTED, id);
  },

  nextGeneration: () => {
    set((state) => ({
      simulation: {
        ...state.simulation,
        generation: state.simulation.generation + 1,
      },
    }));
    eventBus.emit(EventType.GENERATION_COMPLETE, get().simulation.generation);
    
    const { generation } = get().simulation;
    if (generation % SIMULATION_CONFIG.TREND_RECORD_INTERVAL === 0) {
      get().recordTrend();
    }
  },

  recordTrend: () => {
    const { simulation, statistics } = get();
    const record: TrendRecord = {
      generation: simulation.generation,
      population: simulation.organisms.filter((o) => o.isAlive).length,
      averageSpeed: statistics.averageSpeed,
      averageSize: statistics.averageSize,
      geneticDiversity: statistics.geneticDiversity,
    };
    set((state) => ({
      statistics: {
        ...state.statistics,
        trendHistory: [...state.statistics.trendHistory, record].slice(-50),
      },
    }));
  },

  updateStatistics: () => {
    const { organisms } = get().simulation;
    const aliveOrganisms = organisms.filter((o) => o.isAlive);
    
    if (aliveOrganisms.length === 0) {
      set((state) => ({
        statistics: {
          ...state.statistics,
          averageSpeed: 0,
          averageSize: 0,
          geneticDiversity: 0,
        },
      }));
      return;
    }

    const avgSpeed = aliveOrganisms.reduce((sum, o) => sum + o.genes.speed, 0) / aliveOrganisms.length;
    const avgSize = aliveOrganisms.reduce((sum, o) => sum + o.genes.size, 0) / aliveOrganisms.length;
    const diversity = calculateGeneticDiversity(aliveOrganisms);

    set((state) => ({
      statistics: {
        ...state.statistics,
        averageSpeed: avgSpeed,
        averageSize: avgSize,
        geneticDiversity: diversity,
      },
    }));
    
    eventBus.emit(EventType.STATS_UPDATED, get().statistics);
  },

  setFps: (fps) => {
    set((state) => ({
      simulation: { ...state.simulation, fps },
    }));
    eventBus.emit(EventType.FPS_UPDATED, fps);
  },

  resetSimulation: () => {
    eventBus.emit(EventType.UI_RESET_REQUESTED);
    set({
      environment: { ...DEFAULT_ENVIRONMENT },
      simulation: {
        generation: 1,
        totalPopulation: GENETIC_CONFIG.INITIAL_POPULATION,
        organisms: [],
        foods: [],
        obstacles: [],
        fps: 60,
        timeScale: 1,
        isPaused: false,
      },
      statistics: {
        averageSpeed: 0,
        averageSize: 0,
        geneticDiversity: 0,
        trendHistory: [],
      },
      selectedOrganismId: null,
    });
  },

  setSimulationData: (data) => {
    set((state) => ({
      simulation: { ...state.simulation, ...data },
    }));
  },
}));

export default useGameStore;
