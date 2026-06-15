import { create } from 'zustand';
import { GameEngine, GameState, GameConfig, GameEvent } from './gameEngine';

export interface SimulationConfig {
  mapSize: number;
  resourceDensity: number;
  monsterSpawnRate: number;
  playerHealth: number;
  simulationRounds: number;
}

export interface StatisticsData {
  avgSurvivedDays: number;
  stdSurvivedDays: number;
  avgWoodCollected: number;
  avgWaterCollected: number;
  avgStoneCollected: number;
  avgCombatWinRate: number;
  stdCombatWinRate: number;
  avgBuildingsBuilt: number;
  collectionEfficiency: number;
  allResults: GameState[];
}

export interface UIState {
  isRunning: boolean;
  isPaused: boolean;
  currentState: GameState | null;
  statistics: StatisticsData | null;
  config: SimulationConfig;
  panelExpanded: boolean;
  viewScale: number;
  viewOffset: { x: number; y: number };
  hoveredCell: { x: number; y: number } | null;
  activePreset: string | null;
}

interface SimulationStore extends UIState {
  gameEngine: GameEngine | null;
  initEngine: () => void;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  resetSimulation: () => void;
  updateConfig: (config: Partial<SimulationConfig>) => void;
  applyPreset: (preset: string) => void;
  togglePanel: () => void;
  setViewScale: (scale: number) => void;
  setViewOffset: (offset: { x: number; y: number }) => void;
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  handleGameEvent: (event: GameEvent) => void;
}

const DEFAULT_CONFIG: SimulationConfig = {
  mapSize: 20,
  resourceDensity: 0.25,
  monsterSpawnRate: 0.2,
  playerHealth: 100,
  simulationRounds: 5,
};

const PRESETS: Record<string, SimulationConfig> = {
  quick: {
    mapSize: 10,
    resourceDensity: 0.4,
    monsterSpawnRate: 0.1,
    playerHealth: 150,
    simulationRounds: 3,
  },
  standard: {
    mapSize: 20,
    resourceDensity: 0.25,
    monsterSpawnRate: 0.2,
    playerHealth: 100,
    simulationRounds: 5,
  },
  hard: {
    mapSize: 30,
    resourceDensity: 0.15,
    monsterSpawnRate: 0.3,
    playerHealth: 80,
    simulationRounds: 5,
  },
};

