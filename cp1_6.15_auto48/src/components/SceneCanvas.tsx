import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Starfield } from './Starfield'
import { Sculpture } from './Sculpture'
import { GridFloor } from './GridFloor'
import { CameraRig } from './CameraRig'
import { useEEGStore } from '../store/useStore'

function FPSMonitor() {
  const setFps = useEEGStore((state) => state.setFps)
  const framesRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  useFrame(() => {
    framesRef.current++
    const now = performance.now()
    const delta = now - lastTimeRef.current

    if (delta >= 500) {
      const fps = (framesRef.current * 1000) / delta
      setFps(fps)
      framesRef.current = 0
      lastTimeRef.current = now
    }
  })

  return null
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-10, 5, -10]} intensity={0.4} color="#7c5cbf" />
      <pointLight position={[0, -5, 5]} intensity={0.3} color="#4a90e2" />

      <Starfield />
      <Sculpture />
      <GridFloor />
      <CameraRig />
      <FPSMonitor />
    </>
  )
}

export function SceneCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 2, 6], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: '#0a0a1a' }}
    >
      <color attach="background" args={['#0a0a1a']} />
      <fog attach="fog" args={['#0a0a1a', 10, 50]} />
      <Scene />
    </Canvas>
  )
}
