import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type ShipType = 'cruiser' | 'gunboat' | 'supply';
export type AmmoType = 'normal' | 'chain' | 'explosive';
export type Team = 'player' | 'enemy';
export type BattleStatus = 'idle' | 'playing' | 'victory' | 'defeat';

export interface Ship {
  id: string;
  name: string;
  type: ShipType;
  team: Team;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  attack: number;
  range: number;
  ammoType: AmmoType;
  targetX?: number;
  targetY?: number;
  isRetreating?: boolean;
}

export interface Island {
  id: string;
  x: number;
  y: number;
  name: string;
  goldMin: number;
  goldMax: number;
  woodMin: number;
  woodMax: number;
  collectingShipId?: string;
  collectProgress: number;
}

export interface Cannonball {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  progress: number;
  ammoType: AmmoType;
  damage: number;
  sourceId: string;
  targetId: string;
  path: { x: number; y: number }[];
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface BattleRecord {
  id: string;
  date: number;
  status: 'victory' | 'defeat';
  enemiesSunk: number;
  ownLosses: number;
  goldEarned: number;
  woodEarned: number;
  stars: number;
}

export interface Resources {
  gold: number;
  wood: number;
}

export interface UpgradeCost {
  gold: number;
  wood: number;
}

export interface GameState {
  playerShips: Ship[];
  enemyShips: Ship[];
  islands: Island[];
  cannonballs: Cannonball[];
  particles: Particle[];
  resources: Resources;
  selectedShipId: string | null;
  battleStatus: BattleStatus;
  battleRecords: BattleRecord[];
  currentBattleRecord: BattleRecord | null;
  showBattleResult: boolean;
  expandedShipId: string | null;
  upgradingShipId: string | null;
  toast: { message: string; visible: boolean } | null;

  selectShip: (id: string | null) => void;
  expandShip: (id: string | null) => void;
  moveShip: (shipId: string, x: number, y: number) => void;
  fireCannon: (sourceId: string, targetId: string) => void;
  upgradeShip: (shipId: string, stat: 'health' | 'speed' | 'attack') => void;
  changeAmmoType: (shipId: string, ammoType: AmmoType) => void;
  startNewBattle: () => void;
  collectResources: (shipId: string, islandId: string) => void;
  updateGameState: () => void;
  closeBattleResult: () => void;
  showToast: (message: string) => void;
  hideToast: () => void;
}

const getUpgradeCost = (ship: Ship, stat: 'health' | 'speed' | 'attack'): UpgradeCost => {
  const baseCost = { gold: 50, wood: 30 };
  const multiplier = stat === 'health' ? 1.5 : stat === 'attack' ? 2 : 1.2;
  return {
    gold: Math.floor(baseCost.gold * multiplier),
    wood: Math.floor(baseCost.wood * multiplier),
  };
};

const getUpgradeValue = (stat: 'health' | 'speed' | 'attack'): number => {
  switch (stat) {
    case 'health': return 20;
    case 'speed': return 0.5;
    case 'attack': return 5;
  }
};

const createInitialPlayerShips = (): Ship[] => [
  {
    id: uuidv4(),
    name: '黑珍珠号',
    type: 'cruiser',
    team: 'player',
    x: 150,
    y: 300,
    health: 100,
    maxHealth: 100,
    speed: 2.5,
    attack: 15,
    range: 150,
    ammoType: 'normal',
  },
  {
    id: uuidv4(),
    name: '皇家炮舰',
    type: 'gunboat',
    team: 'player',
    x: 150,
    y: 400,
    health: 80,
    maxHealth: 80,
    speed: 1.8,
    attack: 25,
    range: 180,
    ammoType: 'explosive',
  },
  {
    id: uuidv4(),
    name: '海上补给者',
    type: 'supply',
    team: 'player',
    x: 100,
    y: 350,
    health: 120,
    maxHealth: 120,
    speed: 1.5,
    attack: 8,
    range: 100,
    ammoType: 'chain',
  },
];

const createEnemyShips = (difficulty: number): Ship[] => {
  const count = Math.min(4, Math.max(2, Math.floor(difficulty / 2) + 2));
  const types: ShipType[] = ['cruiser', 'gunboat', 'supply'];
  const names = ['复仇者号', '幽灵号', '地狱犬号', '深渊号'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    name: names[i % names.length],
    type: types[i % types.length],
    team: 'enemy' as Team,
    x: 700 + Math.random() * 100,
    y: 200 + i * 120,
    health: 70 + difficulty * 10,
    maxHealth: 70 + difficulty * 10,
    speed: 1.5 + Math.random() * 1,
    attack: 10 + difficulty * 3,
    range: 130 + difficulty * 10,
    ammoType: (['normal', 'chain', 'explosive'] as AmmoType[])[i % 3],
  }));
};

