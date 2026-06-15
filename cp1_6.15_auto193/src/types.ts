export type SpeciesCategory = 'animal' | 'plant' | 'microbe';

export interface NodeData {
  id: string;
  name: string;
  category: SpeciesCategory;
  description: string;
  position: { x: number; y: number; z: number };
  radius: number;
  depth: number;
  age: number;
  relatedSpecies: string[];
}

export interface ParticleData {
  id: string;
  nodeId: string;
  position: { x: number; y: number; z: number };
  basePosition: { x: number; y: number; z: number };
  size: number;
  color: string;
  floatPhase: number;
  floatSpeed: number;
  floatAmplitude: number;
}

export interface EdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'evolution' | 'symbiosis';
  flowSpeed: number;
}

export interface StreamParticleData {
  id: string;
  edgeId: string;
  progress: number;
  size: number;
  speed: number;
}

export interface HighlightState {
  nodeId: string | null;
  isFlashing: boolean;
  flashStartTime: number;
}

export interface ClickAnimationState {
  nodeId: string;
  startTime: number;
  duration: number;
  pulseRadius: number;
}

export interface EventMap {
  'search': { query: string };
  'node-click': { nodeId: string };
  'related-click': { nodeId: string };
  'panel-close': void;
}

export type EventCallback<T = any> = (data: T) => void;
