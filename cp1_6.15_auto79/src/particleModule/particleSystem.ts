import * as THREE from 'three'
import type { EmotionType, StyleType, Point } from '@/store/AppState'

const EMOTION_HEX: Record<EmotionType, number> = {
  happy: 0xff6b6b,
  sad: 0x4ecdc4,
  angry: 0xff4500,
  surprised: 0xffe66d,
  fear: 0x6c5ce7,
  neutral: 0xdfe6e9,
}

const ROMANTIC_EXTRA_COLORS = [0xff9ff3, 0xf368e0, 0xff6b81, 0xc44569]
const FANTASY_COLORS = [0xff6b6b, 0x48dbfb, 0xffe66d, 0x6c5ce7, 0x4ecdc4, 0xff9ff3]

const PARTICLE_COUNT = 3000
const MINIMAL_COUNT = 1500

interface ParticleSystemConfig {
  container: HTMLDivElement
  emotion: EmotionType
  intensity: number
  style: StyleType
  faceLandmarks: Point[]
  imageWidth: number
  imageHeight: number
}

export class ParticleSystemManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private particles: THREE.Points
  private positions: Float32Array
  private velocities: Float32Array
  private sizes: Float32Array
  private alphas: Float32Array
  private colorArray: Float32Array
  private basePositions: Float32Array
  private animationId: number = 0
  private clock: THREE.Clock
  private container: HTMLDivElement
  private currentEmotion: EmotionType = 'neutral'
  private currentIntensity: number = 50
  private currentStyle: StyleType = 'minimal'
  private targetColors: Float32Array
  private currentLandmarks: Point[] = []

  constructor(config: ParticleSystemConfig) {
    this.container = config.container
    this.currentEmotion = config.emotion
    this.currentIntensity = config.intensity
    this.currentStyle = config.style
    this.currentLandmarks = config.faceLandmarks
    this.clock = new THREE.Clock()

    const width = config.container.clientWidth
    const height = config.container.clientHeight

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    this.camera.position.z = 300

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)
    config.container.appendChild(this.renderer.domElement)

    const count = config.style === 'minimal' ? MINIMAL_COUNT : PARTICLE_COUNT
    this.positions = new Float32Array(count * 3)
    this.basePositions = new Float32Array(count * 3)
    this.velocities = new Float32Array(count * 3)
    this.sizes = new Float32Array(count)
    this.alphas = new Float32Array(count)
    this.colorArray = new Float32Array(count * 3)
    this.targetColors = new Float32Array(count * 3)

    this.initParticles(count)
    this.particles = this.createPoints(count)
    this.scene.add(this.particles)

    this.animate()
  }

  private initParticles(count: number) {
    const color = new THREE.Color(EMOTION_HEX[this.currentEmotion])

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const angle = Math.random() * Math.PI * 2
      const radius = 80 + Math.random() * 120
      this.positions[i3] = Math.cos(angle) * radius
      this.positions[i3 + 1] = Math.sin(angle) * radius
      this.positions[i3 + 2] = (Math.random() - 0.5) * 50

      this.basePositions[i3] = this.positions[i3]
      this.basePositions[i3 + 1] = this.positions[i3 + 1]
      this.basePositions[i3 + 2] = this.positions[i3 + 2]

      this.velocities[i3] = (Math.random() - 0.5) * 0.5
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.5
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.2

      this.sizes[i] = 2 + Math.random() * 4
      this.alphas[i] = 0.3 + Math.random() * 0.7

      this.colorArray[i3] = color.r
      this.colorArray[i3 + 1] = color.g
      this.colorArray[i3 + 2] = color.b

      this.targetColors[i3] = color.r
      this.targetColors[i3 + 1] = color.g
      this.targetColors[i3 + 2] = color.b
    }
  }

  private getParticleColors(count: number): Float32Array {
    const colors = new Float32Array(count * 3)
    const baseColor = new THREE.Color(EMOTION_HEX[this.currentEmotion])

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      if (this.currentStyle === 'romantic') {
        const variant = ROMANTIC_EXTRA_COLORS[Math.floor(Math.random() * ROMANTIC_EXTRA_COLORS.length)]
        const c = new THREE.Color(variant)
        const blend = Math.random() * 0.5
        colors[i3] = baseColor.r * (1 - blend) + c.r * blend
        colors[i3 + 1] = baseColor.g * (1 - blend) + c.g * blend
        colors[i3 + 2] = baseColor.b * (1 - blend) + c.b * blend
      } else if (this.currentStyle === 'fantasy') {
        const c = new THREE.Color(FANTASY_COLORS[Math.floor(Math.random() * FANTASY_COLORS.length)])
        colors[i3] = c.r
        colors[i3 + 1] = c.g
        colors[i3 + 2] = c.b
      } else {
        colors[i3] = baseColor.r
        colors[i3 + 1] = baseColor.g
        colors[i3 + 2] = baseColor.b
      }
    }
    return colors
  }

  private createPoints(count: number): THREE.Points {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1))
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colorArray, 3))

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = vAlpha * smoothstep(0.5, 0.1, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    return new THREE.Points(geometry, material)
  }

  updateConfig(emotion: EmotionType, intensity: number, style: StyleType, faceLandmarks: Point[]) {
    const emotionChanged = emotion !== this.currentEmotion
    const styleChanged = style !== this.currentStyle
    this.currentEmotion = emotion
    this.currentIntensity = intensity
    this.currentStyle = style
    this.currentLandmarks = faceLandmarks

    if (emotionChanged || styleChanged) {
      const count = style === 'minimal' ? MINIMAL_COUNT : PARTICLE_COUNT
      const newColors = this.getParticleColors(count)
      this.targetColors = newColors
    }
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate)

    const time = this.clock.getElapsedTime()
    const intensityFactor = this.currentIntensity / 100
    const count = this.currentStyle === 'minimal' ? MINIMAL_COUNT : PARTICLE_COUNT

    const posAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute
    const alphaAttr = this.particles.geometry.getAttribute('aAlpha') as THREE.BufferAttribute
    const colorAttr = this.particles.geometry.getAttribute('aColor') as THREE.BufferAttribute

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const bx = this.basePositions[i3]
      const by = this.basePositions[i3 + 1]
      const bz = this.basePositions[i3 + 2]

      switch (this.currentEmotion) {
        case 'happy': {
          const expandSpeed = 0.3 + intensityFactor * 0.7
          this.basePositions[i3] += Math.cos(time * expandSpeed + i * 0.01) * 0.1 * intensityFactor
          this.basePositions[i3 + 1] -= 0.05 * intensityFactor
          this.basePositions[i3 + 2] += Math.sin(time * expandSpeed + i * 0.02) * 0.05 * intensityFactor
          posAttr.array[i3] = this.basePositions[i3] + Math.sin(time * 0.5 + i * 0.1) * 2 * intensityFactor
          posAttr.array[i3 + 1] = this.basePositions[i3 + 1]
          posAttr.array[i3 + 2] = this.basePositions[i3 + 2]
          break
        }
        case 'sad': {
          this.basePositions[i3 + 1] -= 0.03 * intensityFactor
          if (this.basePositions[i3 + 1] < -200) this.basePositions[i3 + 1] = 200
          posAttr.array[i3] = bx + Math.sin(time * 0.8 + i * 0.05) * 3 * intensityFactor
          posAttr.array[i3 + 1] = this.basePositions[i3 + 1]
          posAttr.array[i3 + 2] = bz
          break
        }
        case 'angry': {
          const rotSpeed = 2.0 + intensityFactor * 4.0
          const angle = time * rotSpeed + i * 0.01
          const r = Math.sqrt(bx * bx + by * by)
          posAttr.array[i3] = Math.cos(angle) * r
          posAttr.array[i3 + 1] = Math.sin(angle) * r
          posAttr.array[i3 + 2] = bz + Math.sin(time * 10 + i) * 2 * intensityFactor
          alphaAttr.array[i] = 0.3 + Math.abs(Math.sin(time * 8 + i * 0.1)) * 0.7 * intensityFactor
          break
        }
        case 'surprised': {
          const pulseR = Math.sin(time * 3 + i * 0.01) * 20 * intensityFactor
          const r2 = Math.sqrt(bx * bx + by * by) + pulseR
          const a = Math.atan2(by, bx)
          posAttr.array[i3] = Math.cos(a) * r2
          posAttr.array[i3 + 1] = Math.sin(a) * r2
          posAttr.array[i3 + 2] = bz + Math.sin(time * 2 + i * 0.03) * 5 * intensityFactor
          break
        }
        case 'fear': {
          posAttr.array[i3] = bx + Math.sin(time * 4 + i * 0.2) * 5 * intensityFactor
          posAttr.array[i3 + 1] = by + Math.cos(time * 3 + i * 0.15) * 5 * intensityFactor
          posAttr.array[i3 + 2] = bz + Math.sin(time * 5 + i * 0.1) * 3 * intensityFactor
          break
        }
        default: {
          posAttr.array[i3] = bx + Math.sin(time * 0.3 + i * 0.05) * 1.5 * intensityFactor
          posAttr.array[i3 + 1] = by + Math.cos(time * 0.2 + i * 0.03) * 1.5 * intensityFactor
          posAttr.array[i3 + 2] = bz
          break
        }
      }

      if (this.currentEmotion !== 'angry') {
        alphaAttr.array[i] = 0.3 + 0.4 * intensityFactor + Math.sin(time + i * 0.05) * 0.15
      }

      colorAttr.array[i3] += (this.targetColors[i3] - colorAttr.array[i3]) * 0.05
      colorAttr.array[i3 + 1] += (this.targetColors[i3 + 1] - colorAttr.array[i3 + 1]) * 0.05
      colorAttr.array[i3 + 2] += (this.targetColors[i3 + 2] - colorAttr.array[i3 + 2]) * 0.05
    }

    posAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
    colorAttr.needsUpdate = true

    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  dispose() {
    cancelAnimationFrame(this.animationId)
    this.particles.geometry.dispose()
    ;(this.particles.material as THREE.ShaderMaterial).dispose()
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement)
    }
  }
}
