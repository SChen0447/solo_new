import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FaceDetector } from './faceDetection'
import { MaskModule } from './maskModule'
import { ParticleSystem } from './particleSystem'
import { ControlPanel } from './ControlPanel'
import { useAppStore, colorPalettes } from './store'

interface SceneProps {
  maskRef: React.MutableRefObject<MaskModule | null>
  particleRef: React.MutableRefObject<ParticleSystem | null>
}

const Scene: React.FC<SceneProps> = ({ maskRef, particleRef }) => {
  const { scene } = useThree()
  const localMaskRef = useRef<MaskModule | null>(null)
  const localParticleRef = useRef<ParticleSystem | null>(null)
  const lastFrameTime = useRef<number>(performance.now())
  const fpsUpdateTime = useRef<number>(0)
  const frameCount = useRef<number>(0)

  const expressions = useAppStore((s) => s.expressions)
  const expressionWeights = useAppStore((s) => s.expressionWeights)
  const particleCount = useAppStore((s) => s.particleState.count)
  const colorTheme = useAppStore((s) => s.particleState.colorTheme)
  const setFps = useAppStore((s) => s.setFps)

  useEffect(() => {
    const mask = new MaskModule()
    const particles = new ParticleSystem(particleCount)
    
    scene.add(mask.mesh)
    scene.add(particles.points)
    
    localMaskRef.current = mask
    localParticleRef.current = particles
    maskRef.current = mask
    particleRef.current = particles
    
    return () => {
      scene.remove(mask.mesh)
      scene.remove(particles.points)
      mask.dispose()
      particles.dispose()
    }
  }, [scene, maskRef, particleRef, particleCount])

  useEffect(() => {
    if (localParticleRef.current) {
      localParticleRef.current.setCount(particleCount)
    }
  }, [particleCount])

  useEffect(() => {
    if (localParticleRef.current) {
      localParticleRef.current.setColorTheme(colorTheme)
    }
  }, [colorTheme])

  useFrame(() => {
    const now = performance.now()
    const delta = Math.min(0.05, (now - lastFrameTime.current) / 1000)
    lastFrameTime.current = now

    frameCount.current++
    if (now - fpsUpdateTime.current >= 500) {
      const elapsed = (now - fpsUpdateTime.current) / 1000
      const currentFps = Math.round(frameCount.current / elapsed)
      setFps(currentFps)
      frameCount.current = 0
      fpsUpdateTime.current = now
    }

    if (localMaskRef.current && delta > 0) {
      localMaskRef.current.update(expressions, expressionWeights, delta)
    }

    if (localParticleRef.current && delta > 0) {
      localParticleRef.current.update(expressions, delta)
    }
  })

  return null
}

const Lighting: React.FC = () => {
  return (
    <>
      <ambientLight color="#404060" intensity={0.5} />
      <pointLight
        position={[-2.5, 1.5, 2]}
        color="#ffdd88"
        intensity={1.2}
        distance={15}
        decay={2}
      />
      <pointLight
        position={[2.5, 1.5, 2]}
        color="#ffdd88"
        intensity={1.2}
        distance={15}
        decay={2}
      />
      <pointLight
        position={[0, -1, 3]}
        color="#88aaff"
        intensity={0.4}
        distance={10}
      />
    </>
  )
}

const Background: React.FC = () => {
  const { scene } = useThree()
  
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 512)
      gradient.addColorStop(0, '#0a0a1a')
      gradient.addColorStop(0.5, '#1a0a2e')
      gradient.addColorStop(1, '#0f0820')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 2, 512)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    scene.background = texture
    
    return () => {
      texture.dispose()
      scene.background = null
    }
  }, [scene])

  return null
}

interface CameraControllerProps {
  isMobile: boolean
}

