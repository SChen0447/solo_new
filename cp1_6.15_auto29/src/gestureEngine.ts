import { Hands, Results, NormalizedLandmark } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import { HAND_CONNECTIONS } from '@mediapipe/hands'

export type GestureType = 'enter-control' | 'exit-control' | 'rotate' | 'pinch' | 'none'

export interface GestureEvent {
  type: GestureType
  palmX: number
  palmY: number
  pinchDistance: number
  timestamp: number
}

type GestureListener = (event: GestureEvent) => void

interface FingersState {
  thumb: boolean
  index: boolean
  middle: boolean
  ring: boolean
  pinky: boolean
}

export class GestureEngine {
  private hands: Hands | null = null
  private camera: Camera | null = null
  private videoElement: HTMLVideoElement | null = null
  private canvasElement: HTMLCanvasElement | null = null
  private canvasCtx: CanvasRenderingContext2D | null = null
  private listeners: Set<GestureListener> = new Set()
  private isInitialized = false
  private isRunning = false

  private openPalmStartTime: number = 0
  private closedFistStartTime: number = 0
  private fiveFingerOpenStartTime: number = 0
  private lastGesture: GestureType = 'none'
  private isControlling: boolean = false

  private basePinchDistance: number = 0.1
  private lastPalmX: number = 0.5
  private lastPalmY: number = 0.5
  private lastPinchDistance: number = 0

