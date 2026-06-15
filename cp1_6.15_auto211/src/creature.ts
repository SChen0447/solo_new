import type { EnvironmentState } from './environment';

export enum Species {
  ARCHAEA = 'archaea',
  TUBE_WORM = 'tubeWorm',
  SHRIMP = 'shrimp'
}

export interface Creature {
  id: number;
  species: Species;
  x: number;
  y: number;
  energy: number;
  temperatureTolerance: { min: number; max: number };
  velocity: { x: number; y: number };
  age: number;
  lastReproductionCheck: number;
}

export interface SpeciesConfig {
  initialCount: number;
  temperatureTolerance: { min: number; max: number };
  color: string;
  size: number;
  movementSpeed: number;
}

const SPECIES_CONFIGS: Record<Species, SpeciesConfig> = {
  [Species.ARCHAEA]: {
    initialCount: 50,
    temperatureTolerance: { min: 80, max: 400 },
    color: '#4caf50',
    size: 8,
    movementSpeed: 0.3
  },
  [Species.TUBE_WORM]: {
    initialCount: 50,
    temperatureTolerance: { min: 20, max: 350 },
    color: '#e91e63',
    size: 16,
    movementSpeed: 0.1
  },
  [Species.SHRIMP]: {
    initialCount: 50,
    temperatureTolerance: { min: 10, max: 300 },
    color: '#ff9800',
    size: 10,
    movementSpeed: 0.8
  }
};

const MAX_CREATURES = 1000;
const BASE_ENERGY_CONSUMPTION = 0.1;
const ENERGY_GAIN_NEAR_VENT = 0.5;
const REPRODUCTION_ENERGY_THRESHOLD = 80;
const REPRODUCTION_INTERVAL = 2000;
const REPRODUCTION_PROBABILITY = 0.1;

export class CreatureManager {
  private creatures: Creature[] = [];
  private nextId: number = 0;
  private canvasWidth: number;
  private canvasHeight: number;
  private onExtremeEvent: (() => void) | null = null;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.initializeCreatures();
  }

  private initializeCreatures(): void {
    const speciesList = [Species.ARCHAEA, Species.TUBE_WORM, Species.SHRIMP];
    
    for (const species of speciesList) {
      const config = SPECIES_CONFIGS[species];
      for (let i = 0; i < config.initialCount; i++) {
        this.createCreature(species);
      }
    }
  }

  private createCreature(species: Species, parentX?: number, parentY?: number): Creature {
    const config = SPECIES_CONFIGS[species];
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 150;
    
    let x: number, y: number;
    if (parentX !== undefined && parentY !== undefined) {
      x = parentX + (Math.random() - 0.5) * 20;
      y = parentY + (Math.random() - 0.5) * 20;
    } else {
      x = this.canvasWidth / 2 + Math.cos(angle) * distance;
      y = this.canvasHeight / 2 + Math.sin(angle) * distance;
    }

    x = Math.max(20, Math.min(this.canvasWidth - 20, x));
    y = Math.max(20, Math.min(this.canvasHeight - 20, y));

    const creature: Creature = {
      id: this.nextId++,
      species,
      x,
      y,
      energy: 100,
      temperatureTolerance: { ...config.temperatureTolerance },
      velocity: {
        x: (Math.random() - 0.5) * config.movementSpeed,
        y: (Math.random() - 0.5) * config.movementSpeed
      },
      age: 0,
      lastReproductionCheck: 0
    };

    this.creatures.push(creature);
    return creature;
  }

  public update(envState: EnvironmentState, currentTime: number): void {
    const newCreatures: Creature[] = [];

    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const creature = this.creatures[i];
      
      this.updateMovement(creature);
      this.updateEnergy(creature, envState);
      
      if (creature.energy <= 0) {
        this.creatures.splice(i, 1);
        continue;
      }

      const offspring = this.checkReproduction(creature, currentTime);
      if (offspring) {
        newCreatures.push(offspring);
      }

      creature.age++;
    }

    this.creatures.push(...newCreatures);
    this.checkPopulationLimit();
  }

  private updateMovement(creature: Creature): void {
    creature.x += creature.velocity.x;
    creature.y += creature.velocity.y;

    if (creature.x < 10 || creature.x > this.canvasWidth - 10) {
      creature.velocity.x *= -1;
      creature.x = Math.max(10, Math.min(this.canvasWidth - 10, creature.x));
    }
    if (creature.y < 10 || creature.y > this.canvasHeight - 10) {
      creature.velocity.y *= -1;
      creature.y = Math.max(10, Math.min(this.canvasHeight - 10, creature.y));
    }

    const config = SPECIES_CONFIGS[creature.species];
    if (Math.random() < 0.02) {
      creature.velocity.x = (Math.random() - 0.5) * config.movementSpeed;
      creature.velocity.y = (Math.random() - 0.5) * config.movementSpeed;
    }
  }

  private updateEnergy(creature: Creature, envState: EnvironmentState): void {
    const distToVent = Math.sqrt(
      Math.pow(creature.x - envState.ventPosition.x, 2) +
      Math.pow(creature.y - envState.ventPosition.y, 2)
    );

    let consumptionRate = BASE_ENERGY_CONSUMPTION;
    
    if (envState.isDisturbed) {
      consumptionRate *= 2;
    }

    if (envState.temperature < creature.temperatureTolerance.min ||
        envState.temperature > creature.temperatureTolerance.max) {
      consumptionRate *= 2;
    }

    creature.energy -= consumptionRate;

    if (distToVent < envState.energySourceRadius) {
      creature.energy += ENERGY_GAIN_NEAR_VENT;
    }

    creature.energy = Math.max(0, Math.min(100, creature.energy));
  }

  private checkReproduction(creature: Creature, currentTime: number): Creature | null {
    if (creature.energy < REPRODUCTION_ENERGY_THRESHOLD) {
      return null;
    }

    if (currentTime - creature.lastReproductionCheck < REPRODUCTION_INTERVAL) {
      return null;
    }

    creature.lastReproductionCheck = currentTime;

    if (Math.random() < REPRODUCTION_PROBABILITY) {
      creature.energy -= 30;
      return this.createCreature(creature.species, creature.x, creature.y);
    }

    return null;
  }

  private checkPopulationLimit(): void {
    if (this.creatures.length > MAX_CREATURES) {
      if (this.onExtremeEvent) {
        this.onExtremeEvent();
      }

      const toKill = Math.floor(this.creatures.length * 0.5);
      for (let i = 0; i < toKill; i++) {
        const randomIndex = Math.floor(Math.random() * this.creatures.length);
        this.creatures.splice(randomIndex, 1);
      }
    }
  }

  public setExtremeEventHandler(handler: () => void): void {
    this.onExtremeEvent = handler;
  }

  public getCreatures(): Readonly<Creature[]> {
    return this.creatures;
  }

  public getSpeciesConfig(species: Species): Readonly<SpeciesConfig> {
    return SPECIES_CONFIGS[species];
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public getPopulationStats(): Record<Species, number> {
    const stats: Record<Species, number> = {
      [Species.ARCHAEA]: 0,
      [Species.TUBE_WORM]: 0,
      [Species.SHRIMP]: 0
    };

    for (const creature of this.creatures) {
      stats[creature.species]++;
    }

    return stats;
  }

  public getTotalEnergy(): number {
    return this.creatures.reduce((sum, c) => sum + c.energy, 0);
  }
}
