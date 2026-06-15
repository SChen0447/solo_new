import Matter from 'matter-js';
import { COLORS, CANVAS_SIZE } from './PhysicsEngine';
import type { PhysicsEngine } from './PhysicsEngine';

const BRICK_WIDTH = 40;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 2;
const BRICK_MASS = 2;
const BRICK_FRICTION = 0.6;
const BRICK_RESTITUTION = 0.3;
const BRICK_FRICTION_AIR = 0.02;

const DEFAULT_ROWS = 8;
const DEFAULT_COLS = 6;

export class BrickWall {
  private engine: PhysicsEngine;
  private rows: number;
  private cols: number;
  private brickIdCounter: number = 0;

  constructor(engine: PhysicsEngine, rows: number = DEFAULT_ROWS, cols: number = DEFAULT_COLS) {
    this.engine = engine;
    this.rows = rows;
    this.cols = cols;
  }

  generate(): Matter.Body[] {
    const bricks: Matter.Body[] = [];
    const totalWidth = this.cols * BRICK_WIDTH + (this.cols - 1) * BRICK_GAP;
    const totalHeight = this.rows * BRICK_HEIGHT + (this.rows - 1) * BRICK_GAP;
    
    const startX = (CANVAS_SIZE.width - totalWidth) / 2 + BRICK_WIDTH / 2;
    const startY = CANVAS_SIZE.height - 20 - totalHeight - 50 + BRICK_HEIGHT / 2;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const x = startX + col * (BRICK_WIDTH + BRICK_GAP);
        const y = startY + row * (BRICK_HEIGHT + BRICK_GAP);
        
        const color = this.getRandomBrickColor();
        const brickId = `brick_${this.brickIdCounter++}`;
        
        const brick = Matter.Bodies.rectangle(x, y, BRICK_WIDTH, BRICK_HEIGHT, {
          label: brickId,
          mass: BRICK_MASS,
          friction: BRICK_FRICTION,
          restitution: BRICK_RESTITUTION,
          frictionAir: BRICK_FRICTION_AIR,
          collisionFilter: {
            category: 0x0001,
            mask: 0x0001,
          },
        });
        
        this.engine.addBody(brick, { color });
        bricks.push(brick);
      }
    }
    
    return bricks;
  }

  regenerate(): Matter.Body[] {
    this.engine.clearBricks();
    return this.generate();
  }

  private getRandomBrickColor(): string {
    const colors = COLORS.BRICK_COLORS;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getBrickDimensions(): { width: number; height: number } {
    return { width: BRICK_WIDTH, height: BRICK_HEIGHT };
  }

  getBrickCount(): number {
    return this.rows * this.cols;
  }
}
