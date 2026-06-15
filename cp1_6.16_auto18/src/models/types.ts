import * as THREE from 'three';

export type NodeType = 'source' | 'processor' | 'sink' | 'relay';

export const NODE_COLORS: Record<string, string> = {
  red: '#e53935',
  blue: '#1e88e5',
  green: '#43a047',
  orange: '#fb8c00',
};

export const NODE_COLOR_KEYS = Object.keys(NODE_COLORS);

export interface FlowNode {
  id: string;
  name: string;
  position: THREE.Vector3;
  colorKey: string;
  color: string;
  type: NodeType;
  receivedPackets: number;
  mesh?: THREE.Mesh;
  label?: THREE.Mesh;
  glowMesh?: THREE.Mesh;
  originalScale: number;
  isFlashing: boolean;
  flashTimer: number;
}

export interface FlowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  mesh?: THREE.Group;
  flowParticles: FlowParticle[];
  lineMesh?: THREE.Mesh;
  particleGroup?: THREE.Group;
}

export interface FlowParticle {
  progress: number;
  mesh: THREE.Mesh;
  speed: number;
}

export interface DataPacket {
  id: string;
  sourceId: string;
  targetId: string;
  connectionId: string;
  progress: number;
  speed: number;
  mesh?: THREE.Mesh;
  active: boolean;
}

export interface GraphState {
  nodes: Map<string, FlowNode>;
  connections: Map<string, FlowConnection>;
  packets: DataPacket[];
}

export const MAX_NODES = 50;
export const MAX_CONNECTIONS = 120;
export const MAX_PACKETS = 200;

export const NODE_RADIUS = 0.5;
export const CONNECTION_TUBE_RADIUS = 0.15;
export const PACKET_RADIUS = 0.15;

export const DAMPING_FACTOR = 0.85;
