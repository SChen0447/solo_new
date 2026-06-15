import { Hands, Results, NormalizedLandmark } from '@mediapipe/hands';
import { useGameStore, type GestureType } from '../store/gameStore';

export interface HandLandmarks {
  wrist: NormalizedLandmark;
  thumbCMC: NormalizedLandmark;
  thumbMCP: NormalizedLandmark;
  thumbIP: NormalizedLandmark;
  thumbTIP: NormalizedLandmark;
  indexMCP: NormalizedLandmark;
  indexPIP: NormalizedLandmark;
  indexDIP: NormalizedLandmark;
  indexTIP: NormalizedLandmark;
  middleMCP: NormalizedLandmark;
  middlePIP: NormalizedLandmark;
  middleDIP: NormalizedLandmark;
  middleTIP: NormalizedLandmark;
  ringMCP: NormalizedLandmark;
  ringPIP: NormalizedLandmark;
  ringDIP: NormalizedLandmark;
  ringTIP: NormalizedLandmark;
  pinkyMCP: NormalizedLandmark;
  pinkyPIP: NormalizedLandmark;
  pinkyDIP: NormalizedLandmark;
  pinkyTIP: NormalizedLandmark;
}

const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_DIP = 11;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_DIP = 15;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_DIP = 19;
const PINKY_TIP = 20;

const CALIBRATION_FRAMES_REQUIRED = 80;
const HAND_LOST_TIMEOUT = 5000;
const SWIPE_SPEED_THRESHOLD = 200;
const CIRCLE_SAMPLE_WINDOW = 60;
const CIRCLE_COMPLETION_THRESHOLD = 0.8;
const CIRCLE_MIN_RADIUS = 0.05;
const CIRCLE_MAX_RADIUS = 0.35;

export class HandTracker {
  private hands: Hands | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private animationFrameId: number | null = null;
  private running: boolean = false;
  private cameraStream: MediaStream | null = null;

  private lastWristPosition: { x: number; y: number; timestamp: number } | null = null;
  private wristVelocity = 0;

  private circleTrail: { x: number; y: number; timestamp: number }[] = [];
  private circleAngles: number[] = [];
  private circleStartAngle: number | null = null;
  private circleTotalRotation: number = 0;

  private lastFrameTime = 0;
  private handDetectedTime = 0;
  private handLostDetectedTime = 0;
  private isHandDetected = false;

  async init(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement | null = null) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;

    try {
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      this.hands.onResults(this.onResults.bind(this));

      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      this.videoElement.srcObject = this.cameraStream;
      this.videoElement.play();

      return true;
    } catch (error) {
      console.warn('MediaPipe Hands 初始化失败，启用模拟手势模式:', error);
      return false;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.processLoop();
  }

