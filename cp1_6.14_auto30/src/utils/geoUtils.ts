import * as THREE from 'three'

export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number,
  mode: 'globe' | 'flat' = 'globe',
  flatWidth: number = 10,
  flatHeight: number = 5,
  progress: number = 0,
): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180
  const lonRad = (lon * Math.PI) / 180

  if (mode === 'globe') {
    const x = radius * Math.cos(latRad) * Math.cos(lonRad)
    const y = radius * Math.sin(latRad)
    const z = radius * Math.cos(latRad) * Math.sin(lonRad)
    return new THREE.Vector3(x, y, z)
  } else {
    const x = (lon / 180) * (flatWidth / 2)
    const y = (lat / 90) * (flatHeight / 2)
    const z = 0.01
    return new THREE.Vector3(x, y, z)
  }
}

export function interpolatePosition(
  lat: number,
  lon: number,
  radius: number,
  progress: number,
  flatWidth: number = 10,
  flatHeight: number = 5,
): THREE.Vector3 {
  const globePos = latLonToVector3(lat, lon, radius, 'globe')
  const flatPos = latLonToVector3(lat, lon, radius, 'flat', flatWidth, flatHeight)

  return new THREE.Vector3().lerpVectors(globePos, flatPos, progress)
}

export function getMagnitudeColor(magnitude: number): string {
  if (magnitude >= 7) return '#ff2d2d'
  if (magnitude >= 5) return '#ff8c1a'
  if (magnitude >= 3) return '#ffd93d'
  return '#6bcb77'
}

export function getMagnitudeRadius(magnitude: number): number {
  return 0.1 * Math.pow(1.8, magnitude / 2)
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
