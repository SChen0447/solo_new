import * as PIXI from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';

export interface PuzzlePiece {
  id: number;
  correctIndex: number;
  currentIndex: number;
  container: PIXI.Container;
  sprite: PIXI.Sprite;
  mask: PIXI.Graphics;
  shadow: PIXI.Sprite;
  border: PIXI.Graphics;
  glowFilter: GlowFilter | null;
  isCorrect: boolean;
  homeX: number;
  homeY: number;
  pieceW: number;
  pieceH: number;
  tab: { top: number; right: number; bottom: number; left: number };
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
  baseScale: number;
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

class SpritePool {
  private pool: PIXI.Sprite[] = [];
  constructor(private maxSize: number = 32) {}
  get(texture?: PIXI.Texture): PIXI.Sprite {
    if (this.pool.length > 0) {
      const s = this.pool.pop()!;
      s.visible = true;
      s.alpha = 1;
      if (texture) s.texture = texture;
      return s;
    }
    return new PIXI.Sprite(texture || PIXI.Texture.WHITE);
  }
  release(sprite: PIXI.Sprite): void {
    if (this.pool.length >= this.maxSize) {
      sprite.destroy();
      return;
    }
    sprite.visible = false;
    sprite.alpha = 0;
    sprite.x = 0;
    sprite.y = 0;
    sprite.scale.set(1);
    sprite.rotation = 0;
    sprite.removeAllListeners();
    this.pool.push(sprite);
  }
  clear(): void {
    for (const s of this.pool) s.destroy();
    this.pool = [];
  }
}

class GraphicsPool {
  private pool: PIXI.Graphics[] = [];
  constructor(private maxSize: number = 32) {}
  get(): PIXI.Graphics {
    if (this.pool.length > 0) {
      const g = this.pool.pop()!;
      g.visible = true;
      g.alpha = 1;
      g.clear();
      return g;
    }
    return new PIXI.Graphics();
  }
  release(g: PIXI.Graphics): void {
    if (this.pool.length >= this.maxSize) {
      g.destroy();
      return;
    }
    g.visible = false;
    g.alpha = 0;
    g.clear();
    g.removeAllListeners();
    this.pool.push(g);
  }
  clear(): void {
    for (const g of this.pool) g.destroy();
    this.pool = [];
  }
}

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
  private spritePool: SpritePool = new SpritePool(32);
  private graphicsPool: GraphicsPool = new GraphicsPool(32);
  private shadowTextureCache: Map<string, PIXI.Texture> = new Map();

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
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private updateAnimations(dt: number): void {
    const toRemove: PuzzlePiece[] = [];
    for (const piece of this.animatingPieces) {
      piece.animTime += dt;
      const t = Math.min(1, piece.animTime / piece.animDuration);
      const eased = this.easeOutCubic(t);
      piece.container.x = piece.animStartX + (piece.animEndX - piece.animStartX) * eased;
      piece.container.y = piece.animStartY + (piece.animEndY - piece.animStartY) * eased;
      if (t >= 1) {
        piece.container.x = piece.animEndX;
        piece.container.y = piece.animEndY;
        piece.isAnimating = false;
        toRemove.push(piece);
        if (piece.onAnimComplete) {
          piece.onAnimComplete();
          piece.onAnimComplete = null;
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

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private updateGlowEffects(dt: number): void {
    for (const piece of this.pieces) {
      if (piece.glowActive && piece.glowFilter) {
        piece.glowPhase += dt * 0.006;
        const alpha = Math.sin(piece.glowPhase) * 0.5 + 0.5;
        piece.glowFilter.alpha = alpha * 0.9;
        piece.glowFilter.distance = 12 + Math.sin(piece.glowPhase * 2) * 4;
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
    const border = this.graphicsPool.get();
    border.beginFill(0x8B5A2B);
    border.drawRect(-borderWidth, -borderWidth, this.boardSize + borderWidth * 2, this.boardSize + borderWidth * 2);
    border.endFill();
    for (let i = 0; i < 30; i++) {
      const woodColor = i % 2 === 0 ? 0x6B4423 : 0x8B5A2B;
      border.lineStyle(1, woodColor, 0.25);
      const y = -borderWidth + (this.boardSize + borderWidth * 2) * (i / 30);
      border.moveTo(-borderWidth, y);
      border.bezierCurveTo(
        -borderWidth + this.boardSize * 0.3, y + Math.sin(i * 0.7) * 3,
        -borderWidth + this.boardSize * 0.7, y + Math.cos(i * 0.9) * 3,
        this.boardSize + borderWidth, y
      );
    }
    const inner = this.graphicsPool.get();
    inner.beginFill(0xF5F0E6);
    inner.drawRect(0, 0, this.boardSize, this.boardSize);
    inner.endFill();
    frame.addChild(border, inner);
    this.container.addChildAt(frame, 0);
  }

  public generateDynamicCuts(): { x: number[]; y: number[]; tabs: number[][] } {
    const createCuts = (): number[] => {
      const cuts: number[] = [0];
      for (let i = 1; i < GRID_SIZE; i++) {
        const base = i / GRID_SIZE;
        const offset = (Math.random() - 0.5) * 2 * MAX_CUT_OFFSET;
        cuts.push(Math.max(0.06, Math.min(0.94, base + offset)));
      }
      cuts.push(1);
      for (let i = 1; i < cuts.length - 1; i++) {
        if (cuts[i] <= cuts[i - 1] + 0.03) {
          cuts[i] = cuts[i - 1] + 0.03 + Math.random() * 0.02;
        }
        if (cuts[i] >= cuts[i + 1] - 0.03) {
          cuts[i] = cuts[i + 1] - 0.03 - Math.random() * 0.02;
        }
      }
      return cuts;
    };
    this.cutX = createCuts();
    this.cutY = createCuts();
    const tabs: number[][] = [];
    for (let i = 0; i < TOTAL_PIECES; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      const top = row === 0 ? 0 : (Math.random() > 0.5 ? 1 : -1);
      const right = col === GRID_SIZE - 1 ? 0 : (Math.random() > 0.5 ? 1 : -1);
      const bottom = row === GRID_SIZE - 1 ? 0 : (Math.random() > 0.5 ? 1 : -1);
      const left = col === 0 ? 0 : (Math.random() > 0.5 ? 1 : -1);
      tabs.push([top, right, bottom, left]);
    }
    for (let i = 0; i < TOTAL_PIECES; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      if (row > 0) tabs[i][0] = -tabs[i - GRID_SIZE][2];
      if (col > 0) tabs[i][3] = -tabs[i - 1][1];
    }
    return { x: this.cutX, y: this.cutY, tabs };
  }

  public loadAndCutImage(image: HTMLImageElement): boolean {
    try {
      if (this.baseTexture) {
        this.baseTexture.destroy();
      }
      this.textureCache.forEach(tex => tex.destroy(false));
      this.textureCache.clear();
      this.shadowTextureCache.forEach(tex => tex.destroy(false));
      this.shadowTextureCache.clear();
      for (const p of this.pieces) {
        this.releasePiece(p);
      }
      this.pieces = [];
      this.baseTexture = PIXI.BaseTexture.from(image);
      const { tabs } = this.generateDynamicCuts();
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
        const padding = Math.max(sw, sh) * 0.25;
        const paddedSX = Math.max(0, sx - padding);
        const paddedSY = Math.max(0, sy - padding);
        const paddedSW = Math.min(imgW - paddedSX, sw + padding * 2);
        const paddedSH = Math.min(imgH - paddedSY, sh + padding * 2);
        const texKey = `piece-${i}`;
        const rect = new PIXI.Rectangle(paddedSX, paddedSY, paddedSW, paddedSH);
        const tex = new PIXI.Texture(this.baseTexture, rect);
        this.textureCache.set(texKey, tex);
        const container = new PIXI.Container();
        const sprite = this.spritePool.get(tex);
        const mask = this.graphicsPool.get();
        const border = this.graphicsPool.get();
        const shadowTex = this.createShadowTexture(paddedSW, paddedSH);
        const shadow = this.spritePool.get(shadowTex);
        shadow.alpha = 0;
        shadow.visible = false;
        const tabConfig = {
          top: tabs[i][0],
          right: tabs[i][1],
          bottom: tabs[i][2],
          left: tabs[i][3]
        };
        const glowFilter = new GlowFilter({
          distance: 15,
          outerStrength: 3,
          innerStrength: 0,
          color: 0xFFD700,
          quality: 0.6,
          alpha: 0
        });
        container.filters = [glowFilter];
        container.filterArea = new PIXI.Rectangle(-50, -50, paddedSW + 100, paddedSH + 100);
        sprite.mask = mask;
        sprite.addChild(shadow);
        container.addChild(sprite, mask, border);
        const piece: PuzzlePiece = {
          id: i,
          correctIndex: i,
          currentIndex: i,
          container,
          sprite,
          mask,
          shadow,
          border,
          glowFilter,
          isCorrect: true,
          homeX: 0,
          homeY: 0,
          pieceW: 0,
          pieceH: 0,
          tab: tabConfig,
          animStartX: 0,
          animStartY: 0,
          animEndX: 0,
          animEndY: 0,
          animDuration: ANIM_DURATION,
          animTime: 0,
          isAnimating: false,
          glowPhase: 0,
          glowActive: false,
          onAnimComplete: null,
          baseScale: 1
        };
        this.makePieceInteractive(piece);
        this.pieces.push(piece);
      }
      this.calculatePieceLayout();
      this.updateAllPieceLayouts();
      this.shufflePieces();
      for (const p of this.pieces) {
        this.container.addChild(p.container);
      }
      return true;
    } catch (err) {
      console.error('Failed to load and cut image:', err);
      return false;
    }
  }

  private releasePiece(piece: PuzzlePiece): void {
    this.spritePool.release(piece.sprite);
    this.spritePool.release(piece.shadow);
    this.graphicsPool.release(piece.mask);
    this.graphicsPool.release(piece.border);
    piece.container.destroy({ children: false });
    if (piece.glowFilter) piece.glowFilter.destroy();
  }

  private createShadowTexture(w: number, h: number): PIXI.Texture {
    const key = `${w}-${h}`;
    if (this.shadowTextureCache.has(key)) {
      return this.shadowTextureCache.get(key)!;
    }
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = w * scale + 40 * scale;
    canvas.height = h * scale + 40 * scale;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 18 * scale;
      ctx.shadowOffsetX = 5 * scale;
      ctx.shadowOffsetY = 8 * scale;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(20 * scale, 20 * scale, w * scale, h * scale);
    }
    const tex = PIXI.Texture.from(canvas);
    this.shadowTextureCache.set(key, tex);
    return tex;
  }

  private drawPuzzleShape(
    g: PIXI.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    tab: { top: number; right: number; bottom: number; left: number }
  ): void {
    const tabSize = Math.min(w, h) * 0.22;
    const neckSize = tabSize * 0.5;
    g.clear();
    g.moveTo(x, y);
    this.drawEdge(g, x, y, x + w, y, tab.top, true, tabSize, neckSize);
    this.drawEdge(g, x + w, y, x + w, y + h, tab.right, false, tabSize, neckSize);
    this.drawEdge(g, x + w, y + h, x, y + h, tab.bottom, true, tabSize, neckSize);
    this.drawEdge(g, x, y + h, x, y, tab.left, false, tabSize, neckSize);
    g.closePath();
  }

  private drawEdge(
    g: PIXI.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    tabDir: number,
    horizontal: boolean,
    tabSize: number,
    neckSize: number
  ): void {
    if (tabDir === 0) {
      g.lineTo(x2, y2);
      return;
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;
    const ny = dx / len;
    const start = 0.5 - neckSize / len / 2;
    const end = 0.5 + neckSize / len / 2;
    const midT = 0.5;
    const bulge = tabDir * tabSize;
    const sx1 = x1 + dx * start;
    const sy1 = y1 + dy * start;
    const sx2 = x1 + dx * end;
    const sy2 = y1 + dy * end;
    const mx = x1 + dx * midT + nx * bulge * 0.8;
    const my = y1 + dy * midT + ny * bulge * 0.8;
    const cp1x = sx1 + nx * bulge * 0.3;
    const cp1y = sy1 + ny * bulge * 0.3;
    const cp2x = sx2 + nx * bulge * 0.3;
    const cp2y = sy2 + ny * bulge * 0.3;
    const tipX = x1 + dx * midT + nx * bulge;
    const tipY = y1 + dy * midT + ny * bulge;
    g.lineTo(sx1, sy1);
    g.bezierCurveTo(cp1x, cp1y, tipX - bulge * 0.3 * nx, tipY - bulge * 0.3 * ny, tipX, tipY);
    g.bezierCurveTo(tipX + bulge * 0.3 * nx, tipY + bulge * 0.3 * ny, cp2x, cp2y, sx2, sy2);
    g.lineTo(x2, y2);
  }

  private updateAllPieceLayouts(): void {
    for (const p of this.pieces) {
      const row = Math.floor(p.currentIndex / GRID_SIZE);
      const col = p.currentIndex % GRID_SIZE;
      const baseX = this.piecePosX[col];
      const baseY = this.piecePosY[row];
      p.pieceW = this.pieceWidths[col];
      p.pieceH = this.pieceHeights[row];
      const padding = Math.max(p.pieceW, p.pieceH) * 0.25;
      p.homeX = baseX - padding;
      p.homeY = baseY - padding;
      if (!p.isAnimating && this.draggingPiece !== p) {
        p.container.x = p.homeX;
        p.container.y = p.homeY;
      }
      const texW = p.sprite.texture.width;
      const texH = p.sprite.texture.height;
      const scaleX = (p.pieceW + padding * 2) / texW;
      const scaleY = (p.pieceH + padding * 2) / texH;
      p.baseScale = Math.max(scaleX, scaleY);
      p.container.scale.set(p.baseScale);
      p.sprite.x = 0;
      p.sprite.y = 0;
      p.sprite.width = p.pieceW + padding * 2;
      p.sprite.height = p.pieceH + padding * 2;
      const maskX = padding;
      const maskY = padding;
      this.drawPuzzleShape(p.mask, maskX, maskY, p.pieceW, p.pieceH, p.tab);
      p.border.clear();
      p.border.lineStyle(2, 0x333333, 1);
      this.drawPuzzleShape(p.border, maskX, maskY, p.pieceW, p.pieceH, p.tab);
      p.shadow.width = p.pieceW + padding * 2;
      p.shadow.height = p.pieceH + padding * 2;
      p.shadow.x = 0;
      p.shadow.y = 0;
      if (p.container.filterArea) {
        p.container.filterArea.x = -50;
        p.container.filterArea.y = -50;
        p.container.filterArea.width = p.pieceW + padding * 2 + 100;
        p.container.filterArea.height = p.pieceH + padding * 2 + 100;
      }
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
    } while (inversions % 2 !== 0 || inversions < 15);
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
    piece.container.eventMode = 'static';
    piece.container.cursor = 'pointer';
    piece.container.hitArea = new PIXI.Rectangle(0, 0, piece.pieceW + 100, piece.pieceH + 100);
    piece.container.on('pointerdown', (e: PIXI.FederatedPointerEvent) => this.onDragStart(e, piece));
    piece.container.on('pointermove', (e: PIXI.FederatedPointerEvent) => this.onDragMove(e, piece));
    piece.container.on('pointerup', (e: PIXI.FederatedPointerEvent) => this.onDragEnd(e, piece));
    piece.container.on('pointerupoutside', (e: PIXI.FederatedPointerEvent) => this.onDragEnd(e, piece));
  }

  private onDragStart(e: PIXI.FederatedPointerEvent, piece: PuzzlePiece): void {
    if (piece.isAnimating) return;
    this.draggingPiece = piece;
    const local = piece.container.toLocal(e.global);
    this.dragOffsetX = local.x;
    this.dragOffsetY = local.y;
    piece.container.zIndex = 1000;
    this.container.sortChildren();
    this.animateScale(piece, DRAG_SCALE);
    this.showShadow(piece);
  }

  private onDragMove(e: PIXI.FederatedPointerEvent, piece: PuzzlePiece): void {
    if (this.draggingPiece !== piece) return;
    const local = this.container.toLocal(e.global);
    piece.container.x = local.x - this.dragOffsetX * piece.container.scale.x;
    piece.container.y = local.y - this.dragOffsetY * piece.container.scale.y;
    this.updateShadowPosition(piece);
  }

  private onDragEnd(_e: PIXI.FederatedPointerEvent, piece: PuzzlePiece): void {
    if (this.draggingPiece !== piece) return;
    this.draggingPiece = null;
    const padding = Math.max(piece.pieceW, piece.pieceH) * 0.25;
    const centerX = piece.container.x + padding + piece.pieceW / 2;
    const centerY = piece.container.y + padding + piece.pieceH / 2;
    const targetIndex = this.getIndexAtPosition(centerX, centerY);
    const targetPiece = targetIndex >= 0 ? this.pieces.find(p => p.currentIndex === targetIndex) : null;
    piece.container.zIndex = 0;
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
    let col = GRID_SIZE - 1;
    for (let i = 0; i < GRID_SIZE; i++) {
      if (x >= this.piecePosX[i] && x < this.piecePosX[i] + this.pieceWidths[i]) {
        col = i;
        break;
      }
    }
    let row = GRID_SIZE - 1;
    for (let i = 0; i < GRID_SIZE; i++) {
      if (y >= this.piecePosY[i] && y < this.piecePosY[i] + this.pieceHeights[i]) {
        row = i;
        break;
      }
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
    const paddingA = Math.max(a.pieceW, a.pieceH) * 0.25;
    const paddingB = Math.max(b.pieceW, b.pieceH) * 0.25;
    a.homeX = this.piecePosX[aCol] - paddingA;
    a.homeY = this.piecePosY[aRow] - paddingA;
    b.homeX = this.piecePosX[bCol] - paddingB;
    b.homeY = this.piecePosY[bRow] - paddingB;
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
    piece.animStartX = piece.container.x;
    piece.animStartY = piece.container.y;
    piece.animEndX = piece.homeX;
    piece.animEndY = piece.homeY;
    piece.animTime = 0;
    piece.animDuration = ANIM_DURATION;
    piece.isAnimating = true;
    if (onComplete) {
      piece.onAnimComplete = onComplete;
    }
    this.animatingPieces.add(piece);
  }

  private animateScale(piece: PuzzlePiece, targetScale: number): void {
    const startScale = piece.container.scale.x;
    const finalScale = piece.baseScale * targetScale;
    const startTime = performance.now();
    const duration = 150;
    const tick = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      const eased = this.easeOutBack(t);
      const s = startScale + (finalScale - startScale) * eased;
      piece.container.scale.set(s);
      this.updateShadowPosition(piece);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private showShadow(piece: PuzzlePiece): void {
    piece.shadow.visible = true;
    const startAlpha = piece.shadow.alpha;
    const startTime = performance.now();
    const duration = 150;
    const tick = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      piece.shadow.alpha = startAlpha + (0.7 - startAlpha) * t;
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
    const scale = piece.container.scale.x;
    const baseScale = piece.baseScale;
    const progress = (scale - baseScale) / (baseScale * DRAG_SCALE - baseScale);
    const clamped = Math.max(0, Math.min(1, progress));
    const offsetX = 3 + clamped * 6;
    const offsetY = 5 + clamped * 10;
    const padding = Math.max(piece.pieceW, piece.pieceH) * 0.25;
    piece.shadow.x = offsetX * (piece.sprite.width / (piece.pieceW + padding * 2));
    piece.shadow.y = offsetY * (piece.sprite.height / (piece.pieceH + padding * 2));
    piece.shadow.scale.set(0.98 + clamped * 0.04);
  }

  private triggerGoldGlow(piece: PuzzlePiece): void {
    if (piece.glowFilter) {
      piece.glowFilter.alpha = 0;
      piece.glowPhase = 0;
      piece.glowActive = true;
      setTimeout(() => {
        piece.glowActive = false;
        if (piece.glowFilter) {
          piece.glowFilter.alpha = 0;
        }
      }, 2500);
    }
  }

  public checkCompletion(): boolean {
    return this.pieces.every(p => p.isCorrect);
  }

  public celebrate(): void {
    for (let i = 0; i < this.pieces.length; i++) {
      setTimeout(() => {
        this.triggerGoldGlow(this.pieces[i]);
      }, i * 60);
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
      this.releasePiece(p);
    }
    this.pieces = [];
    this.textureCache.forEach(tex => tex.destroy(false));
    this.textureCache.clear();
    this.shadowTextureCache.forEach(tex => tex.destroy(false));
    this.shadowTextureCache.clear();
    if (this.baseTexture) {
      this.baseTexture.destroy();
      this.baseTexture = null;
    }
    this.spritePool.clear();
    this.graphicsPool.clear();
  }
}
