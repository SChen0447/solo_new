import { create } from 'zustand';
import { CharacterConfig, createDefaultCharacter, BattleResult } from '@/configs/CharacterConfig';
import { AnalysisResult } from '@/core/Analyzer';

interface GameState {
  character1: CharacterConfig;
  character2: CharacterConfig;
  battleResults: BattleResult[];
  analysisResult: AnalysisResult | null;
  selectedBattleId: string | null;
  isRunning: boolean;

  setCharacter1Name: (name: string) => void;
  setCharacter2Name: (name: string) => void;
  setCharacter1Stats: (stats: Partial<CharacterConfig['stats']>) => void;
  setCharacter2Stats: (stats: Partial<CharacterConfig['stats']>) => void;
  toggleCharacter1Skill: (skillId: string) => void;
  toggleCharacter2Skill: (skillId: string) => void;
  setBattleResults: (results: BattleResult[]) => void;
  addBattleResult: (result: BattleResult) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setSelectedBattleId: (id: string | null) => void;
  setIsRunning: (running: boolean) => void;
  resetAll: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  character1: {
    ...createDefaultCharacter('char1', '战士'),
    skillIds: ['fire_blast', 'lightning_strike', 'power_up'],
  },
  character2: {
    ...createDefaultCharacter('char2', '法师'),
    skillIds: ['healing_light', 'water_shield', 'weaken'],
  },
  battleResults: [],
  analysisResult: null,
  selectedBattleId: null,
  isRunning: false,

  setCharacter1Name: (name) =>
    set((state) => ({ character1: { ...state.character1, name } })),
  setCharacter2Name: (name) =>
    set((state) => ({ character2: { ...state.character2, name } })),

  setCharacter1Stats: (stats) =>
    set((state) => ({
      character1: { ...state.character1, stats: { ...state.character1.stats, ...stats } },
    })),
  setCharacter2Stats: (stats) =>
    set((state) => ({
      character2: { ...state.character2, stats: { ...state.character2.stats, ...stats } },
    })),

  toggleCharacter1Skill: (skillId) =>
    set((state) => {
      const hasSkill = state.character1.skillIds.includes(skillId);
      let newSkillIds: string[];
      if (hasSkill) {
        newSkillIds = state.character1.skillIds.filter((id) => id !== skillId);
      } else if (state.character1.skillIds.length < 3) {
        newSkillIds = [...state.character1.skillIds, skillId];
      } else {
        return state;
      }
      return { character1: { ...state.character1, skillIds: newSkillIds } };
    }),

  toggleCharacter2Skill: (skillId) =>
    set((state) => {
      const hasSkill = state.character2.skillIds.includes(skillId);
      let newSkillIds: string[];
      if (hasSkill) {
        newSkillIds = state.character2.skillIds.filter((id) => id !== skillId);
      } else if (state.character2.skillIds.length < 3) {
        newSkillIds = [...state.character2.skillIds, skillId];
      } else {
        return state;
      }
      return { character2: { ...state.character2, skillIds: newSkillIds } };
    }),

  setBattleResults: (results) => set({ battleResults: results }),
  addBattleResult: (result) =>
    set((state) => ({ battleResults: [result, ...state.battleResults] })),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setSelectedBattleId: (id) => set({ selectedBattleId: id }),
  setIsRunning: (running) => set({ isRunning: running }),

  resetAll: () =>
    set({
      battleResults: [],
      analysisResult: null,
      selectedBattleId: null,
    }),
}));
