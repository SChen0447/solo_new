export type PipeType = 'drainage' | 'gas' | 'power' | 'communication';

export type SensorType = 'pressure' | 'flow' | 'voltage';

export type ViewMode = 'top' | 'profile';

export interface Sensor {
  id: string;
  type: SensorType;
  value: number;
  unit: string;
  history: number[];
}

export interface Node {
  id: string;
  x: number;
  y: number;
  z: number;
  sensor: Sensor;
}

export interface PipeSegmentData {
  id: string;
  type: PipeType;
  startNodeId: string;
  endNodeId: string;
  material: string;
  diameter: number;
}

export interface NetworkData {
  nodes: Node[];
  pipes: PipeSegmentData[];
}

export interface EventMap {
  SELECT_NODE: string;
  SELECT_PIPE: string;
  FILTER_TYPE: { type: PipeType; visible: boolean };
  SENSOR_UPDATE: { nodeId: string; value: number };
  VIEW_CHANGE: ViewMode;
  CLEAR_SELECTION: void;
}

export const PIPE_COLORS: Record<PipeType, string> = {
  drainage: '#1565c0',
  gas: '#e65100',
  power: '#fdd835',
  communication: '#2e7d32',
};

export const PIPE_NAMES: Record<PipeType, string> = {
  drainage: '排水',
  gas: '燃气',
  power: '电力',
  communication: '通信',
};

export const SENSOR_NAMES: Record<SensorType, string> = {
  pressure: '压力',
  flow: '流量',
  voltage: '电压',
};

export const SENSOR_UNITS: Record<SensorType, string> = {
  pressure: 'MPa',
  flow: 'm³/h',
  voltage: 'kV',
};
