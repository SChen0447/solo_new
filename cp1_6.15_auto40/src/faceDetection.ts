import * as faceapi from 'face-api.js'
import { FacialExpressions } from './store'

export interface FaceDetectionResult {
  expressions: FacialExpressions
  landmarks: Array<{ x: number; y: number }>
  detected: boolean
}

export class FaceDetector {
  private modelsLoaded = false
  private videoElement: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private lastDetectionTime = 0
  private smoothedExpressions: FacialExpressions = {
    mouthOpen: 0,
    leftBrowHeight: 0.5,
    rightBrowHeight: 0.5,
    mouthCurve: 0.5,
    leftEyeClosed: 0,
    rightEyeClosed: 0,
  }
  private smoothingFactor = 0.7
  private baselineDistances: {
    faceWidth: number
    mouthClosedDistance: number
  } | null = null

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = 320
    this.canvas.height = 240
    this.ctx = this.canvas.getContext('2d')
  }

  async loadModels(): Promise<boolean> {
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model'
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ])
      
      this.modelsLoaded = true
      return true
    } catch (error) {
      console.warn('Failed to load face-api models, using simulated mode:', error)
      return false
    }
  }

  async startCamera(): Promise<HTMLVideoElement | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      })
      
      this.videoElement = document.createElement('video')
      this.videoElement.srcObject = stream
      this.videoElement.autoplay = true
      this.videoElement.playsInline = true
      this.videoElement.muted = true
      this.videoElement.width = 320
      this.videoElement.height = 240
      
      await new Promise<void>((resolve) => {
        this.videoElement!.onloadedmetadata = () => resolve()
      })
      
      return this.videoElement
    } catch (error) {
      console.warn('Camera access denied, using simulated mode:', error)
      return null
    }
  }

  private calculateDistance(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }

  private smoothValue(current: number, target: number): number {
    return current + (target - current) * this.smoothingFactor
  }

  private extractExpressions(
    landmarks: faceapi.FaceLandmarks68
  ): FacialExpressions {
    const points = landmarks.positions

    const leftEyeTop = points[37]
    const leftEyeBottom = points[41]
    const rightEyeTop = points[43]
    const rightEyeBottom = points[47]
    const mouthTop = points[62]
    const mouthBottom = points[66]
    const mouthLeftCorner = points[48]
    const mouthRightCorner = points[54]
    const mouthTopCenter = points[51]
    const leftBrowInner = points[21]
    const leftBrowOuter = points[19]
    const rightBrowInner = points[22]
    const rightBrowOuter = points[24]
    const eyeOuterLeft = points[36]
    const eyeOuterRight = points[45]

    const faceWidth = this.calculateDistance(eyeOuterLeft, eyeOuterRight)
    
    if (!this.baselineDistances) {
      this.baselineDistances = {
        faceWidth,
        mouthClosedDistance: this.calculateDistance(mouthTop, mouthBottom)
      }
    }

    const mouthOpenDist = this.calculateDistance(mouthTop, mouthBottom)
    const mouthOpen = Math.min(1, Math.max(0, 
      (mouthOpenDist - this.baselineDistances.mouthClosedDistance) / (faceWidth * 0.3)
    ))

    const leftEyeDist = this.calculateDistance(leftEyeTop, leftEyeBottom)
    const rightEyeDist = this.calculateDistance(rightEyeTop, rightEyeBottom)
    const eyeRefDist = faceWidth * 0.08
    const leftEyeClosed = Math.min(1, Math.max(0, 1 - leftEyeDist / eyeRefDist))
    const rightEyeClosed = Math.min(1, Math.max(0, 1 - rightEyeDist / eyeRefDist))

    const leftBrowAvg = (leftBrowInner.y + leftBrowOuter.y) / 2
    const rightBrowAvg = (rightBrowInner.y + rightBrowOuter.y) / 2
    const leftEyeY = (leftEyeTop.y + leftEyeBottom.y) / 2
    const rightEyeY = (rightEyeTop.y + rightEyeBottom.y) / 2
    
    const browRefDist = faceWidth * 0.2
    const leftBrowHeight = Math.min(1, Math.max(0, 
      0.5 + (leftEyeY - leftBrowAvg) / browRefDist
    ))
    const rightBrowHeight = Math.min(1, Math.max(0, 
      0.5 + (rightEyeY - rightBrowAvg) / browRefDist
    ))

    const mouthCenterY = (mouthLeftCorner.y + mouthRightCorner.y) / 2
    const mouthHeightDiff = mouthTopCenter.y - mouthCenterY
    const curveRefDist = faceWidth * 0.08
    const mouthCurve = Math.min(1, Math.max(0, 
      0.5 + mouthHeightDiff / curveRefDist
    ))

    return {
      mouthOpen,
      leftBrowHeight,
      rightBrowHeight,
      mouthCurve,
      leftEyeClosed,
      rightEyeClosed,
    }
  }

  async detect(): Promise<FaceDetectionResult> {
    const now = performance.now()
    
    if (!this.videoElement || this.videoElement.readyState < 2) {
      return {
        expressions: this.generateSimulatedExpressions(),
        landmarks: [],
        detected: false
      }
    }

    if (now - this.lastDetectionTime < 12) {
      return {
        expressions: { ...this.smoothedExpressions },
        landmarks: [],
        detected: true
      }
    }

    this.lastDetectionTime = now

    try {
      if (!this.ctx) {
        return this.getSimulatedResult()
      }

      this.ctx.drawImage(this.videoElement, 0, 0, this.canvas!.width, this.canvas!.height)
      
      const detection = await faceapi
        .detectSingleFace(
          this.canvas!,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.4
          })
        )
        .withFaceLandmarks()
        .withFaceExpressions()

      if (detection) {
        const rawExpressions = this.extractExpressions(detection.landmarks)
        
        this.smoothedExpressions = {
          mouthOpen: this.smoothValue(this.smoothedExpressions.mouthOpen, rawExpressions.mouthOpen),
          leftBrowHeight: this.smoothValue(this.smoothedExpressions.leftBrowHeight, rawExpressions.leftBrowHeight),
          rightBrowHeight: this.smoothValue(this.smoothedExpressions.rightBrowHeight, rawExpressions.rightBrowHeight),
          mouthCurve: this.smoothValue(this.smoothedExpressions.mouthCurve, rawExpressions.mouthCurve),
          leftEyeClosed: this.smoothValue(this.smoothedExpressions.leftEyeClosed, rawExpressions.leftEyeClosed),
          rightEyeClosed: this.smoothValue(this.smoothedExpressions.rightEyeClosed, rawExpressions.rightEyeClosed),
        }

        const landmarks = detection.landmarks.positions.map(p => ({
          x: p.x / (this.canvas?.width || 320),
          y: p.y / (this.canvas?.height || 240)
        }))

        return {
          expressions: { ...this.smoothedExpressions },
          landmarks,
          detected: true
        }
      }
    } catch (error) {
      // Fall through to simulated result
    }

    return this.getSimulatedResult()
  }

  private simulateTime = 0

  private generateSimulatedExpressions(): FacialExpressions {
    this.simulateTime += 0.016
    
    return {
      mouthOpen: (Math.sin(this.simulateTime * 2) + 1) / 2 * 0.8,
      leftBrowHeight: 0.5 + Math.sin(this.simulateTime * 1.5) * 0.3,
      rightBrowHeight: 0.5 + Math.sin(this.simulateTime * 1.5 + 0.2) * 0.3,
      mouthCurve: 0.5 + Math.sin(this.simulateTime * 1.2) * 0.3,
      leftEyeClosed: Math.max(0, Math.sin(this.simulateTime * 3) * 0.6),
      rightEyeClosed: Math.max(0, Math.sin(this.simulateTime * 3 + 0.1) * 0.6),
    }
  }

  private getSimulatedResult(): FaceDetectionResult {
    return {
      expressions: this.generateSimulatedExpressions(),
      landmarks: [],
      detected: false
    }
  }

  stop(): void {
    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      this.videoElement.srcObject = null
    }
  }
}
