import { Hands, Results, NormalizedLandmark } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'

export interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface HandData {
  landmarks: HandLandmark[]
  palmPosition: HandLandmark
  thumbTip: HandLandmark
  indexTip: HandLandmark
  middleTip: HandLandmark
  ringTip: HandLandmark
  pinkyTip: HandLandmark
  thumbMcp: HandLandmark
  indexMcp: HandLandmark
  middleMcp: HandLandmark
  ringMcp: HandLandmark
  pinkyMcp: HandLandmark
  isFist: boolean
  isOpen: boolean
  isPinching: boolean
  pinchStrength: number
  timestamp: number
}

type HandDataCallback = (handData: HandData | null) => void

const MEDIAPIPE_LANDMARK_INDICES = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20
}

export class HandTracker {
  private videoElement: HTMLVideoElement
  private hands: Hands | null = null
  private camera: Camera | null = null
  private callback: HandDataCallback | null = null
  private isInitialized: boolean = false
  private lastProcessTime: number = 0
  private minProcessInterval: number = 16
  private frameCount: number = 0
  private fps: number = 0

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        }
      })

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      this.hands.onResults(this.handleResults.bind(this))

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          const now = performance.now()
          if (now - this.lastProcessTime >= this.minProcessInterval && this.hands) {
            this.lastProcessTime = now
            await this.hands.send({ image: this.videoElement })
            this.frameCount++
          }
        },
        width: 640,
        height: 480
      })

      await this.camera.start()
      this.isInitialized = true

      setInterval(() => {
        this.fps = this.frameCount
        this.frameCount = 0
        if (this.fps > 0) {
          console.debug(`Hand tracking FPS: ${this.fps}`)
        }
      }, 1000)

    } catch (error) {
      console.error('Failed to initialize HandTracker:', error)
      throw error
    }
  }

  private handleResults(results: Results): void {
    if (!this.callback) return

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.callback(null)
      return
    }

    const landmarks = results.multiHandLandmarks[0]
    const handData = this.processLandmarks(landmarks)
    this.callback(handData)
  }

  private processLandmarks(landmarks: NormalizedLandmark[]): HandData {
    const convertedLandmarks: HandLandmark[] = landmarks.map(lm => ({
      x: lm.x,
      y: lm.y,
      z: lm.z || 0
    }))

    const palmPosition = this.calculatePalmCenter(convertedLandmarks)
    const thumbTip = convertedLandmarks[MEDIAPIPE_LANDMARK_INDICES.THUMB_TIP]
    const indexTip = convertedLandmarks[MEDIAPIPE_LANDMARK_INDICES.INDEX_TIP]
    const middleTip = convertedLandmarks[MEDIAPIPE_LANDMARK_INDICES.MIDDLE_TIP]
    const ringTip = convertedLandmarks[MEDIAPIPE_LANDMARK_INDICES.RING_TIP]
    const pinkyTip = convertedLandmarks[MEDIAPIPE_LANDMARK_INDICES.PINKY_TIP]
    
    const thumbMcp = convertedLandmarks[MEDIAPIPE_LANDMARK_INDICES.THUMB_MCP]
    const indexMcp = convertedLandmarks[MEDIAPIPE_LANDMARK_INDICES.INDEX_MCP]
    const middleMcp = convertedLandmarks[MEDIAPIPE_LANDMARK_INDICES.MIDDLE_MCP]
    const ringMcp = convertedLandmarks[MEDIAPIPE_LANDMARK_INDICES.RING_MCP]
    const pinkyMcp = convertedLandmarks[MEDIAPIPE_LANDMARK_INDICES.PINKY_MCP]

    const isFist = this.detectFist(convertedLandmarks)
    const isOpen = this.detectOpenHand(convertedLandmarks)
    const { isPinching, strength } = this.detectPinch(thumbTip, indexTip, palmPosition)

    return {
      landmarks: convertedLandmarks,
      palmPosition,
      thumbTip,
      indexTip,
      middleTip,
      ringTip,
      pinkyTip,
      thumbMcp,
      indexMcp,
      middleMcp,
      ringMcp,
      pinkyMcp,
      isFist,
      isOpen,
      isPinching,
      pinchStrength: strength,
      timestamp: performance.now()
    }
  }

  private calculatePalmCenter(landmarks: HandLandmark[]): HandLandmark {
    const wrist = landmarks[MEDIAPIPE_LANDMARK_INDICES.WRIST]
    const middleMcp = landmarks[MEDIAPIPE_LANDMARK_INDICES.MIDDLE_MCP]
    const indexMcp = landmarks[MEDIAPIPE_LANDMARK_INDICES.INDEX_MCP]
    const ringMcp = landmarks[MEDIAPIPE_LANDMARK_INDICES.RING_MCP]

    return {
      x: (wrist.x + middleMcp.x + indexMcp.x + ringMcp.x) / 4,
      y: (wrist.y + middleMcp.y + indexMcp.y + ringMcp.y) / 4,
      z: (wrist.z + middleMcp.z + indexMcp.z + ringMcp.z) / 4
    }
  }

  private detectFist(landmarks: HandLandmark[]): boolean {
    const fingerTips = [
      MEDIAPIPE_LANDMARK_INDICES.INDEX_TIP,
      MEDIAPIPE_LANDMARK_INDICES.MIDDLE_TIP,
      MEDIAPIPE_LANDMARK_INDICES.RING_TIP,
      MEDIAPIPE_LANDMARK_INDICES.PINKY_TIP
    ]

    const fingerPips = [
      MEDIAPIPE_LANDMARK_INDICES.INDEX_PIP,
      MEDIAPIPE_LANDMARK_INDICES.MIDDLE_PIP,
      MEDIAPIPE_LANDMARK_INDICES.RING_PIP,
      MEDIAPIPE_LANDMARK_INDICES.PINKY_PIP
    ]

    const palmCenter = this.calculatePalmCenter(landmarks)
    let curledCount = 0

    for (let i = 0; i < fingerTips.length; i++) {
      const tip = landmarks[fingerTips[i]]
      const pip = landmarks[fingerPips[i]]
      
      const tipToPalm = this.getDistance(tip, palmCenter)
      const pipToPalm = this.getDistance(pip, palmCenter)
      
      if (tipToPalm < pipToPalm * 1.1) {
        curledCount++
      }
    }

    const thumbTip = landmarks[MEDIAPIPE_LANDMARK_INDICES.THUMB_TIP]
    const indexMcp = landmarks[MEDIAPIPE_LANDMARK_INDICES.INDEX_MCP]
    const thumbToIndex = this.getDistance(thumbTip, indexMcp)
    
    if (thumbToIndex < 0.15) {
      curledCount++
    }

    return curledCount >= 4
  }

  private detectOpenHand(landmarks: HandLandmark[]): boolean {
    const fingerTips = [
      MEDIAPIPE_LANDMARK_INDICES.THUMB_TIP,
      MEDIAPIPE_LANDMARK_INDICES.INDEX_TIP,
      MEDIAPIPE_LANDMARK_INDICES.MIDDLE_TIP,
      MEDIAPIPE_LANDMARK_INDICES.RING_TIP,
      MEDIAPIPE_LANDMARK_INDICES.PINKY_TIP
    ]

    const fingerMcps = [
      MEDIAPIPE_LANDMARK_INDICES.THUMB_MCP,
      MEDIAPIPE_LANDMARK_INDICES.INDEX_MCP,
      MEDIAPIPE_LANDMARK_INDICES.MIDDLE_MCP,
      MEDIAPIPE_LANDMARK_INDICES.RING_MCP,
      MEDIAPIPE_LANDMARK_INDICES.PINKY_MCP
    ]

    const palmCenter = this.calculatePalmCenter(landmarks)
    let extendedCount = 0

    for (let i = 0; i < fingerTips.length; i++) {
      const tip = landmarks[fingerTips[i]]
      const mcp = landmarks[fingerMcps[i]]
      
      const tipToPalm = this.getDistance(tip, palmCenter)
      const mcpToPalm = this.getDistance(mcp, palmCenter)
      
      if (tipToPalm > mcpToPalm * 1.3) {
        extendedCount++
      }
    }

    return extendedCount >= 4
  }

  private detectPinch(
    thumbTip: HandLandmark,
    indexTip: HandLandmark,
    palmCenter: HandLandmark
  ): { isPinching: boolean; strength: number } {
    const pinchDistance = this.getDistance(thumbTip, indexTip)
    const handScale = this.getDistance(
      palmCenter,
      { x: palmCenter.x, y: palmCenter.y - 0.2, z: palmCenter.z }
    )
    
    const normalizedDistance = pinchDistance / 0.15
    const strength = Math.max(0, Math.min(1, 1 - normalizedDistance))
    
    return {
      isPinching: pinchDistance < 0.08,
      strength
    }
  }

  private getDistance(a: HandLandmark, b: HandLandmark): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = a.z - b.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  public onHandData(callback: HandDataCallback): void {
    this.callback = callback
  }

  public getFPS(): number {
    return this.fps
  }

  public destroy(): void {
    if (this.camera) {
      this.camera.stop()
      this.camera = null
    }
    if (this.hands) {
      this.hands.close()
      this.hands = null
    }
    this.isInitialized = false
    this.callback = null
  }
}
