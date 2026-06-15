import { create } from 'zustand';
import toast from 'react-hot-toast';
import type { Attributes, Item, FloorResult, ItemRarity } from './dataModels';
import { createInitialAttributes, DEFAULT_ITEM_POOL, calculateLevel } from './dataModels';
import { DungeonEngine } from './engine';

export type SimulationStatus = 'idle' | 'running' | 'finished';

export type SimulationSpeed = 1 | 2 | 4;

interface DungeonStore {
  baseAttributes: Attributes;
  inventory: Item[];
  warehouse: Item[];
  itemPool: Item[];
  currentFloor: number;
  explorationHistory: FloorResult[];
  simulationStatus: SimulationStatus;
  simulationSpeed: SimulationSpeed;
  engine: DungeonEngine | null;

  adjustAttribute: (key: keyof Attributes, delta: number) => void;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  setSimulationSpeed: (speed: SimulationSpeed) => void;
  clearInventory: () => void;
  addToWarehouse: (items: Item[]) => void;
}

const MAX_HISTORY = 200;
const HISTORY_TRIM = 50;
const MAX_INVENTORY = 8;

export const useDungeonStore = create<DungeonStore>((set, get) => ({
  baseAttributes: createInitialAttributes(),
  inventory: [],
  warehouse: [],
  itemPool: DEFAULT_ITEM_POOL,
  currentFloor: 1,
  explorationHistory: [],
  simulationStatus: 'idle',
  simulationSpeed: 1,
  engine: null,

  adjustAttribute: (key: keyof Attributes, delta: number) => {
    const { simulationStatus } = get();
    if (simulationStatus === 'running') return;

    set((state) => {
      const newValue = Math.min(50, Math.max(10, state.baseAttributes[key] + delta));
      return {
        baseAttributes: {
          ...state.baseAttributes,
          [key]: newValue,
        },
      };
    });
  },

  startSimulation: () => {
    const { simulationStatus, baseAttributes, itemPool, inventory, simulationSpeed } = get();
    if (simulationStatus === 'running') return;

    let engine = get().engine;
    if (!engine) {
      engine = new DungeonEngine(baseAttributes, itemPool, inventory);
      engine.setOnFloorCallback((result) => {
        const state = get();
        let newInventory = [...state.inventory];
        let newHistory = [result, ...state.explorationHistory];

        if (result.droppedItem) {
          if (newInventory.length >= MAX_INVENTORY) {
            toast('背包已满，已自动打包回收到仓库', {
              icon: '🎒',
              style: {
                background: 'rgba(0,0,0,0.85)',
                color: '#fff',
                borderRadius: '8px',
              },
            });
            set((s) => ({ warehouse: [...s.warehouse, ...newInventory] }));
            newInventory = [result.droppedItem];
          } else {
            newInventory.push(result.droppedItem);
          }
        }

        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(0, MAX_HISTORY - HISTORY_TRIM);
        }

        if (result.leveledUp) {
          toast(`升级了！当前等级 Lv.${result.level}`, {
            icon: '⬆️',
            style: {
              background: 'rgba(230, 126, 34, 0.9)',
              color: '#fff',
              borderRadius: '8px',
            },
          });
        }

        set((s) => ({
          currentFloor: result.floor + 1,
          inventory: newInventory,
          explorationHistory: newHistory,
        }));

        const eng = get().engine;
        if (eng) {
          eng.setEquippedItems(newInventory);
        }
      });

      engine.setOnFinishCallback(() => {
        set({ simulationStatus: 'finished' });
        toast('探索完成！你已抵达地牢最深处', {
          icon: '🏆',
          style: {
            background: 'rgba(155, 89, 182, 0.9)',
            color: '#fff',
            borderRadius: '8px',
          },
        });
      });

      set({ engine });
    } else {
      engine.setBaseAttributes(baseAttributes);
      engine.setItemPool(itemPool);
      engine.setEquippedItems(inventory);
    }

    engine.setSpeed(simulationSpeed);
    engine.start();
    set({ simulationStatus: 'running' });
  },

  pauseSimulation: () => {
    const { engine, simulationStatus } = get();
    if (simulationStatus !== 'running') return;
    if (engine) {
      engine.pause();
    }
    set({ simulationStatus: 'idle' });
  },

  resetSimulation: () => {
    const { engine } = get();
    if (engine) {
      engine.destroy();
    }
    set({
      currentFloor: 1,
      explorationHistory: [],
      simulationStatus: 'idle',
      engine: null,
      inventory: [],
    });
    toast('探索已重置', {
      icon: '🔄',
      style: {
        background: 'rgba(231, 76, 60, 0.9)',
        color: '#fff',
        borderRadius: '8px',
      },
    });
  },

  setSimulationSpeed: (speed: SimulationSpeed) => {
    const { engine } = get();
    if (engine) {
      engine.setSpeed(speed);
    }
    set({ simulationSpeed: speed });
  },

  clearInventory: () => {
    const { inventory, simulationStatus } = get();
    if (simulationStatus === 'running') return;
    if (inventory.length === 0) return;

    set((state) => ({
      warehouse: [...state.warehouse, ...state.inventory],
      inventory: [],
    }));
    toast('背包已清空，物品已回收到仓库', {
      icon: '📦',
      style: {
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        borderRadius: '8px',
      },
    });

    const { engine } = get();
    if (engine) {
      engine.clearInventory();
    }
  },

  addToWarehouse: (items: Item[]) => {
    set((state) => ({
      warehouse: [...state.warehouse, ...items],
    }));
  },
}));

export function selectGrowthData(history: FloorResult[]) {
  return history
    .slice()
    .reverse()
    .map((entry) => ({
      floor: entry.floor,
      strength: entry.attributesSnapshot.strength,
      agility: entry.attributesSnapshot.agility,
      intelligence: entry.attributesSnapshot.intelligence,
      vitality: entry.attributesSnapshot.vitality,
    }));
}

export function selectRarityDistribution(history: FloorResult[]) {
  const counts: Record<ItemRarity, number> = {
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };

  history.forEach((entry) => {
    if (entry.droppedItem) {
      counts[entry.droppedItem.rarity]++;
    }
  });

  return [
    { name: '普通', value: counts.common, color: '#BDC3C7' },
    { name: '稀有', value: counts.rare, color: '#3498DB' },
    { name: '史诗', value: counts.epic, color: '#9B59B6' },
    { name: '传说', value: counts.legendary, color: '#E67E22' },
  ];
}

export function selectItemsByRarity(history: FloorResult[], rarity: ItemRarity) {
  return history
    .filter((entry) => entry.droppedItem && entry.droppedItem.rarity === rarity)
    .map((entry) => ({
      item: entry.droppedItem!,
      floor: entry.floor,
    }));
}
