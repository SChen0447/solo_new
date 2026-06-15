import { create } from 'zustand';
import { generateDungeon, Cell, CellType } from '../game/dungeonGenerator';
import { resolveCombat, checkAgilitySave, rollDice } from '../game/diceSystem';

export type InventoryItemType = 'potion' | 'key' | 'rune';

export interface InventoryItem {
  id: string;
  type: InventoryItemType;
  name: string;
  effect?: number;
}

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  gold: number;
  exp: number;
  level: number;
  attackBonus: number;
  inventory: InventoryItem[];
}

export type LogType = 'move' | 'battle' | 'pickup' | 'system' | 'trap' | 'heal';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  message: string;
}

export interface BattleState {
  monsterX: number;
  monsterY: number;
  monsterHp: number;
  monsterMaxHp: number;
  monsterDefense: number;
  lastRoll: number | null;
  lastHit: boolean | null;
  lastDamage: number;
  isAnimating: boolean;
  showMiss: boolean;
}

export interface ReplayState {
  enabled: boolean;
  snapshotQueue: Array<{
    player: PlayerState;
    dungeon: Cell[][];
    log: LogEntry;
  }>;
  currentIndex: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  type: 'gold';
}

interface GameState {
  dungeon: Cell[][];
  rows: number;
  cols: number;
  player: PlayerState;
  logs: LogEntry[];
  battleState: BattleState | null;
  replay: ReplayState;
  particles: Particle[];
  gameOver: boolean;
  victory: boolean;
  cellAnimations: Map<string, number>;

  initGame: () => void;
  movePlayer: (x: number, y: number) => void;
  attackMonster: () => void;
  closeBattle: () => void;
  useItem: (itemId: string) => void;
  discardItem: (itemId: string) => void;
  addLog: (type: LogType, message: string) => void;
  clearLogs: () => void;
  exportLogs: () => string;
  startReplay: () => void;
  stopReplay: () => void;
  removeParticle: (id: string) => void;
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getTimestamp(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function createInitialPlayer(): PlayerState {
  return {
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    gold: 0,
    exp: 0,
    level: 1,
    attackBonus: 5,
    inventory: [],
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  dungeon: [],
  rows: 0,
  cols: 0,
  player: createInitialPlayer(),
  logs: [],
  battleState: null,
  replay: { enabled: false, snapshotQueue: [], currentIndex: 0 },
  particles: [],
  gameOver: false,
  victory: false,
  cellAnimations: new Map(),

  initGame: () => {
    const { dungeon, rows, cols } = generateDungeon();
    const animations = new Map<string, number>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        animations.set(`${r}-${c}`, r * 0.03 + c * 0.03);
      }
    }
    set({
      dungeon,
      rows,
      cols,
      player: createInitialPlayer(),
      logs: [],
      battleState: null,
      replay: { enabled: false, snapshotQueue: [], currentIndex: 0 },
      particles: [],
      gameOver: false,
      victory: false,
      cellAnimations: animations,
    });
    get().addLog('system', '新的冒险开始了！探索地宫寻找宝藏吧。');
  },

  movePlayer: (x: number, y: number) => {
    const state = get();
    if (state.battleState || state.gameOver || state.replay.enabled) return;

    const { player, dungeon, rows, cols } = state;
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;

    const dx = Math.abs(x - player.x);
    const dy = Math.abs(y - player.y);
    if (dx + dy !== 1) return;

    if (player.stamina < 1) {
      get().addLog('system', '体力不足，无法移动！');
      return;
    }

    const newPlayer = { ...player, x, y, stamina: player.stamina - 1 };
    const newDungeon = dungeon.map(row => row.map(cell => ({ ...cell })));
    const cell = newDungeon[y][x];
    cell.revealed = true;

    set({ player: newPlayer, dungeon: newDungeon });
    get().addLog('move', `移动到 (${x}, ${y})`);

    switch (cell.type) {
      case CellType.TREASURE: {
        const gold = cell.data?.gold ?? 0;
        const px = (x + 0.5) * 60;
        const py = (y + 0.5) * 60;
        const newParticles: Particle[] = [];
        const particleCount = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < particleCount; i++) {
          newParticles.push({
            id: generateId(),
            x: px + (Math.random() - 0.5) * 30,
            y: py + (Math.random() - 0.5) * 30,
            type: 'gold',
          });
        }
        set(state => ({
          player: { ...state.player, gold: state.player.gold + gold },
          particles: [...state.particles, ...newParticles],
        }));
        get().addLog('pickup', `发现宝箱！获得 ${gold} 金币`);
        cell.type = CellType.EMPTY;
        cell.data = undefined;
        set({ dungeon: newDungeon });
        break;
      }
      case CellType.MONSTER: {
        set({
          battleState: {
            monsterX: x,
            monsterY: y,
            monsterHp: cell.data?.monsterHp ?? 30,
            monsterMaxHp: cell.data?.monsterMaxHp ?? 30,
            monsterDefense: cell.data?.monsterDefense ?? 12,
            lastRoll: null,
            lastHit: null,
            lastDamage: 0,
            isAnimating: false,
            showMiss: false,
          },
        });
        get().addLog('battle', `遭遇怪物！怪物血量 ${cell.data?.monsterHp ?? 30}`);
        break;
      }
      case CellType.TRAP: {
        const damage = cell.data?.trapDamage ?? 10;
        const saved = checkAgilitySave();
        if (saved) {
          get().addLog('trap', `触发陷阱！敏捷检定成功，成功闪避！`);
        } else {
          const newHp = Math.max(0, newPlayer.hp - damage);
          set(state => ({ player: { ...state.player, hp: newHp } }));
          get().addLog('trap', `触发陷阱！受到 ${damage} 点伤害`);
          if (newHp <= 0) {
            set({ gameOver: true });
            get().addLog('system', '你倒下了... 游戏结束');
          }
        }
        cell.type = CellType.EMPTY;
        cell.data = undefined;
        set({ dungeon: newDungeon });
        break;
      }
      case CellType.POTION: {
        const heal = cell.data?.potionHeal ?? 15;
        set(state => ({
          player: {
            ...state.player,
            hp: Math.min(state.player.maxHp, state.player.hp + heal),
          },
        }));
        get().addLog('heal', `发现药水！恢复 ${heal} 点生命值`);
        cell.type = CellType.EMPTY;
        cell.data = undefined;
        set({ dungeon: newDungeon });
        break;
      }
      case CellType.EXIT: {
        set({ victory: true });
        get().addLog('