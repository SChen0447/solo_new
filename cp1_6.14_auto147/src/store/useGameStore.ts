import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  Rune,
  RuneType,
  InventoryItem,
  Monster,
  BattleLog,
  BattleStats,
  GameProgress,
  Scene,
} from '@/types';
import { createBasicRunes, combineRunes } from '@/modules/合成模块/Combinator';
import { generateMonster, calculateDamage, processMonsterTurn } from '@/modules/战斗模块/BattleEngine';

interface GameState {
  scene: Scene;
  selectedSlots: [Rune | null, Rune | null];
  inventory: InventoryItem[];
  discoveredRecipes: string[];
  wins: number;
  losses: number;
  currentMonster: Monster | null;
  battleLogs: BattleLog[];
  battleStartTime: number | null;
  battleTotalDamage: number;
  lastBattleStats: BattleStats | null;
  showInventory: boolean;
  showBattleResult: boolean;
  cooldownRuneIds: Set<string>;
  basicRunes: Rune[];

  setScene: (scene: Scene) => void;
  placeRuneInSlot: (rune: Rune, slotIndex: 0 | 1) => void;
  removeRuneFromSlot: (slotIndex: 0 | 1) => void;
  performCombination: () => { success: boolean; result?: Rune };
  clearSlots: () => void;
  addToInventory: (rune: Rune) => void;
  removeFromInventory: (runeId: string) => void;
  toggleInventory: () => void;
  startBattle: () => void;
  castSpell: (rune: Rune) => void;
  setCooldown: (runeId: string) => void;
  clearBattle: () => void;
  toggleBattleResult: (show: boolean) => void;
  loadProgress: (progress: GameProgress) => void;
  getProgress: () => GameProgress;
  resetGame: () => void;
}

