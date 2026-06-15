import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SceneManager } from '@/core/SceneManager'
import { FishAI } from '@/core/FishAI'
import { ControlPanel } from '@/components/ControlPanel'
import { Crosshair } from '@/components/Crosshair'
import { FishInfoLabel } from '@/components/FishInfoLabel'
import { useEnvironmentStore } from '@/store/useEnvironmentStore'
import { FISH_SPECIES } from '@/types'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const fishAIRef = useRef<FishAI | null>(null)
  const animationFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const [isLoaded, setIsLoaded] = useState(false)

  const {
    lightIntensity,
    waterTurbidity,
    currentSpeed,
    updateTransitions,
    setHoveredFish
  } = useEnvironmentStore()

  useEffect(() => {
    if (!containerRef.current) return

    const sceneManager = new SceneManager(containerRef.current)
    sceneManagerRef.current = sceneManager

    const obstacleMeshes = sceneManager.getObstacleMeshes()
    const fishAI = new FishAI(obstacleMeshes)
    fishAIRef.current = fishAI

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      const camera = sceneManager.getCamera()
      const hoverResult = fishAI.checkHover(mouseRef.current, camera)

      if (hoverResult) {
        const species = FISH_SPECIES.find(s => s.id === hoverResult.speciesId)
        fishAI.setFishHovered(hoverResult.fishId)
        setHoveredFish({
          fishId: hoverResult.fishId,
          speciesId: hoverResult.speciesId,
          screenPosition: { x: event.clientX, y: event.clientY },
          displayText: species ? `${species.name}：${species.description}` : ''
        })
      } else {
        fishAI.setFishHovered(null)
        setHoveredFish(null)
      }
    }

    const handleWheel = (event: WheelEvent) => {
      sceneManager.handleWheel(event)
    }

    containerRef.current.addEventListener('mousemove', handleMouseMove)
    containerRef.current.addEventListener('wheel', handleWheel, { passive: false })

    const animate = (currentTime: number) => {
      animationFrameRef.current = requestAnimationFrame(animate)

      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = currentTime

      updateTransitions(deltaTime)

      const state = useEnvironmentStore.getState()
      sceneManager.updateEnvironment({
        lightIntensity: state.lightIntensity,
        waterTurbidity: state.waterTurbidity,
        currentSpeed: state.currentSpeed
      })

      fishAI.update(deltaTime, state.currentSpeed)

      const fishStates = fishAI.getFishStates()
      sceneManager.updateFishStates(fishStates)

      sceneManager.update(deltaTime, state.currentSpeed)
    }

    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(animate)
    setIsLoaded(true)

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove)
        containerRef.current.removeEventListener('wheel', handleWheel)
      }
      sceneManager.dispose()
    }
  }, [updateTransitions, setHoveredFish])

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          background: 'linear-gradient(180deg, #0a2a4a 0%, #001524 50%, #000d14 100%)'
        }}
      />

      {isLoaded && (
        <>
          <Crosshair />
          <FishInfoLabel />
          <ControlPanel />
        </>
      )}

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a2a4a] z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-cyan-300 text-lg" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              正在加载深海场景...
            </p>
          </div>
        </div>
      )}

      <div className="fixed top-4 left-4 z-40 pointer-events-none">
        <h1
          className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          深海探索者
        </h1>
        <p className="text-white/60 text-sm mt-1">
          拖拽旋转视角 · 滚轮缩放 · 悬停鱼类查看信息
        </p>
      </div>

      <div className="fixed bottom-4 left-4 z-40 pointer-events-none">
        <div className="text-white/40 text-xs">
          <div>FPS: <span id="fps-counter">60</span></div>
        </div>
      </div>
    </div>
  )
}

export default App
