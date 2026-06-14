import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Planet, ResourceType, Station, ShipAttributes, CombatLog, PirateShip, PartType } from './types';

export interface PlayerPosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Resources {
  metal: number;
  crystal: number;
  darkMatter: number;
  gas: number;
  gold: number;
}

export interface Ship {
  attributes: ShipAttributes;
  currentShield: number;
  currentHull: number;
}

export interface CollectingState {
  planetId: string;
  startTime: number;
  duration: number;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'danger';
  startTime: number;
  duration: number;
}

export interface GameState {
  isPaused: boolean;
  isInCombat: boolean;
  isCollecting: boolean;
  showUpgradePanel: boolean;
  showInventoryPanel: boolean;
  showTradeStation: boolean;
  showCollectionPanel: boolean;
  showPirateAlert: boolean;
  alertStartTime: number;
  playerPosition: PlayerPosition;
  resources: Resources;
  ship: Ship;
  planets: Planet[];
  stations: Station[];
  exploredPlanets: Set<string>;
  harvestedPlanets: Set<string>;
  currentCombat: {
    enemy: PirateShip | null;
    logs: CombatLog[];
    playerTurn: boolean;
  };
  collectingState: CollectingState | null;
  selectedPlanet: Planet | null;
  notifications: Notification[];
  keys: Set<string>;
  addNotification: (message: string, type: Notification['type']) => void;
  removeNotification: (id: string) => void;
  setKey: (key: string, pressed: boolean) => void;
  updatePlayerPosition: (pos: Partial<PlayerPosition>) => void;
  togglePause: () => void;
  explorePlanet: (planetId: string) => void;
  startCollection: (planetId: string) => void;
  finishCollection: () => void;
  cancelCollection: () => void;
  selectPlanet: (planet: Planet | null) => void;
  setShowCollectionPanel: (show: boolean) => void;
  startCombat: (enemy: PirateShip) => void;
  endCombat: (victory: boolean) => void;
  addCombatLog: (log: CombatLog) => void;
  setPlayerTurn: (turn: boolean) => void;
  takeDamage: (amount: number) => void;
  healShip: (amount: number) => void;
  upgradeAttribute: (attr: keyof ShipAttributes, amount: number, cost: Partial<Resources>) => void;
  addResources: (resources: Partial<Resources>) => void;
  spendResources: (resources: Partial<Resources>) => boolean;
  setShowUpgradePanel: (show: boolean) => void;
  setShowInventoryPanel: (show: boolean) => void;
  setShowTradeStation: (show: boolean) => void;
  setShowPirateAlert: (show: boolean, startTime: number) => void;
  setIsInCombat: (inCombat: boolean) => void;
  updateEnemy: (enemy: PirateShip) => void;
  resetPlayerPosition: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  isPaused: false,
  isInCombat: false,
  isCollecting: false,
  showUpgradePanel: false,
  showInventoryPanel: false,
  showTradeStation: false,
  showCollectionPanel: false,
  showPirateAlert: false,
  alertStartTime: 0,
  playerPosition: { x: 0, y: 0, vx: 0, vy: 0 },
  resources: { metal: 50, crystal: 30, darkMatter: 5, gas: 20, gold: 100 },
  ship: {
    attributes: {
      shield: 100,
      hull: 150,
      damage: 25,
      speed: 5,
      cargo: 200,
    },
    currentShield: 100,
    currentHull: 150,
  },
  planets: [],
  stations: [
    { id: 'station-1', x: 100, y: 100, type: 'upgrade' },
    { id: 'station-2', x: -150, y: 200, type: 'trade' },
    { id: 'station-3', x: 200, y: -180, type: 'upgrade' },
    { id: 'station-4', x: -200, y: -150, type: 'trade' },
  ],
  exploredPlanets: new Set(),
  harvestedPlanets: new Set(),
  currentCombat: {
    enemy: null,
    logs: [],
    playerTurn: true,
  },
  collectingState: null,
  selectedPlanet: null,
  notifications: [],
  keys: new Set(),

