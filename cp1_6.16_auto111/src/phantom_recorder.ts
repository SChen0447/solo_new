export interface RecordFrame {
  x: number;
  y: number;
  vx: number;
  vy: number;
  timestamp: number;
}

export interface Phantom {
  id: number;
  frames: RecordFrame[];
  currentFrame: number;
  playbackTime: number;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  lifetime: number;
  maxLifetime: number;
  active: boolean;
  destroyed: boolean;
}

export class PhantomRecorder {
  private recordBuffer: RecordFrame[] = [];
  private maxRecordDuration: number = 5000;
  private isRewinding: boolean = false;
  private rewindProgress: number = 0;
  private rewindDuration: number = 200;
  private rewindStartTime: number = 0;
  private phantoms: Phantom[] = [];
  private maxPhantoms: number = 1;
  private nextPhantomId: number = 0;
  private playerWidth: number = 20;
  private playerHeight: number = 20;

  record(x: number, y: number, vx: number, vy: number, timestamp: number): void {
    if (this.isRewinding) return;
    this.recordBuffer.push({ x, y, vx, vy, timestamp });
    const cutoffTime = timestamp - this.maxRecordDuration;
    while (this.recordBuffer.length > 0 && this.recordBuffer[0].timestamp < cutoffTime) {
      this.recordBuffer.shift();
    }
  }

  startRewind(timestamp: number): void {
    if (this.isRewinding || this.recordBuffer.length < 2) return;
    this.isRewinding = true;
    this.rewindStartTime = timestamp;
    this.rewindProgress = 0;
  }

  stopRewind(timestamp: number): Phantom | null {
    if (!this.isRewinding) return null;
    this.isRewinding = false;
    const rewindFrames = this.getRewindFrames();
    if (rewindFrames.length < 2) return null;
    if (this.phantoms.length >= this.maxPhantoms) {
      this.phantoms.shift();
    }
    const phantom: Phantom = {
      id: this.nextPhantomId++,
      frames: [...rewindFrames],
      currentFrame: 0,
      playbackTime: 0,
      x: rewindFrames[0].x,
      y: rewindFrames[0].y,
      width: this.playerWidth,
      height: this.playerHeight,
      opacity: 1,
      lifetime: 0,
      maxLifetime: 10000,
      active: true,
      destroyed: false
    };
    this.phantoms.push(phantom);
    return phantom;
  }

  update(dt: number, timestamp: number): void {
    if (this.isRewinding) {
      const elapsed = timestamp - this.rewindStartTime;
      this.rewindProgress = Math.min(1, elapsed / this.rewindDuration);
    }
    for (let i = this.phantoms.length - 1; i >= 0; i--) {
      const phantom = this.phantoms[i];
      if (!phantom.active || phantom.destroyed) continue;
      phantom.lifetime += dt;
      if (phantom.lifetime >= phantom.maxLifetime) {
        phantom.opacity = Math.max(0, 1 - (phantom.lifetime - phantom.maxLifetime + 500) / 500);
        if (phantom.opacity <= 0) {
          phantom.destroyed = true;
          this.phantoms.splice(i, 1);
          continue;
        }
      }
      if (phantom.frames.length >= 2) {
        phantom.playbackTime += dt;
        const totalDuration = phantom.frames[phantom.frames.length - 1].timestamp - phantom.frames[0].timestamp;
        if (totalDuration > 0) {
          const progress = (phantom.playbackTime % totalDuration) / totalDuration;
          const frameIndex = Math.floor(progress * (phantom.frames.length - 1));
          const nextFrameIndex = Math.min(frameIndex + 1, phantom.frames.length - 1);
          const frameProgress = (progress * (phantom.frames.length - 1)) % 1;
          const currFrame = phantom.frames[frameIndex];
          const nextFrame = phantom.frames[nextFrameIndex];
          phantom.x = currFrame.x + (nextFrame.x - currFrame.x) * frameProgress;
          phantom.y = currFrame.y + (nextFrame.y - currFrame.y) * frameProgress;
        }
      }
    }
  }

  getScreenOpacity(): number {
    if (!this.isRewinding) return 1;
    return 1 - this.rewindProgress * 0.7;
  }

  isRewindActive(): boolean {
    return this.isRewinding;
  }

  getPhantoms(): Phantom[] {
    return this.phantoms.filter(p => p.active && !p.destroyed);
  }

  getRewindPhantom(): { x: number; y: number; width: number; height: number; opacity: number } | null {
    if (!this.isRewinding || this.recordBuffer.length < 2) return null;
    const totalDuration = this.recordBuffer[this.recordBuffer.length - 1].timestamp - this.recordBuffer[0].timestamp;
    if (totalDuration <= 0) return null;
    const rewindDuration = totalDuration * this.rewindProgress;
    const targetTime = this.recordBuffer[0].timestamp + rewindDuration;
    let frameIndex = 0;
    for (let i = 0; i < this.recordBuffer.length; i++) {
      if (this.recordBuffer[i].timestamp >= targetTime) {
        frameIndex = i;
        break;
      }
    }
    const frame = this.recordBuffer[frameIndex];
    return {
      x: frame.x,
      y: frame.y,
      width: this.playerWidth,
      height: this.playerHeight,
      opacity: 0.5
    };
  }

  private getRewindFrames(): RecordFrame[] {
    if (this.recordBuffer.length < 2) return [];
    const totalDuration = this.recordBuffer[this.recordBuffer.length - 1].timestamp - this.recordBuffer[0].timestamp;
    const rewindDuration = totalDuration * this.rewindProgress;
    const cutoffTime = this.recordBuffer[this.recordBuffer.length - 1].timestamp - rewindDuration;
    const frames: RecordFrame[] = [];
    for (const frame of this.recordBuffer) {
      if (frame.timestamp >= cutoffTime) {
        frames.push(frame);
      }
    }
    return frames;
  }

  destroyPhantom(id: number): void {
    const index = this.phantoms.findIndex(p => p.id === id);
    if (index !== -1) {
      this.phantoms[index].destroyed = true;
      this.phantoms.splice(index, 1);
    }
  }

  getAllPhantoms(): Phantom[] {
    return this.phantoms;
  }

  clear(): void {
    this.recordBuffer = [];
    this.phantoms = [];
    this.isRewinding = false;
    this.rewindProgress = 0;
  }
}
