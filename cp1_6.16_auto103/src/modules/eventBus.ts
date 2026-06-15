export enum EventType {
  PARTICLE_PARAMS_CHANGED = 'particle:params-changed',
  PARTICLE_DATA_UPDATED = 'particle:data-updated',
  CAMERA_POSE_UPDATED = 'camera:pose-updated',
  PARTICLE_CLICKED = 'particle:clicked',
  CONTROL_PANEL_TOGGLED = 'control:panel-toggled'
}

export type NebulaType = 'spiral' | 'diffuse' | 'ring';

export interface ParticleParams {
  nebulaType: NebulaType;
  particleCount: number;
  colorStart: string;
  colorEnd: string;
  rotationSpeed: number;
  turbulence: number;
}

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  count: number;
}

export interface CameraPose {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export interface ParticleInfo {
  index: number;
  position: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number };
  screenX: number;
  screenY: number;
}

type EventCallback<T = any> = (data: T) => void;

class EventBus {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();

  on<T>(event: EventType, callback: (data: T) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
  }

  off<T>(event: EventType, callback: (data: T) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
    }
  }

  emit<T>(event: EventType, data?: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
