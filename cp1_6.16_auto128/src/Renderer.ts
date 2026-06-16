export interface Position {
  x: number;
  y: number;
}

export interface SnakeRenderData {
  id: string;
  color: string;
  headColor: string;
  body: Position[];
  isAlive: boolean;
  deathFlashPhase: number;
  deathFlashAlpha: number;
}

export interface FoodRenderData {
  x: number;
  y: number;
  type: 'normal' | 'special';
}

export interface RenderState {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  snakes: SnakeRenderData[];
  foods: FoodRenderData[];
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridWidth: number;
  private gridHeight: number;
  private cellSize: number = 20;
  private readonly FONT_FAMILY = "'Consolas', 'Courier New', monospace";
  private readonly BG_COLOR = '#1E1E1E';
  private readonly GRID_COLOR = '#333333';

  constructor(canvas: HTMLCanvasElement, gridWidth: number, gridHeight: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.resize();
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    const cellWidth = rect.width / this.gridWidth;
    const cellHeight = rect.height / this.gridHeight;
    this.cellSize = Math.min(cellWidth, cellHeight);
  }

  public getCellSize(): number {
    return this.cellSize;
  }

  public draw(state: RenderState): void {
    const { snakes, foods } = state;
    
    this.clearCanvas();
    this.drawGrid();
    this.drawFoods(foods);
    this.drawSnakes(snakes);
  }

  private clearCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.fillStyle = this.BG_COLOR;
    this.ctx.fillRect(0, 0, rect.width, rect.height);
  }

  private drawGrid(): void {
    const rect = this.canvas.getBoundingClientRect();
    const offsetX = (rect.width - this.gridWidth * this.cellSize) / 2;
    const offsetY = (rect.height - this.gridHeight * this.cellSize) / 2;

    this.ctx.strokeStyle = this.GRID_COLOR;
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.gridWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX + x * this.cellSize, offsetY);
      this.ctx.lineTo(offsetX + x * this.cellSize, offsetY + this.gridHeight * this.cellSize);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.gridHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, offsetY + y * this.cellSize);
      this.ctx.lineTo(offsetX + this.gridWidth * this.cellSize, offsetY + y * this.cellSize);
      this.ctx.stroke();
    }
  }

  private drawFoods(foods: FoodRenderData[]): void {
    const rect = this.canvas.getBoundingClientRect();
    const offsetX = (rect.width - this.gridWidth * this.cellSize) / 2;
    const offsetY = (rect.height - this.gridHeight * this.cellSize) / 2;

    const fontSize = this.cellSize * 0.9;
    this.ctx.font = `bold ${fontSize}px ${this.FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (const food of foods) {
      const px = offsetX + (food.x + 0.5) * this.cellSize;
      const py = offsetY + (food.y + 0.5) * this.cellSize;

      if (food.type === 'special') {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillText('$', px, py);
      } else {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText('*', px, py);
      }
    }
  }

  private drawSnakes(snakes: SnakeRenderData[]): void {
    const rect = this.canvas.getBoundingClientRect();
    const offsetX = (rect.width - this.gridWidth * this.cellSize) / 2;
    const offsetY = (rect.height - this.gridHeight * this.cellSize) / 2;

    const fontSize = this.cellSize * 0.9;
    this.ctx.font = `bold ${fontSize}px ${this.FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (const snake of snakes) {
      if (snake.body.length === 0) continue;

      if (!snake.isAlive && snake.deathFlashAlpha <= 0) {
        continue;
      }

      let bodyColor = snake.color;
      let headColor = snake.headColor;
      let alpha = 1;

      if (!snake.isAlive) {
        alpha = snake.deathFlashAlpha;
        if (snake.deathFlashPhase > 0 && snake.deathFlashPhase % 2 === 1) {
          bodyColor = '#FF0000';
          headColor = '#FF3333';
        }
      }

      this.ctx.globalAlpha = alpha;

      for (let i = snake.body.length - 1; i >= 0; i--) {
        const segment = snake.body[i];
        const px = offsetX + (segment.x + 0.5) * this.cellSize;
        const py = offsetY + (segment.y + 0.5) * this.cellSize;

        if (i === 0) {
          this.ctx.fillStyle = headColor;
          this.ctx.fillText('@', px, py);
        } else {
          this.ctx.fillStyle = bodyColor;
          this.ctx.fillText('#', px, py);
        }
      }

      this.ctx.globalAlpha = 1;
    }
  }
}
