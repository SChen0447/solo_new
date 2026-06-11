import type { Material, ElementType, GridCell } from '../types';

export const MATERIALS: Record<ElementType, Material> = {
  fire: {
    id: 'fire',
    type: 'fire',
    name: '火焰水晶',
    emoji: '💎',
    color: { r: 255, g: 80, b: 40 },
    energy: 80
  },
  ice: {
    id: 'ice',
    type: 'ice',
    name: '冰霜花瓣',
    emoji: '❄️',
    color: { r: 120, g: 200, b: 255 },
    energy: 60
  },
  thunder: {
    id: 'thunder',
    type: 'thunder',
    name: '雷电粉尘',
    emoji: '⚡',
    color: { r: 255, g: 230, b: 80 },
    energy: 90
  },
  life: {
    id: 'life',
    type: 'life',
    name: '生命露珠',
    emoji: '💧',
    color: { r: 80, g: 255, b: 140 },
    energy: 70
  }
};

const GRID_SIZE = 6;

class MaterialService {
  private grid: GridCell[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initGrid();
  }

  private initGrid() {
    this.grid = Array.from({ length: GRID_SIZE }, (_, i) => ({
      index: i,
      material: null,
      isHighlighted: false,
      isGlowing: false
    }));
  }

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  getMaterials(): Material[] {
    return Object.values(MATERIALS);
  }

  getItem(type: ElementType): Material {
    return { ...MATERIALS[type] };
  }

  getGrid(): GridCell[] {
    return [...this.grid];
  }

  getGridMaterials(): (Material | null)[] {
    return this.grid.map(cell => cell.material);
  }

  setCellMaterial(index: number, material: Material | null): boolean {
    if (index < 0 || index >= GRID_SIZE) return false;
    this.grid[index].material = material;
    this.notify();
    return true;
  }

  triggerGlow(index: number, duration = 600) {
    if (index < 0 || index >= GRID_SIZE) return;
    this.grid[index].isGlowing = true;
    this.notify();
    setTimeout(() => {
      if (this.grid[index]) {
        this.grid[index].isGlowing = false;
        this.notify();
      }
    }, duration);
  }

  setHighlight(index: number, highlighted: boolean) {
    if (index < 0 || index >= GRID_SIZE) return;
    this.grid[index].isHighlighted = highlighted;
    this.notify();
  }

  clearHighlights() {
    this.grid.forEach(cell => {
      cell.isHighlighted = false;
      cell.isGlowing = false;
    });
    this.notify();
  }

  resetGrid() {
    this.initGrid();
    this.notify();
  }

  isGridEmpty(): boolean {
    return this.grid.every(cell => cell.material === null);
  }

  getElements(): ElementType[] {
    return this.grid
      .filter(cell => cell.material !== null)
      .map(cell => cell.material!.type);
  }
}

export const materialService = new MaterialService();
