import { create } from 'zustand';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface SnapshotData {
  timestamp: number;
  player: Position3D;
  platforms: Position3D[];
  playerVelocityY: number;
  playerOnPlatform: number | null;
}

export type TimeState = 'normal' | 'rewinding';

interface GameState {
  timeState: TimeState;
  snapshots: SnapshotData[];
  currentSnapshot: SnapshotData | null;
  interpolatedData: SnapshotData | null;
  rewindProgress: number;
  rewindDuration: number;
  maxHistoryTime: number;
  fps: number;
  droppedFrames: number;
  totalRewindFrames: number;
  elapsedGameTime: number;
  rewindStartSnapshotIndex: number;
  buttonFlash: boolean;

  setTimeState: (state: TimeState) => void;
  addSnapshot: (snapshot: SnapshotData) => void;
  setInterpolatedData: (data: SnapshotData | null) => void;
  setRewindProgress: (progress: number) => void;
  setFps: (fps: number) => void;
  incrementDroppedFrames: () => void;
  setTotalRewindFrames: (count: number) => void;
  setElapsedGameTime: (time: number) => void;
  startRewind: () => boolean;
  finishRewind: () => void;
  setRewindStartSnapshotIndex: (index: number) => void;
  triggerButtonFlash: () => void;
  resetButtonFlash: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  timeState: 'normal',
  snapshots: [],
  currentSnapshot: null,
  interpolatedData: null,
  rewindProgress: 0,
  rewindDuration: 3000,
  maxHistoryTime: 3000,
  fps: 60,
  droppedFrames: 0,
  totalRewindFrames: 0,
  elapsedGameTime: 0,
  rewindStartSnapshotIndex: 0,
  buttonFlash: false,

  setTimeState: (state) => set({ timeState: state }),

  addSnapshot: (snapshot) => {
    const { snapshots, maxHistoryTime } = get();
    const cutoffTime = snapshot.timestamp - maxHistoryTime;
    const filtered = snapshots.filter((s) => s.timestamp >= cutoffTime);
    filtered.push(snapshot);
    set({ snapshots: filtered, currentSnapshot: snapshot });
  },

  setInterpolatedData: (data) => set({ interpolatedData: data }),

  setRewindProgress: (progress) => set({ rewindProgress: progress }),

  setFps: (fps) => set({ fps }),

  incrementDroppedFrames: () =>
    set((state) => ({ droppedFrames: state.droppedFrames + 1 })),

  setTotalRewindFrames: (count) => set({ totalRewindFrames: count }),

  setElapsedGameTime: (time) => set({ elapsedGameTime: time }),

  startRewind: () => {
    const { snapshots } = get();
    if (snapshots.length < 2) return false;
    set({
      timeState: 'rewinding',
      rewindProgress: 0,
      droppedFrames: 0,
      rewindStartSnapshotIndex: snapshots.length - 1,
    });
    return true;
  },

  finishRewind: () => {
    const { snapshots } = get();
    const targetSnapshot = snapshots[0] || null;
    set({
      timeState: 'normal',
      rewindProgress: 0,
      interpolatedData: null,
      currentSnapshot: targetSnapshot,
    });
  },

  setRewindStartSnapshotIndex: (index) =>
    set({ rewindStartSnapshotIndex: index }),

  triggerButtonFlash: () => set({ buttonFlash: true }),

  resetButtonFlash: () => set({ buttonFlash: false }),
}));
