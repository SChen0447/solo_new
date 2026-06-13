import * as PIXI from 'pixi.js';

export interface PuzzlePiece {
  id: number;
  correctIndex: number;
  currentIndex: number;
  sprite: PIXI.Sprite;
  shadow: PIXI.Sprite;
  glowSprite: PIXI.Graphics | null;
  isCorrect: boolean;
  homeX: number;
  homeY: number;
  pieceW: number;
  pieceH: number;
  animProgress: number;
  animStartX: number;
  animStartY: number;
  animEndX: number;
  animEndY: number;
  animDuration: number;
  animTime: number;
  isAnimating: boolean;
  glowPhase: number;
  glowActive: boolean;
  onAnimComplete: (() => void) | null;
}

export interface PuzzleBoardCallbacks {
  onMove: () => void;
  onComplete: () => void;
}

const GRID_SIZE = 4;
const TOTAL_PIECES = GRID_SIZE * GRID_SIZE;
const DRAG_SCALE = 1.05;
const ANIM_DURATION = 350;
const MAX_CUT_OFFSET = 0.08;

export class PuzzleBoard {
  private app: PIXI.Application;
  private container: PIXI.Container;
  private pieces: PuzzlePiece[] = [];
  private boardSize: number = 0;
  private boardX: number = 0;
  private boardY: number = 0;
  private draggingPiece: PuzzlePiece | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private callbacks: PuzzleBoardCallbacks;
  private cutX: number[] = [];
  private cutY: number[] = [];
  private pieceWidths: number[] = [];
  private pieceHeights: number[] = [];
  private piecePosX: number[] = [];
  private piecePosY: number[] = [];
  private textureCache: Map<string, PIXI.Texture> = new Map();
  private baseTexture: PIXI.BaseTexture | null = null;
  private animatingPieces: Set<PuzzlePiece> = new Set();
  private rafId: number = 0;
  private lastFrameTime: number = 0;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;

  constructor(app: PIXI.Application, callbacks: PuzzleBoardCallbacks) {
    this.app = app;
    this.callbacks = callbacks;
    this.container = new PIXI.Container();
    this.app.stage.addChild(this.container);
    this.startAnimLoop();
  }

