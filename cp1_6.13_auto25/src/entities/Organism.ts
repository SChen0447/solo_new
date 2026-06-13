import { NeuralNetwork } from '../ai/NeuralNetwork';
import { createChildGenes, createRandomGenes } from './Genetics';
import { generateId, clamp, distance, angleTo, relativeAngle, genesToHexColor } from '../utils/helpers';
import { SIMULATION_CONFIG, GENETIC_CONFIG } from '../config/envConfig';
import eventBus from '../event/EventBus';
import { EventType, Genes, OrganismData, PerceptionInput, DecisionOutput, FoodData, ObstacleData, INeuralNetwork } from '../types';

export class Organism {
  id: string;
  generation: number;
  genes: Genes;
  x: number;
  y: number;
  rotation: number;
  energy: number;
  maxEnergy: number;
  age: number;
  survivalTime: number;
  isAlive: boolean;
  isSelected: boolean;
  neuralNetwork: INeuralNetwork;
  perception: PerceptionInput;
  lastDecision: DecisionOutput;
  velocity: number;
  angularVelocity: number;
  targetX: number;
  targetY: number;

  constructor(x: number, y: number, generation: number = 1, genes?: Genes, neuralNetwork?: INeuralNetwork) {
    this.id = generateId();
    this.generation = generation;
    this.genes = genes || createRandomGenes();
    this.x = x;
    this.y = y;
    this.rotation = Math.random() * Math.PI * 2;
    this.maxEnergy = SIMULATION_CONFIG.MAX_ENERGY;
    this.energy = SIMULATION_CONFIG.INITIAL_ENERGY;
    this.age = 0;
    this.survivalTime = 0;
    this.isAlive = true;
    this.isSelected = false;
    this.neuralNetwork = neuralNetwork || new NeuralNetwork();
    this.velocity = 0;
    this.angularVelocity = 0;
    this.targetX = x;
    this.targetY = y;

    this.perception = {
      nearestFoodDirection: 0,
      nearestFoodDistance: 1,
      nearestObstacleDirection: 0,
      nearestObstacleDistance: 1,
      nearestOrganismDirection: 0,
      nearestOrganismDistance: 1,
      energyLevel: 0.5,
      temperature: 0.5,
    };

    this.lastDecision = {
      movement: 0,
      rotation: 0,
      action: 0,
    };
  }

  update(deltaTime: number, foods: FoodData[], obstacles: ObstacleData[], organisms: Organism[], temperature: number): void {
    if (!this.isAlive) return;

    this.age += deltaTime;
    this.survivalTime += deltaTime;

    this.perceive(foods, obstacles, organisms, temperature);
    this.decide();
    this.act(deltaTime, foods, organisms);

    const baseMetabolism = this.genes.metabolism * 0.2 + 0.05;
    const movementCost = Math.abs(this.velocity) * SIMULATION_CONFIG.MOVE_ENERGY_COST;
    this.energy -= (SIMULATION_CONFIG.ENERGY_DECAY_BASE + baseMetabolism + movementCost) * deltaTime;

    if (this.energy <= 0) {
      this.die();
    }

    const size = this.getSize();
    this.x = clamp(this.x, size, SIMULATION_CONFIG.WORLD_WIDTH - size);
    this.y = clamp(this.y, size, SIMULATION_CONFIG.WORLD_HEIGHT - size);
  }

