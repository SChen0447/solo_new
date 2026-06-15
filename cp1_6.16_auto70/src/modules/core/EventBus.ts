export type RhythmType = 'normal' | 'afib' | 'pvc' | 'tachycardia' | 'bradycardia' | 'av_block';

export interface EcgDataEvent {
  leads: number[][];
  timestamp: number;
}

export interface RhythmChangeEvent {
  rhythmType: RhythmType;
}

export interface DetectionResultEvent {
  type: string;
  label: string;
  confidence: number;
  startTime: number;
  endTime: number;
}

export interface HeartFlashEvent {
  region: 'atria' | 'ventricles' | 'both';
  color: string;
  frequency: number;
  duration: number;
}

export interface DetectionAlertEvent {
  type: string;
  message: string;
}

type EventCallback<T = unknown> = (data: T) => void;

interface EventMap {
  'ecg:data': EcgDataEvent;
  'ecg:rhythm-change': RhythmChangeEvent;
  'detection:result': DetectionResultEvent;
  'heart:flash': HeartFlashEvent;
  'detection:alert': DetectionAlertEvent;
}

export class EventBus {
  private listeners: { [K in keyof EventMap]?: Array<EventCallback<EventMap[K]>> } = {};

  on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);
  }

  off<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): void {
    const list = this.listeners[event];
    if (!list) return;
    this.listeners[event] = list.filter(cb => cb !== callback) as Array<EventCallback<EventMap[K]>>;
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const list = this.listeners[event];
    if (!list) return;
    for (const cb of list) {
      cb(data);
    }
  }
}
