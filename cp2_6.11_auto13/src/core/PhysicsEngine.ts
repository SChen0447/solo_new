import PhysicsWorker from './physicsWorker.ts?worker';
import { INITIAL_STAR_COUNT, INITIAL_GRAVITATIONAL_CONSTANT, INITIAL_TIME_STEP } from '../utils/constants';

export interface PhysicsUpdateData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  collisions: number;
  count: number;
}

export type UpdateCallback = (data: PhysicsUpdateData) => void;

export class PhysicsEngine {
  private worker: Worker;
  private onUpdateCallback: UpdateCallback | null = null;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  constructor() {
    this.worker = new PhysicsWorker();
    this.worker.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(e: MessageEvent) {
    if (e.data.type === 'positions' && this.onUpdateCallback) {
      this.onUpdateCallback({
        positions: e.data.positions,
        colors: e.data.colors,
        sizes: e.data.sizes,
        collisions: e.data.collisions,
        count: e.data.count
      });
    }
  }

  init(count: number = INITIAL_STAR_COUNT) {
    this.worker.postMessage({ type: 'init', data: { count } });
  }

  setOnUpdate(callback: UpdateCallback) {
    this.onUpdateCallback = callback;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tick();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick() {
    if (!this.isRunning) return;
    this.worker.postMessage({ type: 'step' });
    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }

  setGravitationalConstant(value: number) {
    this.worker.postMessage({
      type: 'updateParams',
      params: { gravitationalConstant: value }
    });
  }

  setTimeStep(value: number) {
    this.worker.postMessage({
      type: 'updateParams',
      params: { timeStep: value }
    });
  }

  setStarCount(count: number) {
    this.worker.postMessage({
      type: 'setStarCount',
      count
    });
  }

  dispose() {
    this.stop();
    this.worker.terminate();
  }
}
