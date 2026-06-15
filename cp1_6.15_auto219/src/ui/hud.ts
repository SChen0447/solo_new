import { eventBus } from '../eventBus';
import type { CharacterState, PhysicsDebugState } from '../types';

interface Checkbox {
  x: number;
  y: number;
  width: number;
  height: number;
  checked: boolean;
  label: string;
  key: keyof PhysicsDebugState;
}

export class HUDModule {
  private canvas: HTMLCanvasElement;
  private fps: number = 0;
  private fpsTimer: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private showPerformanceWarning: boolean = false;
  private debugPanelExpanded: boolean = false;
  private gearIconRect: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 24, height: 24 };
  private checkboxes: Checkbox[] = [];
  private debugState: PhysicsDebugState = {
    collisionEnabled: true,
    showBounds: false,
    particlesEnabled: true
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
    this.initializeCheckboxes();
  }

  private initializeCheckboxes(): void {
    const panelX = this.canvas.width - 220;
    const panelY = this.canvas.height - 170;

    this.checkboxes = [
      { x: panelX + 20, y: panelY + 30, width: 16, height: 16, checked: true, label: '碰撞开关', key: 'collisionEnabled' },
      { x: panelX + 20, y: panelY + 60, width: 16, height: 16, checked: false, label: '包围盒显示', key: 'showBounds' },
      { x: panelX + 20, y: panelY + 90, width: 16, height: 16, checked: true, label: '粒子开关', key: 'particlesEnabled' },
    ];
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', this.handleClick.bind(this));

    eventBus.on('PHYSICS_DEBUG', (event) => {
      if (event.type === 'PHYSICS_DEBUG') {
        const payload = event.payload;
        if (payload.collisionEnabled !== undefined) {
          this.debugState.collisionEnabled = payload.collisionEnabled;
          this.checkboxes[0].checked = payload.collisionEnabled;
        }
        if (payload.showBounds !== undefined) {
          this.debugState.showBounds = payload.showBounds;
          this.checkboxes[1].checked = payload.showBounds;
        }
        if (payload.particlesEnabled !== undefined) {
          this.debugState.particlesEnabled = payload.particlesEnabled;
          this.checkboxes[2].checked = payload.particlesEnabled;
        }
      }
    });
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= this.gearIconRect.x && x <= this.gearIconRect.x + this.gearIconRect.width &&
        y >= this.gearIconRect.y && y <= this.gearIconRect.y + this.gearIconRect.height) {
      this.debugPanelExpanded = !this.debugPanelExpanded;
      this.initializeCheckboxes();
      return;
    }

    if (this.debugPanelExpanded) {
      for (const checkbox of this.checkboxes) {
        if (x >= checkbox.x && x <= checkbox.x + checkbox.width &&
            y >= checkbox.y && y <= checkbox.y + checkbox.height) {
          checkbox.checked = !checkbox.checked;
          this.debugState[checkbox.key] = checkbox.checked;
          eventBus.emit({
            type: 'PHYSICS_DEBUG',
            payload: { [checkbox.key]: checkbox.checked }
          });
          break;
        }
      }
    }
  }

  public update(dt: number, characterState: CharacterState): void {
    this.frameCount++;
    this.fpsTimer += dt;

    if (this.fpsTimer >= 1) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
      this.showPerformanceWarning = this.fps < 30;
    }
  }

  public render(ctx: CanvasRenderingContext2D, characterState: CharacterState): void {
    this.renderStatusPanel(ctx, characterState);
    this.renderFPSCounter(ctx);
    this.renderDebugPanel(ctx);

    if (this.showPerformanceWarning) {
      this.renderPerformanceWarning(ctx);
    }

    if (this.debugState.showBounds) {
      this.renderCharacterBounds(ctx, characterState);
    }
  }

  private renderStatusPanel(ctx: CanvasRenderingContext2D, state: CharacterState): void {
    const panelX = 20;
    const panelY = 20;
    const panelWidth = 200;
    const panelHeight = 100;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const hpPercent = state.hp / state.maxHp;
    ctx.fillStyle = '#333333';
    ctx.fillRect(panelX + 15, panelY + 15, 170, 18);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(panelX + 15, panelY + 15, 170 * hpPercent, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`HP: ${Math.ceil(state.hp)}/${state.maxHp}`, panelX + 20, panelY + 17);

    const attackPercent = state.attack / state.maxAttack;
    ctx.fillStyle = '#333333';
    ctx.fillRect(panelX + 15, panelY + 42, 170, 18);
    ctx.fillStyle = '#ff9800';
    ctx.fillRect(panelX + 15, panelY + 42, 170 * attackPercent, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`ATK: ${Math.ceil(state.attack)}/${state.maxAttack}`, panelX + 20, panelY + 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.fillText(`动作: ${state.currentAction.toUpperCase()}`, panelX + 15, panelY + 72);
  }

  private renderFPSCounter(ctx: CanvasRenderingContext2D): void {
    const canvasWidth = this.canvas.width;

    ctx.fillStyle = '#76ff03';
    ctx.font = '16px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS: ${this.fps}`, canvasWidth - 20, 25);
  }

  private renderPerformanceWarning(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Performance Drop!', 20, 130);
  }

  private renderDebugPanel(ctx: CanvasRenderingContext2D): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    this.gearIconRect = {
      x: canvasWidth - 44,
      y: canvasHeight - 44,
      width: 24,
      height: 24
    };

    ctx.font = '24px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('⚙️', this.gearIconRect.x, this.gearIconRect.y);

    if (this.debugPanelExpanded) {
      const panelX = canvasWidth - 220;
      const panelY = canvasHeight - 170;
      const panelWidth = 200;
      const panelHeight = 150;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('物理调试面板', panelX + 15, panelY + 8);

      this.checkboxes.forEach(checkbox => {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(checkbox.x, checkbox.y, checkbox.width, checkbox.height);

        if (checkbox.checked) {
          ctx.fillStyle = '#4caf50';
          ctx.fillRect(checkbox.x + 3, checkbox.y + 3, checkbox.width - 6, checkbox.height - 6);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText(checkbox.label, checkbox.x + checkbox.width + 10, checkbox.y + 1);
      });
    }
  }

  private renderCharacterBounds(ctx: CanvasRenderingContext2D, state: CharacterState): void {
    const rect = state.collisionRect;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  public destroy(): void {
    this.canvas.removeEventListener('click', this.handleClick.bind(this));
  }
}
