import { v4 as uuidv4 } from 'uuid';
import {
  ShapeUnion,
  ShapeType,
  SelectionState,
  HistoryState,
  BoundingBox,
  AlignType,
  DistributeType,
  GroupShape,
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_COLOR,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
} from './types';

type Subscriber = (state: { shapes: ShapeUnion[]; selection: SelectionState }) => void;

export class ShapesManager {
  private shapes: ShapeUnion[] = [];
  private selection: SelectionState = {
    selectedIds: [],
    editingGroupId: null,
  };
  private history: HistoryState[] = [];
  private historyIndex: number = -1;
  private maxHistory: number = 50;
  private subscribers: Set<Subscriber> = new Set();
  private isPerformingUndoRedo: boolean = false;

  constructor() {
    this.saveHistory();
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    const state = {
      shapes: this.shapes,
      selection: { ...this.selection },
    };
    this.subscribers.forEach((cb) => cb(state));
  }

  private saveHistory(): void {
    if (this.isPerformingUndoRedo) return;

    const snapshot: HistoryState = {
      shapes: JSON.parse(JSON.stringify(this.shapes)),
      selection: { ...this.selection },
    };

    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(snapshot);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  undo(): void {
    if (!this.canUndo()) return;

    this.isPerformingUndoRedo = true;
    this.historyIndex--;
    const state = this.history[this.historyIndex];
    this.shapes = JSON.parse(JSON.stringify(state.shapes));
    this.selection = { ...state.selection };
    this.isPerformingUndoRedo = false;
    this.notify();
  }

  redo(): void {
    if (!this.canRedo()) return;

    this.isPerformingUndoRedo = true;
    this.historyIndex++;
    const state = this.history[this.historyIndex];
    this.shapes = JSON.parse(JSON.stringify(state.shapes));
    this.selection = { ...state.selection };
    this.isPerformingUndoRedo = false;
    this.notify();
  }

  getShapes(): ShapeUnion[] {
    return this.shapes;
  }

  getSelection(): SelectionState {
    return { ...this.selection };
  }

  getShapeById(id: string): ShapeUnion | undefined {
    return this.shapes.find((s) => s.id === id);
  }

  getSelectedShapes(): ShapeUnion[] {
    return this.shapes.filter((s) => this.selection.selectedIds.includes(s.id));
  }

  addShape(
    type: ShapeType,
    x: number,
    y: number,
    overrides: Partial<ShapeUnion> = {}
  ): ShapeUnion {
    const id = uuidv4();
    const baseShape: Partial<ShapeUnion> = {
      id,
      type,
      x,
      y,
      width: overrides.width ?? DEFAULT_WIDTH,
      height: overrides.height ?? DEFAULT_HEIGHT,
      rotation: 0,
      fillColor: DEFAULT_FILL_COLOR,
      strokeColor: DEFAULT_STROKE_COLOR,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      visible: true,
      locked: false,
      parentId: this.selection.editingGroupId,
    };

    let shape: ShapeUnion;
    switch (type) {
      case 'rectangle':
        shape = { ...baseShape, type: 'rectangle', borderRadius: 0 } as ShapeUnion;
        break;
      case 'circle':
        shape = { ...baseShape, type: 'circle' } as ShapeUnion;
        break;
      case 'triangle':
        shape = { ...baseShape, type: 'triangle' } as ShapeUnion;
        break;
      case 'star':
        shape = {
          ...baseShape,
          type: 'star',
          points: 5,
          outerRadius: Math.min(baseShape.width!, baseShape.height!) / 2,
          innerRadius: Math.min(baseShape.width!, baseShape.height!) / 4,
        } as ShapeUnion;
        break;
      case 'heart':
        shape = { ...baseShape, type: 'heart' } as ShapeUnion;
        break;
      case 'arrow':
        shape = {
          ...baseShape,
          type: 'arrow',
          arrowHeadWidth: baseShape.width! * 0.6,
          arrowHeadHeight: baseShape.height! * 0.5,
          tailWidth: baseShape.width! * 0.3,
        } as ShapeUnion;
        break;
      default:
        throw new Error(`Unsupported shape type: ${type}`);
    }

    this.shapes.push(shape);
    this.selection.selectedIds = [id];
    this.saveHistory();
    this.notify();
    return shape;
  }

  updateShape(id: string, updates: Partial<ShapeUnion>): ShapeUnion | null {
    const index = this.shapes.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const shape = this.shapes[index];
    const updatedShape = { ...shape, ...updates } as ShapeUnion;
    this.shapes[index] = updatedShape;

    this.saveHistory();
    this.notify();
    return updatedShape;
  }

  updateShapes(updates: Array<{ id: string; updates: Partial<ShapeUnion> }>): void {
    let hasChanges = false;
    updates.forEach(({ id, updates: shapeUpdates }) => {
      const index = this.shapes.findIndex((s) => s.id === id);
      if (index !== -1) {
        this.shapes[index] = { ...this.shapes[index], ...shapeUpdates } as ShapeUnion;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveHistory();
      this.notify();
    }
  }

  deleteShape(id: string): boolean {
    const index = this.shapes.findIndex((s) => s.id === id);
    if (index === -1) return false;

    this.shapes.splice(index, 1);
    this.selection.selectedIds = this.selection.selectedIds.filter((sid) => sid !== id);

    this.saveHistory();
    this.notify();
    return true;
  }

  deleteSelected(): void {
    if (this.selection.selectedIds.length === 0) return;

    const idsToDelete = new Set(this.selection.selectedIds);

    const deleteWithChildren = (id: string): void => {
      const shape = this.getShapeById(id);
      if (shape && shape.type === 'group') {
        shape.childIds.forEach(deleteWithChildren);
      }
      idsToDelete.add(id);
    };

    this.selection.selectedIds.forEach(deleteWithChildren);
    this.shapes = this.shapes.filter((s) => !idsToDelete.has(s.id));
    this.selection.selectedIds = [];

    this.saveHistory();
    this.notify();
  }

  selectShape(id: string, append: boolean = false): void {
    const shape = this.getShapeById(id);
    if (!shape || shape.locked) return;

    if (append) {
      if (this.selection.selectedIds.includes(id)) {
        this.selection.selectedIds = this.selection.selectedIds.filter((sid) => sid !== id);
      } else {
        this.selection.selectedIds = [...this.selection.selectedIds, id];
      }
    } else {
      this.selection.selectedIds = [id];
    }
    this.notify();
  }

  selectShapes(ids: string[], append: boolean = false): void {
    const validIds = ids.filter((id) => {
      const shape = this.getShapeById(id);
      return shape && !shape.locked;
    });

    if (append) {
      const newIds = [...this.selection.selectedIds];
      validIds.forEach((id) => {
        if (!newIds.includes(id)) {
          newIds.push(id);
        } else {
          const idx = newIds.indexOf(id);
          newIds.splice(idx, 1);
        }
      });
      this.selection.selectedIds = newIds;
    } else {
      this.selection.selectedIds = validIds;
    }
    this.notify();
  }

  selectAll(): void {
    const selectableIds = this.shapes
      .filter((s) => !s.locked && s.parentId === this.selection.editingGroupId)
      .map((s) => s.id);
    this.selection.selectedIds = selectableIds;
    this.notify();
  }

  clearSelection(): void {
    this.selection.selectedIds = [];
    this.notify();
  }

  selectByBox(box: BoundingBox): void {
    const selectedIds: string[] = [];

    this.shapes.forEach((shape) => {
      if (shape.locked || shape.parentId !== this.selection.editingGroupId) return;

      const shapeBox = this.getShapeBoundingBox(shape);
      if (
        shapeBox.minX >= box.minX &&
        shapeBox.maxX <= box.maxX &&
        shapeBox.minY >= box.minY &&
        shapeBox.maxY <= box.maxY
      ) {
        selectedIds.push(shape.id);
      }
    });

    this.selection.selectedIds = selectedIds;
    this.notify();
  }

  getShapeBoundingBox(shape: ShapeUnion): BoundingBox {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;

    const corners = [
      { x: shape.x, y: shape.y },
      { x: shape.x + shape.width, y: shape.y },
      { x: shape.x, y: shape.y + shape.height },
      { x: shape.x + shape.width, y: shape.y + shape.height },
    ];

    const rad = (shape.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rotated = corners.map((p) => ({
      x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
      y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
    }));

    const xs = rotated.map((p) => p.x);
    const ys = rotated.map((p) => p.y);

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  getSelectionBoundingBox(): BoundingBox | null {
    if (this.selection.selectedIds.length === 0) return null;

    const selectedShapes = this.getSelectedShapes();
    const boxes = selectedShapes.map((s) => this.getShapeBoundingBox(s));

    const minX = Math.min(...boxes.map((b) => b.minX));
    const maxX = Math.max(...boxes.map((b) => b.maxX));
    const minY = Math.min(...boxes.map((b) => b.minY));
    const maxY = Math.max(...boxes.map((b) => b.maxY));

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  alignSelected(type: AlignType): void {
    const shapes = this.getSelectedShapes();
    if (shapes.length < 2) return;

    const box = this.getSelectionBoundingBox();
    if (!box) return;

    const updates: Array<{ id: string; updates: Partial<ShapeUnion> }> = [];

    shapes.forEach((shape) => {
      const shapeBox = this.getShapeBoundingBox(shape);
      let dx = 0;
      let dy = 0;

      switch (type) {
        case 'left':
          dx = box.minX - shapeBox.minX;
          break;
        case 'right':
          dx = box.maxX - shapeBox.maxX;
          break;
        case 'top':
          dy = box.minY - shapeBox.minY;
          break;
        case 'bottom':
          dy = box.maxY - shapeBox.maxY;
          break;
        case 'center-h':
          dx = box.minX + box.width / 2 - (shapeBox.minX + shapeBox.width / 2);
          break;
        case 'center-v':
          dy = box.minY + box.height / 2 - (shapeBox.minY + shapeBox.height / 2);
          break;
      }

      if (dx !== 0 || dy !== 0) {
        updates.push({
          id: shape.id,
          updates: { x: shape.x + dx, y: shape.y + dy },
        });
      }
    });

    this.updateShapes(updates);
  }

  distributeSelected(type: DistributeType): void {
    const shapes = this.getSelectedShapes();
    if (shapes.length < 3) return;

    const sorted = [...shapes].sort((a, b) => {
      const boxA = this.getShapeBoundingBox(a);
      const boxB = this.getShapeBoundingBox(b);
      return type === 'h' ? boxA.minX - boxB.minX : boxA.minY - boxB.minY;
    });

    const boxes = sorted.map((s) => this.getShapeBoundingBox(s));
    const firstBox = boxes[0];
    const lastBox = boxes[boxes.length - 1];

    let totalGap: number;
    let totalSize: number;

    if (type === 'h') {
      totalGap = lastBox.maxX - firstBox.minX;
      totalSize = boxes.reduce((sum, b) => sum + b.width, 0);
    } else {
      totalGap = lastBox.maxY - firstBox.minY;
      totalSize = boxes.reduce((sum, b) => sum + b.height, 0);
    }

    const gap = (totalGap - totalSize) / (sorted.length - 1);
    const updates: Array<{ id: string; updates: Partial<ShapeUnion> }> = [];

    let current = type === 'h' ? firstBox.maxX : firstBox.maxY;

    for (let i = 1; i < sorted.length - 1; i++) {
      const shape = sorted[i];
      const shapeBox = boxes[i];
      const target = current + gap;
      const delta = target - (type === 'h' ? shapeBox.minX : shapeBox.minY);

      if (delta !== 0) {
        updates.push({
          id: shape.id,
          updates: type === 'h' ? { x: shape.x + delta } : { y: shape.y + delta },
        });
      }

      current = target + shapeBox[type === 'h' ? 'width' : 'height'];
    }

    this.updateShapes(updates);
  }

  groupSelected(): void {
    const shapes = this.getSelectedShapes();
    if (shapes.length < 2) return;

    const box = this.getSelectionBoundingBox();
    if (!box) return;

    const groupId = uuidv4();
    const childIds = shapes.map((s) => s.id);

    const group: GroupShape = {
      id: groupId,
      type: 'group',
      x: box.minX,
      y: box.minY,
      width: box.width,
      height: box.height,
      rotation: 0,
      fillColor: 'transparent',
      strokeColor: 'transparent',
      strokeWidth: 0,
      visible: true,
      locked: false,
      childIds,
      parentId: this.selection.editingGroupId,
    };

    const updates = childIds.map((id) => ({
      id,
      updates: { parentId: groupId },
    }));

    this.shapes.push(group);
    updates.forEach(({ id, updates: u }) => {
      const idx = this.shapes.findIndex((s) => s.id === id);
      if (idx !== -1) {
        this.shapes[idx] = { ...this.shapes[idx], ...u } as ShapeUnion;
      }
    });

    this.selection.selectedIds = [groupId];
    this.saveHistory();
    this.notify();
  }

  ungroupSelected(): void {
    const selected = this.getSelectedShapes();
    const groups = selected.filter((s) => s.type === 'group') as GroupShape[];
    if (groups.length === 0) return;

    const newSelectedIds: string[] = [];

    groups.forEach((group) => {
      group.childIds.forEach((childId) => {
        const idx = this.shapes.findIndex((s) => s.id === childId);
        if (idx !== -1) {
          this.shapes[idx] = { ...this.shapes[idx], parentId: group.parentId } as ShapeUnion;
          newSelectedIds.push(childId);
        }
      });

      const groupIdx = this.shapes.findIndex((s) => s.id === group.id);
      if (groupIdx !== -1) {
        this.shapes.splice(groupIdx, 1);
      }
    });

    this.selection.selectedIds = newSelectedIds;
    this.saveHistory();
    this.notify();
  }

  enterGroup(groupId: string): void {
    const group = this.getShapeById(groupId);
    if (!group || group.type !== 'group') return;
    this.selection.editingGroupId = groupId;
    this.selection.selectedIds = [];
    this.notify();
  }

  exitGroup(): void {
    const currentGroup = this.selection.editingGroupId;
    if (!currentGroup) return;

    const group = this.getShapeById(currentGroup);
    this.selection.editingGroupId = group?.parentId || null;
    this.selection.selectedIds = currentGroup ? [currentGroup] : [];
    this.notify();
  }

  moveSelected(dx: number, dy: number): void {
    const selected = this.getSelectedShapes();
    if (selected.length === 0) return;

    const updates = selected.map((shape) => ({
      id: shape.id,
      updates: { x: shape.x + dx, y: shape.y + dy },
    }));

    this.updateShapes(updates);
  }

  rotateSelected(angle: number): void {
    const selected = this.getSelectedShapes();
    if (selected.length === 0) return;

    const box = this.getSelectionBoundingBox();
    if (!box) return;

    const centerX = box.minX + box.width / 2;
    const centerY = box.minY + box.height / 2;

    const updates = selected.map((shape) => {
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;

      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const newCx = centerX + (cx - centerX) * cos - (cy - centerY) * sin;
      const newCy = centerY + (cx - centerX) * sin + (cy - centerY) * cos;

      return {
        id: shape.id,
        updates: {
          x: newCx - shape.width / 2,
          y: newCy - shape.height / 2,
          rotation: (shape.rotation + angle) % 360,
        },
      };
    });

    this.updateShapes(updates);
  }

  bringToFront(id: string): void {
    const index = this.shapes.findIndex((s) => s.id === id);
    if (index === -1 || index === this.shapes.length - 1) return;

    const [shape] = this.shapes.splice(index, 1);
    this.shapes.push(shape);
    this.saveHistory();
    this.notify();
  }

  sendToBack(id: string): void {
    const index = this.shapes.findIndex((s) => s.id === id);
    if (index <= 0) return;

    const [shape] = this.shapes.splice(index, 1);
    this.shapes.unshift(shape);
    this.saveHistory();
    this.notify();
  }

  duplicateSelected(): void {
    const selected = this.getSelectedShapes();
    if (selected.length === 0) return;

    const idMap = new Map<string, string>();
    const newShapes: ShapeUnion[] = [];
    const offset = 20;

    selected.forEach((shape) => {
      const newId = uuidv4();
      idMap.set(shape.id, newId);

      const newShape = JSON.parse(JSON.stringify(shape)) as ShapeUnion;
      newShape.id = newId;
      newShape.x += offset;
      newShape.y += offset;
      newShapes.push(newShape);
    });

    newShapes.forEach((shape) => {
      if (shape.type === 'group') {
        shape.childIds = shape.childIds.map((oldId) => idMap.get(oldId) || oldId);
      }
    });

    this.shapes.push(...newShapes);
    this.selection.selectedIds = newShapes.map((s) => s.id);
    this.saveHistory();
    this.notify();
  }
}
