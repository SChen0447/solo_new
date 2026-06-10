import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Scene, { RibbonData } from './Scene'
import UI, { SavedFabric } from './UI'
import { ControlPoint } from './Ribbon'

const PRESET_COLORS = [
  '#e8c547', '#d64045', '#2a9d8f', '#4a7c8e',
  '#9b9b9b', '#f4a261', '#a67c52', '#7b4a8b'
]

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function createDefaultRibbon(): RibbonData {
  const points: ControlPoint[] = []
  for (let i = 0; i < 6; i++) {
    const t = i / 5
    points.push({
      id: uid(),
      x: (t - 0.5) * 6,
      y: Math.sin(t * Math.PI) * 1.2,
      z: Math.sin(t * Math.PI * 0.8) * 0.8
    })
  }
  return {
    id: uid(),
    points,
    colorStart: '#6c63ff',
    colorEnd: '#a78bfa',
    emissiveIntensity: 0.3,
    maxWidth: 0.5
  }
}

function createRandomRibbon(center: THREE.Vector3): RibbonData {
  const colorIdx = Math.floor(Math.random() * PRESET_COLORS.length)
  const color = PRESET_COLORS[colorIdx]
  const colorEnd = PRESET_COLORS[(colorIdx + Math.floor(Math.random() * 3 + 1)) % PRESET_COLORS.length]
  const points: ControlPoint[] = []
  const nPoints = 5 + Math.floor(Math.random() * 3)
  for (let i = 0; i < nPoints; i++) {
    const t = i / (nPoints - 1)
    points.push({
      id: uid(),
      x: center.x + (t - 0.5) * 4 + (Math.random() - 0.5) * 0.8,
      y: center.y + Math.sin(t * Math.PI * 1.5) * 0.8 + (Math.random() - 0.5) * 0.6,
      z: center.z + (Math.random() - 0.5) * 1.5
    })
  }
  return {
    id: uid(),
    points,
    colorStart: color,
    colorEnd: colorEnd,
    emissiveIntensity: 0.3,
    maxWidth: 0.45 + Math.random() * 0.2
  }
}

function generateThumbnail(canvas: HTMLCanvasElement, width = 120, height = 80): string {
  try {
    const offscreen = document.createElement('canvas')
    offscreen.width = width
    offscreen.height = height
    const ctx = offscreen.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#0b1024')
    gradient.addColorStop(1, '#1f1f2e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height)
    return offscreen.toDataURL('image/png')
  } catch {
    return ''
  }
}

const App: React.FC = () => {
  const [ribbons, setRibbons] = useState<RibbonData[]>([createDefaultRibbon()])
  const [windStrength, setWindStrength] = useState(5)
  const [savedFabrics, setSavedFabrics] = useState<SavedFabric[]>([])
  const [mergingPair, setMergingPair] = useState<[string, string] | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const handleMerge = (e: Event) => {
      const ce = e as CustomEvent
      if (ce.detail && ce.detail.pair) {
        setMergingPair(ce.detail.pair)
      }
    }
    window.addEventListener('request-merge', handleMerge)
    return () => window.removeEventListener('request-merge', handleMerge)
  }, [])

  const handleMergingComplete = useCallback(() => {
    setMergingPair(null)
  }, [])

  const handleDoubleClickCreate = useCallback((worldPoint: THREE.Vector3) => {
    setRibbons(prev => [...prev, createRandomRibbon(worldPoint)])
  }, [])

  const handleSaveFabric = useCallback(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
    const thumbnail = canvas ? generateThumbnail(canvas) : ''
    const fabric: SavedFabric = {
      id: uid(),
      name: `织物 ${savedFabrics.length + 1}`,
      ribbons: JSON.parse(JSON.stringify(ribbons)),
      windStrength,
      thumbnail,
      createdAt: Date.now()
    }
    setSavedFabrics(prev => [fabric, ...prev])
  }, [ribbons, windStrength, savedFabrics.length])

  const handleLoadFabric = useCallback((fabric: SavedFabric) => {
    setRibbons(JSON.parse(JSON.stringify(fabric.ribbons)))
    setWindStrength(fabric.windStrength)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 0, 10], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        style={{
          background: 'linear-gradient(180deg, #0b1024 0%, #1f1f2e 100%)'
        }}
      >
        <OrbitControls
          enablePan={false}
          enableRotate={true}
          enableZoom={true}
          mouseButtons={{
            LEFT: null as any,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
          }}
          minDistance={4}
          maxDistance={25}
          enableDamping
          dampingFactor={0.08}
        />
        <Scene
          ribbons={ribbons}
          windStrength={windStrength}
          onRibbonsChange={setRibbons}
          onDoubleClickCreate={handleDoubleClickCreate}
          mergingPair={mergingPair}
          onMergingComplete={handleMergingComplete}
        />
      </Canvas>

      <UI
        windStrength={windStrength}
        onWindChange={setWindStrength}
        savedFabrics={savedFabrics}
        onSaveFabric={handleSaveFabric}
        onLoadFabric={handleLoadFabric}
      />
    </div>
  )
}

export default App
