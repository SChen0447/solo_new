import { useEffect, useRef, useState } from 'react'
import { ProductController } from './productController'
import { GestureEngine, GestureEvent } from './gestureEngine'
import UIPanel from './uiPanel'
import { generatePoster, downloadPoster } from './generatePoster'
import { useStore } from './store'

export default function App() {
  const sceneContainerRef = useRef<HTMLDivElement>(null)
  const productControllerRef = useRef<ProductController | null>(null)
  const gestureEngineRef = useRef<GestureEngine | null>(null)
  const gestureRemoveRef = useRef<(() => void) | null>(null)
  const [gestureReady, setGestureReady] = useState(false)
  const [gestureActive, setGestureActive] = useState(false)
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false)
  const [fps, setFps] = useState(0)

  const material = useStore((s) => s.material)
  const colorScheme = useStore((s) => s.colorScheme)
  const viewPreset = useStore((s) => s.viewPreset)
  const autoRotate = useStore((s) => s.autoRotate)
  const triggerPosterGeneration = useStore((s) => s.triggerPosterGeneration)
  const setGesture = useStore((s) => s.setGesture)

  useEffect(() => {
    if (!sceneContainerRef.current) return

    const controller = new ProductController(sceneContainerRef.current)
    productControllerRef.current = controller
    controller.startRenderLoop()

    let lastTime = performance.now()
    let frames = 0
    const fpsInterval = setInterval(() => {
      const now = performance.now()
      const elapsed = (now - lastTime) / 1000
      setFps(Math.round(frames / elapsed))
      frames = 0
      lastTime = now
    }, 1000)

    const animateFps = () => {
      frames++
      requestAnimationFrame(animateFps)
    }
    requestAnimationFrame(animateFps)

    return () => {
      clearInterval(fpsInterval)
      controller.destroy()
      productControllerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!productControllerRef.current) return
    productControllerRef.current.setMaterial(material)
  }, [material])

  useEffect(() => {
    if (!productControllerRef.current) return
    productControllerRef.current.setColorScheme(colorScheme)
  }, [colorScheme])

  useEffect(() => {
    if (!productControllerRef.current) return
    productControllerRef.current.setViewPreset(viewPreset)
  }, [viewPreset])

  useEffect(() => {
    if (!productControllerRef.current) return
    productControllerRef.current.setAutoRotate(autoRotate)
  }, [autoRotate])

  useEffect(() => {
    const init = async () => {
      const videoEl = document.getElementById('webcam') as HTMLVideoElement | null
      const canvasEl = document.getElementById('gesture-canvas') as HTMLCanvasElement | null
      if (!videoEl || !canvasEl) return

      const engine = new GestureEngine()
      gestureEngineRef.current = engine

      const initialized = await engine.init(videoEl, canvasEl)
      if (!initialized) {
        console.warn('手势识别初始化失败，可继续使用UI操作')
        return
      }

      const started = await engine.start()
      if (started) {
        setGestureReady(true)

        const removeListener = engine.addListener((event: GestureEvent) => {
          if (event.type === 'enter-control') {
            setGestureActive(true)
            setGesture({ isControlling: true, gestureMode: 'idle' })
          } else if (event.type === 'exit-control') {
            setGestureActive(false)
            setGesture({ isControlling: false, gestureMode: 'idle', ringBrightness: 0 })
          } else if (event.type === 'rotate') {
            setGesture({ gestureMode: 'rotating', palmX: event.palmX, palmY: event.palmY, ringBrightness: 0.4 })
          } else if (event.type === 'pinch') {
            setGesture({ gestureMode: 'pinching', pinchDistance: event.pinchDistance, ringBrightness: 0.8 })
          }

          if (productControllerRef.current) {
            productControllerRef.current.handleGesture(event)
          }
        })

        gestureRemoveRef.current = removeListener
      }
    }

    init()

    return () => {
      if (gestureRemoveRef.current) {
        gestureRemoveRef.current()
        gestureRemoveRef.current = null
      }
      if (gestureEngineRef.current) {
        gestureEngineRef.current.stop()
        gestureEngineRef.current = null
      }
    }
  }, [setGesture])

  useEffect(() => {
    if (!triggerPosterGeneration || !productControllerRef.current) return

    const run = async () => {
      try {
        setIsGeneratingPoster(true)
        const controller = productControllerRef.current!
        const screenshot = controller.captureScreenshot(1920, 1080)
        const info = controller.getCurrentInfo()
        const gradients = controller.getGradientColors()

        const blob = await generatePoster({
          screenshotDataUrl: screenshot,
          materialLabel: info.materialLabel,
          colorLabel: info.colorLabel,
          gradientStart: gradients.start,
          gradientEnd: gradients.end,
        })

        downloadPoster(blob, `${info.colorLabel}-${info.materialLabel}-poster.png`)
      } catch (error) {
        console.error('海报生成失败:', error)
        alert('海报生成失败，请重试')
      } finally {
        setIsGeneratingPoster(false)
      }
    }

    run()
  }, [triggerPosterGeneration])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      }}
    >
      <div
        ref={sceneContainerRef}
        style={{
          width: window.innerWidth >= 768 ? '75%' : '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: '6px',
              color: fps >= 30 ? '#4ade80' : fps >= 20 ? '#fbbf24' : '#ef4444',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {fps} FPS
          </div>

          <div
            style={{
              background: gestureActive
                ? 'rgba(0, 204, 255, 0.2)'
                : gestureReady
                ? 'rgba(74, 222, 128, 0.2)'
                : 'rgba(107, 114, 128, 0.2)',
              backdropFilter: 'blur(8px)',
              padding: '8px 14px',
              borderRadius: '8px',
              color: gestureActive
                ? '#00ccff'
                : gestureReady
                ? '#4ade80'
                : '#9ca3af',
              fontSize: '12px',
              border: `1px solid ${gestureActive
                ? 'rgba(0, 204, 255, 0.5)'
                : gestureReady
                ? 'rgba(74, 222, 128, 0.5)'
                : 'rgba(107, 114, 128, 0.3)'}`,
            }}
          >
            {gestureActive ? '✋ 操控中' : gestureReady ? '👋 手势就绪' : '⚙️ 加载摄像头...'}
          </div>
        </div>

        {isGeneratingPoster && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                border: '4px solid rgba(0, 204, 255, 0.2)',
                borderTopColor: '#00ccff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ color: '#fff', marginTop: '16px', fontSize: '16px' }}>
              正在生成海报...
            </p>
            <style>
              {`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            padding: '12px 24px',
            borderRadius: '12px',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '13px',
            textAlign: 'center',
            maxWidth: '90%',
            pointerEvents: 'none',
          }}
        >
          <p style={{ margin: 0 }}>
            💡 <span style={{ color: '#00ccff', fontWeight: 600 }}>握拳→张开</span> 进入操控
            {' · '}
            <span style={{ color: '#4ade80', fontWeight: 600 }}>手掌移动</span> 旋转
            {' · '}
            <span style={{ color: '#fbbf24', fontWeight: 600 }}>捏合</span> 缩放
            {' · '}
            <span style={{ color: '#f87171', fontWeight: 600 }}>五指张开2秒</span> 退出
          </p>
        </div>
      </div>

      {window.innerWidth >= 768 && <UIPanel />}
      {window.innerWidth < 768 && <UIPanel />}
    </div>
  )
}
