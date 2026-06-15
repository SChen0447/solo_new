import { energyNodeColors } from '@/data/runes';

export interface EnergyNode {
  id: number;
  x: number;
  y: number;
  color: string;
  active: boolean;
  pulsePhase: number;
}

export interface EnergyWave {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  color: string;
  speed: number;
}

export interface ResonanceEffect {
  active: boolean;
  startTime: number;
  duration: number;
}

export interface EnergySystemState {
  nodes: EnergyNode[];
  energyWaves: EnergyWave[];
  resonance: ResonanceEffect;
  flashEffect: { active: boolean; startTime: number; duration: number };
}

const NODE_COUNT = 6;
const NODE_RADIUS = 80;
const WAVE_SPEED = 2;

export function createNodes(centerX: number, centerY: number): EnergyNode[] {
  const nodes: EnergyNode[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const angle = (i / NODE_COUNT) * Math.PI * 2 - Math.PI / 2;
    nodes.push({
      id: i,
      x: centerX + Math.cos(angle) * NODE_RADIUS,
      y: centerY + Math.sin(angle) * NODE_RADIUS,
      color: energyNodeColors[i],
      active: false,
      pulsePhase: (i / NODE_COUNT) * Math.PI * 2,
    });
  }
  return nodes;
}

export function activateNode(
  state: EnergySystemState,
  nodeIndex: number
): EnergySystemState {
  const newNodes = state.nodes.map((node, idx) =>
    idx === nodeIndex ? { ...node, active: true } : node
  );
  return { ...state, nodes: newNodes };
}

export function transferEnergy(
  state: EnergySystemState,
  nodeIndex: number,
  centerX: number,
  centerY: number
): EnergySystemState {
  const node = state.nodes[nodeIndex];
  if (!node) return state;

  const wave: EnergyWave = {
    id: Date.now() + Math.random(),
    startX: node.x,
    startY: node.y,
    endX: centerX,
    endY: centerY,
    progress: 0,
    color: node.color,
    speed: WAVE_SPEED,
  };

  return {
    ...state,
    energyWaves: [...state.energyWaves, wave],
  };
}

export function triggerResonance(state: EnergySystemState): EnergySystemState {
  return {
    ...state,
    resonance: {
      active: true,
      startTime: Date.now(),
      duration: 500,
    },
    flashEffect: {
      active: true,
      startTime: Date.now(),
      duration: 300,
    },
  };
}

export function updateEnergySystem(
  state: EnergySystemState,
  deltaTime: number,
  pulseSpeed: number = 0.003
): EnergySystemState {
  const updatedNodes = state.nodes.map((node) => ({
    ...node,
    pulsePhase: node.pulsePhase + pulseSpeed * deltaTime,
  }));

  const updatedWaves = state.energyWaves
    .map((wave) => ({
      ...wave,
      progress: wave.progress + wave.speed * deltaTime * 0.001,
    }))
    .filter((wave) => wave.progress < 1);

  const now = Date.now();
  const resonanceActive =
    state.resonance.active && now - state.resonance.startTime < state.resonance.duration;
  const flashActive =
    state.flashEffect.active && now - state.flashEffect.startTime < state.flashEffect.duration;

  return {
    ...state,
    nodes: updatedNodes,
    energyWaves: updatedWaves,
    resonance: {
      ...state.resonance,
      active: resonanceActive,
    },
    flashEffect: {
      ...state.flashEffect,
      active: flashActive,
    },
  };
}

export function activateAllNodesAndTransfer(
  state: EnergySystemState,
  centerX: number,
  centerY: number
): EnergySystemState {
  let newState = { ...state };

  for (let i = 0; i < NODE_COUNT; i++) {
    newState = activateNode(newState, i);
    newState = transferEnergy(newState, i, centerX, centerY);
  }

  return newState;
}

export function resetNodes(state: EnergySystemState): EnergySystemState {
  const resetNodes = state.nodes.map((node) => ({
    ...node,
    active: false,
  }));
  return { ...state, nodes: resetNodes };
}

export function getNodeScale(node: EnergyNode, baseScale: number = 1): number {
  const pulseAmount = Math.sin(node.pulsePhase) * 0.05 + 1;
  const activeScale = node.active ? 1.2 : 1;
  return baseScale * pulseAmount * activeScale;
}

export function getFlashOpacity(flashEffect: {
  active: boolean;
  startTime: number;
  duration: number;
}): number {
  if (!flashEffect.active) return 0;
  const elapsed = Date.now() - flashEffect.startTime;
  const progress = Math.min(1, elapsed / flashEffect.duration);
  return 0.6 * (1 - progress);
}