  stop() {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((t) => t.stop());
      this.cameraStream = null;
    }
  }

  private async processLoop() {
    if (!this.running) return;

    const now = performance.now();

    if (this.videoElement && this.videoElement.readyState >= 2 && this.hands) {
      try {
        await this.hands.send({ image: this.videoElement });
      } catch (e) {
      }
    } else {
      this.simulateGesture();
    }

    if (now - this.lastFrameTime > 16) {
      this.checkHandLost(now);
      this.lastFrameTime = now;
    }

    this.animationFrameId = requestAnimationFrame(() => this.processLoop());
  }

  private onResults(results: Results) {
    const now = performance.now();

    if (this.canvasElement && this.videoElement) {
      this.drawOverlay(results);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      this.isHandDetected = true;
      this.handDetectedTime = now;
      this.handLostDetectedTime = 0;

      this.processCalibration(now);
      this.analyzeLandmarks(landmarks, now);
    } else {
      this.isHandDetected = false;
      if (this.handLostDetectedTime === 0) {
        this.handLostDetectedTime = now;
      }
      useGameStore.getState().setGesture('none', 0);
    }
  }

  private simulateGesture() {
    const now = performance.now();

    this.processCalibration(now);

    const state = useGameStore.getState();
    if (state.phase !== 'playing') return;

    const t = now / 1000;
    const cycle = t % 12;

    let gesture: GestureType = 'none';
    let confidence = 0;

    if (cycle < 3) {
      gesture = 'fist';
      confidence = 0.95;
    } else if (cycle < 6) {
      gesture = 'open';
      confidence = 0.92;
    } else if (cycle < 9) {
      gesture = 'circle';
      confidence = 0.88;
    } else {
      gesture = 'none';
      confidence = 0.3;
    }

    useGameStore.getState().setGesture(gesture, confidence);
  }

  private processCalibration(now: number) {
    const state = useGameStore.getState();

    if (state.phase === 'calibration') {
      if (this.isHandDetected) {
        useGameStore.getState().incrementCalibrationFrames();
        if (useGameStore.getState().calibrationFrames >= CALIBRATION_FRAMES_REQUIRED) {
          useGameStore.getState().setPhase('playing');
          useGameStore.getState().setAILastCastTime(performance.now());
        }
      }
    } else if (state.phase === 'playing') {
    }
  }

  private checkHandLost(now: number) {
    const state = useGameStore.getState();

    if (!this.isHandDetected && this.handLostDetectedTime > 0) {
      const elapsed = now - this.handLostDetectedTime;
      useGameStore.getState().setHandLostTime(elapsed);

      if (elapsed > HAND_LOST_TIMEOUT && state.phase === 'playing') {
        useGameStore.getState().setPhase('calibration');
        useGameStore.getState().resetCalibrationFrames();
        this.clearCircleData();
      }
    } else {
      useGameStore.getState().setHandLostTime(0);
    }
  }

  private analyzeLandmarks(landmarks: NormalizedLandmark[], now: number) {
    const state = useGameStore.getState();

    const wrist = landmarks[WRIST];
    const indexTip = landmarks[INDEX_TIP];
    const middleTip = landmarks[MIDDLE_TIP];
    const ringTip = landmarks[RING_TIP];
    const pinkyTip = landmarks[PINKY_TIP];
    const thumbTip = landmarks[THUMB_TIP];

    const indexMCP = landmarks[INDEX_MCP];
    const middleMCP = landmarks[MIDDLE_MCP];
    const indexPIP = landmarks[INDEX_PIP];
    const middlePIP = landmarks[MIDDLE_PIP];
    const ringPIP = landmarks[RING_PIP];
    const pinkyPIP = landmarks[PINKY_PIP];

    this.updateWristVelocity(wrist, now);

    const indexExtended = this.isFingerExtended(indexTip, indexPIP, indexMCP, wrist);
    const middleExtended = this.isFingerExtended(middleTip, middlePIP, middleMCP, wrist);
    const ringExtended = this.isFingerExtended(ringTip, ringPIP, middleMCP, wrist);
    const pinkyExtended = this.isFingerExtended(pinkyTip, pinkyPIP, landmarks[PINKY_MCP], wrist);

    const fingersExtended = [indexExtended, middleExtended, ringExtended, pinkyExtended];
    const extendedCount = fingersExtended.filter(Boolean).length;

    const palmSize = this.distance(wrist, middleMCP);
    const avgTipToWrist =
      (this.distance(indexTip, wrist) +
        this.distance(middleTip, wrist) +
        this.distance(ringTip, wrist) +
        this.distance(pinkyTip, wrist)) /
      4;
    const fistRatio = avgTipToWrist / (palmSize + 0.0001);

    let gesture: GestureType = 'none';
    let confidence = 0;

    const isCircle = this.detectCircleGesture(indexTip, now);
    if (isCircle) {
      gesture = 'circle';
      confidence = this.circleConfidence();
    } else if (this.wristVelocity > SWIPE_SPEED_THRESHOLD) {
      gesture = 'swipe';
      confidence = Math.min(0.95, 0.7 + (this.wristVelocity - SWIPE_SPEED_THRESHOLD) / 1000);
    } else if (extendedCount === 0 && fistRatio < 1.1) {
      gesture = 'fist';
      confidence = Math.min(0.98, 0.6 + (1.1 - fistRatio) * 0.8);
    } else if (extendedCount >= 3) {
      gesture = 'open';
      confidence = Math.min(0.95, 0.6 + extendedCount * 0.08);
    } else {
      gesture = 'none';
      confidence = 0.3;
    }

    if (!isCircle) {
      this.updateCircleTrail(indexTip, now);
    }

    useGameStore.getState().setGesture(gesture, confidence);
  }

  private updateWristVelocity(wrist: NormalizedLandmark, now: number) {
    const videoWidth = this.videoElement?.videoWidth || 640;
    const videoHeight = this.videoElement?.videoHeight || 480;

    const currentX = wrist.x * videoWidth;
    const currentY = wrist.y * videoHeight;

    if (this.lastWristPosition) {
      const dt = (now - this.lastWristPosition.timestamp) / 1000;
      if (dt > 0) {
        const dx = currentX - this.lastWristPosition.x;
        const dy = currentY - this.lastWristPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = distance / dt;
        this.wristVelocity = this.wristVelocity * 0.7 + speed * 0.3;
      }
    }

    this.lastWristPosition = { x: currentX, y: currentY, timestamp: now };
  }

  private distance(a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private isFingerExtended(
    tip: NormalizedLandmark,
    pip: NormalizedLandmark,
    mcp: NormalizedLandmark,
    wrist: NormalizedLandmark
  ): boolean {
    const tipToWrist = this.distance(tip, wrist);
    const pipToWrist = this.distance(pip, wrist);
    const mcpToWrist = this.distance(mcp, wrist);

    return tipToWrist > pipToWrist && pipToWrist > mcpToWrist * 0.9;
  }

  private updateCircleTrail(tip: NormalizedLandmark, now: number) {
    this.circleTrail.push({ x: tip.x, y: tip.y, timestamp: now });

    const cutoff = now - CIRCLE_SAMPLE_WINDOW * 16;
    while (this.circleTrail.length > 0 && this.circleTrail[0].timestamp < cutoff) {
      this.circleTrail.shift();
    }

    if (this.circleTrail.length >= 3) {
      this.updateCircleAngles();
    }
  }

  private updateCircleAngles() {
    if (this.circleTrail.length < 5) return;

    let cx = 0;
    let cy = 0;
    for (const p of this.circleTrail) {
      cx += p.x;
      cy += p.y;
    }
    cx /= this.circleTrail.length;
    cy /= this.circleTrail.length;

    this.circleAngles = this.circleTrail.map((p) => Math.atan2(p.y - cy, p.x - cx));

    if (this.circleAngles.length >= 2) {
      let totalRotation = 0;
      for (let i = 1; i < this.circleAngles.length; i++) {
        let delta = this.circleAngles[i] - this.circleAngles[i - 1];
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        totalRotation += delta;
      }
      this.circleTotalRotation = totalRotation;

      if (this.circleStartAngle === null && Math.abs(totalRotation) > 0.3) {
        this.circleStartAngle = this.circleAngles[0];
      }
    }
  }

  private detectCircleGesture(tip: NormalizedLandmark, now: number): boolean {
    if (this.circleTrail.length < 20) return false;

    let cx = 0;
    let cy = 0;
    for (const p of this.circleTrail) {
      cx += p.x;
      cy += p.y;
    }
    cx /= this.circleTrail.length;
    cy /= this.circleTrail.length;

    const distances = this.circleTrail.map((p) => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
    const avgRadius = distances.reduce((a, b) => a + b, 0) / distances.length;
    const radiusVariance =
      distances.reduce((sum, d) => sum + (d - avgRadius) ** 2, 0) / distances.length;
    const radiusStd = Math.sqrt(radiusVariance);
    const radiusUniformity = avgRadius > 0 ? 1 - radiusStd / avgRadius : 0;

    const isClockwise = this.circleTotalRotation < 0;
    const rotationComplete = Math.abs(this.circleTotalRotation) >= 2 * Math.PI * CIRCLE_COMPLETION_THRESHOLD;

    const validRadius = avgRadius >= CIRCLE_MIN_RADIUS && avgRadius <= CIRCLE_MAX_RADIUS;

    const pathClosed =
      this.circleTrail.length >= 2 &&
      Math.sqrt(
        (this.circleTrail[0].x - this.circleTrail[this.circleTrail.length - 1].x) ** 2 +
          (this.circleTrail[0].y - this.circleTrail[this.circleTrail.length - 1].y) ** 2
      ) < avgRadius * 0.8;

    const result =
      isClockwise &&
      rotationComplete &&
      validRadius &&
      radiusUniformity > 0.5 &&
      pathClosed;

    if (result) {
      this.clearCircleData();
    }

    return result;
  }

  private circleConfidence(): number {
    const rotationRatio = Math.min(1, Math.abs(this.circleTotalRotation) / (2 * Math.PI));
    return 0.65 + rotationRatio * 0.3;
  }

  private clearCircleData() {
    this.circleTrail = [];
    this.circleAngles = [];
    this.circleStartAngle = null;
    this.circleTotalRotation = 0;
  }

  private drawOverlay(results: Results) {
    if (!this.canvasElement || !this.videoElement) return;

    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return;

    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const landmarks of results.multiHandLandmarks) {
        const connections = [
          [WRIST, THUMB_CMC],
          [THUMB_CMC, THUMB_MCP],
          [THUMB_MCP, THUMB_IP],
          [THUMB_IP, THUMB_TIP],
          [WRIST, INDEX_MCP],
          [INDEX_MCP, INDEX_PIP],
          [INDEX_PIP, INDEX_DIP],
          [INDEX_DIP, INDEX_TIP],
          [INDEX_MCP, MIDDLE_MCP],
          [MIDDLE_MCP, MIDDLE_PIP],
          [MIDDLE_PIP, MIDDLE_DIP],
          [MIDDLE_DIP, MIDDLE_TIP],
          [MIDDLE_MCP, RING_MCP],
          [RING_MCP, RING_PIP],
          [RING_PIP, RING_DIP],
          [RING_DIP, RING_TIP],
          [RING_MCP, PINKY_MCP],
          [PINKY_MCP, PINKY_PIP],
          [PINKY_PIP, PINKY_DIP],
          [PINKY_DIP, PINKY_TIP],
          [WRIST, PINKY_MCP],
        ];

        ctx.strokeStyle = '#00ffaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const [a, b] of connections) {
          const p1 = landmarks[a];
          const p2 = landmarks[b];
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
        }
        ctx.stroke();

        ctx.fillStyle = '#ff4466';
        for (const lm of landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }
}

export const handTracker = new HandTracker();
