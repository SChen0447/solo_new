import { SnapshotData, Position3D } from '../store/gameStore';

export const SNAPSHOT_INTERVAL = 100;
export const REWIND_SPEED = 1.5;
export const REWIND_DURATION_MS = 3000;
export const MAX_INTERPOLATED_FRAMES = 20;
export const GRAVITY = 9.8;

export interface RewindResult {
  interpolatedData: SnapshotData | null;
  progress: number;
  finished: boolean;
  frameComputed: boolean;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPosition(a: Position3D, b: Position3D, t: number): Position3D {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

export function lerpPlatforms(
  a: Position3D[],
  b: Position3D[],
  t: number
): Position3D[] {
  const count = Math.min(a.length, b.length);
  const result: Position3D[] = [];
  for (let i = 0; i < count; i++) {
    result.push(lerpPosition(a[i], b[i], t));
  }
  return result;
}

function findSnapshotPairByProgress(
  snapshots: SnapshotData[],
  rewindProgress: number
): { prev: SnapshotData; next: SnapshotData; t: number } | null {
  if (snapshots.length < 2) return null;

  const startIndex = snapshots.length - 1;
  const endIndex = 0;
  const targetFloatIndex =
    startIndex - (startIndex - endIndex) * rewindProgress;

  const nextIdx = Math.min(
    Math.ceil(targetFloatIndex),
    snapshots.length - 1
  );
  const prevIdx = Math.max(Math.floor(targetFloatIndex), 0);

  if (prevIdx === nextIdx) {
    const snap = snapshots[prevIdx];
    return { prev: snap, next: snap, t: 0 };
  }

  const t = targetFloatIndex - prevIdx;
  return {
    prev: snapshots[prevIdx],
    next: snapshots[nextIdx],
    t: Math.max(0, Math.min(1, t)),
  };
}

export function interpolateSnapshot(
  snapshots: SnapshotData[],
  rewindProgress: number
): SnapshotData | null {
  const pair = findSnapshotPairByProgress(snapshots, rewindProgress);
  if (!pair) return null;

  const { prev, next, t } = pair;
  const invertedT = 1 - t;

  return {
    timestamp: lerp(prev.timestamp, next.timestamp, t),
    player: lerpPosition(prev.player, next.player, t),
    platforms: lerpPlatforms(prev.platforms, next.platforms, t),
    playerVelocityY: lerp(prev.playerVelocityY, next.playerVelocityY, t),
    playerOnPlatform: invertedT > 0.5 ? prev.playerOnPlatform : next.playerOnPlatform,
  };
}

export class TimeEngine {
  private lastSnapshotTime: number = 0;
  private rewindElapsed: number = 0;
  private readonly rewindActualDuration: number;
  private frameBudget: number = 0;

  constructor() {
    this.rewindActualDuration = REWIND_DURATION_MS / REWIND_SPEED;
  }

  shouldTakeSnapshot(currentTime: number): boolean {
    return currentTime - this.lastSnapshotTime >= SNAPSHOT_INTERVAL;
  }

  markSnapshotTaken(currentTime: number): void {
    this.lastSnapshotTime = currentTime;
  }

  startRewind(_currentTime: number): void {
    this.rewindElapsed = 0;
    this.frameBudget = 0;
  }

  updateRewind(
    deltaMs: number,
    snapshots: SnapshotData[]
  ): RewindResult {
    this.rewindElapsed += deltaMs;
    const progress = Math.min(1, this.rewindElapsed / this.rewindActualDuration);
    const finished = progress >= 1;

    this.frameBudget += deltaMs / (1000 / 60);

    let frameComputed = false;
    let interpolatedData: SnapshotData | null = null;

    if (this.frameBudget >= 1 || finished) {
      this.frameBudget = Math.min(this.frameBudget - 1, MAX_INTERPOLATED_FRAMES);
      interpolatedData = interpolateSnapshot(snapshots, progress);
      frameComputed = true;
    }

    return {
      interpolatedData,
      progress,
      finished,
      frameComputed,
    };
  }

  getRewindTimeRemaining(): number {
    const remaining = Math.max(0, this.rewindActualDuration - this.rewindElapsed);
    return remaining / REWIND_SPEED;
  }
}
