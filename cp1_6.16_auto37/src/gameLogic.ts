import { v4 as uuidv4 } from 'uuid';
import {
  Building,
  BuildingType,
  BUILDING_TYPES,
  GameState,
  INITIAL_RESOURCES,
  OfflineEarnings,
  ResourceCost,
  ResourceType,
  SAVE_KEY,
  GRID_SIZE,
  UPGRADE_COST_MULTIPLIER,
  UPGRADE_PRODUCTION_MULTIPLIER,
  WAREHOUSE_BONUS,
  WATCHTOWER_OFFLINE_BONUS,
  MAX_OFFLINE_HOURS
} from './types';

export function getBuildingType(typeId: string): BuildingType | undefined {
  return BUILDING_TYPES.find(t => t.id === typeId);
}

export function canAfford(
  resources: GameState['resources'],
  cost: ResourceCost
): boolean {
  return (Object.keys(cost) as ResourceType[]).every(
    type => resources[type].amount >= (cost[type] || 0)
  );
}

export function deductCost(
  resources: GameState['resources'],
  cost: ResourceCost
): GameState['resources'] {
  const newResources = { ...resources };
  (Object.keys(cost) as ResourceType[]).forEach(type => {
    newResources[type] = {
      ...newResources[type],
      amount: newResources[type].amount - (cost[type] || 0)
    };
  });
  return newResources;
}

export function buildBuilding(
  typeId: string,
  x: number,
  y: number
): Building {
  const buildingType = getBuildingType(typeId);
  if (!buildingType) {
    throw new Error(`Unknown building type: ${typeId}`);
  }

  return {
    id: uuidv4(),
    typeId,
    level: 1,
    x,
    y,
    isBuilding: true,
    buildProgress: 0,
    isUpgrading: false,
    upgradeProgress: 0,
    lastProductionTime: Date.now()
  };
}

export function getUpgradeCost(building: Building): ResourceCost {
  const buildingType = getBuildingType(building.typeId);
  if (!buildingType) return {};

  const multiplier = Math.pow(UPGRADE_COST_MULTIPLIER, building.level);
  const cost: ResourceCost = {};

  (Object.keys(buildingType.baseCost) as ResourceType[]).forEach(type => {
    const baseAmount = buildingType.baseCost[type] || 0;
    cost[type] = Math.floor(baseAmount * multiplier);
  });

  return cost;
}

export function getWarehouseBonus(buildings: Building[]): number {
  const warehouseCount = buildings.filter(
    b => b.typeId === 'warehouse' && !b.isBuilding
  ).length;
  return warehouseCount * WAREHOUSE_BONUS;
}

export function getWatchtowerBonus(buildings: Building[]): number {
  const watchtowerCount = buildings.filter(
    b => b.typeId === 'watchtower' && !b.isBuilding
  ).length;
  return watchtowerCount * WATCHTOWER_OFFLINE_BONUS;
}

export function getBuildingProductionMultiplier(building: Building): number {
  return Math.pow(UPGRADE_PRODUCTION_MULTIPLIER, building.level - 1);
}

export function calculateProduction(
  buildings: Building[]
): Record<ResourceType, number> {
  const production: Record<ResourceType, number> = {
    gold: 0,
    wood: 0,
    stone: 0
  };

  const warehouseBonus = getWarehouseBonus(buildings);

  buildings.forEach(building => {
    if (building.isBuilding || building.isUpgrading) return;

    const buildingType = getBuildingType(building.typeId);
    if (!buildingType) return;

    const levelMultiplier = getBuildingProductionMultiplier(building);
    const { produces, interval } = buildingType.baseProduction;

    if (produces) {
      (Object.keys(produces) as ResourceType[]).forEach(type => {
        const baseAmount = produces[type] || 0;
        const perSecond = interval ? baseAmount / interval : baseAmount;
        production[type] += perSecond * levelMultiplier * (1 + warehouseBonus);
      });
    }
  });

  return production;
}

export function findEmptySpot(
  buildings: Building[]
): { x: number; y: number } | null {
  const occupied = new Set(buildings.map(b => `${b.x},${b.y}`));
  const spots: { x: number; y: number }[] = [];

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!occupied.has(`${x},${y}`)) {
        spots.push({ x, y });
      }
    }
  }

  if (spots.length === 0) return null;
  return spots[Math.floor(Math.random() * spots.length)];
}

