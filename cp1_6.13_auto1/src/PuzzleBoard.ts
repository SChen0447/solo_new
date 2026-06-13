import * as PIXI from 'pixi.js';

export interface PuzzlePiece {
  id: number;
  correctIndex: number;
  currentIndex: number;
  sprite: PIXI.Sprite;
  border: PIXI.Graphics;
  glow: PIXI.Graphics;
  isCorrect: boolean;
  homeX: number;
  homeY: number;
}

export interface PuzzleBoardCallbacks {
  onMove: () => void;
  onComplete: () => void;
}

const GRID_SIZE = 4;
const TOTAL_PIECES = GRID_SIZE * GRID_SIZE;
const DRAG_SCALE = 1.05;
const ANIM_DURATION = 300;

export class PuzzleBoard {
  private app: PIXI.Application;
  private container: PIXI.Container;
  private pieces: PuzzlePiece[] = [];
  private boardSize: number = 0;
  private pieceSize: number = 0;
  private boardX: number = 0;
  private boardY: number = 0;
  private draggingPiece: PuzzlePiece | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private callbacks: PuzzleBoardCallbacks;
  private isAnimating: boolean = false;

  constructor(app: PIXI.Application, callbacks: PuzzleBoardCallbacks) {
    this.app = app;
    this.callbacks = callbacks;
    this.container = new PIXI.Container();
    this.app.stage.addChild(this.container);
  }

  public resize(screenWidth: number, screenHeight: number, toolbarHeight: number): void {
    const maxBoard = Math.min(screenWidth * 0.9, screenHeight - toolbarHeight - 80);
    this.boardSize = Math.floor(maxBoard);
    this.pieceSize = Math.floor(this.boardSize / GRID_SIZE);
    this.boardSize = this.pieceSize * GRID_SIZE;
    this.boardX = (screenWidth - this.boardSize) / 2;
    this.boardY = toolbarHeight + (screenHeight - toolbarHeight - this.boardSize) / 2;
    this.container.x = this.boardX;
    this.container.y = this.boardY;
    this.drawBoard();
    this.updatePiecePositions();
  }

  private drawBoard(): void {
    while (this.container.children.length > 0) {
      this.container.removeChildAt(0);
    }
    const border = new PIXI.Graphics();
    const borderWidth = Math.max(12, this.boardSize * 0.03);
    border.beginFill(0x8B5A2B);
    border.drawRect(-borderWidth, -borderWidth, this.boardSize + borderWidth * 2, this.boardSize + borderWidth * 2);
    border.endFill();
    for (let i = 0; i < 20; i++) {
      const woodColor = i % 2 === 0 ? 0x6B4423 : 0x8B5A2B;
      border.lineStyle(1, woodColor, 0.3);
      const y = -borderWidth + (this.boardSize + borderWidth * 2) * (i / 20);
      border.moveTo(-borderWidth, y);
      border.bezierCurveTo(
        -borderWidth + this.boardSize * 0.3, y + (Math.random() - 0.5) * 4,
        -borderWidth + this.boardSize * 0.7, y + (Math.random() - 0.5) * 4,
        this.boardSize + borderWidth, y
      );
    }
    const inner = new PIXI.Graphics();
    inner.beginFill(0xF5F0E6);
    inner.drawRect(0, 0, this.boardSize, this.boardSize);
    inner.endFill();
    this.container.addChild(border, inner);
  }

