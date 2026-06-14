import { create } from 'zustand';
import type { GardenPlot, IngredientInventory } from './types';
import { INGREDIENT_MAP, INITIAL_PLOTS, AUTO_HARVEST_INTERVAL } from './constants';

interface GardenState {
  plots: GardenPlot[];
  ingredientInventory: IngredientInventory;
  autoHarvestTimer: ReturnType<typeof setInterval> | null;
  growthTimers: Map<number, ReturnType<typeof setInterval>>;

  plant: (plotIndex: number, ingredientId: string) => void;
  harvest: (plotIndex: number) => void;
  autoHarvest: () => void;
  consumeIngredient: (ingredientId: string, quantity: number) => void;
  startAutoHarvestTimer: () => void;
  stopAutoHarvestTimer: () => void;
  startGrowthTimer: (plotIndex: number) => void;
  stopGrowthTimer: (plotIndex: number) => void;
}

export const useGardenStore = create<GardenState>((set, get) => ({
  plots: INITIAL_PLOTS.map((p) => ({ ...p })),
  ingredientInventory: {},
  autoHarvestTimer: null,
  growthTimers: new Map(),

  plant: (plotIndex, ingredientId) => {
    set((state) => {
      const newPlots = [...state.plots];
      newPlots[plotIndex] = {
        ...newPlots[plotIndex],
        ingredientId,
        progress: 0,
        plantedAt: Date.now(),
        isMature: false,
        autoHarvested: false,
      };
      return { plots: newPlots };
    });
    get().startGrowthTimer(plotIndex);
  },

  harvest: (plotIndex) => {
    const state = get();
    const plot = state.plots[plotIndex];
    if (!plot.isMature || !plot.ingredientId) return;

    get().stopGrowthTimer(plotIndex);

    set((state) => {
      const newInventory = { ...state.ingredientInventory };
      newInventory[plot.ingredientId!] = (newInventory[plot.ingredientId!] ?? 0) + 1;

      const newPlots = [...state.plots];
      newPlots[plotIndex] = {
        index: plotIndex,
        ingredientId: null,
        progress: 0,
        plantedAt: null,
        isMature: false,
        harvestRound: plot.harvestRound,
        autoHarvested: false,
      };

      return { plots: newPlots, ingredientInventory: newInventory };
    });
  },

  autoHarvest: () => {
    const state = get();
    const maturePlots = state.plots.filter((p) => p.isMature && p.ingredientId);

    if (maturePlots.length === 0) return;

    const newInventory = { ...state.ingredientInventory };
    const newPlots = [...state.plots];

    for (const plot of maturePlots) {
      const ingId = plot.ingredientId!;
      newInventory[ingId] = (newInventory[ingId] ?? 0) + 1;

      state.stopGrowthTimer(plot.index);

      newPlots[plot.index] = {
        index: plot.index,
        ingredientId: ingId,
        progress: 0,
        plantedAt: Date.now(),
        isMature: false,
        harvestRound: plot.harvestRound + 1,
        autoHarvested: true,
      };

      setTimeout(() => {
        get().startGrowthTimer(plot.index);
      }, 100);
    }

    set({ plots: newPlots, ingredientInventory: newInventory });
  },

  consumeIngredient: (ingredientId, quantity) => {
    set((state) => {
      const newInventory = { ...state.ingredientInventory };
      const current = newInventory[ingredientId] ?? 0;
      newInventory[ingredientId] = Math.max(0, current - quantity);
      return { ingredientInventory: newInventory };
    });
  },

  startAutoHarvestTimer: () => {
    const state = get();
    if (state.autoHarvestTimer) return;

    const timer = setInterval(() => {
      get().autoHarvest();
    }, AUTO_HARVEST_INTERVAL);

    set({ autoHarvestTimer: timer });
  },

  stopAutoHarvestTimer: () => {
    const state = get();
    if (state.autoHarvestTimer) {
      clearInterval(state.autoHarvestTimer);
      set({ autoHarvestTimer: null });
    }
  },

  startGrowthTimer: (plotIndex: number) => {
    const state = get();
    const plot = state.plots[plotIndex];
    if (!plot.ingredientId) return;

    const ingredient = INGREDIENT_MAP[plot.ingredientId];
    if (!ingredient) return;

    const growTimeMs = ingredient.growTime * 1000;
    const intervalMs = 100;
    const increment = (intervalMs / growTimeMs) * 100;

    const timer = setInterval(() => {
      const currentState = get();
      const currentPlot = currentState.plots[plotIndex];
      if (!currentPlot.ingredientId) {
        clearInterval(timer);
        return;
      }

      const newProgress = Math.min(100, currentPlot.progress + increment);
      const isMature = newProgress >= 100;

      set((state) => {
        const newPlots = [...state.plots];
        newPlots[plotIndex] = {
          ...newPlots[plotIndex],
          progress: newProgress,
          isMature,
        };

        const newGrowthTimers = new Map(state.growthTimers);
        if (isMature) {
          clearInterval(timer);
          newGrowthTimers.delete(plotIndex);
        }

        return { plots: newPlots, growthTimers: newGrowthTimers };
      });

      if (isMature) {
        clearInterval(timer);
      }
    }, intervalMs);

    set((state) => {
      const newGrowthTimers = new Map(state.growthTimers);
      const existing = newGrowthTimers.get(plotIndex);
      if (existing) clearInterval(existing);
      newGrowthTimers.set(plotIndex, timer);
      return { growthTimers: newGrowthTimers };
    });
  },

  stopGrowthTimer: (plotIndex: number) => {
    const state = get();
    const timer = state.growthTimers.get(plotIndex);
    if (timer) {
      clearInterval(timer);
      set((state) => {
        const newGrowthTimers = new Map(state.growthTimers);
        newGrowthTimers.delete(plotIndex);
        return { growthTimers: newGrowthTimers };
      });
    }
  },
}));
