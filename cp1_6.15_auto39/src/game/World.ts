import { v4 as uuidv4 } from 'uuid';
import type { Obstacle } from './Snake';
import { Snake } from './Snake';
import { Prey } from './Prey';

export interface GrassBlade {
  x: number;
  y: number;
  length: number;
  angle: number;
  color: string;
}

export class World {
  width: number;
  height: number;
  obstacles: Obstacle[] = [];
  grassBlades: GrassBlade[] = [];
  snake: Snake;
  preys: Prey[] = [];
  initialPreyPositions: { x: number; y: number }[] = [];
  initialSnakePosition: { x: number; y: number };

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initialSnakePosition = { x: width / 2, y: height / 2 };
    this.snake = new Snake(this.initialSnakePosition.x, this.initialSnakePosition.y);
    this.generateObstacles();
    this.generateGrass();
    this.spawnPreys();
  }

  generateObstacles() {
    this.obstacles = [];
    const count = 12;

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 50) {
        const x = 100 + Math.random() * (this.width - 200);
        const y = 100 + Math.random() * (this.height - 200);
        const types: ('rock' | 'tree' | 'bush')[] = ['rock', 'tree', 'bush', 'tree', 'rock', 'bush'];
        const type = types[Math.floor(Math.random() * types.length)];
        const radius = type === 'tree' ? 28 + Math.random() * 10 : type === 'rock' ? 22 + Math.random() * 12 : 18 + Math.random() * 8;

        const dx = x - this.initialSnakePosition.x;
        const dy = y - this.initialSnakePosition.y;
        if (Math.sqrt(dx * dx + dy * dy) < 200) {
          attempts++;
          continue;
        }

        let tooClose = false;
        for (const obs of this.obstacles) {
          const odx = x - obs.x;
          const ody = y - obs.y;
          if (Math.sqrt(odx * odx + ody * ody) < radius + obs.radius + 40) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          this.obstacles.push({ id: uuidv4(), x, y, radius, type });
          break;
        }
        attempts++;
      }
    }
  }

  generateGrass() {
    this.grassBlades = [];
    const density = Math.floor((this.width * this.height) / 2500);

    const colors = [
      '#7cb342',
      '#8bc34a',
      '#9ccc65',
      '#aed581',
      '#689f38',
      '#558b2f'
    ];

    for (let i = 0; i < density; i++) {
      this.grassBlades.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        length: 6 + Math.random() * 10,
        angle: -Math.PI / 4 + Math.random() * (Math.PI / 2),
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  spawnPreys() {
    this.preys = [];
    this.initialPreyPositions = [];
    const count = 3;

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 50) {
        const x = 120 + Math.random() * (this.width - 240);
        const y = 120 + Math.random() * (this.height - 240);

        const dx = x - this.initialSnakePosition.x;
        const dy = y - this.initialSnakePosition.y;
        if (Math.sqrt(dx * dx + dy * dy) < 300) {
          attempts++;
          continue;
        }

        let tooClose = false;
        for (const obs of this.obstacles) {
          const odx = x - obs.x;
          const ody = y - obs.y;
          if (Math.sqrt(odx * odx + ody * ody) < obs.radius + 30) {
            tooClose = true;
            break;
          }
        }
        for (const prey of this.preys) {
          const pdx = x - prey.x;
          const pdy = y - prey.y;
          if (Math.sqrt(pdx * pdx + pdy * pdy) < 80) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          this.preys.push(new Prey(x, y));
          this.initialPreyPositions.push({ x, y });
          break;
        }
        attempts++;
      }
    }
  }

  update(deltaTime: number = 1) {
    const preyMap = new Map<string, { x: number; y: number; alive: boolean }>();
    for (const prey of this.preys) {
      preyMap.set(prey.id, { x: prey.x, y: prey.y, alive: prey.alive });
    }

    const perception = this.snake.perceive(
      this.obstacles,
      this.preys.filter(p => p.alive).map(p => ({ id: p.id, x: p.x, y: p.y })),
      this.width,
      this.height
    );

    const result = this.snake.update(perception, preyMap, this.obstacles, this.width, this.height, deltaTime);

    if (result.caughtPreyId) {
      const prey = this.preys.find(p => p.id === result.caughtPreyId);
      if (prey) {
        prey.alive = false;
      }
    }

    for (const prey of this.preys) {
      prey.update({ x: this.snake.head.x, y: this.snake.head.y }, this.obstacles, this.width, this.height);
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.generateGrass();
  }

  reset() {
    this.snake.reset(this.initialSnakePosition.x, this.initialSnakePosition.y);
    for (let i = 0; i < this.preys.length; i++) {
      const pos = this.initialPreyPositions[i] || {
        x: 120 + Math.random() * (this.width - 240),
        y: 120 + Math.random() * (this.height - 240)
      };
      this.preys[i]?.reset(pos.x, pos.y);
    }
    this.preys.forEach(p => { p.alive = true; });
  }

  getStats() {
    return {
      huntCount: this.snake.huntCount,
      totalDistance: Math.floor(this.snake.totalDistance),
      survivalTime: this.snake.getSurvivalTime(),
      aiState: this.snake.state,
      speed: this.snake.speed.toFixed(1),
      nearestPreyDistance: this.getNearestPreyDistance(),
      headX: Math.floor(this.snake.head.x),
      headY: Math.floor(this.snake.head.y),
      alivePreys: this.preys.filter(p => p.alive).length
    };
  }

  getNearestPreyDistance(): number {
    let minDist = Infinity;
    const head = this.snake.head;
    for (const prey of this.preys) {
      if (!prey.alive) continue;
      const dx = prey.x - head.x;
      const dy = prey.y - head.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    }
    return minDist === Infinity ? -1 : Math.floor(minDist);
  }
}
