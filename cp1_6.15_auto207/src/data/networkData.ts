import { v4 as uuidv4 } from 'uuid';
import {
  Node,
  PipeSegmentData,
  NetworkData,
  SensorType,
  PipeType,
  SENSOR_UNITS,
} from '../types';
import { eventBus } from '../utils/eventBus';

export const SENSOR_BASE_VALUES: Record<SensorType, number> = {
  pressure: 0.6,
  flow: 120,
  voltage: 10,
};

const MATERIALS: Record<PipeType, string[]> = {
  drainage: ['混凝土', 'PVC', 'HDPE'],
  gas: ['钢管', 'PE管', '铸铁管'],
  power: ['电缆沟', '排管', '隧道'],
  communication: ['光纤', '同轴电缆', '双绞线'],
};

function generateNodes(count: number): Node[] {
  const nodes: Node[] = [];
  const gridSize = Math.ceil(Math.sqrt(count));
  const sensorTypes: SensorType[] = ['pressure', 'flow', 'voltage'];

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const x = (col / (gridSize - 1) - 0.5) * 80 + (Math.random() - 0.5) * 10;
    const z = (row / (gridSize - 1) - 0.5) * 80 + (Math.random() - 0.5) * 10;
    const y = -2 - Math.random() * 6;
    const sensorType = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];
    const baseValue = SENSOR_BASE_VALUES[sensorType];
    const initialValue = baseValue * (0.8 + Math.random() * 0.4);

    const history: number[] = [];
    for (let h = 0; h < 20; h++) {
      history.push(initialValue * (0.95 + Math.random() * 0.1));
    }

    nodes.push({
      id: uuidv4(),
      x: Math.max(-45, Math.min(45, x)),
      y: Math.max(-8, Math.min(-2, y)),
      z: Math.max(-45, Math.min(45, z)),
      sensor: {
        id: uuidv4(),
        type: sensorType,
        value: initialValue,
        unit: SENSOR_UNITS[sensorType],
        history,
      },
    });
  }

  return nodes;
}

function generatePipes(nodes: Node[], count: number): PipeSegmentData[] {
  const pipes: PipeSegmentData[] = [];
  const pipeTypes: PipeType[] = ['drainage', 'gas', 'power', 'communication'];
  const connections = new Set<string>();

  function getConnectionKey(a: string, b: string): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    while (attempts < 100) {
      const startIdx = Math.floor(Math.random() * nodes.length);
      let endIdx = Math.floor(Math.random() * nodes.length);

      if (endIdx === startIdx) {
        endIdx = (endIdx + 1) % nodes.length;
      }

      const key = getConnectionKey(nodes[startIdx].id, nodes[endIdx].id);
      if (!connections.has(key)) {
        connections.add(key);
        const type = pipeTypes[Math.floor(Math.random() * pipeTypes.length)];
        const materials = MATERIALS[type];

        pipes.push({
          id: uuidv4(),
          type,
          startNodeId: nodes[startIdx].id,
          endNodeId: nodes[endIdx].id,
          material: materials[Math.floor(Math.random() * materials.length)],
          diameter: 0.3 + Math.random() * 0.4,
        });
        break;
      }
      attempts++;
    }
  }

  return pipes;
}

export function generateNetworkData(): NetworkData {
  const nodes = generateNodes(12);
  const pipes = generatePipes(nodes, 15);
  return { nodes, pipes };
}

let updateInterval: number | null = null;

export function startSensorUpdates(nodes: Node[], onUpdate: (nodeId: string, value: number) => void): void {
  stopSensorUpdates();

  updateInterval = window.setInterval(() => {
    nodes.forEach((node) => {
      const fluctuation = 0.95 + Math.random() * 0.1;
      const newValue = node.sensor.value * fluctuation;
      const baseValue = SENSOR_BASE_VALUES[node.sensor.type];
      const clampedValue = Math.max(baseValue * 0.5, Math.min(baseValue * 1.5, newValue));

      node.sensor.value = clampedValue;
      node.sensor.history.push(clampedValue);
      if (node.sensor.history.length > 20) {
        node.sensor.history.shift();
      }

      eventBus.emit('SENSOR_UPDATE', { nodeId: node.id, value: clampedValue });
      onUpdate(node.id, clampedValue);
    });
  }, 2000);
}

export function stopSensorUpdates(): void {
  if (updateInterval !== null) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}
