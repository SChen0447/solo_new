import type { EditorModule, Point } from './editorModule';

export interface CarState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  gear: number;
  steerAngle: number;
  isOffTrack: boolean;
  respawnTimer: number;
}

export interface FrameData {
  x: number;
  y: number;
  angle: number;
  speed: number;
  gear: number;
  steerAngle: number;
  timestamp: number;
}

export class PhysicsModule {
  car: CarState = {
    x: 0, y: 0, angle: 0, speed: 0,
    gear: 1, steerAngle: 0, isOffTrack: false, respawnTimer: 0,
  };

  private editor: EditorModule;
  private keys: Set<string> = new Set();

  private readonly maxSpeed = 300;
  private readonly acceleration = 120;
  private readonly brakeForce = 200;
  private readonly frictionCoeff = 0.02;
  private readonly steerRate = 2.5;
  private readonly maxSteerAngle = Math.PI / 6;
  private readonly centripetalFactor = 0.003;

  isRecording = false;
  isReplaying = false;
  private recordedFrames: FrameData[] = [];
  private replayFrames: FrameData[] = [];
  private replayIndex = 0;
  private replayStartTime = 0;
  private recordStartTime = 0;
  private readonly maxRecordDuration = 30;

  speedHistory: number[] = [];
  private speedHistoryTimestamps: number[] = [];
  private readonly speedHistoryDuration = 10;
  private readonly speedHistorySampleRate = 100;
  private lastSpeedSampleTime = 0;

  onReplayFinish: (() => void) | null = null;

  constructor(editor: EditorModule) {
    this.editor = editor;
  }

  handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  resetCarToStart(): void {
    const start = this.editor.getStartPoint();
    const angle = this.editor.getStartAngle();
    this.car.x = start.x;
    this.car.y = start.y;
    this.car.angle = angle;
    this.car.speed = 0;
    this.car.gear = 1;
    this.car.steerAngle = 0;
    this.car.isOffTrack = false;
    this.car.respawnTimer = 0;
  }

  startRecording(): void {
    this.isRecording = true;
    this.recordedFrames = [];
    this.recordStartTime = performance.now();
  }

  stopRecording(): FrameData[] {
    this.isRecording = false;
    return this.recordedFrames;
  }

  startReplay(frames: FrameData[]): void {
    this.isReplaying = true;
    this.replayFrames = frames;
    this.replayIndex = 0;
    this.replayStartTime = performance.now();
  }

  stopReplay(): void {
    this.isReplaying = false;
    this.replayFrames = [];
    this.replayIndex = 0;
  }

