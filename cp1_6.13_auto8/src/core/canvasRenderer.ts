import type { CircuitState, LogicGate, Wire, Pin, SelectionRect, Point } from './logicGate';
import { getPinWorldPosition, elasticEase } from './logicGate';

const GRID_SIZE = 20;
const HIGH_COLOR = '#ff4757';
const LOW_COLOR = '#57606f';
const WIRE_COLOR = '#70a1ff';
const WIRE_GLOW = 'rgba(112, 161, 255, 0.5)';
const SELECTED_COLOR = '#4da6ff';
const GATE_BG = 'rgba(255, 255, 255, 0.08)';
const GATE_BORDER = 'rgba(255, 255, 255, 0.2)';
const GRID_COLOR = 'rgba(255, 255, 255, 0.05)';
const SELECTION_FILL = 'rgba(77, 166, 255, 0.15)';
const SELECTION_BORDER = 'rgba(77, 166, 255, 0.6)';
const TEXT_COLOR = '#ffffff';

export interface DraggingWireState {
  active: boolean;
  fromGateId: string;
  fromPinId: string;
  mouseX: number;
  mouseY: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: CircuitState;
  private animationTime: number = 0;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  public draggingWire: DraggingWireState = {
    active: false,
    fromGateId: '',
    fromPinId: '',
    mouseX: 0,
    mouseY: 0,
  };

  public selectionRect: SelectionRect = {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    visible: false,
  };

  public sidebarDragging: { active: boolean; type: string; mouseX: number; mouseY: number } = {
    active: false,
    type: '',
    mouseX: 0,
    mouseY: 0,
  };

  constructor(canvas: HTMLCanvasElement, state: CircuitState) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.state = state;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Failed to get offscreen canvas context');
    this.offscreenCtx = offCtx;

