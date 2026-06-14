import { Ship, Cannonball, Island, AmmoType } from '../store/gameStore';
import { v4 as uuidv4 } from 'uuid';

export interface Position {
  x: number;
  y: number;
}

export const calculateDistance = (p1: Position, p2: Position): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const calculateSpeed = (ship: Ship): number => {
  const healthFactor = ship.health / ship.maxHealth;
  const baseSpeed = ship.speed;
  return baseSpeed * (0.5 + healthFactor * 0.5);
};

export const calculateCannonballPath = (
  start: Position,
  target: Position,
  steps: number = 30
): Position[] => {
  const path: Position[] = [];
  const arcHeight = 50;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = start.x + (target.x - start.x) * t;
    const y = start.y + (target.y - start.y) * t - Math.sin(t * Math.PI) * arcHeight;
    path.push({ x, y });
  }

  return path;
};

export const calculateDamage = (
  attacker: Ship,
  defender: Ship,
  ammoType: AmmoType
): number => {
  let damage = attacker.attack;
  
  switch (ammoType) {
    case 'explosive':
      damage *= 1.5;
      break;
    case 'chain':
      damage *= 0.8;
      break;
    case 'normal':
    default:
      break;
  }

  const distance = calculateDistance(attacker, defender);
  const rangeFactor = Math.max(0.5, 1 - (distance / attacker.range) * 0.5);
  damage *= rangeFactor;

  return Math.floor(damage);
};

export const checkHit = (
  cannonball: Cannonball,
  target: Ship
): boolean => {
  if (cannonball.progress < 1) return false;
  
  const hitRadius = 20;
  const distance = calculateDistance(
    { x: cannonball.targetX, y: cannonball.targetY },
    target
  );
  
  return distance < hitRadius;
};

export const isInRange = (ship: Ship, target: Ship): boolean => {
  const distance = calculateDistance(ship, target);
  return distance <= ship.range && ship.health > 0 && target.health > 0;
};

export const canCollectResource = (ship: Ship, island: Island): boolean => {
  const distance = calculateDistance(ship, island);
  return distance < 50 && ship.health > 0 && !island.collectingShipId;
};

export const createCannonball = (
  source: Ship,
  target: Ship
): Cannonball | null => {
  if (!isInRange(source, target)) return null;

  const path = calculateCannonballPath(source, target);
  const damage = calculateDamage(source, target, source.ammoType);

  return {
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
    sourceId: source.id,
    targetId: target.id,
    path,
  };
};

export const updateCannonballPosition = (
  cannonball: Cannonball,
  deltaTime: number = 1
): Cannonball => {
  const speed = 0.03 * deltaTime;
  const newProgress = Math.min(1, cannonball.progress + speed);
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
};

export const moveShipTowardsTarget = (
  ship: Ship,
  deltaTime: number = 1
): Ship => {
  if (ship.health <= 0 || ship.targetX === undefined || ship.targetY === undefined) {
    return ship;
  }

  const speed = calculateSpeed(ship) * deltaTime;
  const dx = ship.targetX - ship.x;
  const dy = ship.targetY - ship.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < speed) {
    return {
      ...ship,
      x: ship.targetX,
      y: ship.targetY,
      targetX: undefined,
      targetY: undefined,
    };
  }

  return {
    ...ship,
    x: ship.x + (dx / distance) * speed,
    y: ship.y + (dy / distance) * speed,
  };
};

export const findNearestTarget = (
  ship: Ship,
  targets: Ship[]
): Ship | null => {
  const aliveTargets = targets.filter(t => t.health > 0);
  if (aliveTargets.length === 0) return null;

  let nearest: Ship | null = null;
  let minDistance = Infinity;

  for (const target of aliveTargets) {
    const distance = calculateDistance(ship, target);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = target;
    }
  }

  return nearest;
};

export const findLowestHealthTarget = (
  ship: Ship,
  targets: Ship[]
): Ship | null => {
  const aliveTargets = targets.filter(t => t.health > 0);
  if (aliveTargets.length === 0) return null;

  let lowest: Ship | null = null;
  let minHealth = Infinity;

  for (const target of aliveTargets) {
    if (target.health < minHealth) {
      minHealth = target.health;
      lowest = target;
    }
  }

  return lowest;
};

export const shouldRetreat = (
  ship: Ship,
  allies: Ship[],
  enemies: Ship[]
): boolean => {
  if (ship.health / ship.maxHealth > 0.3) return false;
  
  const enemyCount = enemies.filter(e => e.health > 0).length;
  const allyCount = allies.filter(a => a.health > 0).length;
  
  if (allyCount === 0) return true;
  if (enemyCount === 0) return false;
  
  return enemyCount > allyCount || ship.health / ship.maxHealth < 0.2;
};

export const getRet