export function createInitialState(): GameState {
  return {
    resources: JSON.parse(JSON.stringify(INITIAL_RESOURCES)),
    buildings: [],
    lastSaveTime: Date.now(),
    totalPlayTime: 0
  };
}

export function saveGame(state: GameState): void {
  try {
    const saveData = {
      ...state,
      lastSaveTime: Date.now()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

export function loadGame(): GameState | null {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as GameState;
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
}

export function calculateOfflineEarnings(
  state: GameState,
  offlineSeconds: number
): OfflineEarnings {
  const maxSeconds = MAX_OFFLINE_HOURS * 3600;
  const actualSeconds = Math.min(offlineSeconds, maxSeconds);

  const production = calculateProduction(state.buildings);
  const watchtowerBonus = getWatchtowerBonus(state.buildings);
  const offlineMultiplier = 0.5 * (1 + watchtowerBonus);

  const earnings: Record<ResourceType, number> = {
    gold: 0,
    wood: 0,
    stone: 0
  };

  (Object.keys(production) as ResourceType[]).forEach(type => {
    earnings[type] = Math.floor(
      production[type] * actualSeconds * offlineMultiplier
    );
  });

  return {
    duration: actualSeconds,
    earnings
  };
}

export function addResources(
  resources: GameState['resources'],
  amount: Record<ResourceType, number>
): GameState['resources'] {
  const newResources = { ...resources };
  (Object.keys(amount) as ResourceType[]).forEach(type => {
    newResources[type] = {
      ...newResources[type],
      amount: newResources[type].amount + amount[type]
    };
  });
  return newResources;
}

export function tick(
  state: GameState,
  deltaTime: number
): GameState {
  const newState = { ...state };
  const now = Date.now();

  newState.buildings = newState.buildings.map(building => {
    const updated = { ...building };

    if (updated.isBuilding) {
      const buildingType = getBuildingType(updated.typeId);
      if (buildingType) {
        updated.buildProgress += deltaTime / buildingType.buildTime;
        if (updated.buildProgress >= 1) {
          updated.isBuilding = false;
          updated.buildProgress = 1;
          updated.lastProductionTime = now;
        }
      }
    }

    if (updated.isUpgrading) {
      updated.upgradeProgress += deltaTime / 1.5;
      if (updated.upgradeProgress >= 1) {
        updated.isUpgrading = false;
        updated.upgradeProgress = 0;
        updated.level += 1;
      }
    }

    return updated;
  });

  const production = calculateProduction(newState.buildings);
  (Object.keys(production) as ResourceType[]).forEach(type => {
    newState.resources[type] = {
      ...newState.resources[type],
      amount: newState.resources[type].amount + production[type] * deltaTime,
      perSecond: production[type]
    };
  });

  newState.buildings.forEach(building => {
    if (building.isBuilding || building.isUpgrading) return;

    const buildingType = getBuildingType(building.typeId);
    if (!buildingType) return;

    const { consumes, interval } = buildingType.baseProduction;
    if (!consumes || !interval) return;

    const timeSinceLastProduction = (now - building.lastProductionTime) / 1000;
    if (timeSinceLastProduction >= interval) {
      const canConsume = (Object.keys(consumes) as ResourceType[]).every(
        type => newState.resources[type].amount >= (consumes[type] || 0)
      );

      if (canConsume) {
        (Object.keys(consumes) as ResourceType[]).forEach(type => {
          newState.resources[type] = {
            ...newState.resources[type],
            amount: newState.resources[type].amount - (consumes[type] || 0)
          };
        });
        building.lastProductionTime = now;
      }
    }
  });

  newState.totalPlayTime += deltaTime;
  newState.lastSaveTime = now;

  return newState;
}

export function startUpgrade(building: Building): Building {
  return {
    ...building,
    isUpgrading: true,
    upgradeProgress: 0
  };
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  if (minutes > 0) {
    return `${minutes}分钟`;
  }
  return `${Math.floor(seconds)}秒`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return Math.floor(num).toString();
}