const CameraController: React.FC<CameraControllerProps> = ({ isMobile }) => {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3(0, 0.2, isMobile ? 5.5 : 4.5))
  const currentPos = useRef(new THREE.Vector3(0, 0.2, 4.5))

  useEffect(() => {
    targetPos.current.z = isMobile ? 5.5 : 4.5
    targetPos.current.y = isMobile ? 0 : 0.2
  }, [isMobile])

  useFrame((_, delta) => {
    currentPos.current.lerp(targetPos.current, Math.min(1, delta * 3))
    camera.position.copy(currentPos.current)
    camera.lookAt(0, 0, 0)
  })

  return null
}

const App: React.FC = () => {
  const maskRef = useRef<MaskModule | null>(null)
  const particleRef = useRef<ParticleSystem | null>(null)
  const faceDetectorRef = useRef<FaceDetector | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastDetectionFrame = useRef<number>(0)
  
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 900)
  const [panelOpen, setPanelOpen] = useState<boolean>(false)
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false)
  const [loadingProgress, setLoadingProgress] = useState<string>('初始化中...')

  const updateExpressions = useAppStore((s) => s.updateExpressions)
  const setLandmarks = useAppStore((s) => s.setLandmarks)
  const setCameraActive = useAppStore((s) => s.setCameraActive)
  const setFaceDetected = useAppStore((s) => s.setFaceDetected)

  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth < 900)
  }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  const runDetectionLoop = useCallback(async () => {
    if (!faceDetectorRef.current) return

    try {
      const frame = performance.now()
      if (frame - lastDetectionFrame.current >= 16) {
        lastDetectionFrame.current = frame
        const result = await faceDetectorRef.current.detect()
        updateExpressions(result.expressions)
        setLandmarks(result.landmarks.length > 0 ? result.landmarks : null)
        setFaceDetected(result.detected)
      }
    } catch (e) {
      // silently continue loop
    }

    animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
  }, [updateExpressions, setLandmarks, setFaceDetected])

  useEffect(() => {
    const init = async () => {
      setLoadingProgress('加载面部识别模型...')
      const detector = new FaceDetector()
      faceDetectorRef.current = detector

      const loaded = await detector.loadModels()
      setLoadingProgress('请求摄像头权限...')

      const video = await detector.startCamera()
      const cameraActive = video !== null
      setCameraActive(cameraActive)

      if (!loaded && !cameraActive) {
        setLoadingProgress('使用模拟数据模式')
      } else {
        setLoadingProgress('就绪')
      }
      
      setModelsLoaded(true)
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
    }

    init()

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (faceDetectorRef.current) {
        faceDetectorRef.current.stop()
      }
    }
  }, [runDetectionLoop, setCameraActive])

  const particleTheme = useAppStore((s) => s.particleState.colorTheme)
  const themeColor = colorPalettes[particleTheme][0]

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: isMobile ? 0 : '280px',
          bottom: isMobile ? (panelOpen ? '300px' : '0') : 0,
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          background: 'transparent'
        }}
      >
        <Canvas
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1
          }}
          camera={{
            fov: 45,
            near: 0.1,
            far: 100,
            position: [0, 0.2, 4.5]
          }}
          dpr={[1, 1.5]}
        >
          <Background />
          <CameraController isMobile={isMobile} />
          <Lighting />
          <Scene maskRef={maskRef} particleRef={particleRef} />
        </Canvas>
      </div>

      {!modelsLoaded && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10,10,26,0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          gap: '24px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: `3px solid ${themeColor}33`,
            borderTopColor: themeColor,
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            color: '#c0c0e0',
            fontSize: '14px',
            letterSpacing: '2px'
          }}>
            {loadingProgress}
          </div>
          <div style={{
            width: '240px',
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '60%',
              height: '100%',
              background: `linear-gradient(90deg, ${themeColor}, ${colorPalettes[particleTheme][3]})`,
              animation: 'shimmer 2s ease-in-out infinite'
            }} />
          </div>
        </div>
      )}

      <ControlPanel
        isMobile={isMobile}
        isOpen={panelOpen}
        onToggle={() => setPanelOpen(!panelOpen)}
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          cursor: pointer;
          border: none;
          background: transparent;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.25);
        }
      `}</style>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}
