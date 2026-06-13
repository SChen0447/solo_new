export type GateType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'INPUT' | 'OUTPUT';

export interface Point {
  x: number;
  y: number;
}

export interface Pin {
  id: string;
  type: 'input' | 'output';
  position: Point;
  value: boolean;
  connected: boolean;
}

export interface AnimationState {
  scale: number;
  targetScale: number;
  floatOffset: number;
  targetFloatOffset: number;
  elasticProgress: number;
}

export interface LogicGate {
  id: string;
  type: GateType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  inputs: Pin[];
  outputs: Pin[];
  selected: boolean;
  dragging: boolean;
  animation: AnimationState;
}

export interface Wire {
  id: string;
  fromGateId: string;
  fromPinId: string;
  toGateId: string;
  toPinId: string;
  value: boolean;
  pulseProgress: number;
}

export interface CircuitState {
  gates: Map<string, LogicGate>;
  wires: Map<string, Wire>;
  selectedGateIds: Set<string>;
  dirty: boolean;
}

export interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  visible: boolean;
}

export const GATE_CONFIG: Record<GateType, { inputs: number; outputs: number; width: number; height: number }> = {
  INPUT: { inputs: 0, outputs: 1, width: 80, height: 60 },
  OUTPUT: { inputs: 1, outputs: 0, width: 80, height: 60 },
  AND: { inputs: 2, outputs: 1, width: 100, height: 70 },
  OR: { inputs: 2, outputs: 1, width: 100, height: 70 },
  NOT: { inputs: 1, outputs: 1, width: 90, height: 60 },
  XOR: { inputs: 2, outputs: 1, width: 100, height: 70 },
};

let gateIdCounter = 0;
let wireIdCounter = 0;
let pinIdCounter = 0;

function generateGateId(): string {
  return `gate_${++gateIdCounter}`;
}

function generateWireId(): string {
  return `wire_${++wireIdCounter}`;
}

function generatePinId(): string {
  return `pin_${++pinIdCounter}`;
}

export function createGate(type: GateType, x: number, y: number): LogicGate {
  const config = GATE_CONFIG[type];
  const inputs: Pin[] = [];
  const outputs: Pin[] = [];

  for (let i = 0; i < config.inputs; i++) {
    const yOffset = config.inputs === 1 ? config.height / 2 : (i + 1) * config.height / (config.inputs + 1);
    inputs.push({
      id: generatePinId(),
      type: 'input',
      position: { x: 0, y: yOffset },
      value: false,
      connected: false,
    });
  }

  for (let i = 0; i < config.outputs; i++) {
    const yOffset = config.outputs === 1 ? config.height / 2 : (i + 1) * config.height / (config.outputs + 1);
    outputs.push({
      id: generatePinId(),
      type: 'output',
      position: { x: config.width, y: yOffset },
      value: false,
      connected: false,
    });
  }

  return {
    id: generateGateId(),
    type,
    x,
    y,
    targetX: x,
    targetY: y,
    width: config.width,
    height: config.height,
    inputs,
    outputs,
    selected: false,
    dragging: false,
    animation: {
      scale: 0,
      targetScale: 1,
      floatOffset: 0,
      targetFloatOffset: 0,
      elasticProgress: 0,
    },
  };
}

export function createWire(
  fromGateId: string,
  fromPinId: string,
  toGateId: string,
  toPinId: string
): Wire {
  return {
    id: generateWireId(),
    fromGateId,
    fromPinId,
    toGateId,
    toPinId,
    value: false,
    pulseProgress: 0,
  };
}

export function computeGateOutput(gate: LogicGate): void {
  if (gate.type === 'INPUT') {
    return;
  }

  if (gate.type === 'OUTPUT') {
    if (gate.inputs.length > 0) {
      gate.outputs = [];
    }
    return;
  }

  const inputValues = gate.inputs.map(pin => pin.value);

  let outputValue = false;
  switch (gate.type) {
    case 'AND':
      outputValue = inputValues.every(v => v);
      break;
    case 'OR':
      outputValue = inputValues.some(v => v);
      break;
    case 'NOT':
      outputValue = !inputValues[0];
      break;
    case 'XOR':
      outputValue = inputValues.reduce((acc, v) => acc !== v, false);
      break;
  }

  for (const output of gate.outputs) {
    output.value = outputValue;
  }
}

