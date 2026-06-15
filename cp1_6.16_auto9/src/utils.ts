import { Part, PartPosition } from '@/types'

export const GRID_SIZE = 32
export const HEIGHT_STEP = 8
export const SNAP_THRESHOLD = 5

export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize
}

export function snapPosition(pos: PartPosition): PartPosition {
  return {
    x: snapToGrid(pos.x),
    y: snapToGrid(pos.y, HEIGHT_STEP),
    z: snapToGrid(pos.z),
  }
}

export function distance3D(a: PartPosition, b: PartPosition): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function horizontalDistance(a: PartPosition, b: PartPosition): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function checkVerticalSnap(
  newPos: PartPosition,
  existingParts: Part[],
  partHeight: number
): PartPosition {
  let snappedY = newPos.y

  for (const part of existingParts) {
    const hDist = horizontalDistance(newPos, part.position)
    if (hDist < SNAP_THRESHOLD) {
      const topOfExisting = part.position.y + getPartHeight(part.type)
      if (Math.abs(newPos.y - topOfExisting) < SNAP_THRESHOLD + partHeight) {
        snappedY = topOfExisting
      }
    }
  }

  return { ...newPos, y: snappedY }
}

export function getPartHeight(type: Part['type']): number {
  const heights: Record<Part['type'], number> = {
    plate2x2: 8,
    brick2x4: 32,
    cube1x1: 32,
    slope: 32,
  }
  return heights[type] || 32
}

export function exportToJSON(parts: Part[]): string {
  const exportData = parts.map((part) => ({
    id: part.id,
    type: part.type,
    color: part.color,
    position: {
      x: part.position.x,
      y: part.position.y,
      z: part.position.z,
    },
  }))
  return JSON.stringify(exportData, null, 2)
}

export function downloadJSON(data: string, filename: string = 'lego-build.json'): void {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function generateId(): string {
  return `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