    this.resize();
    this.preRenderGrid();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.offscreenCanvas.width = rect.width * dpr;
    this.offscreenCanvas.height = rect.height * dpr;
    this.offscreenCtx.scale(dpr, dpr);
    this.preRenderGrid();
  }

  private preRenderGrid(): void {
    const ctx = this.offscreenCtx;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let x = 0; x <= width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  public render(deltaTime: number): void {
    this.animationTime += deltaTime;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.drawImage(this.offscreenCanvas, 0, 0, width, height);

    for (const wire of this.state.wires.values()) {
      wire.pulseProgress = (wire.pulseProgress + deltaTime * 0.5) % 1;
      this.drawWire(wire);
    }

    if (this.draggingWire.active) {
      this.drawDraggingWire();
    }

    for (const gate of this.state.gates.values()) {
      this.drawGate(gate);
    }

    if (this.selectionRect.visible) {
      this.drawSelectionRect();
    }

    if (this.sidebarDragging.active) {
      this.drawSidebarDragGhost();
    }
  }

  private drawGate(gate: LogicGate): void {
    const ctx = this.ctx;
    const anim = gate.animation;
    const elasticScale = elasticEase(anim.elasticProgress);
    const scale = anim.scale * elasticScale;
    const floatY = anim.floatOffset;

    const centerX = gate.x + gate.width / 2;
    const centerY = gate.y + gate.height / 2 + floatY;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-gate.width / 2, -gate.height / 2);

    if (gate.selected) {
      ctx.shadowColor = SELECTED_COLOR;
      ctx.shadowBlur = 15;
    }

    this.drawGateBody(gate);
    this.drawGatePins(gate);
    this.drawGateLabel(gate);

    ctx.restore();
  }

  private drawGateBody(gate: LogicGate): void {
    const ctx = this.ctx;

    const radius = 8;
    const w = gate.width;
    const h = gate.height;

    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(w - radius, 0);
    ctx.quadraticCurveTo(w, 0, w, radius);
    ctx.lineTo(w, h - radius);
    ctx.quadraticCurveTo(w, h, w - radius, h);
    ctx.lineTo(radius, h);
    ctx.quadraticCurveTo(0, h, 0, h - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();

    ctx.fillStyle = GATE_BG;
    ctx.fill();

    if (gate.selected) {
      ctx.strokeStyle = SELECTED_COLOR;
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = GATE_BORDER;
      ctx.lineWidth = 1;
    }
    ctx.stroke();

    if (gate.type === 'INPUT') {
      const isHigh = gate.outputs[0]?.value || false;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 15, 0, Math.PI * 2);
      ctx.fillStyle = isHigh ? HIGH_COLOR : LOW_COLOR;
      ctx.fill();

      if (isHigh) {
        ctx.shadowColor = HIGH_COLOR;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else if (gate.type === 'OUTPUT') {
      const isHigh = gate.inputs[0]?.value || false;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 15, 0, Math.PI * 2);
      ctx.fillStyle = isHigh ? HIGH_COLOR : LOW_COLOR;
      ctx.fill();

      if (isHigh) {
        ctx.shadowColor = HIGH_COLOR;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  private drawGatePins(gate: LogicGate): void {
    const ctx = this.ctx;

    for (const pin of gate.inputs) {
      this.drawPin(pin);
    }

    for (const pin of gate.outputs) {
      this.drawPin(pin);
    }
  }

  private drawPin(pin: Pin): void {
    const ctx = this.ctx;
    const x = pin.position.x;
    const y = pin.position.y;
    const radius = 5;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = pin.value ? HIGH_COLOR : LOW_COLOR;
    ctx.fill();

    if (pin.value) {
      ctx.shadowColor = HIGH_COLOR;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawGateLabel(gate: LogicGate): void {
    const ctx = this.ctx;
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let label = gate.type;
    if (gate.type === 'INPUT') label = 'IN';
    else if (gate.type === 'OUTPUT') label = 'OUT';

    const y = gate.height / 2;
    ctx.fillText(label, gate.width / 2, y);
  }

  private drawWire(wire: Wire): void {
    const fromGate = this.state.gates.get(wire.fromGateId);
    const toGate = this.state.gates.get(wire.toGateId);
    const fromPin = fromGate?.outputs.find(p => p.id === wire.fromPinId);
    const toPin = toGate?.inputs.find(p => p.id === wire.toPinId);

    if (!fromGate || !toGate || !fromPin || !toPin) return;

    const from = getPinWorldPosition(fromGate, fromPin);
    const to = getPinWorldPosition(toGate, toPin);

    this.drawBezierWire(from, to, wire.value, wire.pulseProgress);
  }

  private drawBezierWire(from: Point, to: Point, isHigh: boolean, pulseProgress: number): void {
    const ctx = this.ctx;

    const dx = to.x - from.x;
    const controlOffset = Math.min(Math.abs(dx) * 0.5, 80);

    const cp1x = from.x + controlOffset;
    const cp1y = from.y;
    const cp2x = to.x - controlOffset;
    const cp2y = to.y;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y);

    ctx.strokeStyle = isHigh ? HIGH_COLOR : WIRE_COLOR;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    if (isHigh) {
      ctx.shadowColor = HIGH_COLOR;
      ctx.shadowBlur = 8;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;

    if (isHigh) {
      this.drawPulseEffect(from, to, pulseProgress);
    }
  }

  private drawPulseEffect(from: Point, to: Point, progress: number): void {
    const ctx = this.ctx;

    const dx = to.x - from.x;
    const controlOffset = Math.min(Math.abs(dx) * 0.5, 80);

    const cp1x = from.x + controlOffset;
    const cp1y = from.y;
    const cp2x = to.x - controlOffset;
    const cp2y = to.y;

    const pulsePos = this.getBezierPoint(from.x, from.y, cp1x, cp1y, cp2x, cp2y, to.x, to.y, progress);

    const gradient = ctx.createRadialGradient(pulsePos.x, pulsePos.y, 0, pulsePos.x, pulsePos.y, 12);
    gradient.addColorStop(0, 'rgba(255, 71, 87, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 71, 87, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 71, 87, 0)');

    ctx.beginPath();
    ctx.arc(pulsePos.x, pulsePos.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private getBezierPoint(
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    t: number
  ): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3,
      y: mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3,
    };
  }

  private drawDraggingWire(): void {
    const fromGate = this.state.gates.get(this.draggingWire.fromGateId);
    const fromPin = fromGate?.outputs.find(p => p.id === this.draggingWire.fromPinId);

    if (!fromGate || !fromPin) return;

    const from = getPinWorldPosition(fromGate, fromPin);
    const to = { x: this.draggingWire.mouseX, y: this.draggingWire.mouseY };

    const ctx = this.ctx;
    const dx = to.x - from.x;
    const controlOffset = Math.min(Math.abs(dx) * 0.5, 80);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(
      from.x + controlOffset, from.y,
      to.x - controlOffset, to.y,
      to.x, to.y
    );

    ctx.strokeStyle = 'rgba(112, 161, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(to.x, to.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = WIRE_COLOR;
    ctx.fill();
  }

  private drawSelectionRect(): void {
    const ctx = this.ctx;
    const rect = this.selectionRect;

    const x = Math.min(rect.startX, rect.endX);
    const y = Math.min(rect.startY, rect.endY);
    const w = Math.abs(rect.endX - rect.startX);
    const h = Math.abs(rect.endY - rect.startY);

    ctx.fillStyle = SELECTION_FILL;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = SELECTION_BORDER;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }

  private drawSidebarDragGhost(): void {
    const ctx = this.ctx;
    const drag = this.sidebarDragging;

    const width = 100;
    const height = 70;
    const x = drag.mouseX - width / 2;
    const y = drag.mouseY - height / 2;

    ctx.globalAlpha = 0.7;

    ctx.fillStyle = GATE_BG;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = SELECTED_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(drag.type, x + width / 2, y + height / 2);

    ctx.globalAlpha = 1;
  }

  public getCanvasSize(): { width: number; height: number } {
    const dpr = window.devicePixelRatio || 1;
    return {
      width: this.canvas.width / dpr,
      height: this.canvas.height / dpr,
    };
  }
}