  async init(videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement): Promise<boolean> {
    if (this.isInitialized) return true

    try {
      this.videoElement = videoEl
      this.canvasElement = canvasEl
      this.canvasCtx = canvasEl.getContext('2d')

      this.hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
      })

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      })

      this.hands.onResults(this.onResults.bind(this))

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.hands && this.isRunning) {
            await this.hands.send({ image: this.videoElement! })
          }
        },
        width: 640,
        height: 480,
      })

      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Gesture engine init failed:', error)
      return false
    }
  }

  async start(): Promise<boolean> {
    if (!this.isInitialized || !this.camera) return false
    this.isRunning = true
    if (this.videoElement) this.videoElement.style.display = 'block'
    if (this.canvasElement) this.canvasElement.style.display = 'block'
    try {
      await this.camera.start()
      return true
    } catch (error) {
      console.error('Camera start failed:', error)
      return false
    }
  }

  stop(): void {
    this.isRunning = false
    if (this.camera) this.camera.stop()
    if (this.videoElement) this.videoElement.style.display = 'none'
    if (this.canvasElement) this.canvasElement.style.display = 'none'
    this.isControlling = false
    this.emit({
      type: 'exit-control',
      palmX: 0.5,
      palmY: 0.5,
      pinchDistance: 0,
      timestamp: Date.now(),
    })
  }

  addListener(listener: GestureListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: GestureEvent): void {
    this.listeners.forEach((fn) => fn(event))
  }

  private onResults(results: Results): void {
    if (!this.canvasCtx || !this.canvasElement) return

    this.canvasCtx.save()
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)
    this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height)

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0]

      this.drawLandmarks(landmarks)
      this.analyzeGesture(landmarks)
    } else {
      this.openPalmStartTime = 0
      this.closedFistStartTime = 0
      this.fiveFingerOpenStartTime = 0
    }

    this.canvasCtx.restore()
  }

  private drawLandmarks(landmarks: NormalizedLandmark[]): void {
    if (!this.canvasCtx) return
    drawConnectors(this.canvasCtx, landmarks, HAND_CONNECTIONS, {
      color: this.isControlling ? '#00ccff' : '#ffffff',
      lineWidth: 2,
    })
    drawLandmarks(this.canvasCtx, landmarks, {
      color: '#ff0080',
      lineWidth: 1,
      radius: 3,
    })
  }

  private analyzeGesture(landmarks: NormalizedLandmark[]): void {
    const fingers = this.detectFingers(landmarks)
    const palm = this.calculatePalmCenter(landmarks)
    const pinchDist = this.calculatePinchDistance(landmarks)
    const now = Date.now()

    const allFingersOpen = fingers.thumb && fingers.index && fingers.middle && fingers.ring && fingers.pinky
    const allFingersClosed = !fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky
    const indexThumbOnly = !fingers.middle && !fingers.ring && !fingers.pinky && fingers.thumb && fingers.index

    const smoothedPalmX = this.lastPalmX * 0.7 + palm.x * 0.3
    const smoothedPalmY = this.lastPalmY * 0.7 + palm.y * 0.3
    const smoothedPinch = this.lastPinchDistance * 0.7 + pinchDist * 0.3

    this.lastPalmX = smoothedPalmX
    this.lastPalmY = smoothedPalmY
    this.lastPinchDistance = smoothedPinch

    if (!this.isControlling) {
      if (allFingersClosed) {
        if (this.closedFistStartTime === 0) this.closedFistStartTime = now
        this.fiveFingerOpenStartTime = 0
      } else if (allFingersOpen && this.closedFistStartTime > 0 && now - this.closedFistStartTime > 200) {
        if (this.openPalmStartTime === 0) this.openPalmStartTime = now
        if (now - this.openPalmStartTime > 150) {
          this.isControlling = true
          this.basePinchDistance = pinchDist || 0.1
          this.closedFistStartTime = 0
          this.openPalmStartTime = 0
          this.lastGesture = 'enter-control'
          this.emit({
            type: 'enter-control',
            palmX: smoothedPalmX,
            palmY: smoothedPalmY,
            pinchDistance: smoothedPinch,
            timestamp: now,
          })
        }
      } else {
        this.closedFistStartTime = 0
        this.openPalmStartTime = 0
      }
    } else {
      if (allFingersOpen) {
        if (this.fiveFingerOpenStartTime === 0) this.fiveFingerOpenStartTime = now
        if (now - this.fiveFingerOpenStartTime > 2000) {
          this.isControlling = false
          this.fiveFingerOpenStartTime = 0
          this.lastGesture = 'exit-control'
          this.emit({
            type: 'exit-control',
            palmX: smoothedPalmX,
            palmY: smoothedPalmY,
            pinchDistance: smoothedPinch,
            timestamp: now,
          })
          return
        }
      } else {
        this.fiveFingerOpenStartTime = 0
      }

      if (indexThumbOnly && pinchDist < this.basePinchDistance * 1.5) {
        this.lastGesture = 'pinch'
        this.emit({
          type: 'pinch',
          palmX: smoothedPalmX,
          palmY: smoothedPalmY,
          pinchDistance: smoothedPinch,
          timestamp: now,
        })
      } else {
        this.lastGesture = 'rotate'
        this.emit({
          type: 'rotate',
          palmX: smoothedPalmX,
          palmY: smoothedPalmY,
          pinchDistance: smoothedPinch,
          timestamp: now,
        })
      }
    }
  }

  private detectFingers(lm: NormalizedLandmark[]): FingersState {
    const isFingerExtended = (tipIdx: number, pipIdx: number, mcpIdx: number, isThumb = false) => {
      if (isThumb) {
        return lm[tipIdx].x < lm[pipIdx].x
      }
      return lm[tipIdx].y < lm[pipIdx].y && lm[pipIdx].y < lm[mcpIdx].y
    }

    return {
      thumb: isFingerExtended(4, 3, 2, true),
      index: isFingerExtended(8, 6, 5),
      middle: isFingerExtended(12, 10, 9),
      ring: isFingerExtended(16, 14, 13),
      pinky: isFingerExtended(20, 18, 17),
    }
  }

  private calculatePalmCenter(lm: NormalizedLandmark[]): { x: number; y: number } {
    const points = [0, 5, 9, 13, 17]
    let sx = 0, sy = 0
    for (const i of points) {
      sx += lm[i].x
      sy += lm[i].y
    }
    return { x: sx / points.length, y: sy / points.length }
  }

  private calculatePinchDistance(lm: NormalizedLandmark[]): number {
    const thumb = lm[4]
    const index = lm[8]
    const dx = thumb.x - index.x
    const dy = thumb.y - index.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  isControlActive(): boolean {
    return this.isControlling
  }

  getLastGesture(): GestureType {
    return this.lastGesture
  }
}
