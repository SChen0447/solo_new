import { create } from 'zustand';
import type { Wave, MonsterSpawn, MonsterType } from '../../types';
import { MONSTER_STATS } from '../../types';

interface EnemyState {
  waves: Wave[];
  currentWaveIndex: number | null;
  placingMonsterType: MonsterType | null;

  addWave: () => void;
  removeWave: (waveId: string) => void;
  setCurrentWave: (index: number | null) => void;
  addMonster: (waveId: string, type: MonsterType, x: number, y: number) => void;
  removeMonster: (waveId: string, monsterId: string) => void;
  moveMonster: (waveId: string, monsterId: string, x: number, y: number) => void;
  setPlacingMonsterType: (type: MonsterType | null) => void;
  getWaveStats: (waveIndex: number) => { totalHp: number; totalAttack: number; monsterCount: number };
  clearAllMonsters: (waveId: string) => void;
}

let waveIdCounter = 0;
let monsterIdCounter = 0;
const generateWaveId = () => `wave_${++waveIdCounter}`;
const generateMonsterId = () => `monster_${++monsterIdCounter}`;

export const useEnemyState = create<EnemyState>((set, get) => ({
  waves: [],
  currentWaveIndex: null,
  placingMonsterType: null,

  addWave: () => {
    const { waves } = get();
    if (waves.length >= 3) return;
    const newWave: Wave = {
      id: generateWaveId(),
      monsters: [],
    };
    set({ waves: [...waves, newWave] });
  },

  removeWave: (waveId) => {
    const { waves, currentWaveIndex } = get();
    const waveIdx = waves.findIndex((w) => w.id === waveId);
    const newWaves = waves.filter((w) => w.id !== waveId);
    
    let newCurrentIndex: number | null = null;
    if (currentWaveIndex !== null) {
      if (waveIdx < currentWaveIndex) {
        newCurrentIndex = currentWaveIndex - 1;
      } else if (waveIdx === currentWaveIndex) {
        newCurrentIndex = null;
      } else {
        newCurrentIndex = currentWaveIndex;
      }
    }
    
    set({ waves: newWaves, currentWaveIndex: newCurrentIndex });
  },

  setCurrentWave: (index) => set({ currentWaveIndex: index }),

  addMonster: (waveId, type, x, y) => {
    const { waves } = get();
    const newMonster: MonsterSpawn = {
      id: generateMonsterId(),
      type,
      x,
      y,
    };
    
    set({
      waves: waves.map((wave) =>
        wave.id === waveId
          ? { ...wave, monsters: [...wave.monsters, newMonster] }
          : wave
      ),
    });
  },

  removeMonster: (waveId, monsterId) => {
    const { waves } = get();
    set({
      waves: waves.map((wave) =>
        wave.id === waveId
          ? { ...wave, monsters: wave.monsters.filter((m) => m.id !== monsterId) }
          : wave
      ),
    });
  },

  moveMonster: (waveId, monsterId, x, y) => {
    const { waves } = get();
    set({
      waves: waves.map((wave) =>
        wave.id === waveId
          ? {
              ...wave,
              monsters: wave.monsters.map((m) =>
                m.id === monsterId ? { ...m, x, y } : m
              ),
            }
          : wave
      ),
    });
  },

  setPlacingMonsterType: (type) => set({ placingMonsterType: type }),

  getWaveStats: (waveIndex) => {
    const { waves } = get();
    const wave = waves[waveIndex];
    if (!wave) return { totalHp: 0, totalAttack: 0, monsterCount: 0 };

    let totalHp = 0;
    let totalAttack = 0;

    wave.monsters.forEach((monster) => {
      const stats = MONSTER_STATS[monster.type];
      totalHp += stats.hp;
      totalAttack += stats.attack;
    });

    return {
      totalHp,
      totalAttack,
      monsterCount: wave.monsters.length,
    };
  },

  clearAllMonsters: (waveId) => {
    const { waves } = get();
    set({
      waves: waves.map((wave) =>
        wave.id === waveId ? { ...wave, monsters: [] } : wave
      ),
    });
  },
}));