const createIslands = (): Island[] => [
  { id: uuidv4(), x: 400, y: 150, name: '金银岛', goldMin: 60, goldMax: 100, woodMin: 30, woodMax: 50, collectProgress: 0 },
  { id: uuidv4(), x: 500, y: 500, name: '翡翠湾', goldMin: 50, goldMax: 80, woodMin: 40, woodMax: 60, collectProgress: 0 },
  { id: uuidv4(), x: 250, y: 550, name: '珊瑚礁', goldMin: 70, goldMax: 90, woodMin: 20, woodMax: 40, collectProgress: 0 },
];

export const useGameStore = create<GameState>((set, get) => ({
  playerShips: createInitialPlayerShips(),
  enemyShips: createEnemyShips(1),
  islands: createIslands(),
  cannonballs: [],
  particles: [],
  resources: { gold: 200, wood: 100 },
  selectedShipId: null,
  battleStatus: 'idle',
  battleRecords: [],
  currentBattleRecord: null,
  showBattleResult: false,
  expandedShipId: null,
  upgradingShipId: null,
  toast: null,

  selectShip: (id) => set({ selectedShipId: id }),

  expandShip: (id) => set((state) => ({ expandedShipId: state.expandedShipId === id ? null : id })),

  moveShip: (shipId, x, y) => {
    const { playerShips, battleStatus } = get();
    if (battleStatus !== 'playing' && battleStatus !== 'idle') return;
    const ship = playerShips.find(s => s.id === shipId);
    if (ship && ship.health > 0) {
      set({
        playerShips: playerShips.map(s =>
          s.id === shipId ? { ...s, targetX: x, targetY: y, isRetreating: false } : s
        ),
      });
    }
  },

  fireCannon: (sourceId, targetId) => {
    const { playerShips, enemyShips, cannonballs, battleStatus } = get();
    if (battleStatus !== 'playing') return;

    const source = playerShips.find(s => s.id === sourceId);
    const target = enemyShips.find(s => s.id === targetId);
    
    if (!source || !target || source.health <= 0 || target.health <= 0) return;

    const distance = Math.sqrt(
      Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)
    );

    if (distance > source.range) return;

    const pathPoints: { x: number; y: number }[] = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = source.x + (target.x - source.x) * t;
      const y = source.y + (target.y - source.y) * t - Math.sin(t * Math.PI) * 50;
      pathPoints.push({ x, y });
    }

    const damage = source.attack * (source.ammoType === 'explosive' ? 1.5 : source.ammoType === 'chain' ? 0.8 : 1);

    const newCannonball: Cannonball = {
      id: uuidv4(),
      x: source.x,
      y: source.y,
      startX: source.x,
      startY: source.y,
      targetX: target.x,
      targetY: target.y,
      progress: 0,
      ammoType: source.ammoType,
      damage,
      sourceId,
      targetId,
      path: pathPoints,
    };

    set({ cannonballs: [...cannonballs, newCannonball] });
  },

  upgradeShip: (shipId, stat) => {
    const { playerShips, resources } = get();
    const ship = playerShips.find(s => s.id === shipId);
    if (!ship) return;

    const cost = getUpgradeCost(ship, stat);
    if (resources.gold < cost.gold || resources.wood < cost.wood) {
      get().showToast('资源不足！');
      return;
    }

    const upgradeValue = getUpgradeValue(stat);

    set({
      upgradingShipId: shipId,
      resources: {
        gold: resources.gold - cost.gold,
        wood: resources.wood - cost.wood,
      },
      playerShips: playerShips.map(s => {
        if (s.id !== shipId) return s;
        if (stat === 'health') {
          return { ...s, maxHealth: s.maxHealth + upgradeValue, health: s.health + upgradeValue };
        }
        return { ...s, [stat]: s[stat] + upgradeValue };
      }),
    });

    get().showToast('升级成功！');

    setTimeout(() => {
      set({ upgradingShipId: null });
    }, 600);
  },

  changeAmmoType: (shipId, ammoType) => {
    const { playerShips } = get();
    set({
      playerShips: playerShips.map(s =>
        s.id === shipId ? { ...s, ammoType } : s
      ),
    });
  },

  startNewBattle: () => {
    const difficulty = get().battleRecords.length + 1;
    set({
      enemyShips: createEnemyShips(difficulty),
      cannonballs: [],
      particles: [],
      battleStatus: 'playing',
      showBattleResult: false,
      currentBattleRecord: {
        id: uuidv4(),
        date: Date.now(),
        status: 'victory',
        enemiesSunk: 0,
        ownLosses: 0,
        goldEarned: 0,
        woodEarned: 0,
        stars: 0,
      },
    });
    get().showToast('战斗开始！');
  },

  collectResources: (shipId, islandId) => {
    const { islands, playerShips } = get();
    const island = islands.find(i => i.id === islandId);
    const ship = playerShips.find(s => s.id === shipId);
    
    if (!island || !ship || island.collectingShipId) return;
    
    const distance = Math.sqrt(
      Math.pow(island.x - ship.x, 2) + Math.pow(island.y - ship.y, 2)
    );
    
    if (distance < 50) {
      set({
        islands: islands.map(i =>
          i.id === islandId ? { ...i, collectingShipId: shipId, collectProgress: 0 } : i
        ),
      });
    }
  },

  updateGameState: () => {
    const state = get();
    if (state.battleStatus !== 'playing' && state.battleStatus !== 'idle') return;

    const newParticles: Particle[] = [...state.particles];
    let newEnemyShips = [...state.enemyShips];
    let newPlayerShips = [...state.playerShips];
    let newCannonballs = [...state.cannonballs];
    let newIslands = [...state.islands];
    let newResources = { ...state.resources };
    let enemiesSunk = state.currentBattleRecord?.enemiesSunk || 0;
    let ownLosses = state.currentBattleRecord?.ownLosses || 0;
    let goldEarned = state.currentBattleRecord?.goldEarned || 0;
    let woodEarned = state.currentBattleRecord?.woodEarned || 0;

    const updateShipPosition = (ship: Ship): Ship => {
      if (ship.health <= 0 || ship.targetX === undefined || ship.targetY === undefined) {
        return ship;
      }

      const dx = ship.targetX - ship.x;
      const dy = ship.targetY - ship.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < ship.speed) {
        return { ...ship, x: ship.targetX, y: ship.targetY, targetX: undefined, targetY: undefined };
      }

      return {
        ...ship,
        x: ship.x + (dx / distance) * ship.speed,
        y: ship.y + (dy / distance) * ship.speed,
      };
    };

    newPlayerShips = newPlayerShips.map(updateShipPosition);
    newEnemyShips = newEnemyShips.map(updateShipPosition);

    newCannonballs = newCannonballs.map(cannonball => {
      const newProgress = cannonball.progress + 0.03;
      const pathIndex = Math.min(
        Math.floor(newProgress * cannonball.path.length),
        cannonball.path.length - 1
      );
      const pos = cannonball.path[pathIndex];
      
      return {
        ...cannonball,
        progress: newProgress,
        x: pos.x,
        y: pos.y,
      };
    });

    const hitCannonballs = newCannonballs.filter(c => c.progress >= 1);
    newCannonballs = newCannonballs.filter(c => c.progress < 1);

    hitCannonballs.forEach(cannonball => {
      const targetShip = cannonball.sourceId.startsWith('enemy-') 
        ? newPlayerShips.find(s => s.id === cannonball.targetId)
        : newEnemyShips.find(s => s.id === cannonball.targetId);
      
      if (targetShip && targetShip.health > 0) {
        const particleColor = cannonball.ammoType === 'normal' ? '#FFD700' : 
                              cannonball.ammoType === 'chain' ? '#C0C0C0' : '#FF6B35';
        
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12;
          const speed = 2 + Math.random() * 3;
          newParticles.push({
            id: uuidv4(),
            x: cannonball.targetX,
            y: cannonball.targetY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 1,
            color: particleColor,
            size: 3 + Math.random() * 4,
          });
        }

        const newHealth = targetShip.health - cannonball.damage;
        
        if (cannonball.sourceId.startsWith('enemy-')) {
          newPlayerShips = newPlayerShips.map(s =>
            s.id === cannonball.targetId ? { ...s, health: Math.max(0, newHealth) } : s
          );
          if (newHealth <= 0) ownLosses++;
        } else {
          newEnemyShips = newEnemyShips.map(s =>
            s.id === cannonball.targetId ? { ...s, health: Math.max(0, newHealth) } : s
          );
          if (newHealth <= 0) {
            enemiesSunk++;
            goldEarned += Math.floor(Math.random() * 50) + 30;
            woodEarned += Math.floor(Math.random() * 30) + 10;
          }
        }
      }
    });

    newIslands = newIslands.map(island => {
      if (!island.collectingShipId) return island;
      
      const ship = newPlayerShips.find(s => s.id === island.collectingShipId);
      if (!ship || ship.health <= 0) {
        return { ...island, collectingShipId: undefined, collectProgress: 0 };
      }

      const newProgress = island.collectProgress + 1 / (60 * 3);
      
      if (newProgress >= 1) {
        const gold = Math.floor(Math.random() * (island.goldMax - island.goldMin + 1)) + island.goldMin;
        const wood = Math.floor(Math.random() * (island.woodMax - island.woodMin + 1)) + island.woodMin;
        newResources.gold += gold;
        newResources.wood += wood;
        goldEarned += gold;
        woodEarned += wood;
        get().showToast(`采集完成！获得 ${gold} 金币, ${wood} 木材`);
        return { ...island, collectingShipId: undefined, collectProgress: 0 };
      }
      
      return { ...island, collectProgress: newProgress };
    });

    const updatedParticles: Particle[] = [];
    newParticles.forEach(p => {
      const newLife = p.life - 1 / (60 * 0.6);
      if (newLife > 0) {
        updatedParticles.push({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1,
          life: newLife,
        });
      }
    });

    newEnemyShips.filter(s => s.isRetreating && s.health > 0).forEach(ship => {
      if (Math.random() < 0.3) {
        updatedParticles.push({
          id: uuidv4(),
          x: ship.x - 15,
          y: ship.y,
          vx: -2 - Math.random() * 2,
          vy: -1 - Math.random(),
          life: 1,
          maxLife: 1,
          color: 'rgba(128, 128, 128, 0.6)',
          size: 4 + Math.random() * 6,
        });
      }
    });

    const aliveEnemies = newEnemyShips.filter(s => s.health > 0).length;
    const alivePlayer = newPlayerShips.filter(s => s.health > 0).length;

    let newBattleStatus = state.battleStatus;
    let newShowBattleResult = state.showBattleResult;
    let newBattleRecord = state.currentBattleRecord;

    if (state.battleStatus === 'playing') {
      if (aliveEnemies === 0) {
        const totalEnemies = state.enemyShips.length;
        const lossRatio = ownLosses / newPlayerShips.length;
        let stars = 1;
        if (lossRatio === 0) stars = 3;
        else if (lossRatio < 0.3) stars = 2;

        newBattleRecord = {
          id: uuidv4(),
          date: Date.now(),
          status: 'victory',
          enemiesSunk,
          ownLosses,
          goldEarned,
          woodEarned,
          stars,
        };
        newBattleStatus = 'victory';
        newShowBattleResult = true;
      } else if (alivePlayer === 0) {
        newBattleRecord = {
          id: uuidv4(),
          date: Date.now(),
          status: 'defeat',
          enemiesSunk,
          ownLosses,
          goldEarned: Math.floor(goldEarned * 0.5),
          woodEarned: Math.floor(woodEarned * 0.5),
          stars: 0,
        };
        newBattleStatus = 'defeat';
        newShowBattleResult = true;
      }
    }

    if (newBattleRecord && newBattleRecord !== state.currentBattleRecord) {
      newResources.gold += newBattleRecord.goldEarned;
      newResources.wood += newBattleRecord.woodEarned;
    }

    set({
      playerShips: newPlayerShips,
      enemyShips: newEnemyShips,
      cannonballs: newCannonballs,
      particles: updatedParticles,
      islands: newIslands,
      resources: newResources,
      battleStatus: newBattleStatus,
      showBattleResult: newShowBattleResult,
      battleRecords: newBattleRecord && newBattleStatus !== 'playing'
        ? [...state.battleRecords, newBattleRecord]
        : state.battleRecords,
      currentBattleRecord: newBattleRecord,
    });
  },

  closeBattleResult: () => {
    const { playerShips } = get();
    set({
      showBattleResult: false,
      battleStatus: 'idle',
      playerShips: playerShips.map(s => ({
        ...s,
        health: s.maxHealth,
        x: 150 + Math.random() * 50,
        y: 250 + Math.random() * 200,
        targetX: undefined,
        targetY: undefined,
        isRetreating: false,
      })),
      enemyShips: [],
      cannonballs: [],
      particles: [],
    });
  },

  showToast: (message) => {
    set({ toast: { message, visible: true } });
    setTimeout(() => {
      set({ toast: null });
    }, 1000);
  },

  hideToast: () => set({ toast: null }),
}));

export { getUpgradeCost, getUpgradeValue };
