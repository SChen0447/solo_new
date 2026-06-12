import { Color } from 'three'

export function colorTempToRGB(kelvin: number): { r: number; g: number; b: number } {
  const temp = kelvin / 100
  let r: number, g: number, b: number

  if (temp <= 66) {
    r = 255
  } else {
    r = temp - 60
    r = 329.698727446 * Math.pow(r, -0.1332047592)
    r = Math.max(0, Math.min(255, r))
  }

  if (temp <= 66) {
    g = temp
    g = 99.4708025861 * Math.log(g) - 161.1195681661
    g = Math.max(0, Math.min(255, g))
  } else {
    g = temp - 60
    g = 288.1221695283 * Math.pow(g, -0.0755148492)
    g = Math.max(0, Math.min(255, g))
  }

  if (temp >= 66) {
    b = 255
  } else {
    if (temp <= 19) {
      b = 0
    } else {
      b = temp - 10
      b = 138.5177312231 * Math.log(b) - 305.0447927307
      b = Math.max(0, Math.min(255, b))
    }
  }

  return { r: r / 255, g: g / 255, b: b / 255 }
}

export function colorTempToHex(kelvin: number): string {
  const { r, g, b } = colorTempToRGB(kelvin)
  return new Color(r, g, b).getHexString()
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpColor(current: Color, target: Color, t: number): void {
  current.r = lerp(current.r, target.r, t)
  current.g = lerp(current.g, target.g, t)
  current.b = lerp(current.b, target.b, t)
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

export function genId(): string {
  return `light-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
