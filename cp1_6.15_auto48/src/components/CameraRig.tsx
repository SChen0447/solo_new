import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from '@react-three/drei'
import { useEEGStore, ViewMode } from '../store/useStore'
import { CameraController } from '../modules/cameraController'

export function CameraRig() {
  const controlsRef = useRef<any>(null)
  const cameraController = useMemo(() => new CameraController(), [])
  const viewMode = useEEGStore((state) => state.viewMode)
  const prevViewMode = useRef<ViewMode>('front')

  useMemo(() => {
    if (viewMode !== prevViewMode.current) {
      cameraController.setViewMode(viewMode)
      prevViewMode.current = viewMode
    }
  }, [viewMode, cameraController])

  useFrame((state, delta) => {
    if (viewMode === 'front' || viewMode === 'top') {
      if (controlsRef.current) {
        controlsRef.current.enabled = false
      }

      const result = cameraController.update(delta)

      state.camera.position.lerp(result.position, 0.1)

      if (controlsRef.current) {
        controlsRef.current.target.lerp(result.target, 0.1)
        controlsRef.current.update()
      }
    } else if (viewMode === 'orbit') {
      if (controlsRef.current) {
        controlsRef.current.enabled = false
      }

      const result = cameraController.update(delta)
      state.camera.position.copy(result.position)

      if (controlsRef.current) {
        controlsRef.current.target.copy(result.target)
        controlsRef.current.update()
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={20}
      maxPolarAngle={Math.PI * 0.9}
    />
  )
}
