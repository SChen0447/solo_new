import type { RecordingSnapshot, RecordingSession } from './TimeRecorder';

export type PlaybackState = 'idle' | 'playing' | 'paused';

export interface PlaybackStatus {
  state: PlaybackState;
  currentIndex: number;
  currentTime: number;
  totalDuration: number;
  currentSnapshot: RecordingSnapshot | null;
}

type PlaybackCallback = (snapshot: RecordingSnapshot, index: number) => void;
type StateChangeCallback = (status: PlaybackStatus) => void;

class TimelinePlayer {
  private session: RecordingSession | null = null;
  private currentIndex: number = 0;
  private state: PlaybackState = 'idle';
  private pauseTime: number = 0;
  private accumulatedPauseTime: number = 0;
  private animationFrameId: number | null = null;
  private playbackCallback: PlaybackCallback | null = null;
  private stateChangeCallback: StateChangeCallback | null = null;
  private autoPlayTimeout: number | null = null;
  private transitionDuration: number = 500;
  private pauseDuration: number = 3000;

  loadSession(session: RecordingSession): void {
    this.stop();
    this.session = session;
    this.currentIndex = 0;
    this.state = 'idle';
    this.notifyStateChange();
  }

  getSnapshots(): RecordingSnapshot[] {
    return this.session?.snapshots || [];
  }

  getTotalDuration(): number {
    if (!this.session || this.session.snapshots.length < 2) return 0;
    const first = this.session.snapshots[0];
    const last = this.session.snapshots[this.session.snapshots.length - 1];
    return last.timestamp - first.timestamp;
  }

  getCurrentSnapshot(): RecordingSnapshot | null {
    if (!this.session || this.session.snapshots.length === 0) return null;
    return this.session.snapshots[Math.min(this.currentIndex, this.session.snapshots.length - 1)];
  }

  getStatus(): PlaybackStatus {
    const currentSnapshot = this.getCurrentSnapshot();
    const currentTime = currentSnapshot
      ? currentSnapshot.timestamp - (this.session?.snapshots[0]?.timestamp || 0)
      : 0;

    return {
      state: this.state,
      currentIndex: this.currentIndex,
      currentTime,
      totalDuration: this.getTotalDuration(),
      currentSnapshot,
    };
  }

  play(): void {
    if (!this.session || this.session.snapshots.length < 2) return;
    if (this.state === 'playing') return;

    if (this.state === 'idle') {
      this.currentIndex = 0;
      this.accumulatedPauseTime = 0;
    } else if (this.state === 'paused') {
      const now = performance.now();
      this.accumulatedPauseTime += now - this.pauseTime;
    }

    this.state = 'playing';
    this.notifyStateChange();
    this.scheduleNext();
  }

  pause(): void {
    if (this.state !== 'playing') return;

    this.state = 'paused';
    this.pauseTime = performance.now();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.autoPlayTimeout !== null) {
      clearTimeout(this.autoPlayTimeout);
      this.autoPlayTimeout = null;
    }

