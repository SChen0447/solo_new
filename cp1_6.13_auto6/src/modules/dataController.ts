export interface DataColumn {
  id: number;
  value: number;
  targetValue: number;
  angle: number;
  radius: number;
  category: number;
  isHighlighted: boolean;
  bendOffset: { x: number; z: number };
  targetBendOffset: { x: number; z: number };
  scale: number;
  targetScale: number;
  opacity: number;
  targetOpacity: number;
  pulseAmount: number;
}

export interface FilterConfig {
  type: 'none' | 'value-high' | 'value-low' | 'category';
  threshold: number;
  category: number;
}

type EventCallback = (data: unknown) => void;

export class DataController {
  private columns: DataColumn[] = [];
  private columnCount: number = 75;
  private ringRadius: number = 8;
  private events: Map<string, EventCallback[]> = new Map();
  private filterConfig: FilterConfig = {
    type: 'none',
    threshold: 3,
    category: 0
  };

  constructor() {
    this.generateColumns();
  }

  private generateColumns(): void {
    const newColumns: DataColumn[] = [];
    const categories = 3;

    for (let i = 0; i < this.columnCount; i++) {
      const angle = (i / this.columnCount) * Math.PI * 2;
      const value = 1 + Math.random() * 4;
      
      newColumns.push({
        id: i,
        value,
        targetValue: value,
        angle,
        radius: this.ringRadius,
        category: i % categories,
        isHighlighted: false,
        bendOffset: { x: 0, z: 0 },
        targetBendOffset: { x: 0, z: 0 },
        scale: 1,
        targetScale: 1,
        opacity: 1,
        targetOpacity: 1,
        pulseAmount: 0
      });
    }

    const oldColumns = [...this.columns];
    this.columns = newColumns;
    
    this.applyFilter();
    this.emit('columnsGenerated', { newColumns, oldColumns });
  }

  public updateColumnCount(count: number): void {
    this.columnCount = Math.max(20, Math.min(200, count));
    this.generateColumns();
  }

  public getColumnCount(): number {
    return this.columnCount;
  }

  public getColumns(): DataColumn[] {
    return this.columns;
  }

  public getRingRadius(): number {
    return this.ringRadius;
  }

  public updateColumnValue(columnId: number, newValue: number): void {
    const column = this.columns.find(c => c.id === columnId);
    if (column) {
      column.targetValue = Math.max(0.5, Math.min(5, newValue));
      this.emit('columnUpdated', { columnId, newValue });
    }
  }

  public bendColumn(columnId: number, x: number, z: number): void {
    const column = this.columns.find(c => c.id === columnId);
    if (column) {
      column.targetBendOffset = { x, z };
    }
  }

  public releaseColumn(columnId: number): void {
    const column = this.columns.find(c => c.id === columnId);
    if (column) {
      column.targetBendOffset = { x: 0, z: 0 };
      this.triggerWaveEffect(columnId);
    }
  }

  private triggerWaveEffect(originId: number): void {
    const originColumn = this.columns.find(c => c.id === originId);
    if (!originColumn) return;

    const waveStrength = Math.abs(originColumn.targetValue - originColumn.value) * 0.3;
    const waveRange = 5;

    this.columns.forEach((column, index) => {
      if (column.id === originId) return;

      const distance = Math.min(
        Math.abs(index - originId),
        this.columns.length - Math.abs(index - originId)
      );

      if (distance <= waveRange) {
        const falloff = 1 - (distance / waveRange);
        const waveAmount = waveStrength * falloff * (Math.random() * 0.5 + 0.5);
        column.targetValue = Math.max(0.5, Math.min(5, column.value + waveAmount));
      }
    });

    this.emit('waveTriggered', { originId, waveStrength });
  }

  public setFilter(config: Partial<FilterConfig>): void {
    this.filterConfig = { ...this.filterConfig, ...config };
    this.applyFilter();
    this.emit('filterChanged', this.filterConfig);
  }

  public getFilterConfig(): FilterConfig {
    return { ...this.filterConfig };
  }

  private applyFilter(): void {
    if (this.filterConfig.type === 'none') {
      this.columns.forEach(column => {
        column.isHighlighted = false;
        column.targetScale = 1;
        column.targetOpacity = 1;
      });
      return;
    }

    this.columns.forEach(column => {
      let isMatch = false;

      switch (this.filterConfig.type) {
        case 'value-high':
          isMatch = column.value >= this.filterConfig.threshold;
          break;
        case 'value-low':
          isMatch = column.value <= this.filterConfig.threshold;
          break;
        case 'category':
          isMatch = column.category === this.filterConfig.category;
          break;
      }

      column.isHighlighted = isMatch;
      column.targetScale = isMatch ? 1.3 : 0.7;
      column.targetOpacity = isMatch ? 1 : 0.3;
    });
  }

  public update(deltaTime: number): void {
    const smoothFactor = Math.min(deltaTime * 5, 1);

    this.columns.forEach(column => {
      column.value += (column.targetValue - column.value) * smoothFactor;
      column.bendOffset.x += (column.targetBendOffset.x - column.bendOffset.x) * smoothFactor;
      column.bendOffset.z += (column.targetBendOffset.z - column.bendOffset.z) * smoothFactor;
      column.scale += (column.targetScale - column.scale) * smoothFactor;
      column.opacity += (column.targetOpacity - column.opacity) * smoothFactor;
      column.pulseAmount *= Math.pow(0.01, deltaTime);
    });
  }

  public triggerPulse(intensity: number = 1): void {
    this.columns.forEach(column => {
      column.pulseAmount = intensity * (0.8 + Math.random() * 0.4);
    });
    this.emit('pulseTriggered', { intensity });
  }

  public on(eventName: string, callback: EventCallback): void {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName)!.push(callback);
  }

  public off(eventName: string, callback: EventCallback): void {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(eventName: string, data: unknown): void {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}