  public loadAndCutImage(image: HTMLImageElement): void {
    const cutOffsetsX = this.generateCutOffsets();
    const cutOffsetsY = this.generateCutOffsets();
    this.pieces = [];
    const imgW = image.width;
    const imgH = image.height;
    const imgCutsX = [0, ...cutOffsetsX.map(o => Math.floor(imgW * (0.25 + o))), imgW];
    const imgCutsY = [0, ...cutOffsetsY.map(o => Math.floor(imgH * (0.25 + o))), imgH];
    const baseTex = PIXI.BaseTexture.from(image);
    for (let i = 0; i < TOTAL_PIECES; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      const sx = imgCutsX[col];
      const sy = imgCutsY[row];
      const sw = imgCutsX[col + 1] - sx;
      const sh = imgCutsY[row + 1] - sy;
      const rect = new PIXI.Rectangle(sx, sy, sw, sh);
      const tex = new PIXI.Texture(baseTex, rect);
      const sprite = new PIXI.Sprite(tex);
      const border = new PIXI.Graphics();
      border.lineStyle(2, 0x333333, 1);
      border.drawRect(0, 0, this.pieceSize, this.pieceSize);
      sprite.addChild(border);
      const glow = new PIXI.Graphics();
      glow.lineStyle(4, 0xFFD700, 0);
      glow.drawRect(0, 0, this.pieceSize, this.pieceSize);
      sprite.addChild(glow);
      const piece: PuzzlePiece = {
        id: i,
        correctIndex: i,
        currentIndex: i,
        sprite,
        border,
        glow,
        isCorrect: true,
        homeX: 0,
        homeY: 0
      };
      this.makePieceInteractive(piece);
      this.pieces.push(piece);
    }
    this.shufflePieces();
    this.updatePiecePositions();
    for (const p of this.pieces) {
      this.container.addChild(p.sprite);
    }
  }

  private generateCutOffsets(): number[] {
    const maxOffset = 0.04;
    return [-maxOffset + Math.random() * maxOffset * 2, -maxOffset + Math.random() * maxOffset * 2, -maxOffset + Math.random() * maxOffset * 2];
  }

