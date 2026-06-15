import { ParticleData, RecordingFrame, AnimationScript } from '../types';

const MAX_DURATION = 30000;
const FPS = 30;
const FRAME_INTERVAL = 1000 / FPS;

export class AnimationRecorder {
  private isRecording: boolean = false;
  private startTime: number = 0;
  private frames: RecordingFrame[] = [];
  private lastFrameTime: number = 0;

  start(): void {
    this.isRecording = true;
    this.startTime = performance.now();
    this.frames = [];
    this.lastFrameTime = 0;
  }

  stop(): void {
    this.isRecording = false;
  }

  get recording(): boolean {
    return this.isRecording;
  }

  get elapsed(): number {
    if (!this.isRecording) return 0;
    return performance.now() - this.startTime;
  }

  get frameCount(): number {
    return this.frames.length;
  }

  tryRecordFrame(particles: ParticleData[]): boolean {
    if (!this.isRecording) return false;

    const elapsed = performance.now() - this.startTime;

    if (elapsed >= MAX_DURATION) {
      this.stop();
      return false;
    }

    if (elapsed - this.lastFrameTime >= FRAME_INTERVAL) {
      this.lastFrameTime = elapsed;
      this.frames.push({
        timestamp: elapsed,
        particles: particles.map((p) => ({
          id: p.id,
          position: [p.position.x, p.position.y, p.position.z],
          color: p.color,
          size: p.size
        }))
      });
      return true;
    }

    return false;
  }

  export(): AnimationScript {
    const duration = this.frames.length > 0 ? this.frames[this.frames.length - 1].timestamp / 1000 : 0;
    return {
      version: '1.0',
      fps: FPS,
      duration,
      frames: this.frames
    };
  }

  exportAsJSON(): string {
    return JSON.stringify(this.export(), null, 2);
  }

  downloadJSON(filename: string = 'light-trails-animation.json'): void {
    const json = this.exportAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clear(): void {
    this.frames = [];
    this.isRecording = false;
    this.startTime = 0;
    this.lastFrameTime = 0;
  }
}

export const animationRecorder = new AnimationRecorder();
