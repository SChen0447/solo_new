export interface Room {
  id: string
  name: string
  description: string
  wallColor: string
  initialCamera: {
    x: number
    y: number
    z: number
  }
  createdAt: string
  updatedAt: string
}

export interface Artwork {
  id: string
  roomId: string
  name: string
  author: string
  year: number
  description: string
  modelFile: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: number
  createdAt: string
  updatedAt: string
}

export interface VisitLog {
  id: string
  artworkId: string
  visitorId: string
  duration: number
  timestamp: string
}

export interface VisitStats {
  views: number
  totalDuration: number
  avgDuration: number
}