  private perceive(foods: FoodData[], obstacles: ObstacleData[], organisms: Organism[], temperature: number): void {
    const senseRange = 50 + this.genes.senseRange * 200;
    const senseAngle = (0.5 + this.genes.senseAngle * 0.5) * Math.PI;

    let nearestFood: { dist: number; angle: number } | null = null;
    let nearestObstacle: { dist: number; angle: number } | null = null;
    let nearestOrganism: { dist: number; angle: number } | null = null;

    foods.forEach((food) => {
      const dist = distance(this.x, this.y, food.x, food.y);
      if (dist < senseRange) {
        const absAngle = angleTo(this.x, this.y, food.x, food.y);
        const relAngle = relativeAngle(this.rotation, absAngle);
        if (Math.abs(relAngle) < senseAngle / 2) {
          if (!nearestFood || dist < nearestFood.dist) {
            nearestFood = { dist, angle: relAngle };
          }
        }
      }
    });

    obstacles.forEach((obstacle) => {
      const dist = distance(this.x, this.y, obstacle.x, obstacle.y) - obstacle.radius;
      if (dist < senseRange) {
        const absAngle = angleTo(this.x, this.y, obstacle.x, obstacle.y);
        const relAngle = relativeAngle(this.rotation, absAngle);
        if (Math.abs(relAngle) < senseAngle / 2) {
          if (!nearestObstacle || dist < nearestObstacle.dist) {
            nearestObstacle = { dist, angle: relAngle };
          }
        }
      }
    });

    organisms.forEach((org) => {
      if (org.id === this.id || !org.isAlive) return;
      const dist = distance(this.x, this.y, org.x, org.y);
      if (dist < senseRange) {
        const absAngle = angleTo(this.x, this.y, org.x, org.y);
        const relAngle = relativeAngle(this.rotation, absAngle);
        if (Math.abs(relAngle) < senseAngle / 2) {
          if (!nearestOrganism || dist < nearestOrganism.dist) {
            nearestOrganism = { dist, angle: relAngle };
          }
        }
      }
    });

    this.perception = {
      nearestFoodDirection: nearestFood ? nearestFood.angle / Math.PI : 0,
      nearestFoodDistance: nearestFood ? clamp(nearestFood.dist / senseRange, 0, 1) : 1,
      nearestObstacleDirection: nearestObstacle ? nearestObstacle.angle / Math.PI : 0,
      nearestObstacleDistance: nearestObstacle ? clamp(nearestObstacle.dist / senseRange, 0, 1) : 1,
      nearestOrganismDirection: nearestOrganism ? nearestOrganism.angle / Math.PI : 0,
      nearestOrganismDistance: nearestOrganism ? clamp(nearestOrganism.dist / senseRange, 0, 1) : 1,
      energyLevel: clamp(this.energy / this.maxEnergy, 0, 1),
      temperature: temperature / 100,
    };
  }

  private decide(): void {
    this.lastDecision = this.neuralNetwork.predict(this.perception);
  }

  private act(deltaTime: number, foods: FoodData[], organisms: Organism[]): void {
    const maxSpeed = 30 + this.genes.speed * 90;
    const maxTurnRate = 1 + this.genes.acceleration * 3;

    this.angularVelocity = this.lastDecision.rotation * maxTurnRate;
    this.rotation += this.angularVelocity * deltaTime;

    const targetSpeed = this.lastDecision.movement * maxSpeed;
    this.velocity += (targetSpeed - this.velocity) * 0.1;

    const speedFactor = this.genes.energyEfficiency * 0.5 + 0.5;
    this.x += Math.cos(this.rotation) * this.velocity * speedFactor * deltaTime;
    this.y += Math.sin(this.rotation) * this.velocity * speedFactor * deltaTime;

    const actionThreshold = 0.6;
    if (this.lastDecision.action > actionThreshold) {
      if (this.energy > this.maxEnergy * (0.4 + this.genes.reproductionThreshold * 0.4)) {
        this.tryReproduce(organisms);
      } else {
        this.tryEat(foods, organisms);
      }
    }
  }

  private tryEat(foods: FoodData[], organisms: Organism[]): void {
    const eatRadius = this.getSize() + 10;
    const dietThreshold = this.genes.dietPreference;

    foods.forEach((food, index) => {
      const dist = distance(this.x, this.y, food.x, food.y);
      if (dist < eatRadius) {
        if (food.type === 'plant' && dietThreshold < 0.6) {
          this.energy = clamp(this.energy + SIMULATION_CONFIG.FOOD_ENERGY, 0, this.maxEnergy);
          foods.splice(index, 1);
        } else if (food.type === 'meat' && dietThreshold > 0.4) {
          this.energy = clamp(this.energy + SIMULATION_CONFIG.MEAT_ENERGY, 0, this.maxEnergy);
          foods.splice(index, 1);
        }
      }
    });

    if (dietThreshold > 0.6 && this.genes.aggression > 0.5) {
      organisms.forEach((org) => {
        if (org.id === this.id || !org.isAlive) return;
        const dist = distance(this.x, this.y, org.x, org.y);
        const sizeDiff = this.getSize() - org.getSize();
        if (dist < eatRadius && sizeDiff > 10) {
          this.energy = clamp(this.energy + org.energy * 0.5, 0, this.maxEnergy);
          org.die();
        }
      });
    }
  }

