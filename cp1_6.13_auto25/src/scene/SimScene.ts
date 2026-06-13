import Phaser from 'phaser';
import { NeuralNetworkAI } from '../ai/NeuralNetwork';
import { eventBus } from '../event/EventBus';
import { useGameStore } from '../store/gameStore';
import {
  SIMULATION_CONFIG,
  GENETIC_CONFIG,
  COLOR_CONFIG,
  clamp,
  distance,
  angleTo,
  relativeAngle,
  generateId,
  randomGenes,
} from '../config/envConfig';
import type {
  Organism,
  Food,
  Obstacle,
  Genes,
  PerceptionInput,
  DecisionOutput,
  EnvironmentParams,
  EventType,
} from '../types';

export class SimScene extends Phaser.Scene {
  private organisms: Organism[] = [];
  private organismNetworks: Map<string, NeuralNetworkAI> = new Map();
  private foods: Food[] = [];
  private obstacles: Obstacle[] = [];
  private graphics!: Phaser.GameObjects.Graphics;
  private backgroundGraphics!: Phaser.GameObjects.Graphics;
  private selectedOrganism: Organism | null = null;
  private lastFoodSpawnTime = 0;
  private statsUpdateTimer = 0;
  private fpsTimer = 0;
  private frameCount = 0;
  private currentFps = 60;
  private unsubscribeFns: (() => void)[] = [];

  private worldWidth = SIMULATION_CONFIG.WORLD_WIDTH;
  private worldHeight = SIMULATION_CONFIG.WORLD_HEIGHT;

  constructor() {
    super('SimScene');
  }

  preload(): void {
  }

  create(): void {
    this.setupBackground();
    this.setupGraphics();
    this.setupInput();
    this.setupEventListeners();
    this.initializeWorld();
  }

  private setupBackground(): void {
    this.backgroundGraphics = this.add.graphics();
    this.updateBackgroundGradient();
  }

  private updateBackgroundGradient(): void {
    const { humidity } = useGameStore.getState().environment;
    const [color1, color2] = COLOR_CONFIG.getBackgroundGradient(humidity);

    this.backgroundGraphics.clear();
    
    const width = this.worldWidth;
    const height = this.worldHeight;
    const steps = 50;

    const r1 = parseInt(color1.match(/\d+/)?.[0] || '200');
    const g1 = parseInt(color1.match(/,(\d+)/)?.[1] || '200');
    const b1 = parseInt(color1.match(/,\d+,(\d+)/)?.[1] || '200');
    const r2 = parseInt(color2.match(/\d+/)?.[0] || '100');
    const g2 = parseInt(color2.match(/,(\d+)/)?.[1] || '100');
    const b2 = parseInt(color2.match(/,\d+,(\d+)/)?.[1] || '100');

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      const color = (r << 16) | (g << 8) | b;
      
      this.backgroundGraphics.fillStyle(color, 1);
      this.backgroundGraphics.fillRect(0, (height * i) / steps, width, height / steps + 1);
    }
  }

  private setupGraphics(): void {
    this.graphics = this.add.graphics();
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.worldX, pointer.worldY);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleHover(pointer.worldX, pointer.worldY);
    });
  }

  private setupEventListeners(): void {
    const unsub1 = eventBus.on(
      EventType.ENVIRONMENT_CHANGED as unknown as EventType,
      (env: EnvironmentParams) => {
        this.onEnvironmentChanged(env);
      }
    );

    const unsub2 = eventBus.on(
      EventType.UI_RESET_REQUESTED as unknown as EventType,
      () => {
        this.resetSimulation();
      }
    );

    const unsub3 = eventBus.on(
      EventType.ORGANISM_SELECTED as unknown as EventType,
      (id: string | null) => {
        this.selectedOrganism = id ? this.organisms.find(o => o.id === id) || null : null;
      }
    );

    this.unsubscribeFns.push(unsub1, unsub2, unsub3);
  }

  private initializeWorld(): void {
    this.createInitialFoods();
    this.createInitialObstacles();
    this.createInitialOrganisms();
    this.syncToStore();
  }

  private createInitialFoods(): void {
    const { foodDensity } = useGameStore.getState().environment;
    const count = Math.floor((foodDensity / 100) * SIMULATION_CONFIG.MAX_FOOD * 0.6);
    
    this.foods = [];
    for (let i = 0; i < count; i++) {
      this.spawnFood();
    }
  }

  private spawnFood(): void {
    if (this.foods.length >= SIMULATION_CONFIG.MAX_FOOD) return;

    const margin = 50;
    const x = margin + Math.random() * (this.worldWidth - margin * 2);
    const y = margin + Math.random() * (this.worldHeight - margin * 2);

    const type: 'plant' | 'meat' = Math.random() < 0.85 ? 'plant' : 'meat';

    this.foods.push({
      id: generateId(),
      x,
      y,
      energy: type === 'plant' ? SIMULATION_CONFIG.FOOD_ENERGY : SIMULATION_CONFIG.MEAT_ENERGY,
      type,
    });
  }

  private createInitialObstacles(): void {
    const { obstacleDensity } = useGameStore.getState().environment;
    const count = Math.floor((obstacleDensity / 100) * 30);
    
    this.obstacles = [];
    for (let i = 0; i < count; i++) {
      this.spawnObstacle();
    }
  }

  private spawnObstacle(): void {
    const margin = 100;
    const x = margin + Math.random() * (this.worldWidth - margin * 2);
    const y = margin + Math.random() * (this.worldHeight - margin * 2);
    const radius = 15 + Math.random() * 30;

    this.obstacles.push({
      id: generateId(),
      x,
      y,
      radius,
    });
  }

  private createInitialOrganisms(): void {
    this.organisms = [];
    this.organismNetworks.clear();

    for (let i = 0; i < GENETIC_CONFIG.INITIAL_POPULATION; i++) {
      this.spawnOrganism();
    }
  }

  private spawnOrganism(genes?: Genes, network?: NeuralNetworkAI, generation: number = 1): Organism {
    const margin = 100;
    const x = margin + Math.random() * (this.worldWidth - margin * 2);
    const y = margin + Math.random() * (this.worldHeight - margin * 2);

    const organismGenes = genes || randomGenes();
    const aiNetwork = network || new NeuralNetworkAI();

    const organism: Organism = {
      id: generateId(),
      generation,
      genes: organismGenes,
      x,
      y,
      rotation: Math.random() * Math.PI * 2,
      velocity: 0,
      angularVelocity: 0,
      energy: SIMULATION_CONFIG.INITIAL_ENERGY,
      maxEnergy: SIMULATION_CONFIG.MAX_ENERGY,
      age: 0,
      survivalTime: 0,
      isAlive: true,
      isSelected: false,
      perception: {
        nearestFoodDirection: 0,
        nearestFoodDistance: 1,
        nearestObstacleDirection: 0,
        nearestObstacleDistance: 1,
        nearestOrganismDirection: 0,
        nearestOrganismDistance: 1,
        energyLevel: 0.