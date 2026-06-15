import type { Point, EmotionType } from '@/store/AppState'

interface EmotionResult {
  emotion: EmotionType
  confidence: number
  landmarks: Point[]
}

type FaceMeshModel = {
  estimateFaces: (input: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement) => Promise<Array<{
    scaledMesh: number[][]
    boundingBox: { topLeft: number[]; bottomRight: number[] }
  }>>
}

let modelInstance: FaceMeshModel | null = null

async function loadModel(): Promise<FaceMeshModel> {
  if (modelInstance) return modelInstance

  const tf = await import('@tensorflow/tfjs')
  await tf.ready()

  const facemesh = await import('@tensorflow-models/facemesh')
  modelInstance = await facemesh.load({
    maxFaces: 1,
    iouThreshold: 0.5,
    scoreThreshold: 0.5,
  })

  return modelInstance
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  )
}

function classifyEmotion(landmarks: number[][]): { emotion: EmotionType; confidence: number } {
  if (landmarks.length < 468) {
    return { emotion: 'neutral', confidence: 0.5 }
  }

  const leftEyeTop = landmarks[159]
  const leftEyeBottom = landmarks[145]
  const rightEyeTop = landmarks[386]
  const rightEyeBottom = landmarks[374]
  const leftEyeOpen = euclidean(leftEyeTop, leftEyeBottom)
  const rightEyeOpen = euclidean(rightEyeTop, rightEyeBottom)
  const eyeOpenness = (leftEyeOpen + rightEyeOpen) / 2

  const mouthTop = landmarks[13]
  const mouthBottom = landmarks[14]
  const mouthLeft = landmarks[61]
  const mouthRight = landmarks[291]
  const mouthOpen = euclidean(mouthTop, mouthBottom)
  const mouthWidth = euclidean(mouthLeft, mouthRight)
  const mouthRatio = mouthOpen / (mouthWidth + 0.001)

  const leftBrowInner = landmarks[107]
  const rightBrowInner = landmarks[336]
  const noseBridge = landmarks[6]
  const leftBrowHeight = euclidean(leftBrowInner, noseBridge)
  const rightBrowHeight = euclidean(rightBrowInner, noseBridge)
  const browHeight = (leftBrowHeight + rightBrowHeight) / 2

  const faceHeight = euclidean(landmarks[10], landmarks[152])
  const normalizedBrowHeight = browHeight / (faceHeight + 0.001)
  const normalizedMouthRatio = mouthRatio
  const normalizedEyeOpen = eyeOpenness / (faceHeight + 0.001)

  const scores: Record<EmotionType, number> = {
    happy: 0,
    sad: 0,
    angry: 0,
    surprised: 0,
    fear: 0,
    neutral: 0,
  }

  if (mouthRatio > 0.3 && normalizedEyeOpen > 0.03) {
    scores.surprised = 0.7 + mouthRatio * 0.3
  }

  if (mouthRatio > 0.15 && mouthRatio < 0.35 && mouthWidth > 50) {
    scores.happy = 0.5 + mouthRatio
  }

  if (normalizedBrowHeight < 0.25 && mouthRatio < 0.15) {
    scores.angry = 0.6 + (0.3 - normalizedBrowHeight) * 2
  }

  if (normalizedBrowHeight > 0.32 && mouthRatio < 0.1) {
    scores.sad = 0.5 + (normalizedBrowHeight - 0.3) * 2
  }

  if (normalizedEyeOpen > 0.035 && normalizedBrowHeight > 0.3) {
    scores.fear = 0.4 + normalizedEyeOpen * 5
  }

  const maxScore = Math.max(...Object.values(scores))
  if (maxScore < 0.2) {
    scores.neutral = 0.8
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const emotion = (Object.entries(scores) as [EmotionType, number][])
    .sort((a, b) => b[1] - a[1])[0][0]
  const confidence = Math.min(scores[emotion] / (totalScore + 0.001), 1)

  return { emotion, confidence }
}

export async function detectEmotion(
  image: HTMLImageElement
): Promise<EmotionResult> {
  const model = await loadModel()

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)

  const predictions = await model.estimateFaces(canvas)

  if (!predictions || predictions.length === 0) {
    return {
      emotion: 'neutral',
      confidence: 0.5,
      landmarks: [],
    }
  }

  const face = predictions[0]
  const meshPoints = face.scaledMesh as number[][]

  const landmarks: Point[] = meshPoints.map((p) => ({
    x: p[0],
    y: p[1],
    z: p[2],
  }))

  const { emotion, confidence } = classifyEmotion(meshPoints)

  return { emotion, confidence, landmarks }
}

export { loadModel }
