import * as PIXI from 'pixi.js';
import { PuzzleBoard } from './PuzzleBoard';
import { UIManager, type PaintingInfo } from './UIManager';

interface Painting {
  id: string;
  name: string;
  artist: string;
  year: string;
  imageUrl: string;
}

const PAINTINGS: Painting[] = [
  {
    id: 'mona-lisa',
    name: '蒙娜丽莎',
    artist: '列奥纳多·达·芬奇',
    year: '1503年 — 1519年',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg'
  },
  {
    id: 'starry-night',
    name: '星月夜',
    artist: '文森特·梵高',
    year: '1889年',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/800px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'
  },
  {
    id: 'scream',
    name: '呐喊',
    artist: '爱德华·蒙克',
    year: '1893年',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/800px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg'
  },
  {
    id: 'girl-with-pearl-earring',
    name: '戴珍珠耳环的少女',
    artist: '约翰内斯·维米尔',
    year: '约1665年',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Meisje_met_de_parel.jpg/800px-Meisje_met_de_parel.jpg'
  },
  {
    id: 'birth-of-venus',
    name: '维纳斯的诞生',
    artist: '桑德罗·波提切利',
    year: '约1485年',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/800px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg'
  }
];

class Game {
  private app: PIXI.Application;
  private container: HTMLElement;
  private puzzleBoard: PuzzleBoard | null = null;
  private uiManager: UIManager | null = null;
  private currentPainting: Painting | null = null;
  private isPlaying: boolean = false;
  private isCompleted: boolean = false;
  private startTime: number = 0;
  private elapsedSeconds: number = 0;
  private moveCount: number = 0;
  private timerInterval: number | null = null;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor() {
    const container = document.getElementById('app');
    if (!container) throw new Error('Container #app not found');
    this.container = container;
    this.app = new PIXI.Application({
      resizeTo: window,
      backgroundColor: 0xF5F0E6,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      powerPreference: 'high-performance'
    });
    this.app.view.style.position = 'absolute';
    this.app.view.style.top = '0';
    this.app.view.style.left = '0';
    this.app.view.style.width = '100%';
    this.app.view.style.height = '100%';
    container.appendChild(this.app.view as HTMLCanvasElement);
    this.init();
  }

  private async init(): Promise<void> {
    try {
      this.uiManager = new UIManager(this.app, this.container);
      this.uiManager.createToolbar();
      this.uiManager.onRestart = () => this.restartGame();
      this.puzzleBoard = new PuzzleBoard(this.app, {
        onMove: () => this.onMove(),
        onComplete: () => this.onComplete()
      });
      window.addEventListener('resize', () => this.handleResize());
      this.handleResize();
      await this.startNewGame();
    } catch (err) {
      console.error('Game initialization failed:', err);
      this.uiManager?.showError('游戏初始化失败，请刷新页面重试');
    }
  }

  private async startNewGame(): Promise<void> {
    try {
      this.moveCount = 0;
      this.elapsedSeconds = 0;
      this.isCompleted = false;
      this.isPlaying = false;
      this.uiManager?.updateMoveCount(0);
      this.uiManager?.updateTimer(0);
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      const painting = this.selectRandomPainting();
      this.currentPainting = painting;
      const image = await this.loadImage(painting.imageUrl);
      this.uiManager?.hideLoading();
      this.puzzleBoard?.destroy();
      const success = this.puzzleBoard?.loadAndCutImage(image);
      if (!success) {
        throw new Error('图片切割失败');
      }
      this.handleResize();
      this.isPlaying = true;
      this.startTime = performance.now();
      this.startTimer();
    } catch (err) {
      console.error('Failed to start game:', err);
      this.uiManager?.showError('加载图片失败，请检查网络后重试');
    }
  }

  private selectRandomPainting(): Painting {
    const available = PAINTINGS.filter(p => p.id !== this.currentPainting?.id);
    const pool = available.length > 0 ? available : PAINTINGS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private async loadImage(url: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(url)) {
      const cached = this.imageCache.get(url);
      if (cached && cached.complete) return cached;
    }
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      let timeoutId: number | null = null;
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        img.onload = null;
        img.onerror = null;
      };
      timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('图片加载超时'));
      }, 15000);
      img.onload = () => {
        cleanup();
        this.imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        cleanup();
        reject(new Error('图片加载失败'));
      };
      img.src = url;
    });
  }

  private startTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => {
      if (!this.isPlaying || this.isCompleted) return;
      const elapsed = (performance.now() - this.startTime) / 1000;
      this.elapsedSeconds = elapsed;
      this.uiManager?.updateTimer(elapsed);
    }, 200);
  }

  private onMove(): void {
    this.moveCount++;
    this.uiManager?.updateMoveCount(this.moveCount);
  }

  private onComplete(): void {
    if (this.isCompleted) return;
    this.isCompleted = true;
    this.isPlaying = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.elapsedSeconds = (performance.now() - this.startTime) / 1000;
    this.puzzleBoard?.celebrate();
    setTimeout(() => {
      if (this.currentPainting && this.uiManager) {
        const info: PaintingInfo = {
          name: this.currentPainting.name,
          artist: this.currentPainting.artist,
          year: this.currentPainting.year
        };
        this.uiManager.showCompletion(info, this.elapsedSeconds, this.moveCount);
      }
    }, 1500);
  }

  private restartGame(): void {
    this.startNewGame();
  }

  private handleResize(): void {
    const toolbarHeight = this.uiManager?.getToolbarHeight() || 60;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.uiManager?.resize(w, h);
    this.puzzleBoard?.resize(w, h, toolbarHeight);
  }

  public destroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.puzzleBoard?.destroy();
    this.uiManager?.destroy();
    this.app.destroy(true, { texture: true, baseTexture: true });
  }
}

let game: Game | null = null;

window.addEventListener('DOMContentLoaded', () => {
  try {
    game = new Game();
  } catch (err) {
    console.error('Failed to start game:', err);
    const loading = document.getElementById('loading');
    if (loading) {
      loading.textContent = '游戏启动失败';
      loading.style.color = '#d32f2f';
    }
  }
});
