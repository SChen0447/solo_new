import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Pokemon, Skill, BattleLog, ElementType, BattleState, ReplayState } from '@/types';
import { elementStats } from '@/data/elementStats';
import { skillPool } from '@/data/skills';
import {
  executeTurn,
  checkBattleEnd,
  getNextAliveIndex,
  generateEnemyTeam,
} from '@/utils/battleEngine';

interface AppState {
  pokemonList: Pokemon[];
  selectedPokemonIds: string[];
  battle: BattleState;
  replay: ReplayState;
  editingPokemonId: string | null;
  showSkillSelector: boolean;

  createPokemon: (name: string, type: ElementType) => void;
  deletePokemon: (id: string) => void;
  addSkillToPokemon: (pokemonId: string, skill: Skill) => void;
  removeSkillFromPokemon: (pokemonId: string, skillId: string) => void;
  togglePokemonSelection: (id: string) => void;
  setEditingPokemonId: (id: string | null) => void;
  setShowSkillSelector: (show: boolean) => void;

  startBattle: () => void;
  executeBattleTurn: (playerSkillIndex: number) => void;
  resetBattle: () => void;

  startReplay: () => void;
  pauseReplay: () => void;
  resumeReplay: () => void;
  stepReplayForward: () => void;
  resetReplay: () => void;
  setReplayIndex: (index: number) => void;
}

function generateStats(type: ElementType): {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
} {
  const stats = elementStats[type];
  return {
    hp: Math.floor(stats.hp[0] + Math.random() * (stats.hp[1] - stats.hp[0])),
    attack: Math.floor(stats.attack[0] + Math.random() * (stats.attack[1] - stats.attack[0])),
    defense: Math.floor(stats.defense[0] + Math.random() * (stats.defense[1] - stats.defense[0])),
    speed: Math.floor(stats.speed[0] + Math.random() * (stats.speed[1] - stats.speed[0])),
  };
}

const initialBattleState: BattleState = {
  playerTeam: [],
  enemyTeam: [],
  currentPlayerIndex: 0,
  currentEnemyIndex: 0,
  logs: [],
  isInBattle: false,
  isBattleOver: false,
  winner: null,
  turn: 0,
};

const initialReplayState: ReplayState = {
  isReplaying: false,
  isPaused: false,
  currentLogIndex: -1,
};