  private shufflePieces(): void {
    const indices = this.pieces.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let k = 0; k < this.pieces.length; k++) {
      this.pieces[indices[k]].currentIndex = k;
      this.pieces[indices[k]].isCorrect = indices[k] === k;
    }
  }

  private updatePiecePositions(): void {
    for (const p of this.pieces) {
      const row = Math.floor(p.currentIndex / GRID_SIZE);
      const col = p.currentIndex % GRID_SIZE;
      p.homeX = col * this.pieceSize;
      p.homeY = row * this.pieceSize;
      if (!this.draggingPiece || this.draggingPiece !== p) {
        p.sprite.x = p.homeX;
        p.sprite.y = p.homeY;
      }
      p.sprite.width = this.pieceSize;
      p.sprite.height = this.pieceSize;
    }
  }

  private makePieceInteractive(piece: PuzzlePiece): void {
    piece.sprite.eventMode = 'static';
    piece.sprite.cursor = 'pointer';
    piece.sprite.on('pointerdown', (e: PIXI.FederatedPointerEvent) => this.onDragStart(e, piece));
    piece.sprite.on('pointermove', (e: PIXI.FederatedPointerEvent) => this.onDragMove(e, piece));
    piece.sprite.on('pointerup', (e: PIXI.FederatedPointerEvent) => this.onDragEnd(e, piece));
    piece.sprite.on('pointerupoutside', (e: PIXI.FederatedPointerEvent) => this.onDragEnd(e, piece));
  }

  private onDragStart(e: PIXI.FederatedPointerEvent, piece: PuzzlePiece): void {
    if (this.isAnimating) return;
    this.draggingPiece = piece;
    const local = piece.sprite.toLocal(e.global);
    this.dragOffsetX = local.x;
    this.dragOffsetY = local.y;
    piece.sprite.zIndex = 1000;
    this.container.sortChildren();
    this.animateScale(piece, DRAG_SCALE);
  }

  private onDragMove(e: PIXI.FederatedPointerEvent, piece: PuzzlePiece): void {
    if (this.draggingPiece !== piece) return;
    const local = this.container.toLocal(e.global);
    piece.sprite.x = local.x - this.dragOffsetX * piece.sprite.scale.x;
    piece.sprite.y = local.y - this.dragOffsetY * piece.sprite.scale.y;
  }

  private onDragEnd(_e: PIXI.FederatedPointerEvent, piece: PuzzlePiece): void {
    if (this.draggingPiece !== piece) return;
    this.draggingPiece = null;
    const centerX = piece.sprite.x + this.pieceSize / 2;
    const centerY = piece.sprite.y + this.pieceSize / 2;
    const col = Math.floor(centerX / this.pieceSize);
    const row = Math.floor(centerY / this.pieceSize);
    const targetCol = Math.max(0, Math.min(GRID_SIZE - 1, col));
    const targetRow = Math.max(0, Math.min(GRID_SIZE - 1, row));
    const targetIndex = targetRow * GRID_SIZE + targetCol;
    const targetPiece = this.pieces.find(p => p.currentIndex === targetIndex);
    piece.sprite.zIndex = 0;
    this.container.sortChildren();
    if (targetPiece && targetPiece !== piece) {
      this.swapPieces(piece, targetPiece);
    } else {
      this.animateToHome(piece);
    }
    this.animateScale(piece, 1);
  }

  private swapPieces(a: PuzzlePiece, b: PuzzlePiece): void {
    this.isAnimating = true;
    const tmpIndex = a.currentIndex;
    a.currentIndex = b.currentIndex;
    b.currentIndex = tmpIndex;
    const wasACorrect = a.isCorrect;
    const wasBCorrect = b.isCorrect;
    a.isCorrect = a.currentIndex === a.correctIndex;
    b.isCorrect = b.currentIndex === b.correctIndex;
    this.callbacks.onMove();
    this.animateToHome(a, () => {
      if (a.isCorrect && !wasACorrect) this.flashGold(a);
    });
    this.animateToHome(b, () => {
      if (b.isCorrect && !wasBCorrect) this.flashGold(b);
      this.isAnimating = false;
      if (this.checkCompletion()) {
        this.callbacks.onComplete();
      }
    });
  }

  private animateToHome(piece: PuzzlePiece, onComplete?: () => void): void {
    const startX = piece.sprite.x;
    const startY = piece.sprite.y;
    const endX = piece.homeX = (piece.currentIndex % GRID_SIZE) * this.pieceSize;
    const endY = piece.homeY = Math.floor(piece.currentIndex / GRID_SIZE) * this.pieceSize;
    const startTime = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - startTime) / ANIM_DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      piece.sprite.x = startX + (endX - startX) * eased;
      piece.sprite.y = startY + (endY - startY) * eased;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        piece.sprite.x = endX;
        piece.sprite.y = endY;
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(tick);
  }

  private animateScale(piece: PuzzlePiece, targetScale: number): void {
    const startScale = piece.sprite.scale.x;
    const startTime = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - startTime) / 150);
      const eased = 1 - Math.pow(1 - t, 3);
      const s = startScale + (targetScale - startScale) * eased;
      piece.sprite.scale.set(s);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private flashGold(piece: PuzzlePiece): void {
    let phase = 0;
    const tick = () => {
      phase += 0.12;
      const alpha = Math.sin(phase) * 0.5 + 0.5;
      piece.glow.clear();
      piece.glow.lineStyle(4, 0xFFD700, alpha);
      piece.glow.drawRect(0, 0, this.pieceSize, this.pieceSize);
      if (phase < Math.PI * 3) {
        requestAnimationFrame(tick);
      } else {
        piece.glow.clear();
        piece.glow.lineStyle(4, 0xFFD700, 0);
        piece.glow.drawRect(0, 0, this.pieceSize, this.pieceSize);
      }
    };
    requestAnimationFrame(tick);
  }

  public checkCompletion(): boolean {
    return this.pieces.every(p => p.isCorrect);
  }

  public celebrate(): void {
    for (const p of this.pieces) {
      this.flashGold(p);
    }
  }

  public destroy(): void {
    for (const p of this.pieces) {
      p.sprite.destroy();
    }
    this.pieces = [];
  }
}
