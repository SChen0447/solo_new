export type ResourceType = 'metal' | 'crystal' | 'darkMatter' | 'gas' | 'gold';

export interface Planet {
  id: string;
  x: number;
  y: number;
  name: string;
  resourceType: ResourceType;
  reserve: number;
  maxReserve: number;
  threatLevel: number;
  radius: number;
  discovered: boolean;
}

export interface Station {
  id: string;
  x: number;
  y: number;
  type: 'upgrade' | 'trade';
}

export interface ShipAttributes {
  shield: number;
  hull: number;
  damage: number;
  speed: number;
  cargo: number;
}

export interface PirateShip {
  id: string;
  name: string;
  level: number;
  currentShield: number;
  maxShield: number;
  currentHull: number;
  maxHull: number;
  damage: number;
  accuracy: number;
}

export type PartType = 'shield' | 'weapon' | 'engine' | 'cargo';

export interface ShipPart {
  id: string;
  name: string;
  type: PartType;
  description: string;
  attribute: keyof ShipAttributes;
  bonus: number;
  cost: {
    metal?: number;
    crystal?: number;
    darkMatter?: number;
    gas?: number;
    gold: number;
  };
}

export interface CombatLog {
  id: string;
  message: string;
  type: 'info' | 'damage' | 'heal' | 'critical' | 'miss';
  timestamp: number;
}

export interface Particle {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export interface Nebula {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  driftSpeed: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  color: string;
  brightness: number;
}