function topologicalSort(gates: Map<string, LogicGate>, wires: Map<string, Wire>): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const [id] of gates) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const wire of wires.values()) {
    const fromId = wire.fromGateId;
    const toId = wire.toGateId;
    adjacency.get(fromId)?.push(toId);
    inDegree.set(toId, (inDegree.get(toId) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

export function propagateSignals(state: CircuitState): void {
  const sortedIds = topologicalSort(state.gates, state.wires);

  for (const pin of getPinsByType(state, 'input')) {
    pin.value = false;
  }

  for (const wire of state.wires.values()) {
    const fromGate = state.gates.get(wire.fromGateId);
    const fromPin = fromGate?.outputs.find(p => p.id === wire.fromPinId);
    if (fromPin) {
      wire.value = fromPin.value;
    }

    const toGate = state.gates.get(wire.toGateId);
    const toPin = toGate?.inputs.find(p => p.id === wire.toPinId);
    if (toPin) {
      toPin.value = wire.value;
    }
  }

  for (const gateId of sortedIds) {
    const gate = state.gates.get(gateId);
    if (gate) {
      computeGateOutput(gate);
    }
  }

  state.dirty = false;
}

export function getPinWorldPosition(gate: LogicGate, pin: Pin): Point {
  return {
    x: gate.x + pin.position.x,
    y: gate.y + pin.position.y,
  };
}

export function findPinAtPosition(state: CircuitState, x: number, y: number, radius: number = 10): { gate: LogicGate; pin: Pin } | null {
  for (const gate of state.gates.values()) {
    for (const pin of [...gate.inputs, ...gate.outputs]) {
      const pos = getPinWorldPosition(gate, pin);
      const dx = x - pos.x;
      const dy = y - pos.y;
      if (dx * dx + dy * dy <= radius * radius) {
        return { gate, pin };
      }
    }
  }
  return null;
}

export function findGateAtPosition(state: CircuitState, x: number, y: number): LogicGate | null {
  for (const gate of state.gates.values()) {
    if (x >= gate.x && x <= gate.x + gate.width &&
        y >= gate.y && y <= gate.y + gate.height) {
      return gate;
    }
  }
  return null;
}

export function toggleInputGate(gate: LogicGate, state: CircuitState): void {
  if (gate.type !== 'INPUT') return;
  for (const output of gate.outputs) {
    output.value = !output.value;
  }
  state.dirty = true;
}

export function deleteGate(gateId: string, state: CircuitState): void {
  const wiresToDelete: string[] = [];
  for (const wire of state.wires.values()) {
    if (wire.fromGateId === gateId || wire.toGateId === gateId) {
      wiresToDelete.push(wire.id);
    }
  }
  for (const wireId of wiresToDelete) {
    state.wires.delete(wireId);
  }

  state.gates.delete(gateId);
  state.selectedGateIds.delete(gateId);
  state.dirty = true;
}

export function deleteWire(wireId: string, state: CircuitState): void {
  const wire = state.wires.get(wireId);
  if (wire) {
    const toGate = state.gates.get(wire.toGateId);
    const toPin = toGate?.inputs.find(p => p.id === wire.toPinId);
    if (toPin) {
      toPin.connected = false;
      toPin.value = false;
    }

    const fromGate = state.gates.get(wire.fromGateId);
    const fromPin = fromGate?.outputs.find(p => p.id === wire.fromPinId);
    if (fromPin) {
      fromPin.connected = false;
    }
  }
  state.wires.delete(wireId);
  state.dirty = true;
}

export function deleteSelectedGates(state: CircuitState): void {
  const idsToDelete = [...state.selectedGateIds];
  for (const id of idsToDelete) {
    deleteGate(id, state);
  }
  state.selectedGateIds.clear();
}

export function selectGatesInRect(state: CircuitState, rect: SelectionRect, append: boolean = false): void {
  const minX = Math.min(rect.startX, rect.endX);
  const maxX = Math.max(rect.startX, rect.endX);
  const minY = Math.min(rect.startY, rect.endY);
  const maxY = Math.max(rect.start