const initialBasicRunes = createBasicRunes();
const initialInventory: InventoryItem[] = initialBasicRunes.map((r) => ({ rune: r, count: 5 }));

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      scene: 'workshop',
      selectedSlots: [null, null],
      inventory: initialInventory,
      discoveredRecipes: [],
      wins: 0,
      losses: 0,
      currentMonster: null,
      battleLogs: [],
      battleStartTime: null,
      battleTotalDamage: 0,
      lastBattleStats: null,
      showInventory: false,
      showBattleResult: false,
      cooldownRuneIds: new Set(),
      basicRunes: initialBasicRunes,

      setScene: (scene) => set({ scene }),

      placeRuneInSlot: (rune, slotIndex) => {
        set((state) => {
          const newSlots: [Rune | null, Rune | null] = [...state.selectedSlots] as [Rune | null, Rune | null];
          newSlots[slotIndex] = rune;
          return { selectedSlots: newSlots };
        });
      },

      removeRuneFromSlot: (slotIndex) => {
        set((state) => {
          const newSlots: [Rune | null, Rune | null] = [...state.selectedSlots] as [Rune | null, Rune | null];
          newSlots[slotIndex] = null;
          return { selectedSlots: newSlots };
        });
      },

      performCombination: () => {
        const state = get();
        const [r1, r2] = state.selectedSlots;
        if (!r1 || !r2) return { success: false };

        const result = combineRunes(r1, r2);
        if (!result.success || !result.rune) {
          return { success: false };
        }

        const recipeKey = [r1.type, r2.type].sort().join('+');
        const newDiscovered = state.discoveredRecipes.includes(recipeKey)
          ? state.discoveredRecipes
          : [...state.discoveredRecipes, recipeKey];

        const existingIdx = state.inventory.findIndex((i) => i.rune.id === result.rune!.id);
        let newInventory: InventoryItem[];
        if (existingIdx >= 0) {
          newInventory = state.inventory.map((item, idx) =>
            idx === existingIdx ? { ...item, count: item.count + 1 } : item
          );
        } else {
          newInventory = [...state.inventory, { rune: result.rune!, count: 1 }];
        }

        set({
          discoveredRecipes: newDiscovered,
          inventory: newInventory,
          selectedSlots: [null, null],
        });

        return { success: true, result: result.rune };
      },

      clearSlots: () => set({ selectedSlots: [null, null] }),

      addToInventory: (rune) => {
        set((state) => {
          const existingIdx = state.inventory.findIndex((i) => i.rune.id === rune.id);
          if (existingIdx >= 0) {
            return {
              inventory: state.inventory.map((item, idx) =>
                idx === existingIdx ? { ...item, count: item.count + 1 } : item
              ),
            };
          }
          return { inventory: [...state.inventory, { rune, count: 1 }] };
        });
      },

      removeFromInventory: (runeId) => {
        set((state) => ({
          inventory: state.inventory
            .map((item) => (item.rune.id === runeId ? { ...item, count: item.count - 1 } : item))
            .filter((item) => item.count > 0),
        }));
      },

      toggleInventory: () => set((s) => ({ showInventory: !s.showInventory })),

      startBattle: () => {
        const monster = generateMonster();
        set({
          scene: 'arena',
          currentMonster: monster,
          battleLogs: [{ id: uuidv4(), text: `${monster.name} 出现了！弱点是 ${monster.weakness} 属性`, timestamp: Date.now() }],
          battleStartTime: Date.now(),
          battleTotalDamage: 0,
          showBattleResult: false,
          cooldownRuneIds: new Set(),
        });
      },

      castSpell: (rune) => {
        const state = get();
        if (!state.currentMonster || state.cooldownRuneIds.has(rune.id)) return;

        const monster = state.currentMonster;
        const damage = calculateDamage(rune, monster);
        const newHp = Math.max(0, monster.hp - damage);
        const won = newHp <= 0;

        const newLogs = [
          ...state.battleLogs,
          { id: uuidv4(), text: `你释放了 ${rune.name}，造成 ${damage} 点伤害！`, timestamp: Date.now() },
        ];

        let updatedMonster = { ...monster, hp: newHp };
        let finalWon = won;
        let finalLost = false;

        if (won) {
          newLogs.push({ id: uuidv4(), text: `${monster.name} 被击败了！`, timestamp: Date.now() });
        } else {
          const { monster: nextMonster, playerHpLoss, attackText } = processMonsterTurn(updatedMonster);
          updatedMonster = nextMonster;
          newLogs.push({ id: uuidv4(), text: attackText, timestamp: Date.now() });
          if (playerHpLoss > 0) {
            newLogs.push({ id: uuidv4(), text: `你受到了 ${playerHpLoss} 点伤害！`, timestamp: Date.now() });
            finalLost = Math.random() < 0.3;
            if (finalLost) {
              newLogs.push({ id: uuidv4(), text: `你被击败了...`, timestamp: Date.now() });
            }
          }
        }

        const duration = state.battleStartTime ? Math.floor((Date.now() - state.battleStartTime) / 1000) : 0;
        const stats: BattleStats = {
          totalDamage: state.battleTotalDamage + damage,
          monsterName: monster.name,
          duration,
          won: finalWon,
        };

        const newWins = finalWon ? state.wins + 1 : state.wins;
        const newLosses = finalLost ? state.losses + 1 : state.losses;

        set({
          currentMonster: finalWon || finalLost ? null : updatedMonster,
          battleLogs: newLogs,
          battleTotalDamage: state.battleTotalDamage + damage,
          wins: newWins,
          losses: newLosses,
          lastBattleStats: finalWon || finalLost ? stats : null,
          showBattleResult: finalWon || finalLost,
        });

        if (finalWon) {
          const bonusRune = Math.random() > 0.5 ? rune : state.basicRunes[Math.floor(Math.random() * state.basicRunes.length)];
          get().addToInventory(bonusRune);
        }
      },

      setCooldown: (runeId) => {
        set((s) => {
          const newSet = new Set(s.cooldownRuneIds);
          newSet.add(runeId);
          return { cooldownRuneIds: newSet };
        });
        setTimeout(() => {
          set((s) => {
            const newSet = new Set(s.cooldownRuneIds);
            newSet.delete(runeId);
            return { cooldownRuneIds: newSet };
          });
        }, 1000);
      },

      clearBattle: () => {
        set({
          currentMonster: null,
          battleLogs: [],
          battleStartTime: null,
          battleTotalDamage: 0,
          showBattleResult: false,
          cooldownRuneIds: new Set(),
          scene: 'workshop',
        });
      },

      toggleBattleResult: (show) => set({ showBattleResult: show }),

      loadProgress: (progress) => {
        set({
          discoveredRecipes: progress.discoveredRecipes,
          inventory: progress.inventory.length > 0 ? progress.inventory : initialInventory,
          wins: progress.wins,
          losses: progress.losses,
        });
      },

      getProgress: () => {
        const s = get();
        return {
          discoveredRecipes: s.discoveredRecipes,
          inventory: s.inventory,
          wins: s.wins,
          losses: s.losses,
        };
      },

      resetGame: () => {
        set({
          scene: 'workshop',
          selectedSlots: [null, null],
          inventory: initialInventory,
          discoveredRecipes: [],
          wins: 0,
          losses: 0,
          currentMonster: null,
          battleLogs: [],
          battleStartTime: null,
          battleTotalDamage: 0,
          lastBattleStats: null,
          showInventory: false,
          showBattleResult: false,
          cooldownRuneIds: new Set(),
        });
      },
    }),
    {
      name: 'rune-workshop-storage',
      partialize: (state) => ({
        discoveredRecipes: state.discoveredRecipes,
        inventory: state.inventory,
        wins: state.wins,
        losses: state.losses,
      }),
    }
  )
);
