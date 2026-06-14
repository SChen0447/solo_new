import React, { useRef, useEffect, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useGeoStore } from '../../store'
import { GeologicalLayer } from './GeologicalLayer'
import { AnnotationLayer } from '../annotation/AnnotationLayer'

const AxisIndicator: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ camera }) => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion)
    }
  })

  const axisLength = 0.4
  const axisOffset = new THREE.Vector3(-1.2, 1.0, -2)

  return (
    <group ref={groupRef} position={axisOffset}>
      <mesh position={[axisLength / 2, 0, 0]}>
        <boxGeometry args={[axisLength, 0.04, 0.04]} />
        <meshBasicMaterial color={0xff0000} />
      </mesh>
      <mesh position={[0, axisLength / 2, 0]}>
        <boxGeometry args={[0.04, axisLength, 0.04]} />
        <meshBasicMaterial color={0x00ff00} />
      </mesh>
      <mesh position={[0, 0, axisLength / 2]}>
        <boxGeometry args={[0.04, 0.04, axisLength]} />
        <meshBasicMaterial color={0x0000ff} />
      </mesh>
    </group>
  )
}

const CameraAnimator: React.FC = () => {
  const animating = useGeoStore((s) => s.animatingCamera)
  const targetPos = useGeoStore((s) => s.viewport.cameraPosition)
  const setAnimating = useGeoStore((s) => s.setAnimatingCamera)
  const { camera } = useThree()
  const progressRef = useRef(0)
  const startRef = useRef<THREE.Vector3>(new THREE.Vector3())

  useEffect(() => {
    if (animating) {
      startRef.current.copy(camera.position)
      progressRef.current = 0
    }
  }, [animating])

  useFrame((_, delta) => {
    if (!animating) return
    progressRef.current += delta
    const t = Math.min(progressRef.current / 1.0, 1)
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    const target = new THREE.Vector3(...targetPos)
    camera.position.lerpVectors(startRef.current, target, eased)
    camera.lookAt(0, 3, 0)
    if (t >= 1) {
      setAnimating(false)
    }
  })

  return null
}

export const SceneViewer: React.FC = () => {
  const performanceMode = useGeoStore((s) => s.performanceMode)
  const setCameraPosition = useGeoStore((s) => s.setCameraPosition)
  const setFps = useGeoStore((s) => s.setFps)
  const controlsRef = useRef<any>(null)

  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  useFrame(() => {
    frameCountRef.current++
    const now = performance.now()
    const elapsed = now - lastTimeRef.current
    if (elapsed >= 500) {
      const fps = Math.round((frameCountRef.current / elapsed) * 1000)
      setFps(fps)
      frameCountRef.current = 0
      lastTimeRef.current = now
    }
  })

  return (
    <>
      <CameraAnimator />
      <OrbitControls
        ref={controlsRef}
        target={[0, 3, 0]}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={15}
        enableDamping
        dampingFactor={0.1}
      />

      <ambientLight intensity={performanceMode === 'optimized' ? 0.2 : 0.4} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
      />
      {performanceMode !== 'optimized' && (
        <>
          <directionalLight position={[-5, 8, -5]} intensity={0.3} />
          <pointLight position={[0, 12, 0]} intensity={0.2} />
        </>
      )}

      <GeologicalLayer />
      <AnnotationLayer />
      <AxisIndicator />

      <Grid
        position={[0, -0.01, 0]}
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor={0x333355}
        sectionSize={5}
        sectionThickness={1}
        sectionColor={0x4fc3f7}
        fadeDistance={20}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
    </>
  )
}
