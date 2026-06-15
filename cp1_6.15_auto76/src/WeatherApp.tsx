import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useParticleStore, ParticleData } from './useParticleStore'
import {
  ParticleRenderer,
  generateParticlesForWeather,
  updateParticle
} from './ParticleSystem'
import UIPanel from './UIPanel'

const WeatherApp: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const particleRendererRef = useRef<ParticleRenderer | null>(null)
  const animationIdRef = useRef<number>(0)
  const particlesRef = useRef<ParticleData[]>([])
  const timeRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const targetRotationRef = useRef<number>(0)
  const currentRotationRef = useRef<number>(0)
  const targetPitchRef = useRef<number>(0.2)
  const currentPitchRef = useRef<number>(0.2)
  const targetDistanceRef = useRef<number>(15)
  const currentDistanceRef = useRef<number>(15)

  const isDraggingRef = useRef<boolean>(false)
  const lastMouseXRef = useRef<number>(0)
  const lastMouseYRef = useRef<number>(0)

  const bgFlashRef = useRef<number>(0)

  const weatherType = useParticleStore((s) => s.weatherType)
  const particleCount = useParticleStore((s) => s.particleCount)
  const storeParticles = useParticleStore((s) => s.particles)
  const setParticles = useParticleStore((s) => s.setParticles)

  const weatherTypeRef = useRef(weatherType)
  const particleCountRef = useRef(particleCount)

  useEffect(() => {
    weatherTypeRef.current = weatherType
  }, [weatherType])

  useEffect(() => {
    particleCountRef.current = particleCount
  }, [particleCount])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = window.innerWidth
    const height = window.innerHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a1a)
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
    camera.position.set(0, 8, 15)
    camera.lookAt(0, 5, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x0a0a1a, 1)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5)
    scene.add(ambientLight)

    const particleRenderer = new ParticleRenderer(scene)
    particleRendererRef.current = particleRenderer

    const initialParticles = generateParticlesForWeather('rain', 1000)
    particlesRef.current = initialParticles
    setParticles(initialParticles)
    particleRenderer.rebuild(initialParticles, 'rain')

    const animate = (timestamp: number) => {
      animationIdRef.current = requestAnimationFrame(animate)

      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = timestamp
      timeRef.current += dt

      currentRotationRef.current += (targetRotationRef.current - currentRotationRef.current) * 0.1
      currentPitchRef.current += (targetPitchRef.current - currentPitchRef.current) * 0.1
      currentDistanceRef.current += (targetDistanceRef.current - currentDistanceRef.current) * 0.05

      const radius = currentDistanceRef.current
      const y = 8 + Math.sin(currentPitchRef.current) * radius * 0.5
      const xz = Math.cos(currentPitchRef.current) * radius
      const camX = Math.sin(currentRotationRef.current) * xz
      const camZ = Math.cos(currentRotationRef.current) * xz

      camera.position.set(camX, y, camZ)
      camera.lookAt(0, 5, 0)

      const currentParticles = particlesRef.current
      for (let i = 0; i < currentParticles.length; i++) {
        currentParticles[i] = updateParticle(
          currentParticles[i],
          dt,
          weatherTypeRef.current,
          timeRef.current
        )
      }

      const flashResult = particleRenderer.update(
        currentParticles,
        dt,
        currentDistanceRef.current
      )

      if (flashResult.isFlashing) {
        bgFlashRef.current = 0.15
      }
      if (bgFlashRef.current > 0) {
        bgFlashRef.current -= dt
        const t = Math.max(0, bgFlashRef.current / 0.15)
        const r = Math.floor(10 + t * (58 - 10))
        const g = Math.floor(10 + t * (58 - 10))
        const b = Math.floor(26 + t * (78 - 26))
        scene.background = new THREE.Color(r / 255, g / 255, b / 255)
        ;(scene.fog as THREE.FogExp2).color = new THREE.Color(r / 255, g / 255, b / 255)
      } else {
        scene.background = new THREE.Color(0x0a0a1a)
        ;(scene.fog as THREE.FogExp2).color = new THREE.Color(0x0a0a1a)
      }

      renderer.render(scene, camera)
    }

    animationIdRef.current = requestAnimationFrame(animate)

    const onMouseDown = (e: MouseEvent) => {
      if (e.target !== renderer.domElement) return
      isDraggingRef.current = true
      lastMouseXRef.current = e.clientX
      lastMouseYRef.current = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - lastMouseXRef.current
      const dy = e.clientY - lastMouseYRef.current
      lastMouseXRef.current = e.clientX
      lastMouseYRef.current = e.clientY

      targetRotationRef.current += dx * 0.005
      targetPitchRef.current = Math.max(
        -0.5,
        Math.min(1.0, targetPitchRef.current + dy * 0.003)
      )
    }

    const onMouseUp = () => {
      isDraggingRef.current = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      targetDistanceRef.current = Math.max(
        5,
        Math.min(30, targetDistanceRef.current + e.deltaY * 0.02)
      )
    }

    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    const canvas = renderer.domElement
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animationIdRef.current)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)

      particleRenderer.disposeAll()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    if (!particleRendererRef.current) return

    const currentType = weatherTypeRef.current
    particleRendererRef.current.setWeatherType(currentType)

    let newParticles = generateParticlesForWeather(currentType, particleCountRef.current)

    if (currentType === 'thunderstorm') {
      const lightningOnly = generateParticlesForWeather('thunderstorm')
      const lightningParticles = lightningOnly.filter((p) => p.isLightning)
      const rainParticles = newParticles.filter((p) => !p.isLightning)
      newParticles = [...rainParticles, ...lightningParticles]
    }

    particlesRef.current = newParticles
    setParticles(newParticles)
    particleRendererRef.current.rebuild(newParticles, currentType)
  }, [weatherType, particleCount])

  const appStyle: React.CSSProperties = {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: 'radial-gradient(circle at center, #0a0a1a 0%, #1a1a2e 100%)'
  }

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  }

  return (
    <div style={appStyle}>
      <div ref={containerRef} style={containerStyle} />
      <UIPanel />
    </div>
  )
}

export default WeatherApp