export const useAppStore = create<AppState>((set, get) => ({
  pokemonList: [],
  selectedPokemonIds: [],
  battle: initialBattleState,
  replay: initialReplayState,
  editingPokemonId: null,
  showSkillSelector: false,

  createPokemon: (name, type) => {
    const stats = generateStats(type);
    const newPokemon: Pokemon = {
      id: uuidv4(),
      name,
      type,
      hp: stats.hp,
      maxHp: stats.hp,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      skills: [],
    };
    set((state) => ({
      pokemonList: [...state.pokemonList, newPokemon],
    }));
  },

  deletePokemon: (id) => {
    set((state) => ({
      pokemonList: state.pokemonList.filter((p) => p.id !== id),
      selectedPokemonIds: state.selectedPokemonIds.filter((pid) => pid !== id),
    }));
  },

  addSkillToPokemon: (pokemonId, skill) => {
    set((state) => ({
      pokemonList: state.pokemonList.map((p) => {
        if (p.id !== pokemonId) return p;
        if (p.skills.length >= 3) return p;
        if (p.skills.find((s) => s.id === skill.id)) return p;
        return {
          ...p,
          skills: [...p.skills, { ...skill, id: uuidv4(), pp: skill.maxPp }],
        };
      }),
    }));
  },

  removeSkillFromPokemon: (pokemonId, skillId) => {
    set((state) => ({
      pokemonList: state.pokemonList.map((p) => {
        if (p.id !== pokemonId) return p;
        return {
          ...p,
          skills: p.skills.filter((s) => s.id !== skillId),
        };
      }),
    }));
  },

  togglePokemonSelection: (id) => {
    set((state) => {
      const isSelected = state.selectedPokemonIds.includes(id);
      if (isSelected) {
        return {
          selectedPokemonIds: state.selectedPokemonIds.filter((pid) => pid !== id),
        };
      }
      if (state.selectedPokemonIds.length >= 4) {
        return state;
      }
      return {
        selectedPokemonIds: [...state.selectedPokemonIds, id],
      };
    });
  },

  setEditingPokemonId: (id) => set({ editingPokemonId: id }),
  setShowSkillSelector: (show) => set({ showSkillSelector: show }),

  startBattle: () => {
    const { pokemonList, selectedPokemonIds } = get();
    const selectedPokemon = selectedPokemonIds
      .map((id) => pokemonList.find((p) => p.id === id))
      .filter((p): p is Pokemon => p !== undefined && p.skills.length > 0);

    if (selectedPokemon.length === 0) return;

    const playerTeam = selectedPokemon.map((p) => ({ ...p, hp: p.maxHp }));
    const enemyTeam = generateEnemyTeam(playerTeam);

    set({
      battle: {
        playerTeam,
        enemyTeam,
        currentPlayerIndex: 0,
        currentEnemyIndex: 0,
        logs: [],
        isInBattle: true,
        isBattleOver: false,
        winner: null,
        turn: 0,
      },
      replay: initialReplayState,
    });
  },

  executeBattleTurn: (playerSkillIndex) => {
    const state = get();
    const { battle } = state;

    if (!battle.isInBattle || battle.isBattleOver) return;

    const playerPokemon = battle.playerTeam[battle.currentPlayerIndex];
    const enemyPokemon = battle.enemyTeam[battle.currentEnemyIndex];

    if (!playerPokemon || !enemyPokemon) return;
    if (!playerPokemon.skills[playerSkillIndex]) return;

    const enemySkillIndex = Math.floor(Math.random() * enemyPokemon.skills.length);

    const turnResult = executeTurn(
      playerPokemon,
      enemyPokemon,
      playerSkillIndex,
      enemySkillIndex,
      battle.turn + 1,
    );

    const newPlayerTeam = [...battle.playerTeam];
    const newEnemyTeam = [...battle.enemyTeam];

    newPlayerTeam[battle.currentPlayerIndex] = {
      ...playerPokemon,
      hp: turnResult.playerHp,
    };
    newEnemyTeam[battle.currentEnemyIndex] = {
      ...enemyPokemon,
      hp: turnResult.enemyHp,
    };

    let newPlayerIndex = battle.currentPlayerIndex;
    let newEnemyIndex = battle.currentEnemyIndex;

    if (turnResult.playerHp <= 0) {
      const nextIndex = getNextAliveIndex(newPlayerTeam, battle.currentPlayerIndex);
      newPlayerIndex = nextIndex;
    }
    if (turnResult.enemyHp <= 0) {
      const nextIndex = getNextAliveIndex(newEnemyTeam, battle.currentEnemyIndex);
      newEnemyIndex = nextIndex;
    }

    const winner = checkBattleEnd(newPlayerTeam, newEnemyTeam);
    const isBattleOver = winner !== null;

    set({
      battle: {
        ...battle,
        playerTeam: newPlayerTeam,
        enemyTeam: newEnemyTeam,
        currentPlayerIndex: newPlayerIndex,
        currentEnemyIndex: newEnemyIndex,
        logs: [...battle.logs, ...turnResult.logs],
        turn: battle.turn + 1,
        isBattleOver,
        winner,
        isInBattle: !isBattleOver,
      },
    });
  },

  resetBattle: () => {
    set({
      battle: initialBattleState,
      replay: initialReplayState,
    });
  },

  startReplay: () => {
    set({
      replay: {
        isReplaying: true,
        isPaused: false,
        currentLogIndex: -1,
      },
    });
  },

  pauseReplay: () => {
    set((state) => ({
      replay: { ...state.replay, isPaused: true },
    }));
  },

  resumeReplay: () => {
    set((state) => ({
      replay: { ...state.replay, isPaused: false },
    }));
  },

  stepReplayForward: () => {
    const state = get();
    const { battle, replay } = state;

    if (replay.currentLogIndex >= battle.logs.length - 1) {
      set({ replay: { ...replay, isReplaying: false, isPaused: false } });
      return;
    }

    set({
      replay: {
        ...replay,
        currentLogIndex: replay.currentLogIndex + 1,
      },
    });
  },

  resetReplay: () => {
    set({
      replay: {
        isReplaying: false,
        isPaused: false,
        currentLogIndex: -1,
      },
    });
  },

  setReplayIndex: (index) => {
    set((state) => ({
      replay: { ...state.replay, currentLogIndex: index },
    }));
  },
}));
