import Phaser from 'phaser';
import { Organism } from '../entities/Organism';
import { Food } from '../entities/Food';
import { Obstacle } from '../entities/Obstacle';
import { SIMULATION_CONFIG, GENETIC_CONFIG, COLOR_CONFIG } from '../config/envConfig';
import eventBus from '../event/EventBus';
import { EventType, EnvironmentParams, FoodData, ObstacleData } from '../types';
import useGameStore from '../store/gameStore';
import { randomRange } from '../utils/helpers';

export class SimScene extends Phaser.Scene {
  private organisms: Organism[] = [];
  private foods: Food[] = [];
  private obstacles: Obstacle[] = [];
  private organismSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private foodSprites: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private obstacleSprites: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private backgroundGraphics!: Phaser.GameObjects.Graphics;
  private gridSize: number = 150;
  private logicAccumulator: number = 0;
  private statsAccumulator: number = 0;
  private fpsAccumulator: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private selectedOrganism: Organism | null = null;
  private hoveredOrganism: Organism | null = null;
  private hoverTooltip!: Phaser.GameObjects.Container;
  private cameraFollow: boolean = false;

  constructor() {
    super('SimScene');
  }

  create(): void {
    this.createBackground();
    this.createInitialPopulation();
    this.createObstacles();
    this.createFood();
    this.setupEventListeners();
    this.setupInputHandlers();
    this.createHoverTooltip();
    
    eventBus.throttle(EventType.SIMULATION_TICK, 1000 / SIMULATION_CONFIG.LOGIC_TICK_RATE);
  }

  private createBackground(): void {
    this.backgroundGraphics = this.add.graphics();
    this.updateBackground();
  }

  private updateBackground(): void {
    const { humidity } = useGameStore.getState().environment;
    const colors = COLOR_CONFIG.getBackgroundGradient(humidity);
    
    this.backgroundGraphics.clear();
    
    const gradient = this.backgroundGraphics.createLinearGradient(
      0, 0, 0, SIMULATION_CONFIG.WORLD_HEIGHT
    );
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    
    this.backgroundGraphics.fillGradientStyle(
      parseInt(colors[0].slice(4, -1).split(',')[0]),
      parseInt(colors[0].slice(4, -1).split(',')[1]),
      parseInt(colors[0].slice(4, -1).split(',')[2]),
      parseInt(colors[1].slice(4, -1).split(',')[0]),
      parseInt(colors[1].slice(4, -1).split(',')[1]),
      parseInt(colors[1].slice(4, -1).split(',')[2])
    );
    this.backgroundGraphics.fillRect(0, 0, SIMULATION_CONFIG.WORLD_WIDTH, SIMULATION_CONFIG.WORLD_HEIGHT);
    
    this.backgroundGraphics.setAlpha(0.3);
    
    const noiseCanvas = this.textures.createCanvas('noise', 256, 256);
    const ctx = noiseCanvas.getContext();
    const imageData = ctx.createImageData(256, 256);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const value = Math.floor(Math.random() * 40);
      imageData.data[i] = value;
      imageData.data[i + 1] = value + 20;
      imageData.data[i + 2] = value;
      imageData.data[i + 3] = 30;
    }
    
    ctx.putImageData(imageData, 0, 0);
    noiseCanvas.refresh();
    
    const noiseSprite = this.add.tileSprite(
      SIMULATION_CONFIG.WORLD_WIDTH / 2,
      SIMULATION_CONFIG.WORLD_HEIGHT / 2,
      SIMULATION_CONFIG.WORLD_WIDTH,
      SIMULATION_CONFIG.WORLD_HEIGHT,
      'noise'
    );
    noiseSprite.setAlpha(0.15);
    noiseSprite.setDepth(-1);
  }

  private createInitialPopulation(): void {
    const { mutationRate } = useGameStore.getState().environment;
    
    for (let i = 0; i < GENETIC_CONFIG.INITIAL_POPULATION; i++) {
      const x = randomRange(50, SIMULATION_CONFIG.WORLD_WIDTH - 50);
      const y = randomRange(50, SIMULATION_CONFIG.WORLD_HEIGHT - 50);
      const organism = new Organism(x, y, 1);
      this.organisms.push(organism);
      this.createOrganismSprite(organism);
      useGameStore.getState().addOrganism(organism.toData());
    }
    
    useGameStore.getState().updateStatistics();
  }

  private createObstacles(): void {
    const { obstacleDensity } = useGameStore.getState().environment;
    const count = Math.floor((obstacleDensity / 100) * 30) + 5;
    
    for (let i = 0; i < count; i++) {
      const x = randomRange(50, SIMULATION_CONFIG.WORLD_WIDTH - 50);
      const y = randomRange(50, SIMULATION_CONFIG.WORLD_HEIGHT - 50);
      const radius = randomRange(15, 40);
      const obstacle = new Obstacle(x, y, radius);
      this.obstacles.push(obstacle);
      this.createObstacleSprite(obstacle);
    }
    
    useGameStore.getState().setSimulationData({
      obstacles: this.obstacles.map((o) => o.toData()),
    });
  }

  private createFood(): void {
    const { foodDensity } = useGameStore.getState().environment;
    const targetCount = Math.floor((foodDensity / 100) * SIMULATION_CONFIG.MAX_FOOD);
    
    while (this.foods.length < targetCount) {
      this.spawnFood();
    }
    
    useGameStore.getState().setSimulationData({
      foods: this.foods.map((f) => f.toData()),
    });
  }

  private spawnFood(): void {
    const x = randomRange(20, SIMULATION_CONFIG.WORLD_WIDTH - 20);
    const y = randomRange(20, SIMULATION_CONFIG.WORLD_HEIGHT - 20);
    const type = Math.random() < 0.8 ? 'plant' : 'meat';
    const food = new Food(x, y, type);
    this.foods.push(food);
    this.createFoodSprite(food);
  }

  private createOrganismSprite(organism: Organism): void {
    const container = this.add.container(organism.x, organism.y);
    const size = organism.getSize();
    
    const body = this.add.graphics();
    this.drawHexagon(body, 0, 0, size, organism.getColor());
    container.add(body);
    
    const whiskers = this.add.graphics();
    this.drawWhiskers(whiskers, organism);
    container.add(whiskers);
    
    const energyBar = this.add.graphics();
    this.drawEnergyBar(energyBar, organism.energy / organism.maxEnergy, size);
    container.add(energyBar);
    
    const highlight = this.add.graphics();
    highlight.lineStyle(3, 0xec4899, 0);
    this.drawHexagonOutline(highlight, 0, 0, size + 4);
    container.add(highlight);
    
    container.setSize(size * 2, size * 2);
    container.setInteractive(
      new Phaser.Geom.Circle(0, 0, size),
      Phaser.Geom.Circle.Contains
    );
    
    this.organismSprites.set(organism.id, container);
    
    container.on('pointerdown', () => {
      this.selectOrganism(organism);
    });
    
    container.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      this.hoveredOrganism = organism;
      this.updateHoverTooltip(organism, pointer.x, pointer.y);
    });
    
    container.on('pointerout', () => {
      this.hoveredOrganism = null;
      this.hoverTooltip.setVisible(false);
    });
  }

  private drawHexagon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    color: number
  ): void {
    graphics.clear();
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
    
    graphics.closePath();
    graphics.fill();
    
    graphics.lineStyle(2, 0x000000, 0.3);
    graphics.strokePath();
  }

  private drawHexagonOutline(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number
  ): void {
    graphics.beginPath();