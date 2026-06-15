import { create } from 'zustand';

export type JointName = 'base' | 'shoulder' | 'elbow' | 'wrist1' | 'wrist2' | 'wrist3';

export const JOINT_NAMES: JointName[] = ['base', 'shoulder', 'elbow', 'wrist1', 'wrist2', 'wrist3'];

export const JOINT_LABELS: Record<JointName, string> = {
  base: '基座',
  shoulder: '肩部',
  elbow: '肘部',
  wrist1: '腕部1',
  wrist2: '腕部2',
  wrist3: '腕部3'
};

export interface JointAngles {
  base: number;
  shoulder: number;
  elbow: number;
  wrist1: number;
  wrist2: number;
  wrist3: number;
}

export interface EndEffectorPosition {
  x: number;
  y: number;
  z: number;
}

export interface TargetCubeState {
  position: [number, number, number];
  visible: boolean;
  selected: boolean;
}

export interface TrailPoint {
  x: number;
  y: number;
  z: number;
}

export interface AnimationState {
  isMoving: boolean;
  targetAngles: JointAngles | null;
  startAngles: JointAngles | null;
  animationProgress: number;
  animationDuration: number;
}

export interface JointStore {
  jointAngles: JointAngles;
  setJointAngle: (joint: JointName, angle: number) => void;
  setAllJointAngles: (angles: Partial<JointAngles>) => void;

  endEffectorPosition: EndEffectorPosition;
  setEndEffectorPosition: (pos: EndEffectorPosition) => void;

  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  clearTrail: () => void;

  trailPoints: TrailPoint[];
  addTrailPoint: (point: TrailPoint) => void;
  compressTrail: () => void;

  targetCube: TargetCubeState;
  setTargetCubePosition: (pos: [number, number, number]) => void;
  toggleTargetCube: (visible?: boolean) => void;
  selectTargetCube: (selected: boolean) => void;

  animation: AnimationState;
  startAnimation: (targetAngles: JointAngles, duration?: number) => void;
  stopAnimation: () => void;
  setAnimationProgress: (progress: number) => void;

  particles: Array<{ id: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number }>;
  spawnParticles: (position: [number, number, number]) => void;
  updateParticles: (delta: number) => void;
  clearParticles: () => void;
}

export const useJointStore = create<JointStore>((set, get) => ({
  jointAngles: {
    base: 90,
    shoulder: 45,
    elbow: 90,
    wrist1: 0,
    wrist2: 0,
    wrist3: 0
  },
  setJointAngle: (joint, angle) => {
    const clamped = Math.max(0, Math.min(180, angle));
    set(state => ({
      jointAngles: { ...state.jointAngles, [joint]: clamped }
    }));
  },
  setAllJointAngles: (angles) => {
    set(state => ({
      jointAngles: { ...state.jointAngles, ...angles }
    }));
  },

  endEffectorPosition: { x: 0, y: 0, z: 0 },
  setEndEffectorPosition: (pos) => set({ endEffectorPosition: pos }),

  isRecording: false,
  startRecording: () => {
    set({ isRecording: true });
  },
  stopRecording: () => {
    set({ isRecording: false });
  },
  clearTrail: () => set({ trailPoints: [] }),

  trailPoints: [],
  addTrailPoint: (point) => {
    const state = get();
    if (!state.isRecording) return;

    const trail = state.trailPoints;
    if (trail.length === 0) {
      set({ trailPoints: [...trail, point] });
      return;
    }

    const last = trail[trail.length - 1];
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    const dz = point.z - last.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist >= 0.05) {
      const newTrail = [...trail, point];
      if (newTrail.length > 10000) {
        const compressed: TrailPoint[] = [];
        for (let i = 0; i < newTrail.length; i += 2) {
          if (i + 1 < newTrail.length) {
            compressed.push({
              x: (newTrail[i].x + newTrail[i + 1].x) / 2,
              y: (newTrail[i].y + newTrail[i + 1].y) / 2,
              z: (newTrail[i].z + newTrail[i + 1].z) / 2
            });
          } else {
            compressed.push(newTrail[i]);
          }
        }
        set({ trailPoints: compressed });
      } else {
        set({ trailPoints: newTrail });
      }
    }
  },
  compressTrail: () => {
    const state = get();
    const trail = state.trailPoints;
    if (trail.length <= 10000) return;

    const compressed: TrailPoint[] = [];
    for (let i = 0; i < trail.length; i += 2) {
      if (i + 1 < trail.length) {
        compressed.push({
          x: (trail[i].x + trail[i + 1].x) / 2,
          y: (trail[i].y + trail[i + 1].y) / 2,
          z: (trail[i].z + trail[i + 1].z) / 2
        });
      } else {
        compressed.push(trail[i]);
      }
    }
    set({ trailPoints: compressed });
  },

  targetCube: {
    position: [2, 1.5, 0],
    visible: true,
    selected: false
  },
  setTargetCubePosition: (pos) => set(state => ({
    targetCube: { ...state.targetCube, position: pos }
  })),
  toggleTargetCube: (visible) => set(state => ({
    targetCube: {
      ...state.targetCube,
      visible: visible !== undefined ? visible : !state.targetCube.visible
    }
  })),
  selectTargetCube: (selected) => set(state => ({
    targetCube: { ...state.targetCube, selected }
  })),

  animation: {
    isMoving: false,
    targetAngles: null,
    startAngles: null,
    animationProgress: 0,
    animationDuration: 1
  },
  startAnimation: (targetAngles, duration = 1) => {
    const state = get();
    set({
      animation: {
        isMoving: true,
        targetAngles,
        startAngles: { ...state.jointAngles },
        animationProgress: 0,
        animationDuration: duration
      }
    });
  },
  stopAnimation: () => {
    set(state => ({
      animation: {
        ...state.animation,
        isMoving: false
      }
    }));
  },
  setAnimationProgress: (progress) => {
    set(state => ({
      animation: {
        ...state.animation,
        animationProgress: progress
      }
    }));
  },

  particles: [],
  spawnParticles: (position) => {
    const particles: JointStore['particles'] = [];
    for (let i = 0; i < 50; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = Math.random() * 2;
      particles.push({
        id: Date.now() + i,
        x: position[0],
        y: position[1],
        z: position[2],
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.cos(phi) * speed,
        vz: Math.sin(phi) * Math.sin(theta) * speed,
        life: 1
      });
    }
    set(state => ({
      particles: [...state.particles, ...particles]
    }));
  },
  updateParticles: (delta) => {
    set(state => ({
      particles: state.particles
        .map(p => ({
          ...p,
          x: p.x + p.vx * delta,
          y: p.y + p.vy * delta,
          z: p.z + p.vz * delta,
          vy: p.vy - 1 * delta,
          life: p.life - delta / 0.6
        }))
        .filter(p => p.life > 0)
    }));
  },
  clearParticles: () => set({ particles: [] })
}));
