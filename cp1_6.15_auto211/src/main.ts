import { Environment } from './environment';
import { CreatureManager } from './creature';
import { Renderer } from './renderer';
import { UIManager } from './ui';
import type { UICallbacks } from './ui';

const FPS = 30;
const FRAME_TIME = 1000 / FPS;

class Game {
  private environment!: Environment;
  private creatureManager!: CreatureManager;
  private renderer!: Renderer;
  private uiManager!: UIManager;
  private canvas!: HTMLCanvasElement;
  private canvasContainer!: HTMLElement;
  
  private lastTime: number = 0;
  private animationId: number = 0;
  private isPaused: boolean = false;
  private speedMultiplier: number = 1;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  public init(): void {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.canvasContainer = document.getElementById('canvas-container') as HTMLElement;
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.environment = new Environment(this.canvasWidth, this.canvasHeight);
    this.creatureManager = new CreatureManager(this.canvasWidth, this.canvasHeight);
    this.renderer = new Renderer(this.canvas, this.canvasWidth, this.canvasHeight);
    
    const callbacks: UICallbacks = {
      onTemperatureChange: (temp: number) => this.handleTemperatureChange(temp),
      onNutrientBoost: () => this.handleNutrientBoost(),
      onSpeedChange: (speed: number) => this.handleSpeedChange(speed),
      onPauseToggle: () => this.handlePauseToggle()
    };
    
    this.uiManager = new UIManager(callbacks);
    
    this.creatureManager.setExtremeEventHandler(() => {
      this.environment.triggerExtremeEvent();
    });
    
    this.startLoop();
  }

  private resizeCanvas(): void {
    const containerRect = this.canvasContainer.getBoundingClientRect();
    this.canvasWidth = Math.floor(containerRect.width);
    this.canvasHeight = Math.floor(containerRect.height);
    
    if (this.environment) {
      this.environment.resize(this.canvasWidth, this.canvasHeight);
    }
    if (this.creatureManager) {
      this.creatureManager.resize(this.canvasWidth, this.canvasHeight);
    }
    if (this.renderer) {
      this.renderer.resize(this.canvasWidth, this.canvasHeight);
    }
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (currentTime: number): void => {
    this.animationId = requestAnimationFrame(this.loop);
    
    const deltaTime = currentTime - this.lastTime;
    
    if (deltaTime >= FRAME_TIME) {
      const steps = Math.floor(deltaTime / FRAME_TIME) * this.speedMultiplier;
      const currentTimeMs = currentTime;
      
      for (let i = 0; i < steps; i++) {
        if (!this.isPaused) {
          this.update(currentTimeMs);
        }
      }
      
      this.render();
      this.lastTime = currentTime;
    }
  };

  private update(currentTime: number): void {
    this.environment.update(currentTime);
    
    const envState = this.environment.getState();
    this.creatureManager.update(envState, currentTime);
  }

  private render(): void {
    const envState = this.environment.getState();
    const creatures = this.creatureManager.getCreatures();
    
    this.renderer.render(envState, creatures);
    this.uiManager.updateStats(envState, creatures);
  }

  private handleTemperatureChange(temp: number): void {
    this.environment.setTemperature(temp);
  }

  private handleNutrientBoost(): void {
    this.environment.boostNutrients(20);
  }

  private handleSpeedChange(speed: number): void {
    this.speedMultiplier = speed;
  }

  private handlePauseToggle(): void {
    this.isPaused = !this.isPaused;
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

const game = new Game();

window.addEventListener('DOMContentLoaded', () => {
  game.init();
});

window.addEventListener('beforeunload', () => {
  game.destroy();
});