  private tryReproduce(organisms: Organism[]): void {
    if (this.survivalTime < GENETIC_CONFIG.MIN_SURVIVAL_TIME_FOR_REPRODUCTION) return;
    if (this.energy < SIMULATION_CONFIG.REPRODUCTION_ENERGY_COST) return;

    const mateRadius = 80;
    let nearestMate: Organism | null = null;
    let nearestDist = Infinity;

    organisms.forEach((org) => {
      if (org.id === this.id || !org.isAlive) return;
      if (org.survivalTime < GENETIC_CONFIG.MIN_SURVIVAL_TIME_FOR_REPRODUCTION) return;
      if (org.energy < SIMULATION_CONFIG.REPRODUCTION_ENERGY_COST) return;

      const dist = distance(this.x, this.y, org.x, org.y);
      if (dist < mateRadius && dist < nearestDist) {
        nearestDist = dist;
        nearestMate = org;
      }
    });

    if (nearestMate) {
      this.reproduce(nearestMate, organisms);
    }
  }

  reproduce(partner: Organism, organisms: Organism[], mutationRate: number = GENETIC_CONFIG.NEURAL_WEIGHT_MUTATION_RATE * 100): Organism {
    this.energy -= SIMULATION_CONFIG.REPRODUCTION_ENERGY_COST;
    partner.energy -= SIMULATION_CONFIG.REPRODUCTION_ENERGY_COST;

    const childGenes = createChildGenes(this.genes, partner.genes, mutationRate);
    const childNetwork = this.neuralNetwork.crossover(partner.neuralNetwork);
    childNetwork.mutate(GENETIC_CONFIG.NEURAL_WEIGHT_MUTATION_RATE);

    const offsetX = (Math.random() - 0.5) * 30;
    const offsetY = (Math.random() - 0.5) * 30;

    const child = new Organism(
      this.x + offsetX,
      this.y + offsetY,
      Math.max(this.generation, partner.generation) + 1,
      childGenes,
      childNetwork
    );

    organisms.push(child);
    eventBus.emit(EventType.ORGANISM_REPRODUCED, { parent1: this.id, parent2: partner.id, child: child.id });

    return child;
  }

  die(): void {
    this.isAlive = false;
    eventBus.emit(EventType.ORGANISM_DIED, { id: this.id, age: this.age, survivalTime: this.survivalTime });
  }

  getSize(): number {
    return 8 + this.genes.size * 20 + (Math.random() - 0.5) * this.genes.sizeVariance * 8;
  }

  getColor(): number {
    return genesToHexColor(this.genes);
  }

  getWhiskerData(): { angle: number; length: number }[] {
    const count = Math.round(2 + this.genes.whiskerCount * 6);
    const length = 10 + this.genes.whiskerLength * 30;
    const whiskers: { angle: number; length: number }[] = [];

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.PI * i) / (count - 1);
      whiskers.push({ angle, length });
    }

    return whiskers;
  }

  toData(): OrganismData {
    return {
      id: this.id,
      generation: this.generation,
      genes: { ...this.genes },
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      age: this.age,
      survivalTime: this.survivalTime,
      isAlive: this.isAlive,
      isSelected: this.isSelected,
      perception: { ...this.perception },
      lastDecision: { ...this.lastDecision },
    };
  }

  static fromData(data: OrganismData): Organism {
    const org = new Organism(data.x, data.y, data.generation, data.genes);
    org.id = data.id;
    org.rotation = data.rotation;
    org.energy = data.energy;
    org.maxEnergy = data.maxEnergy;
    org.age = data.age;
    org.survivalTime = data.survivalTime;
    org.isAlive = data.isAlive;
    org.isSelected = data.isSelected;
    org.perception = { ...data.perception };
    org.lastDecision = { ...data.lastDecision };
    return org;
  }
}

export default Organism;