  addNotification: (message, type) => {
    const id = uuidv4();
    const notification: Notification = {
      id,
      message,
      type,
      startTime: Date.now(),
      duration: 2000,
    };
    set((state) => ({
      notifications: [...state.notifications, notification],
    }));
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  setKey: (key, pressed) => {
    set((state) => {
      const newKeys = new Set(state.keys);
      if (pressed) {
        newKeys.add(key.toLowerCase());
      } else {
        newKeys.delete(key.toLowerCase());
      }
      return { keys: newKeys };
    });
  },

  updatePlayerPosition: (pos) => {
    set((state) => ({
      playerPosition: { ...state.playerPosition, ...pos },
    }));
  },

  togglePause: () => {
    set((state) => ({ isPaused: !state.isPaused }));
  },

  explorePlanet: (planetId) => {
    set((state) => {
      const newExplored = new Set(state.exploredPlanets);
      newExplored.add(planetId);
      return { exploredPlanets: newExplored };
    });
  },

  startCollection: (planetId) => {
    set({
      isCollecting: true,
      collectingState: {
        planetId,
        startTime: Date.now(),
        duration: 5000,
      },
    });
  },

  finishCollection: () => {
    const { collectingState, planets, ship } = get();
    if (!collectingState) return;

    const planet = planets.find((p) => p.id === collectingState.planetId);
    if (!planet) return;

    const resourceAmount = Math.floor(planet.reserve * 0.3 + Math.random() * planet.reserve * 0.4);
    const resourceKey = planet.resourceType as keyof Resources;
    const totalResources = Object.values(get().resources).reduce((a, b) => a + b, 0);
    const availableSpace = ship.attributes.cargo - totalResources;
    const actualAmount = Math.min(resourceAmount, availableSpace);

    if (actualAmount > 0) {
      set((state) => {
        const newHarvested = new Set(state.harvestedPlanets);
        newHarvested.add(collectingState.planetId);
        return {
          resources: {
            ...state.resources,
            [resourceKey]: state.resources[resourceKey] + actualAmount,
          },
          harvestedPlanets: newHarvested,
        };
      });
      get().addNotification(`采集完成！获得 ${actualAmount} ${getResourceName(planet.resourceType)}`, 'success');
    } else {
      get().addNotification('货仓已满！', 'warning');
    }

    set({
      isCollecting: false,
      collectingState: null,
      showCollectionPanel: false,
      selectedPlanet: null,
    });
  },

  cancelCollection: () => {
    set({
      isCollecting: false,
      collectingState: null,
    });
  },

  selectPlanet: (planet) => {
    set({ selectedPlanet: planet });
  },

  setShowCollectionPanel: (show) => {
    set({ showCollectionPanel: show });
  },

  startCombat: (enemy) => {
    set({
      isInCombat: true,
      showPirateAlert: false,
      currentCombat: {
        enemy,
        logs: [{ id: uuidv4(), message: `遭遇 ${enemy.name}！准备战斗！`, type: 'info', timestamp: Date.now() }],
        playerTurn: true,
      },
    });
  },

  endCombat: (victory) => {
    const { currentCombat } = get();
    if (victory && currentCombat.enemy) {
      const loot = generateLoot(currentCombat.enemy.level);
      set((state) => ({
        resources: {
          metal: state.resources.metal + (loot.metal || 0),
          crystal: state.resources.crystal + (loot.crystal || 0),
          darkMatter: state.resources.darkMatter + (loot.darkMatter || 0),
          gas: state.resources.gas + (loot.gas || 0),
          gold: state.resources.gold + (loot.gold || 0),
        },
      }));
      get().addNotification('战斗胜利！获得战利品！', 'success');
    } else {
      set((state) => ({
        resources: {
          metal: Math.floor(state.resources.metal * 0.8),
          crystal: Math.floor(state.resources.crystal * 0.8),
          darkMatter: Math.floor(state.resources.darkMatter * 0.8),
          gas: Math.floor(state.resources.gas * 0.8),
          gold: Math.floor(state.resources.gold * 0.8),
        },
        ship: {
          ...state.ship,
          currentShield: state.ship.attributes.shield,
          currentHull: Math.floor(state.ship.attributes.hull * 0.5),
        },
      }));
      get().addNotification('战斗失败！损失部分资源...', 'danger');
      get().resetPlayerPosition();
    }

    set({
      isInCombat: false,
      currentCombat: { enemy: null, logs: [], playerTurn: true },
    });
  },

  addCombatLog: (log) => {
    set((state) => ({
      currentCombat: {
        ...state.currentCombat,
        logs: [...state.currentCombat.logs.slice(-20), log],
      },
    }));
  },

  setPlayerTurn: (turn) => {
    set((state) => ({
      currentCombat: { ...state.currentCombat, playerTurn: turn },
    }));
  },

  takeDamage: (amount) => {
    set((state) => {
      let remainingDamage = amount;
      let newShield = state.ship.currentShield;
      let newHull = state.ship.currentHull;

      if (newShield > 0) {
        const shieldDamage = Math.min(newShield, remainingDamage);
        newShield -= shieldDamage;
        remainingDamage -= shieldDamage;
      }

      if (remainingDamage > 0) {
        newHull -= remainingDamage;
      }

      return {
        ship: {
          ...state.ship,
          currentShield: Math.max(0, newShield),
          currentHull: Math.max(0, newHull),
        },
      };
    });
  },

  healShip: (amount) => {
    set((state) => ({
      ship: {
        ...state.ship,
        currentShield: Math.min(state.ship.attributes.shield, state.ship.currentShield + amount),
        currentHull: Math.min(state.ship.attributes.hull, state.ship.currentHull + amount),
      },
    }));
  },

  upgradeAttribute: (attr, amount, cost) => {
    const state = get();
    const canAfford = Object.entries(cost).every(
      ([key, value]) => state.resources[key as keyof Resources] >= (value || 0)
    );

    if (!canAfford) {
      get().addNotification('资源不足！', 'warning');
      return;
    }

    set((state) => ({
      ship: {
        ...state.ship,
        attributes: {
          ...state.ship.attributes,
          [attr]: state.ship.attributes[attr] + amount,
        },
        currentShield: attr === 'shield' ? state.ship.attributes.shield + amount : state.ship.currentShield,
        currentHull: attr === 'hull' ? state.ship.attributes.hull + amount : state.ship.currentHull,
      },
      resources: {
        metal: state.resources.metal - (cost.metal || 0),
        crystal: state.resources.crystal - (cost.crystal || 0),
        darkMatter: state.resources.darkMatter - (cost.darkMatter || 0),
        gas: state.resources.gas - (cost.gas || 0),
        gold: state.resources.gold - (cost.gold || 0),
      },
    }));
    get().addNotification(`升级成功！${getAttributeName(attr)} +${amount}`, 'success');
  },

  addResources: (resources) => {
    set((state) => ({
      resources: {
        metal: state.resources.metal + (resources.metal || 0),
        crystal: state.resources.crystal + (resources.crystal || 0),
        darkMatter: state.resources.darkMatter + (resources.darkMatter || 0),
        gas: state.resources.gas + (resources.gas || 0),
        gold: state.resources.gold + (resources.gold || 0),
      },
    }));
  },

  spendResources: (resources) => {
    const state = get();
    const canAfford = Object.entries(resources).every(
      ([key, value]) => state.resources[key as keyof Resources] >= (value || 0)
    );

    if (!canAfford) return false;

    set((state) => ({
      resources: {
        metal: state.resources.metal - (resources.metal || 0),
        crystal: state.resources.crystal - (resources.crystal || 0),
        darkMatter: state.resources.darkMatter - (resources.darkMatter || 0),
        gas: state.resources.gas - (resources.gas || 0),
        gold: state.resources.gold - (resources.gold || 0),
      },
    }));
    return true;
  },

  setShowUpgradePanel: (show) => {
    set({ showUpgradePanel: show });
  },

  setShowInventoryPanel: (show) => {
    set({ showInventoryPanel: show });
  },

  setShowTradeStation: (show) => {
    set({ showTradeStation: show });
  },

  setShowPirateAlert: (show, startTime) => {
    set({ showPirateAlert: show, alertStartTime: startTime });
  },

  setIsInCombat: (inCombat) => {
    set({ isInCombat: inCombat });
  },

  updateEnemy: (enemy) => {
    set((state) => ({
      currentCombat: { ...state.currentCombat, enemy },
    }));
  },

  resetPlayerPosition: () => {
    const { stations } = get();
    const nearestStation = stations.reduce((nearest, station) => {
      const dist = Math.sqrt(station.x * station.x + station.y * station.y);
      const nearestDist = Math.sqrt(nearest.x * nearest.x + nearest.y * nearest.y);
      return dist < nearestDist ? station : nearest;
    });
    set({
      playerPosition: { x: nearestStation.x, y: nearestStation.y, vx: 0, vy: 0 },
    });
  },
}));

function getResourceName(type: ResourceType): string {
  const names: Record<ResourceType, string> = {
    metal: '金属矿',
    crystal: '水晶矿',
    darkMatter: '暗物质',
    gas: '气体矿',
    gold: '金币',
  };
  return names[type];
}

function getAttributeName(attr: keyof ShipAttributes): string {
  const names: Record<keyof ShipAttributes, string> = {
    shield: '护盾值',
    hull: '船体厚度',
    damage: '主武器伤害',
    speed: '引擎速度',
    cargo: '货仓容量',
  };
  return names[attr];
}

function generateLoot(level: number): Partial<Resources> {
  const loot: Partial<Resources> = {};
  const types: ResourceType[] = ['metal', 'crystal', 'darkMatter', 'gas', 'gold'];
  const numTypes = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < numTypes; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const baseAmount = Math.floor(Math.random() * 20 + 10) * level;
    loot[type] = (loot[type] || 0) + baseAmount;
  }

  return loot;
}
