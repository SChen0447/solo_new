import { eventBus, Events } from '../utils/EventBus';
import { v4 as uuidv4 } from 'uuid';

export type FontFamily = 'Roboto' | 'Orbitron' | 'Playfair Display' | 'Fira Code' | 'Pacifico';
export type AnimationType = 'none' | 'flip' | 'scale-fade' | 'rotate-in';
export type BorderStyle = 'none' | 'solid' | 'dashed' | 'rounded';
export type BackgroundType = 'solid' | 'linear-gradient' | 'radial-gradient';
export type Timezone = 
  | 'UTC-12' | 'UTC-11' | 'UTC-10' | 'UTC-9' | 'UTC-8' | 'UTC-7' | 'UTC-6'
  | 'UTC-5' | 'UTC-4' | 'UTC-3' | 'UTC-2' | 'UTC-1' | 'UTC+0'
  | 'UTC+1' | 'UTC+2' | 'UTC+3' | 'UTC+4' | 'UTC+5' | 'UTC+6'
  | 'UTC+7' | 'UTC+8' | 'UTC+9' | 'UTC+10' | 'UTC+11' | 'UTC+12';

export interface GradientConfig {
  type: BackgroundType;
  angle: number;
  color1: string;
  color2: string;
}

export interface TimeLabelConfig {
  showHours: boolean;
  showMinutes: boolean;
  showSeconds: boolean;
  showMilliseconds: boolean;
}

export interface CountdownConfig {
  id: string;
  activityName: string;
  fontFamily: FontFamily;
  fontSize: number;
  textColor: string;
  backgroundColor: GradientConfig;
  backgroundOpacity: number;
  borderStyle: BorderStyle;
  borderColor: string;
  borderWidth: number;
  animation: AnimationType;
  timeLabels: TimeLabelConfig;
  durationHours: number;
  durationMinutes: number;
  durationSeconds: number;
  targetTime: string;
  useTargetTime: boolean;
  timezone: Timezone;
}

export const PRESET_COLORS: string[] = [
  '#FF5252', '#448AFF', '#69F0AE', '#FFD740', '#AB47BC',
  '#FF6E40', '#40C4FF', '#E040FB', '#76FF03', '#FFAB40', '#C6FF00'
];

export const FONT_FAMILIES: FontFamily[] = ['Roboto', 'Orbitron', 'Playfair Display', 'Fira Code', 'Pacifico'];

export const TIMEZONES: Timezone[] = [
  'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6',
  'UTC-5', 'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0',
  'UTC+1', 'UTC+2', 'UTC+3', 'UTC+4', 'UTC+5', 'UTC+6',
  'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10', 'UTC+11', 'UTC+12'
];

export const createDefaultConfig = (): CountdownConfig => ({
  id: uuidv4(),
  activityName: '限时特惠',
  fontFamily: 'Orbitron',
  fontSize: 48,
  textColor: '#FF5252',
  backgroundColor: {
    type: 'solid',
    angle: 90,
    color1: '#16213E',
    color2: '#0F3460'
  },
  backgroundOpacity: 100,
  borderStyle: 'rounded',
  borderColor: '#40C4FF',
  borderWidth: 2,
  animation: 'flip',
  timeLabels: {
    showHours: true,
    showMinutes: true,
    showSeconds: true,
    showMilliseconds: false
  },
  durationHours: 2,
  durationMinutes: 30,
  durationSeconds: 0,
  targetTime: '',
  useTargetTime: false,
  timezone: 'UTC+8'
});

class ConfigDataModel {
  private config: CountdownConfig;

  constructor() {
    this.config = createDefaultConfig();
  }

  getConfig(): CountdownConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<CountdownConfig>): void {
    this.config = { ...this.config, ...updates };
    eventBus.emit(Events.CONFIG_CHANGED, this.getConfig());
  }

  updateNestedConfig<K extends keyof CountdownConfig>(
    key: K,
    updates: Partial<CountdownConfig[K]>
  ): void {
    if (typeof this.config[key] === 'object' && this.config[key] !== null) {
      (this.config as any)[key] = { ...(this.config as any)[key], ...updates };
      eventBus.emit(Events.CONFIG_CHANGED, this.getConfig());
    }
  }

  loadConfig(config: CountdownConfig): void {
    this.config = { ...config };
    eventBus.emit(Events.CONFIG_CHANGED, this.getConfig());
  }
}

export const configDataModel = new ConfigDataModel();