  update(dt: number): void {
    if (this.isReplaying) {
      this.updateReplay();
      return;
    }

    if (this.car.isOffTrack) {
      this.car.respawnTimer -= dt;
      if (this.car.respawnTimer <= 0) {
        this.resetCarToStart();
      }
      return;
    }

    const w = this.keys.has('w');
    const s = this.keys.has('s');
    const a = this.keys.has('a');
    const d = this.keys.has('d');

    if (a) {
      this.car.steerAngle = Math.min(this.car.steerAngle + this.steerRate * dt, this.maxSteerAngle);
    } else if (d) {
      this.car.steerAngle = Math.max(this.car.steerAngle - this.steerRate * dt, -this.maxSteerAngle);
    } else {
      if (Math.abs(this.car.steerAngle) < 0.05) {
        this.car.steerAngle = 0;
      } else {
        this.car.steerAngle -= Math.sign(this.car.steerAngle) * this.steerRate * dt;
      }
    }

    if (w) {
      this.car.speed += this.acceleration * dt;
    }
    if (s) {
      this.car.speed -= this.brakeForce * dt;
    }

    const friction = this.frictionCoeff * this.car.speed;
    if (!w && this.car.speed > 0) {
      this.car.speed -= friction;
    }
    if (!s && this.car.speed < 0) {
      this.car.speed += friction;
    }

    if (Math.abs(this.car.steerAngle) > 0.01 && Math.abs(this.car.speed) > 1) {
      const centripetal = this.car.speed * this.car.speed * this.centripetalFactor * Math.abs(this.car.steerAngle);
      this.car.speed -= Math.sign(this.car.speed) * centripetal * dt;
    }

    this.car.speed = Math.max(-this.maxSpeed * 0.3, Math.min(this.maxSpeed, this.car.speed));

    if (Math.abs(this.car.speed) < 0.5 && !w && !s) {
      this.car.speed = 0;
    }

    this.car.gear = this.computeGear(this.car.speed);

    const turnRadius = 50;
    if (Math.abs(this.car.steerAngle) > 0.001 && Math.abs(this.car.speed) > 0.5) {
      const angularVel = (this.car.speed / turnRadius) * Math.sin(this.car.steerAngle);
      this.car.angle += angularVel * dt;
    }

    this.car.x += Math.cos(this.car.angle) * this.car.speed * dt;
    this.car.y += Math.sin(this.car.angle) * this.car.speed * dt;

    const onTrack = this.editor.isPointOnTrack({ x: this.car.x, y: this.car.y });
    if (!onTrack && this.editor.pathPoints.length >= 2) {
      this.car.isOffTrack = true;
      this.car.speed = 0;
      this.car.respawnTimer = 2;
    }

    const now = performance.now();
    if (now - this.lastSpeedSampleTime >= this.speedHistorySampleRate) {
      this.speedHistory.push(Math.abs(this.car.speed));
      this.speedHistoryTimestamps.push(now);
      this.lastSpeedSampleTime = now;

      while (this.speedHistoryTimestamps.length > 0 && now - this.speedHistoryTimestamps[0] > this.speedHistoryDuration * 1000) {
        this.speedHistory.shift();
        this.speedHistoryTimestamps.shift();
      }
    }

    if (this.isRecording) {
      const elapsed = (now - this.recordStartTime) / 1000;
      if (elapsed <= this.maxRecordDuration) {
        this.recordedFrames.push({
          x: this.car.x,
          y: this.car.y,
          angle: this.car.angle,
          speed: this.car.speed,
          gear: this.car.gear,
          steerAngle: this.car.steerAngle,
          timestamp: now,
        });
      } else {
        this.isRecording = false;
      }
    }
  }

  private updateReplay(): void {
    if (this.replayFrames.length === 0) {
      this.isReplaying = false;
      if (this.onReplayFinish) this.onReplayFinish();
      return;
    }

    const elapsed = performance.now() - this.replayStartTime;

    while (this.replayIndex < this.replayFrames.length) {
      const frame = this.replayFrames[this.replayIndex];
      const frameTime = frame.timestamp - this.replayFrames[0].timestamp;
      if (frameTime <= elapsed) {
        this.car.x = frame.x;
        this.car.y = frame.y;
        this.car.angle = frame.angle;
        this.car.speed = frame.speed;
        this.car.gear = frame.gear;
        this.car.steerAngle = frame.steerAngle;
        this.car.isOffTrack = false;
        this.replayIndex++;
      } else {
        break;
      }
    }

    const now = performance.now();
    if (now - this.lastSpeedSampleTime >= this.speedHistorySampleRate) {
      this.speedHistory.push(Math.abs(this.car.speed));
      this.speedHistoryTimestamps.push(now);
      this.lastSpeedSampleTime = now;

      while (this.speedHistoryTimestamps.length > 0 && now - this.speedHistoryTimestamps[0] > this.speedHistoryDuration * 1000) {
        this.speedHistory.shift();
        this.speedHistoryTimestamps.shift();
      }
    }

    if (this.replayIndex >= this.replayFrames.length) {
      this.isReplaying = false;
      if (this.onReplayFinish) this.onReplayFinish();
    }
  }

  private computeGear(speed: number): number {
    const absSpeed = Math.abs(speed);
    if (absSpeed < 1) return 0;
    if (absSpeed < 40) return 1;
    if (absSpeed < 80) return 2;
    if (absSpeed < 130) return 3;
    if (absSpeed < 190) return 4;
    if (absSpeed < 250) return 5;
    return 6;
  }

  getSpeedKmh(): number {
    return Math.abs(this.car.speed) * 3.6;
  }

  getSpeedHistoryWithTimestamps(): { times: number[]; values: number[] } {
    return {
      times: [...this.speedHistoryTimestamps],
      values: [...this.speedHistory],
    };
  }
}
