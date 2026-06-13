import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';

const BATTLEFIELD_WIDTH = 1200;
const BATTLEFIELD_HEIGHT = 900;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: BATTLEFIELD_WIDTH,
  height: BATTLEFIELD_HEIGHT,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  scene: [BattleScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

export const BATTLEFIELD = {
  WIDTH: BATTLEFIELD_WIDTH,
  HEIGHT: BATTLEFIELD_HEIGHT
};

export const GAME_EVENTS = {
  SHIP_DAMAGED: 'ship-damaged',
  SHIP_DESTROYED: 'ship-destroyed',
  FORMATION_MOVE: 'formation-move',
  AI_DECISION: 'ai-decision',
  COMBAT_STARTED: 'combat-started'
} as const;

export type GameEventType = typeof GAME_EVENTS[keyof typeof GAME_EVENTS];

export class EventBus {
  private static instance: EventBus;
  private emitter: Phaser.Events.EventEmitter;

  private constructor() {
    this.emitter = new Phaser.Events.EventEmitter();
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit(event: GameEventType, data?: unknown): void {
    this.emitter.emit(event, data);
  }

  on(event: GameEventType, callback: (data?: unknown) => void, context?: unknown): void {
    this.emitter.on(event, callback, context);
  }

  off(event: GameEventType, callback?: (data?: unknown) => void, context?: unknown, once?: boolean): void {
    this.emitter.off(event, callback, context, once);
  }

  once(event: GameEventType, callback: (data?: unknown) => void, context?: unknown): void {
    this.emitter.once(event, callback, context);
  }

  destroy(): void {
    this.emitter.destroy();
  }
}

new Phaser.Game(config);
