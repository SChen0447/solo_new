import type { CircuitState, LogicGate, Pin, GateType } from '../core/logicGate';
import {
  createGate,
  findPinAtPosition,
  findGateAtPosition,
  toggleInputGate,
  addWire,
  selectGatesInRect,
  deleteSelectedGates,
  GATE_CONFIG,
} from '../core/logicGate';
import type { CanvasRenderer } from '../core/canvasRenderer';

type InteractionState = 'idle' | 'dragging_gate' | 'drawing_wire' | 'drawing_selection' | 'moving_selection' | 'sidebar_dragging';

interface DragOffset {
  dx: number;
  dy: number;
}

export class DragDropController {
  private state: CircuitState;
  private renderer: CanvasRenderer;
  private canvas: HTMLCanvasElement;

  private interactionState: InteractionState = 'idle';
  private dragGate: LogicGate | null = null;
  private dragOffset: DragOffset = { dx: 0, dy: 0 };
  private selectedMoveStart: Map<string, { x: number; y: number }> = new Map();
  private mouseDownPos = { x: 0, y: 0 };
  private movedSinceDown = false;

  private sidebarDragType: GateType | null = null;

  constructor(canvas: HTMLCanvasElement, state: CircuitState, renderer: CanvasRenderer) {
    this.canvas = canvas;
    this.state = state;
    this.renderer = renderer;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  public bindSidebarDrag(): void {
    const gateItems = document.querySelectorAll('.gate-item');
    gateItems.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        const type = (item as HTMLElement).dataset.type as GateType;
        if (type) {
          this.sidebarDragType = type;
          this.interactionState = 'sidebar_dragging';
          this.renderer.sidebarDragging.active = true;
          this.renderer.sidebarDragging.type = type;
          e.dataTransfer?.setData('text/plain', type);
          e.dataTransfer!.effectAllowed = 'copy';
        }
      });

