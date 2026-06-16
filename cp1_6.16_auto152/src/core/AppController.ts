import {
  SoundSource,
  RoomDimensions,
  FrequencyBand,
  MaterialScheme,
  ABSORPTION_SCHEMES,
  AcousticResult,
  PickedPointInfo
} from '@/types';
import { AcousticEngine } from './AcousticEngine';
import { RoomMesh } from './RoomMesh';

export interface AppState {
  sources: SoundSource[];
  dimensions: RoomDimensions;
  frequency: FrequencyBand;
  materialScheme: MaterialScheme;
  wallColor: string;
}

export type StateUpdateHandler = (state: AppState) => void;

export class AppController {
  private state: AppState;
  private engine: AcousticEngine;
  private roomMesh: RoomMesh;
  private listeners: Set<StateUpdateHandler> = new Set();
  private lastComputeTime: number = 0;
  private computeThrottleMs: number = 16;

  constructor(initialState: AppState) {
    this.state = { ...initialState, sources: initialState.sources.map((s) => ({ ...s })) };
    this.engine = new AcousticEngine(
      this.state.sources,
      this.state.dimensions,
      this.state.frequency,
      ABSORPTION_SCHEMES[this.state.materialScheme]
    );
    this.roomMesh = new RoomMesh(this.state.dimensions);
  }

  public getState(): AppState {
    return {
      ...this.state,
      sources: this.state.sources.map((s) => ({ ...s })),
      dimensions: { ...this.state.dimensions }
    };
  }

  public getRoomMesh(): RoomMesh {
    return this.roomMesh;
  }

  public getAcousticEngine(): AcousticEngine {
    return this.engine;
  }

  public subscribe(handler: StateUpdateHandler): () => void {
    this.listeners.add(handler);
    handler(this.getState());
    return () => this.listeners.delete(handler);
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((h) => h(state));
  }

  private scheduleCompute(): void {
    const now = performance.now();
    if (now - this.lastComputeTime < this.computeThrottleMs) {
      return;
    }
    this.lastComputeTime = now;
    this.engine.setSources(this.state.sources);
    this.engine.setDimensions(this.state.dimensions);
    this.engine.setFrequency(this.state.frequency);
    this.engine.setAbsorption(ABSORPTION_SCHEMES[this.state.materialScheme]);

    requestAnimationFrame(() => {
      const result = this.engine.compute();
      this.roomMesh.updateAcousticColors(result);
    });
  }

  public setSourceIntensity(sourceId: number, intensity: number): void {
    const source = this.state.sources.find((s) => s.id === sourceId);
    if (source) {
      source.intensity = Math.max(30, Math.min(80, intensity));
      this.notify();
      this.scheduleCompute();
    }
  }

  public setDimensions(dimensions: Partial<RoomDimensions>): void {
    this.state.dimensions = {
      ...this.state.dimensions,
      ...dimensions,
      width: Math.max(8, Math.min(12, dimensions.width ?? this.state.dimensions.width)),
      depth: Math.max(6, Math.min(8, dimensions.depth ?? this.state.dimensions.depth)),
      height: Math.max(3, Math.min(4, dimensions.height ?? this.state.dimensions.height))
    };
    this.roomMesh.setDimensions(this.state.dimensions);
    this.notify();
    this.scheduleCompute();
  }

  public setFrequency(frequency: FrequencyBand): void {
    this.state.frequency = frequency;
    this.notify();
    this.scheduleCompute();
  }

  public setMaterialScheme(scheme: MaterialScheme): void {
    this.state.materialScheme = scheme;
    this.notify();
    this.scheduleCompute();
  }

  public setWallColor(color: string): void {
    this.state.wallColor = color;
    this.roomMesh.setWallColor(color);
    this.notify();
  }

  public computeInitial(): AcousticResult {
    const result = this.engine.compute();
    this.roomMesh.updateAcousticColors(result);
    return result;
  }

  public updateAnimation(deltaTime: number): void {
    this.roomMesh.animateColors(deltaTime, 0.5);
  }

  public getPickedPointInfo(
    worldX: number,
    worldY: number,
    worldZ: number,
    screenX: number,
    screenY: number
  ): PickedPointInfo {
    const { width: w, depth: d, height: h } = this.state.dimensions;
    const clampedX = Math.max(0, Math.min(w, worldX));
    const clampedY = Math.max(0, Math.min(h, worldY));
    const clampedZ = Math.max(0, Math.min(d, worldZ));
    const spl = this.engine.getSPLAtPoint(clampedX, clampedY, clampedZ);

    return {
      x: parseFloat(clampedX.toFixed(2)),
      y: parseFloat(clampedY.toFixed(2)),
      z: parseFloat(clampedZ.toFixed(2)),
      spl: parseFloat(spl.toFixed(1)),
      frequency: this.state.frequency,
      scheme: this.state.materialScheme,
      screenX,
      screenY
    };
  }
}