    this.notifyStateChange();
  }

  stop(): void {
    this.state = 'idle';
    this.currentIndex = 0;
    this.accumulatedPauseTime = 0;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.autoPlayTimeout !== null) {
      clearTimeout(this.autoPlayTimeout);
      this.autoPlayTimeout = null;
    }

    this.notifyStateChange();
  }

  seekToIndex(index: number): void {
    if (!this.session || index < 0 || index >= this.session.snapshots.length) return;

    const wasPlaying = this.state === 'playing';
    this.pause();

    this.currentIndex = index;

    const snapshot = this.session.snapshots[index];
    if (this.playbackCallback) {
      this.playbackCallback(snapshot, index);
    }

    this.notifyStateChange();

    if (wasPlaying) {
      this.scheduleAutoPlay();
    }
  }

  seekToTime(time: number): void {
    if (!this.session || this.session.snapshots.length === 0) return;

    const firstTimestamp = this.session.snapshots[0].timestamp;
    const targetTimestamp = firstTimestamp + time;

    let closestIndex = 0;
    let minDiff = Infinity;

    for (let i = 0; i < this.session.snapshots.length; i++) {
      const diff = Math.abs(this.session.snapshots[i].timestamp - targetTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    this.seekToIndex(closestIndex);
  }

  next(): void {
    if (!this.session) return;
    if (this.currentIndex >= this.session.snapshots.length - 1) {
      this.stop();
      return;
    }

    this.currentIndex++;
    const snapshot = this.session.snapshots[this.currentIndex];

    if (this.playbackCallback) {
      this.playbackCallback(snapshot, this.currentIndex);
    }

    this.notifyStateChange();
  }

  previous(): void {
    if (!this.session || this.currentIndex <= 0) return;

    this.currentIndex--;
    const snapshot = this.session.snapshots[this.currentIndex];

    if (this.playbackCallback) {
      this.playbackCallback(snapshot, this.currentIndex);
    }

    this.notifyStateChange();
  }

  setOnPlayback(callback: PlaybackCallback | null): void {
    this.playbackCallback = callback;
  }

  setOnStateChange(callback: StateChangeCallback | null): void {
    this.stateChangeCallback = callback;
  }

  setTransitionDuration(duration: number): void {
    this.transitionDuration = duration;
  }

  setPauseDuration(duration: number): void {
    this.pauseDuration = duration;
  }

  private scheduleNext(): void {
    if (!this.session || this.state !== 'playing') return;

    if (this.currentIndex >= this.session.snapshots.length - 1) {
      this.stop();
      return;
    }

    this.autoPlayTimeout = window.setTimeout(() => {
      this.next();
      this.scheduleNext();
    }, this.pauseDuration + this.transitionDuration);
  }

  private scheduleAutoPlay(): void {
    if (this.autoPlayTimeout !== null) {
      clearTimeout(this.autoPlayTimeout);
    }

    this.autoPlayTimeout = window.setTimeout(() => {
      this.play();
    }, this.pauseDuration);
  }

  private notifyStateChange(): void {
    if (this.stateChangeCallback) {
      this.stateChangeCallback(this.getStatus());
    }
  }

  getIndexCount(): number {
    return this.session?.snapshots.length || 0;
  }

  getSnapshotAtPercent(percent: number): RecordingSnapshot | null {
    if (!this.session || this.session.snapshots.length === 0) return null;

    const totalDuration = this.getTotalDuration();
    if (totalDuration === 0) return this.session.snapshots[0];

    const targetTime = totalDuration * percent;
    return this.getSnapshotAtTime(targetTime);
  }

  getSnapshotAtTime(time: number): RecordingSnapshot | null {
    if (!this.session || this.session.snapshots.length === 0) return null;

    const firstTimestamp = this.session.snapshots[0].timestamp;
    const targetTimestamp = firstTimestamp + time;

    let closest: RecordingSnapshot = this.session.snapshots[0];
    let minDiff = Infinity;

    for (const snapshot of this.session.snapshots) {
      const diff = Math.abs(snapshot.timestamp - targetTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = snapshot;
      }
    }

    return closest;
  }

  getIndexAtPercent(percent: number): number {
    if (!this.session || this.session.snapshots.length === 0) return 0;

    const totalDuration = this.getTotalDuration();
    if (totalDuration === 0) return 0;

    const targetTime = totalDuration * percent;
    const firstTimestamp = this.session.snapshots[0].timestamp;
    const targetTimestamp = firstTimestamp + targetTime;

    let closestIndex = 0;
    let minDiff = Infinity;

    for (let i = 0; i < this.session.snapshots.length; i++) {
      const diff = Math.abs(this.session.snapshots[i].timestamp - targetTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    return closestIndex;
  }
}

export const timelinePlayer = new TimelinePlayer();