      item.addEventListener('dragend', () => {
        this.sidebarDragType = null;
        this.interactionState = 'idle';
        this.renderer.sidebarDragging.active = false;
      });
    });

    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.sidebarDragType) {
        const pos = this.getMousePos(e);
        this.renderer.sidebarDragging.mouseX = pos.x;
        this.renderer.sidebarDragging.mouseY = pos.y;
      }
    });

    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      if (this.sidebarDragType) {
        const pos = this.getMousePos(e);
        this.addGateToCanvas(this.sidebarDragType, pos.x, pos.y);
      }
      this.sidebarDragType = null;
      this.interactionState = 'idle';
      this.renderer.sidebarDragging.active = false;
    });
  }

  private getMousePos(e: MouseEvent | DragEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;

    const pos = this.getMousePos(e);
    this.mouseDownPos = { ...pos };
    this.movedSinceDown = false;

    const pinResult = findPinAtPosition(this.state, pos.x, pos.y, 10);
    if (pinResult && pinResult.pin.type === 'output') {
      this.startDrawingWire(pinResult.gate, pinResult.pin);
      return;
    }

    const gate = findGateAtPosition(this.state, pos.x, pos.y);
    if (gate) {
      if (gate.type === 'INPUT' && !this.movedSinceDown) {
        const clickPos = { x: pos.x - gate.x, y: pos.y - gate.y };
        const centerX = gate.width / 2;
        const centerY = gate.height / 2;
        const dx = clickPos.x - centerX;
        const dy = clickPos.y - centerY;
        if (dx * dx + dy * dy <= 15 * 15) {
          toggleInputGate(gate, this.state);
          return;
        }
      }

      if (gate.selected) {
        this.startMovingSelection(pos.x, pos.y);
      } else {
        this.clearSelection();
        gate.selected = true;
        this.state.selectedGateIds.add(gate.id);
        this.startDraggingGate(gate, pos.x, pos.y);
      }
      return;
    }

    this.startDrawingSelection(pos.x, pos.y);
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);

    const dx = pos.x - this.mouseDownPos.x;
    const dy = pos.y - this.mouseDownPos.y;
    if (dx * dx + dy * dy > 4) {
      this.movedSinceDown = true;
    }

    switch (this.interactionState) {
      case 'drawing_wire':
        this.updateDrawingWire(pos.x, pos.y);
        break;
      case 'dragging_gate':
        this.updateDraggingGate(pos.x, pos.y);
        break;
      case 'moving_selection':
        this.updateMovingSelection(pos.x, pos.y);
        break;
      case 'drawing_selection':
        this.updateDrawingSelection(pos.x, pos.y);
        break;
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    const pos = this.getMousePos(e);

    switch (this.interactionState) {
      case 'drawing_wire':
        this.finishDrawingWire(pos.x, pos.y);
        break;
      case 'dragging_gate':
        this.finishDraggingGate();
        break;
      case 'moving_selection':
        this.finishMovingSelection();
        break;
      case 'drawing_selection':
        this.finishDrawingSelection();
        break;
    }

    this.interactionState = 'idle';
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.state.selectedGateIds.size > 0) {
        e.preventDefault();
        deleteSelectedGates(this.state);
      }
    }

    if (e.key === 'Escape') {
      this.clearSelection();
      if (this.interactionState === 'drawing_wire') {
        this.renderer.draggingWire.active = false;
        this.interactionState = 'idle';
      }
    }
  }

  private startDrawingWire(gate: LogicGate, pin: Pin): void {
    this.interactionState = 'drawing_wire';
    this.renderer.draggingWire.active = true;
    this.renderer.draggingWire.fromGateId = gate.id;
    this.renderer.draggingWire.fromPinId = pin.id;
  }

  private updateDrawingWire(x: number, y: number): void {
    this.renderer.draggingWire.mouseX = x;
    this.renderer.draggingWire.mouseY = y;
  }

  private finishDrawingWire(x: number, y: number): void {
    const pinResult = findPinAtPosition(this.state, x, y, 12);
    if (pinResult && pinResult.pin.type === 'input') {
      const fromGateId = this.renderer.draggingWire.fromGateId;
      const fromPinId = this.renderer.draggingWire.fromPinId;
      addWire(this.state, fromGateId, fromPinId, pinResult.gate.id, pinResult.pin.id);
    }
    this.renderer.draggingWire.active = false;
  }

  private startDraggingGate(gate: LogicGate, x: number, y: number): void {
    this.interactionState = 'dragging_gate';
    this.dragGate = gate;
    gate.dragging = true;
    gate.animation.targetFloatOffset = -4;
    this.dragOffset = {
      dx: x - gate.x,
      dy: y - gate.y,
    };
  }

  private updateDraggingGate(x: number, y: number): void {
    if (this.dragGate) {
      this.dragGate.targetX = x - this.dragOffset.dx;
      this.dragGate.targetY = y - this.dragOffset.dy;
      this.dragGate.x = this.dragGate.targetX;
      this.dragGate.y = this.dragGate.targetY;
      this.state.dirty = true;
    }
  }

  private finishDraggingGate(): void {
    if (this.dragGate) {
      this.dragGate.dragging = false;
      this.dragGate.animation.targetFloatOffset = 0;
      this.dragGate = null;
    }
  }

  private startMovingSelection(x: number, y: number): void {
    this.interactionState = 'moving_selection';
    this.selectedMoveStart.clear();
    for (const id of this.state.selectedGateIds) {
      const gate = this.state.gates.get(id);
      if (gate) {
        this.selectedMoveStart.set(id, { x: gate.x, y: gate.y });
        gate.animation.targetFloatOffset = -4;
      }
    }
    this.dragOffset = { dx: x, dy: y };
  }

  private updateMovingSelection(x: number, y: number): void {
    const dx = x - this.dragOffset.dx;
    const dy = y - this.dragOffset.dy;

    for (const id of this.state.selectedGateIds) {
      const gate = this.state.gates.get(id);
      const start = this.selectedMoveStart.get(id);
      if (gate && start) {
        gate.targetX = start.x + dx;
        gate.targetY = start.y + dy;
        gate.x = gate.targetX;
        gate.y = gate.targetY;
      }
    }
    this.state.dirty = true;
  }

  private finishMovingSelection(): void {
    for (const id of this.state.selectedGateIds) {
      const gate = this.state.gates.get(id);
      if (gate) {
        gate.animation.targetFloatOffset = 0;
      }
    }
    this.selectedMoveStart.clear();
  }

  private startDrawingSelection(x: number, y: number): void {
    this.interactionState = 'drawing_selection';
    this.renderer.selectionRect.visible = true;
    this.renderer.selectionRect.startX = x;
    this.renderer.selectionRect.startY = y;
    this.renderer.selectionRect.endX = x;
    this.renderer.selectionRect.endY = y;
  }

  private updateDrawingSelection(x: number, y: number): void {
    this.renderer.selectionRect.endX = x;
    this.renderer.selectionRect.endY = y;
  }

  private finishDrawingSelection(): void {
    const rect = this.renderer.selectionRect;
    const dx = Math.abs(rect.endX - rect.startX);
    const dy = Math.abs(rect.endY - rect.startY);

    if (dx > 5 || dy > 5) {
      selectGatesInRect(this.state, rect, false);
    } else {
      this.clearSelection();
    }

    this.renderer.selectionRect.visible = false;
  }

  private clearSelection(): void {
    for (const gate of this.state.gates.values()) {
      gate.selected = false;
    }
    this.state.selectedGateIds.clear();
  }

  private addGateToCanvas(type: GateType, x: number, y: number): void {
    const config = GATE_CONFIG[type];
    const gate = createGate(type, x - config.width / 2, y - config.height / 2);
    this.state.gates.set(gate.id, gate);
    gate.animation.elasticProgress = 0;
    gate.animation.scale = 1;
    this.state.dirty = true;
  }
}
