export type EventCallback<T = any> = (data: T) => void;

export interface EventBusEvents {
  DataLoaded: {
    scalarData: Float32Array;
    vectorData: Float32Array;
    gridSize: { x: number; y: number; z: number };
    bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
    dataSetName: string;
    frequency: number;
  };
  SliceChanged: { axis: 'X' | 'Y' | 'Z'; position: number };
  IsosurfaceRequest: { threshold: number };
  IsosurfaceReady: { vertices: Float32Array; normals: Float32Array; threshold: number };
  IsosurfaceError: { message: string };
  FieldLineRequest: { startPoint: { x: number; y: number; z: number } };
  FieldLineReady: { points: Float32Array; id: number; fieldValues: Float32Array };
  FieldLineDragged: { id: number; newPosition: { x: number; y: number; z: number } };
  FieldLineRemoved: { id: number };
  ExportRequest: { type: 'slice' | 'isosurface' | 'fieldline' };
  ExportReady: { data: string; filename: string };
  UndoRequest: { operation: string };
  UndoPerformed: { record: any };
  ViewReset: void;
  DisplayModeChanged: { mode: 'particles' | 'arrows' | 'both' };
  ArrowDensityChanged: { density: number };
  DataSetChanged: { dataSetIndex: number };
  StatsUpdate: {
    minScalar: number;
    maxScalar: number;
    avgScalar: number;
    currentSliceValue: number;
    particleCount: number;
  };
  HoverPoint: {
    point: { x: number; y: number; z: number } | null;
    fieldValue: number;
    vector: { x: number; y: number; z: number };
  };
  ClickPoint: { point: { x: number; y: number; z: number } };
  AnimationComplete: { type: string };
}

class EventBus {
  private events: Map<keyof EventBusEvents, Set<EventCallback<any>>> = new Map();

  on<K extends keyof EventBusEvents>(event: K, callback: EventCallback<EventBusEvents[K]>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  off<K extends keyof EventBusEvents>(event: K, callback: EventCallback<EventBusEvents[K]>): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit<K extends keyof EventBusEvents>(event: K, data: EventBusEvents[K]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus();
export default eventBus;