function calculateStatistics(results: GameState[]): StatisticsData {
  if (results.length === 0) {
    return {
      avgSurvivedDays: 0,
      stdSurvivedDays: 0,
      avgWoodCollected: 0,
      avgWaterCollected: 0,
      avgStoneCollected: 0,
      avgCombatWinRate: 0,
      stdCombatWinRate: 0,
      avgBuildingsBuilt: 0,
      collectionEfficiency: 0,
      allResults: [],
    };
  }

  const survivedDays = results.map((r) => r.survivedDays);
  const avgSurvivedDays = survivedDays.reduce((a, b) => a + b, 0) / results.length;
  const stdSurvivedDays = Math.sqrt(
    survivedDays.reduce((sum, d) => sum + Math.pow(d - avgSurvivedDays, 2), 0) / results.length
  );

  const totalWood = results.reduce((sum, r) => {
    return sum + r.dailyStats.reduce((s, d) => s + d.woodCollected, 0);
  }, 0);
  const avgWoodCollected = totalWood / results.length;

  const totalWater = results.reduce((sum, r) => {
    return sum + r.dailyStats.reduce((s, d) => s + d.waterCollected, 0);
  }, 0);
  const avgWaterCollected = totalWater / results.length;

  const totalStone = results.reduce((sum, r) => {
    return sum + r.dailyStats.reduce((s, d) => s + d.stoneCollected, 0);
  }, 0);
  const avgStoneCollected = totalStone / results.length;

  const winRates = results.map((r) => {
    const totalCombat = r.dailyStats.reduce((s, d) => s + d.combats, 0);
    const totalWins = r.dailyStats.reduce((s, d) => s + d.combatWins, 0);
    return totalCombat > 0 ? totalWins / totalCombat : 0;
  });
  const avgCombatWinRate = winRates.reduce((a, b) => a + b, 0) / results.length;
  const stdCombatWinRate = Math.sqrt(
    winRates.reduce((sum, w) => sum + Math.pow(w - avgCombatWinRate, 2), 0) / results.length
  );

  const avgBuildingsBuilt =
    results.reduce((sum, r) => sum + r.player.buildingsBuilt, 0) / results.length;

  const maxDays = 30;
  const maxResources = 500;
  const maxWinRate = 1;
  const maxBuildings = 20;

  const collectionEfficiency =
    ((avgWoodCollected + avgWaterCollected + avgStoneCollected) / 3 / maxResources) * 100;

  return {
    avgSurvivedDays,
    stdSurvivedDays,
    avgWoodCollected,
    avgWaterCollected,
    avgStoneCollected,
    avgCombatWinRate,
    stdCombatWinRate,
    avgBuildingsBuilt,
    collectionEfficiency,
    allResults: results,
  };
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  isRunning: false,
  isPaused: false,
  currentState: null,
  statistics: null,
  config: DEFAULT_CONFIG,
  panelExpanded: true,
  viewScale: 1,
  viewOffset: { x: 0, y: 0 },
  hoveredCell: null,
  activePreset: null,
  gameEngine: null,

  initEngine: () => {
    const { config } = get();
    const engineConfig: GameConfig = {
      mapSize: config.mapSize,
      resourceDensity: config.resourceDensity,
      monsterSpawnRate: config.monsterSpawnRate,
      playerHealth: config.playerHealth,
      simulationRounds: config.simulationRounds,
    };
    const engine = new GameEngine(engineConfig);
    const unsubscribe = engine.subscribe(get().handleGameEvent);
    engine.reset();
    set({ gameEngine: engine });
  },

  startSimulation: () => {
    const { gameEngine, initEngine } = get();
    if (!gameEngine) {
      initEngine();
    }
    const engine = get().gameEngine;
    if (engine) {
      engine.reset();
      engine.start();
      set({ isRunning: true, isPaused: false });
    }
  },

  pauseSimulation: () => {
    const { gameEngine } = get();
    if (gameEngine) {
      gameEngine.stop();
      set({ isPaused: true });
    }
  },

  resumeSimulation: () => {
    const { gameEngine } = get();
    if (gameEngine) {
      gameEngine.start();
      set({ isPaused: false });
    }
  },

  resetSimulation: () => {
    const { gameEngine } = get();
    if (gameEngine) {
      gameEngine.stop();
      gameEngine.reset();
    }
    set({ isRunning: false, isPaused: false, statistics: null });
  },

  updateConfig: (newConfig: Partial<SimulationConfig>) => {
    const { config, gameEngine, isRunning } = get();
    const updated = { ...config, ...newConfig };
    set({ config: updated, activePreset: null });

    if (gameEngine && !isRunning) {
      gameEngine.updateConfig({
        mapSize: updated.mapSize,
        resourceDensity: updated.resourceDensity,
        monsterSpawnRate: updated.monsterSpawnRate,
        playerHealth: updated.playerHealth,
        simulationRounds: updated.simulationRounds,
      });
      gameEngine.reset();
    }
  },

  applyPreset: (preset: string) => {
    const presetConfig = PRESETS[preset];
    if (presetConfig) {
      const { gameEngine, isRunning } = get();
      set({ config: { ...presetConfig }, activePreset: preset });

      if (gameEngine && !isRunning) {
        gameEngine.updateConfig({
          mapSize: presetConfig.mapSize,
          resourceDensity: presetConfig.resourceDensity,
          monsterSpawnRate: presetConfig.monsterSpawnRate,
          playerHealth: presetConfig.playerHealth,
          simulationRounds: presetConfig.simulationRounds,
        });
        gameEngine.reset();
      }
    }
  },

  togglePanel: () => {
    set((state) => ({ panelExpanded: !state.panelExpanded }));
  },

  setViewScale: (scale: number) => {
    set({ viewScale: Math.max(0.5, Math.min(2, scale)) });
  },

  setViewOffset: (offset: { x: number; y: number }) => {
    set({ viewOffset: offset });
  },

  setHoveredCell: (cell: { x: number; y: number } | null) => {
    set({ hoveredCell: cell });
  },

  handleGameEvent: (event: GameEvent) => {
    switch (event.type) {
      case 'turn_update':
        set({ currentState: event.state });
        break;
      case 'game_over':
        set({ currentState: event.state, isRunning: false, isPaused: false });
        break;
      case 'simulation_complete':
        const stats = calculateStatistics(event.allResults);
        set({ statistics: stats, isRunning: false, isPaused: false });
        break;
    }
  },
}));
