import { TILE_SIZE, Level, Position } from './level';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export class Player {
  private x: number;
  private y: number;
  private readonly width: number = 16;
  private readonly height: number = 16;
  private readonly speed: number = 90;
  private animFrame: number;
  private animTimer: number;
  private facing: 'left' | 'right' | 'up' | 'down';
  private isMoving: boolean;
  private footprintTimer: number;
  private lastFootprintX: number;
  private lastFootprintY: number;

  constructor(startPos: Position) {
    this.x = startPos.x * TILE_SIZE + (TILE_SIZE - this.width) / 2;
    this.y = startPos.y * TILE_SIZE + (TILE_SIZE - this.height) / 2;
    this.animFrame = 0;
    this.animTimer = 0;
    this.facing = 'down';
    this.isMoving = false;
    this.footprintTimer = 0;
    this.lastFootprintX = -100;
    this.lastFootprintY = -100;
  }

  public update(deltaTime: number, input: InputState, level: Level): void {
    let dx = 0;
    let dy = 0;

    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    this.isMoving = dx !== 0 || dy !== 0;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    if (dx < 0) this.facing = 'left';
    else if (dx > 0) this.facing = 'right';
    else if (dy < 0) this.facing = 'up';
    else if (dy > 0) this.facing = 'down';

    const moveX = dx * this.speed * deltaTime;
    const moveY = dy * this.speed * deltaTime;

    if (moveX !== 0 && this.canMove(this.x + moveX, this.y, level)) {
      this.x += moveX;
    }
    if (moveY !== 0 && this.canMove(this.x, this.y + moveY, level)) {
      this.y += moveY;
    }

    if (this.isMoving) {
      this.animTimer += deltaTime;
      if (this.animTimer > 0.15) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }

      this.footprintTimer += deltaTime;
      if (this.footprintTimer > 0.2) {
        this.footprintTimer = 0;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const dx2 = cx - this.lastFootprintX;
        const dy2 = cy - this.lastFootprintY;
        if (dx2 * dx2 + dy2 * dy2 > 100) {
          level.addFootprint(cx, cy);
          this.lastFootprintX = cx;
          this.lastFootprintY = cy;
        }
      }
    } else {
      this.animFrame = 0;
    }
  }

  private canMove(newX: number, newY: number, level: Level): boolean {
    const corners = [
      { x: newX, y: newY },
      { x: newX + this.width - 1, y: newY },
      { x: newX, y: newY + this.height - 1 },
      { x: newX + this.width - 1, y: newY + this.height - 1 }
    ];

    for (const corner of corners) {
      const tileX = Math.floor(corner.x / TILE_SIZE);
      const tileY = Math.floor(corner.y / TILE_SIZE);
      if (!level.isWalkable(tileX, tileY)) {
        return false;
      }
    }
    return true;
  }

  public resetPosition(startPos: Position): void {
    this.x = startPos.x * TILE_SIZE + (TILE_SIZE - this.width) / 2;
    this.y = startPos.y * TILE_SIZE + (TILE_SIZE - this.height) / 2;
    this.animFrame = 0;
    this.animTimer = 0;
    this.facing = 'down';
    this.isMoving = false;
    this.footprintTimer = 0;
    this.lastFootprintX = -100;
    this.lastFootprintY = -100;
  }

  public getX(): number { return this.x; }
  public getY(): number { return this.y; }
  public getWidth(): number { return this.width; }
  public getHeight(): number { return this.height; }
  public getAnimFrame(): number { return this.animFrame; }
  public getFacing(): 'left' | 'right' | 'up' | 'down' { return this.facing; }
  public getIsMoving(): boolean { return this.isMoving; }
}
