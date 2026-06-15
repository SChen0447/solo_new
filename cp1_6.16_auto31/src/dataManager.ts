import { EventBus } from './eventBus';

export interface DataPoint {
  id: number;
  x: number;
  y: number;
  z: number;
  size: number;
  color: number;
  label: string;
  visible: boolean;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomLabel(): string {
  const a = LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
  const b = LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
  return a + b;
}

function hslToHex(h: number, s: number, l: number): number {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  return (r << 16) | (g << 8) | b;
}

export class DataManager {
  private eventBus: EventBus;
  private allData: DataPoint[] = [];
  private currentFilter: number = -50;
  public static readonly TOTAL_COUNT = 300;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.generateData();
  }

  private generateData(): void {
    for (let i = 0; i < DataManager.TOTAL_COUNT; i++) {
      const hue = Math.random() * 360;
      const color = hslToHex(hue, 80, 55);
      this.allData.push({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        z: Math.random() * 100 - 50,
        size: Math.random() * 2.5 + 0.5,
        color,
        label: randomLabel(),
        visible: true
      });
    }
  }

  init(): void {
    this.emitData();
  }

  getAllData(): DataPoint[] {
    return this.allData;
  }

  getVisibleData(): DataPoint[] {
    return this.allData.filter(p => p.visible);
  }

  filterByX(minX: number): void {
    this.currentFilter = minX;
    for (const point of this.allData) {
      point.visible = point.x >= minX;
    }
    this.emitData();
  }

  reset(): void {
    this.currentFilter = -50;
    for (const point of this.allData) {
      point.visible = true;
    }
    this.emitData();
  }

  getCurrentFilter(): number {
    return this.currentFilter;
  }

  private emitData(): void {
    this.eventBus.emit('dataUpdated', this.allData.slice());
  }
}
