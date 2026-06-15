import { InputModule } from './modules/input';
import { CharacterModule } from './modules/character';
import { PhysicsModule } from './modules/physics';
import { ParticleSystem } from './modules/particles';
import { HUDModule } from './ui/hud';
import { eventBus } from './eventBus';
import type { Joint } from './types';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private inputModule: InputModule;
  private characterModule: CharacterModule;
  private physicsModule: PhysicsModule;
  private particleSystem: ParticleSystem;
  private hudModule: HUDModule;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private readonly GROUND_Y: number = 600;
  private readonly BONE_COLOR: string = '#aaaaaa';
  private readonly JOINT_COLOR: string = '#ffffff';
  private readonly JOINT_RADIUS: number = 5;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D context not available');
    }
    this.ctx = ctx;

    this.setupCanvasSize();
    window.addEventListener('resize', this.handleResize.bind(this));

    this.inputModule = new InputModule();
    this.characterModule = new CharacterModule(400);
    this.physicsModule = new PhysicsModule();
    this.particleSystem = new ParticleSystem();
    this.hudModule = new HUDModule(canvas);
  }

  private setupCanvasSize(): void {
    const container = document.getElementById('game-container');
    if (container) {
      const width = window.innerWidth * 0.8;
      const height = window.innerHeight * 0.8;
      this.canvas.width = Math.max(width, 800);
      this.canvas.height = Math.max(height, 700);
    } else {
      this.canvas.width = Math.max(window.innerWidth * 0.8, 800);
      this.canvas.height = Math.max(window.innerHeight * 0.8, 700);
    }
  }

  private handleResize(): void {
    this.setupCanvasSize();
  }

  public start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop(currentTime: number): void {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number): void {
    const horizontalDir = this.inputModule.getHorizontalDirection();
    this.characterModule.setHorizontalDirection(horizontalDir);

    this.inputModule.update(dt);
    this.characterModule.update(dt);

    const characterRect = this.characterModule.getCollisionRect();
    const characterVel = this.characterModule.getState().velocity;
    const attackHitbox = this.characterModule.getAttackHitbox();

    const { characterResponse } = this.physicsModule.update(dt, characterRect, characterVel, attackHitbox);

    if (characterResponse) {
      this.characterModule.setPosition(
        characterResponse.x + characterRect.width / 2,
        characterResponse.y
      );
      this.characterModule.setVelocity(characterResponse.vx, characterResponse.vy);
    }

    this.particleSystem.update(dt);
    this.hudModule.update(dt, this.characterModule.getState());
  }

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    this.renderBackground(ctx, width, height);
    this.renderGroundLine(ctx, width);

    this.physicsModule.render(ctx);
    this.particleSystem.render(ctx);

    this.renderSkeleton(ctx);

    this.hudModule.render(ctx, this.characterModule.getState());
  }

  private renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private renderGroundLine(ctx: CanvasRenderingContext2D, width: number): void {
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.GROUND_Y);
    ctx.lineTo(width, this.GROUND_Y);
    ctx.stroke();
  }

  private renderSkeleton(ctx: CanvasRenderingContext2D): void {
    const joints = this.characterModule.getWorldJoints();
    const jointMap = new Map<string, Joint>();

    joints.forEach(joint => {
      jointMap.set(joint.name, joint);
    });

    ctx.strokeStyle = this.BONE_COLOR;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    joints.forEach(joint => {
      if (joint.parent && jointMap.has(joint.parent)) {
        const parent = jointMap.get(joint.parent)!;
        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);
        ctx.lineTo(joint.x, joint.y);
        ctx.stroke();
      }
    });

    ctx.fillStyle = this.JOINT_COLOR;
    joints.forEach(joint => {
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, this.JOINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.inputModule.destroy();
    this.characterModule.destroy();
    this.physicsModule.destroy();
    this.particleSystem.destroy();
    this.hudModule.destroy();
    eventBus.clear();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();

  window.addEventListener('beforeunload', () => {
    game.destroy();
  });
});
