import { PlayerState } from '../stores/gameStore'

export interface Snapshot {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  timestamp: number
}

const MAX_SNAPSHOTS = 50
const SNAPSHOT_INTERVAL = 0.1
const REWIND_DURATION = 0.5
const HISTORY_DURATION = 5

export class TimeRecorder {
  private snapshots: Snapshot[] = []
  private isRewinding: boolean = false
  private rewindProgress: number = 0
  private rewindStartSnapshot: Snapshot | null = null
  private rewindTargetSnapshot: Snapshot | null = null
  private lastSnapshotTime: number = 0
  private onRewindComplete: (() => void) | null = null

  recordSnapshot(player: PlayerState, currentTime: number): void {
    if (this.isRewinding) return

    if (currentTime - this.lastSnapshotTime >= SNAPSHOT_INTERVAL) {
      const snapshot: Snapshot = {
        x: player.x,
        y: player.y,
        vx: player.vx,
        vy: player.vy,
        color: player.color,
        timestamp: currentTime
      }

      this.snapshots.push(snapshot)

      if (this.snapshots.length > MAX_SNAPSHOTS) {
        this.snapshots.shift()
      }

      this.lastSnapshotTime = currentTime
    }
  }

  startRewind(onComplete: () => void): boolean {
    if (this.isRewinding || this.snapshots.length === 0) return false

    const targetTime = this.lastSnapshotTime - HISTORY_DURATION
    const targetIndex = this.snapshots.findIndex((s) => s.timestamp >= targetTime)

    if (targetIndex === -1 && this.snapshots.length > 0) {
      this.rewindTargetSnapshot = this.snapshots[0]
    } else if (targetIndex >= 0) {
      this.rewindTargetSnapshot = this.snapshots[targetIndex]
    } else {
      return false
    }

    const lastSnapshot = this.snapshots[this.snapshots.length - 1]
    this.rewindStartSnapshot = {
      ...lastSnapshot,
      timestamp: this.lastSnapshotTime
    }

    this.isRewinding = true
    this.rewindProgress = 0
    this.onRewindComplete = onComplete

    return true
  }

  updateRewind(deltaTime: number, player: PlayerState): PlayerState | null {
    if (!this.isRewinding || !this.rewindStartSnapshot || !this.rewindTargetSnapshot) {
      return null
    }

    this.rewindProgress += deltaTime / REWIND_DURATION

    if (this.rewindProgress >= 1) {
      this.isRewinding = false
      this.rewindProgress = 0

      const result: PlayerState = {
        x: this.rewindTargetSnapshot.x,
        y: this.rewindTargetSnapshot.y,
        vx: this.rewindTargetSnapshot.vx,
        vy: this.rewindTargetSnapshot.vy,
        color: this.rewindTargetSnapshot.color,
        opacity: player.opacity
      }

      const targetIndex = this.snapshots.findIndex(
        (s) => s.timestamp >= this.rewindTargetSnapshot!.timestamp
      )
      if (targetIndex >= 0) {
        this.snapshots = this.snapshots.slice(0, targetIndex + 1)
      }

      this.lastSnapshotTime = this.rewindTargetSnapshot.timestamp
      this.rewindStartSnapshot = null
      this.rewindTargetSnapshot = null

      if (this.onRewindComplete) {
        this.onRewindComplete()
        this.onRewindComplete = null
      }

      return result
    }

    const t = this.easeInOutQuad(this.rewindProgress)
    const interpolated: PlayerState = {
      x: this.lerp(this.rewindStartSnapshot.x, this.rewindTargetSnapshot.x, t),
      y: this.lerp(this.rewindStartSnapshot.y, this.rewindTargetSnapshot.y, t),
      vx: this.lerp(this.rewindStartSnapshot.vx, this.rewindTargetSnapshot.vx, t),
      vy: this.lerp(this.rewindStartSnapshot.vy, this.rewindTargetSnapshot.vy, t),
      color: this.interpolateColor(
        this.rewindStartSnapshot.color,
        this.rewindTargetSnapshot.color,
        t
      ),
      opacity: player.opacity
    }

    return interpolated
  }

  getRewindProgress(): number {
    return this.rewindProgress
  }

  getIsRewinding(): boolean {
    return this.isRewinding
  }

  getAvailableRewindTime(): number {
    if (this.snapshots.length === 0) return 0
    const oldestTime = this.snapshots[0].timestamp
    return Math.min(HISTORY_DURATION, this.lastSnapshotTime - oldestTime)
  }

  clear(): void {
    this.snapshots = []
    this.isRewinding = false
    this.rewindProgress = 0
    this.rewindStartSnapshot = null
    this.rewindTargetSnapshot = null
    this.lastSnapshotTime = 0
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16)
    const g1 = parseInt(color1.slice(3, 5), 16)
    const b1 = parseInt(color1.slice(5, 7), 16)

    const r2 = parseInt(color2.slice(1, 3), 16)
    const g2 = parseInt(color2.slice(3, 5), 16)
    const b2 = parseInt(color2.slice(5, 7), 16)

    const r = Math.round(this.lerp(r1, r2, t))
    const g = Math.round(this.lerp(g1, g2, t))
    const b = Math.round(this.lerp(b1, b2, t))

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }
}