  private startAnimLoop(): void {
    const loop = (time: number) => {
      this.rafId = requestAnimationFrame(loop);
      const dt = time - this.lastFrameTime;
      this.lastFrameTime = time;
      this.frameCount++;
      if (time - this.fpsUpdateTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.fpsUpdateTime = time;
      }
      if (this.animatingPieces.size > 0) {
        this.updateAnimations(dt);
      }
      this.updateGlowEffects(dt);
      if (this.draggingPiece) {
        this.updateShadowPosition(this.draggingPiece);
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private updateAnimations(dt: number): void {
    const toRemove: PuzzlePiece[] = [];
    for (const piece of this.animatingPieces) {
      piece.animTime += dt;
      const t = Math.min(1, piece.animTime / piece.animDuration);
      const eased = this.easeOutCubic(t);
      piece.sprite.x = piece.animStartX + (piece.animEndX - piece.animStartX) * eased;
      piece.sprite.y = piece.animStartY + (piece.animEndY - piece.animStartY) * eased;
      if (t >= 1) {
        piece.sprite.x = piece.animEndX;
        piece.sprite.y = piece.animEndY;
        piece.isAnimating = false;
        toRemove.push(piece);
        if (piece.onAnimComplete) {
          piece.onAnimComplete();
          (piece as any).onAnimComplete = null;
        }
      }
    }
    for (const p of toRemove) {
      this.animatingPieces.delete(p);
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateGlowEffects(dt: number): void {
    for (const piece of this.pieces) {
      if (piece.glowActive) {
        piece.glowPhase += dt * 0.005;
        const alpha = Math.sin(piece.glowPhase) * 0.5 + 0.5;
        if (piece.glowFilter) {
          piece.glowFilter.alpha = alpha;
        }
      }
    }
  }

  public resize(screenWidth: number, screenHeight: number, toolbarHeight: number): void {
    const maxBoard = Math.min(screenWidth * 0.9, screenHeight - toolbarHeight - 80);
    this.boardSize = Math.floor(maxBoard);
    this.boardX = (screenWidth - this.boardSize) / 2;
    this.boardY = toolbarHeight + (screenHeight - toolbarHeight - this.boardSize) / 2;
    this.container.x = this.boardX;
    this.container.y = this.boardY;
    this.calculatePieceLayout();
    this.drawBoard();
    this.updateAllPieceLayouts();
  }

  private calculatePieceLayout(): void {
    if (this.cutX.length === 0 || this.cutY.length === 0) return;
    this.pieceWidths = [];
    this.pieceHeights = [];
    this.piecePosX = [];
    this.piecePosY = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      const w = (this.cutX[i + 1] - this.cutX[i]) * this.boardSize;
      this.pieceWidths.push(w);
      this.piecePosX.push(this.cutX[i] * this.boardSize);
    }
    for (let i = 0; i < GRID_SIZE; i++) {
      const h = (this.cutY[i + 1] - this.cutY[i]) * this.boardSize;
      this.pieceHeights.push(h);
      this.piecePosY.push(this.cutY[i] * this.boardSize);
    }
  }

  private drawBoard(): void {
    const existing = this.container.getChildByName('board-frame');
    if (existing) this.container.removeChild(existing);
    const frame = new PIXI.Container();
    frame.name = 'board-frame';
    const borderWidth = Math.max(12, this.boardSize * 0.03);
    const border = new PIXI.Graphics();
    border.beginFill(0x8B5A2B);
    border.drawRect(-borderWidth, -borderWidth, this.boardSize + borderWidth * 2, this.boardSize + borderWidth * 2);
    border.endFill();
    for (let i = 0; i < 25; i++) {
      const woodColor = i % 2 === 0 ? 0x6B4423 : 0x8B5A2B;
      border.lineStyle(1, woodColor, 0.25);
      const y = -borderWidth + (this.boardSize + borderWidth * 2) * (i / 25);
      border.moveTo(-borderWidth, y);
      border.bezierCurveTo(
        -borderWidth + this.boardSize * 0.3, y + (Math.sin(i) * 3),
        -borderWidth + this.boardSize * 0.7, y + (Math.cos(i) * 3),
        this.boardSize + borderWidth, y
      );
    }
    const inner = new PIXI.Graphics();
    inner.beginFill(0xF5F0E6);
    inner.drawRect(0, 0, this.boardSize, this.boardSize);
    inner.endFill();
    frame.addChild(border, inner);
    this.container.addChildAt(frame, 0);
  }

  public generateDynamicCuts(): void {
    const cuts: number[] = [0];
    for (let i = 1; i < GRID_SIZE; i++) {
      const base = i / GRID_SIZE;
      const offset = (Math.random() - 0.5) * 2 * MAX_CUT_OFFSET;
      cuts.push(Math.max(0.05, Math.min(0.95, base + offset)));
    }
    cuts.push(1);
    this.cutX = cuts.slice();
    this.cutY = cuts.slice();
    this.sortCuts(this.cutX);
    this.sortCuts(this.cutY);
  }

  private sortCuts(cuts: number[]): void {
    for (let i = 1; i < cuts.length - 1; i++) {
      if (cuts[i] <= cuts[i - 1] + 0.02) {
        cuts[i] = cuts[i - 1] + 0.02 + Math.random() * 0.02;
      }
      if (cuts[i] >= cuts[i + 1] - 0.02) {
        cuts[i] = cuts[i + 1] - 0.02 - Math.random() * 0.02;
      }
    }
  }

  public loadAndCutImage(image: HTMLImageElement): boolean {
    try {
      if (this.baseTexture) {
        this.baseTexture.destroy();
      }
      this.textureCache.clear();
      this.baseTexture = PIXI.BaseTexture.from(image);
      this.generateDynamicCuts();
      this.pieces = [];
      const imgW = image.width;
      const imgH = image.height;
      const imgCutsX = this.cutX.map(c => Math.floor(c * imgW));
      const imgCutsY = this.cutY.map(c => Math.floor(c * imgH));
      for (let i = 0; i < TOTAL_PIECES; i++) {
        const row = Math.floor(i / GRID_SIZE);
        const col = i % GRID_SIZE;
        const sx = imgCutsX[col];
        const sy = imgCutsY[row];
        const sw = imgCutsX[col + 1] - sx;
        const sh = imgCutsY[row + 1] - sy;
        const texKey = `piece-${i}`;
        const rect = new PIXI.Rectangle(sx, sy, sw, sh);
        const tex = new PIXI.Texture(this.baseTexture, rect);
        this.textureCache.set(texKey, tex);
        const sprite = new PIXI.Sprite(tex);
        const shadowTex = this.createShadowTexture(sw, sh);
        const shadow = new PIXI.Sprite(shadowTex);
        shadow.alpha = 0;
        sprite.addChildAt(shadow, 0);
        const piece: PuzzlePiece = {
          id: i,
          correctIndex: i,
          currentIndex: i,
          sprite,
          shadow,
          glowFilter: null,
          isCorrect: true,
          homeX: 0,
          homeY: 0,
          pieceW: 0,
          pieceH: 0,
          animProgress: 0,
          animStartX: 0,
          animStartY: 0,
          animEndX: 0,
          animEndY: 0,
          animDuration: ANIM_DURATION,
          animTime: 0,
          isAnimating: false,
          glowPhase: 0,
          glowActive: false
        };
        this.makePieceInteractive(piece);
        this.pieces.push(piece);
      }
      this.calculatePieceLayout();
      this.updateAllPieceLayouts();
      this.shufflePieces();
      this.addPiecesToStage();
      return true;
    } catch (err) {
      console.error('Failed to load and cut image:', err);
      return false;
    }
  }

  private createShadowTexture(w: number, h: number): PIXI.Texture {
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = w * scale + 20 * scale;
    canvas.height = h * scale + 20 * scale;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 15 * scale;
      ctx.shadowOffsetX = 4 * scale;
      ctx.shadowOffsetY = 6 * scale;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(10 * scale, 10 * scale, w * scale, h * scale);
    }
    return PIXI.Texture.from(canvas);
  }

  private updateAllPieceLayouts(): void {
    for (const p of this.pieces) {
      const row = Math.floor(p.currentIndex / GRID_SIZE);
      const col = p.currentIndex % GRID_SIZE;
      p.homeX = this.piecePosX[col];
      p.homeY = this.piecePosY[row];
      p.pieceW = this.pieceWidths[col];
      p.pieceH = this.pieceHeights[row];
      if (!p.isAnimating && this.draggingPiece !== p) {
        p.sprite.x = p.homeX;
        p.sprite.y = p.homeY;
      }
      p.sprite.width = p.pieceW;
      p.sprite.height = p.pieceH;
      p.shadow.width = p.pieceW;
      p.shadow.height = p.pieceH;
    }
  }

  private addPiecesToStage(): void {
    for (const p of this.pieces) {
      this.container.addChild(p.sprite);
    }
  }

  private shufflePieces(): void {
    const indices = this.pieces.map((_, i) => i);
    let inversions = 0;
    do {
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      inversions = this.countInversions(indices);
    } while (inversions % 2 !== 0 || inversions < 10);
    for (let k = 0; k < this.pieces.length; k++) {
      const piece = this.pieces[indices[k]];
      piece.currentIndex = k;
      piece.isCorrect = indices[k] === k;
    }
    this.updateAllPieceLayouts();
  }

  private countInversions(arr: number[]): number {
    let inv = 0;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i] > arr[j]) inv++;
      }
    }
    return inv;
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
    if (piece.isAnimating) return;
    this.draggingPiece = piece;
    const local = piece.sprite.toLocal(e.global);
    this.dragOffsetX = local.x;
    this.dragOffsetY = local.y;
    piece.sprite.zIndex = 1000;
    this.container.sortChildren();
    this.animateScale(piece, DRAG_SCALE);
    this.showShadow(piece);
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
    const centerX = piece.sprite.x + piece.pieceW / 2;
    const centerY = piece.sprite.y + piece.pieceH / 2;
    const targetIndex = this.getIndexAtPosition(centerX, centerY);
    const targetPiece = targetIndex >= 0 ? this.pieces.find(p => p.currentIndex === targetIndex) : null;
    piece.sprite.zIndex = 0;
    this.container.sortChildren();
    this.hideShadow(piece);
    this.animateScale(piece, 1);
    if (targetPiece && targetPiece !== piece) {
      this.swapPieces(piece, targetPiece);
    } else {
      this.animateToHome(piece);
    }
  }

  private getIndexAtPosition(x: number, y: number): number {
    if (x < 0 || x > this.boardSize || y < 0 || y > this.boardSize) return -1;
    let col = 0;
    for (let i = 0; i < GRID_SIZE; i++) {
      if (x >= this.piecePosX[i] && x < this.piecePosX[i] + this.pieceWidths[i]) {
        col = i;
        break;
      }
      if (i === GRID_SIZE - 1) col = i;
    }
    let row = 0;
    for (let i = 0; i < GRID_SIZE; i++) {
      if (y >= this.piecePosY[i] && y < this.piecePosY[i] + this.pieceHeights[i]) {
        row = i;
        break;
      }
      if (i === GRID_SIZE - 1) row = i;
    }
    return row * GRID_SIZE + col;
  }

  private swapPieces(a: PuzzlePiece, b: PuzzlePiece): void {
    const tmpIndex = a.currentIndex;
    a.currentIndex = b.currentIndex;
    b.currentIndex = tmpIndex;
    const wasACorrect = a.isCorrect;
    const wasBCorrect = b.isCorrect;
    a.isCorrect = a.currentIndex === a.correctIndex;
    b.isCorrect = b.currentIndex === b.correctIndex;
    this.callbacks.onMove();
    const aRow = Math.floor(a.currentIndex / GRID_SIZE);
    const aCol = a.currentIndex % GRID_SIZE;
    const bRow = Math.floor(b.currentIndex / GRID_SIZE);
    const bCol = b.currentIndex % GRID_SIZE;
    a.homeX = this.piecePosX[aCol];
    a.homeY = this.piecePosY[aRow];
    a.pieceW = this.pieceWidths[aCol];
    a.pieceH = this.pieceHeights[aRow];
    b.homeX = this.piecePosX[bCol];
    b.homeY = this.piecePosY[bRow];
    b.pieceW = this.pieceWidths[bCol];
    b.pieceH = this.pieceHeights[bRow];
    this.animateToHome(a, () => {
      if (a.isCorrect && !wasACorrect) this.triggerGoldGlow(a);
    });
    this.animateToHome(b, () => {
      if (b.isCorrect && !wasBCorrect) this.triggerGoldGlow(b);
      if (this.checkCompletion()) {
        this.callbacks.onComplete();
      }
    });
  }

  private animateToHome(piece: PuzzlePiece, onComplete?: () => void): void {
    piece.animStartX = piece.sprite.x;
    piece.animStartY = piece.sprite.y;
    piece.animEndX = piece.homeX;
    piece.animEndY = piece.homeY;
    piece.animTime = 0;
    piece.animDuration = ANIM_DURATION;
    piece.isAnimating = true;
    if (onComplete) {
      (piece as any).onAnimComplete = onComplete;
    }
    this.animatingPieces.add(piece);
  }

  private animateScale(piece: PuzzlePiece, targetScale: number): void {
    const startScale = piece.sprite.scale.x;
    const startTime = performance.now();
    const duration = 150;
    const tick = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      const eased = this.easeOutCubic(t);
      const s = startScale + (targetScale - startScale) * eased;
      piece.sprite.scale.set(s);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private showShadow(piece: PuzzlePiece): void {
    piece.shadow.visible = true;
    let alpha = piece.shadow.alpha;
    const startTime = performance.now();
    const duration = 150;
    const tick = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      piece.shadow.alpha = alpha + (0.6 - alpha) * t;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    this.updateShadowPosition(piece);
  }

  private hideShadow(piece: PuzzlePiece): void {
    const startAlpha = piece.shadow.alpha;
    const startTime = performance.now();
    const duration = 200;
    const tick = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      piece.shadow.alpha = startAlpha * (1 - t);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        piece.shadow.visible = false;
      }
    };
    requestAnimationFrame(tick);
  }

  private updateShadowPosition(piece: PuzzlePiece): void {
    const scale = piece.sprite.scale.x;
    const offset = 6 * (scale - 1) / (DRAG_SCALE - 1) * scale;
    piece.shadow.x = -piece.sprite.width * 0.02 + offset * 0.3;
    piece.shadow.y = -piece.sprite.height * 0.02 + offset * 0.5;
  }

  private triggerGoldGlow(piece: PuzzlePiece): void {
    try {
      if (!piece.glowFilter) {
        const glow = new PIXI.filters.GlowFilter({
          distance: 15,
          outerStrength: 3,
          innerStrength: 0,
          color: 0xFFD700,
          quality: 0.5
        });
        piece.glowFilter = glow;
        piece.sprite.filters = piece.sprite.filters ? [...piece.sprite.filters, glow] : [glow];
      }
      piece.glowFilter.alpha = 0;
      piece.glowPhase = 0;
      piece.glowActive = true;
      setTimeout(() => {
        piece.glowActive = false;
        if (piece.glowFilter) {
          piece.glowFilter.alpha = 0;
        }
      }, 2000);
    } catch {
      const glowSprite = new PIXI.Graphics();
      const w = piece.pieceW;
      const h = piece.pieceH;
      glowSprite.lineStyle(6, 0xFFD700, 0.8);
      glowSprite.drawRect(-3, -3, w + 6, h + 6);
      piece.sprite.addChild(glowSprite);
      let phase = 0;
      const tick = () => {
        phase += 0.1;
        const alpha = Math.sin(phase) * 0.5 + 0.5;
        glowSprite.clear();
        glowSprite.lineStyle(6, 0xFFD700, alpha);
        glowSprite.drawRect(-3, -3, w + 6, h + 6);
        if (phase < Math.PI * 4) {
          requestAnimationFrame(tick);
        } else {
          glowSprite.destroy();
        }
      };
      requestAnimationFrame(tick);
    }
  }

  public checkCompletion(): boolean {
    return this.pieces.every(p => p.isCorrect);
  }

  public celebrate(): void {
    for (let i = 0; i < this.pieces.length; i++) {
      setTimeout(() => {
        this.triggerGoldGlow(this.pieces[i]);
      }, i * 80);
    }
  }

  public getFPS(): number {
    return this.fps;
  }

  public destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    for (const p of this.pieces) {
      p.sprite.destroy({ texture: false, baseTexture: false });
    }
    this.pieces = [];
    this.textureCache.forEach(tex => tex.destroy(false));
    this.textureCache.clear();
    if (this.baseTexture) {
      this.baseTexture.destroy();
      this.baseTexture = null;
    }
  }
}
