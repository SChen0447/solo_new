import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import AssetPanel from './AssetPanel'
import Canvas from './Canvas'
import SceneManager from './SceneManager'
import ExportImport from './ExportImport'
import { eventBus } from './eventBus'
import { perfMonitor } from './performance'
import type { Scene, ProjectData } from './types'
import './App.css'

const createDefaultScene = (index: number): Scene => ({
  id: uuidv4(),
  name: `场景 ${index + 1}`,
  index,
  items: [],
  background: '#FFFDE7'
})

const createInitialScenes = (): Scene[] => [createDefaultScene(0)]

export const App: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>(createInitialScenes)
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [switchDirection, setSwitchDirection] = useState<'left' | 'right' | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [canvasScale, setCanvasScale] = useState(1)
  const [showPerfPanel, setShowPerfPanel] = useState(false)
  const [perfMetrics, setPerfMetrics] = useState<{ [key: string]: { value: number; unit: string } }>({})

  const handleResize = useCallback(() => {
    const mobile = window.innerWidth < 768
    setIsMobile(mobile)

    const canvasWrapper = document.getElementById('canvas-wrapper')
    if (canvasWrapper) {
      const wrapperWidth = canvasWrapper.clientWidth
      const wrapperHeight = canvasWrapper.clientHeight
      const canvasWidth = 1200
      const canvasHeight = 800
      const scaleX = wrapperWidth / canvasWidth
      const scaleY = wrapperHeight / canvasHeight
      const scale = Math.min(scaleX, scaleY, 1)
      setCanvasScale(Math.max(scale, 0.3))
    } else {
      setCanvasScale(1)
    }
  }, [])

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    perfMonitor.startFrameMonitoring()

    const interval = setInterval(() => {
      perfMonitor.getMemoryUsage()
      setPerfMetrics(prev => ({
        ...prev,
        avg_fps: { value: perfMonitor.getAverageFPS(), unit: 'fps' },
        min_fps: { value: perfMonitor.getMinFPS(), unit: 'fps' }
      }))
    }, 2000)

    return () => {
      window.removeEventListener('resize', handleResize)
      perfMonitor.stopFrameMonitoring()
      clearInterval(interval)
    }
  }, [handleResize])

  useEffect(() => {
    const unsub = eventBus.on('performance:metric', ({ name, value, unit }) => {
      setPerfMetrics(prev => ({ ...prev, [name]: { value, unit } }))
    })
    return unsub
  }, [])

  const handleSceneUpdate = useCallback((scene: Scene) => {
    setScenes(prev => {
      const next = [...prev]
      next[currentSceneIndex] = scene
      return next
    })
    eventBus.emit('scene:updated', scene)
  }, [currentSceneIndex])

  const handleProjectImport = useCallback((data: ProjectData) => {
    if (data && Array.isArray(data.scenes) && data.scenes.length > 0) {
      setScenes(data.scenes)
      setCurrentSceneIndex(0)
    }
  }, [])

  const handleToggleDrawer = useCallback(() => {
    setDrawerOpen(prev => !prev)
  }, [])

  const currentScene = useMemo(() => scenes[currentSceneIndex] || null, [scenes, currentSceneIndex])

  const getCanvasAnimationStyle = () => {
    if (!switchDirection) {
      return { transform: 'translateX(0)', opacity: 1 }
    }

    const dir = switchDirection === 'left' ? -1 : 1
    return {
      animation: `slideIn${switchDirection === 'left' ? 'Left' : 'Right'} 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards`
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">📖 故事拼图</h1>
          <span className="app-subtitle">互动式漫画创作</span>
        </div>
        <div className="header-right">
          <button
            className={`perf-btn ${showPerfPanel ? 'active' : ''}`}
            onClick={() => setShowPerfPanel(p => !p)}
            title="性能监控"
          >
            ⚡
          </button>
          <ExportImport scenes={scenes} onProjectImport={handleProjectImport} />
        </div>
      </header>

      <div className="app-body">
        <div className={`asset-panel-wrapper ${drawerOpen ? 'open' : ''}`}>
          <AssetPanel />
          {isMobile && (
            <button
              className="drawer-toggle close"
              onClick={handleToggleDrawer}
            >
              × 关闭
            </button>
          )}
        </div>

        <main className="main-content">
          <SceneManager
            scenes={scenes}
            currentSceneIndex={currentSceneIndex}
            onScenesChange={setScenes}
            onCurrentSceneChange={setCurrentSceneIndex}
            switchDirection={switchDirection}
            onSwitchDirectionChange={setSwitchDirection}
          />

          <div className="canvas-area">
            <div
              id="canvas-wrapper"
              className="canvas-wrapper"
            >
              <div
                className="canvas-viewport"
                style={getCanvasAnimationStyle()}
                key={`scene-${currentScene?.id}`}
              >
                {currentScene && (
                  <Canvas
                    scene={currentScene}
                    onSceneUpdate={handleSceneUpdate}
                    scale={canvasScale}
                  />
                )}
              </div>
            </div>
          </div>

          {isMobile && (
            <button
              className="drawer-toggle open"
              onClick={handleToggleDrawer}
            >
              🎨 打开资源面板
            </button>
          )}
        </main>
      </div>

      {showPerfPanel && (
        <div className="perf-panel">
          <h4>⚡ 性能监控</h4>
          <div className="perf-metrics">
            <div className="perf-metric">
              <span className="metric-label">平均 FPS</span>
              <span className={`metric-value ${perfMetrics.avg_fps?.value < 50 ? 'warn' : ''}`}>
                {perfMetrics.avg_fps?.value?.toFixed(0) || '--'} {perfMetrics.avg_fps?.unit || ''}
              </span>
            </div>
            <div className="perf-metric">
              <span className="metric-label">最低 FPS</span>
              <span className={`metric-value ${perfMetrics.min_fps?.value < 50 ? 'warn' : ''}`}>
                {perfMetrics.min_fps?.value?.toFixed(0) || '--'} {perfMetrics.min_fps?.unit || ''}
              </span>
            </div>
            <div className="perf-metric">
              <span className="metric-label">拖拽延迟</span>
              <span className={`metric-value ${perfMetrics.drag_latency?.value > 100 ? 'warn' : ''}`}>
                {perfMetrics.drag_latency?.value?.toFixed(0) || '--'} {perfMetrics.drag_latency?.unit || ''}
              </span>
            </div>
            <div className="perf-metric">
              <span className="metric-label">内存使用</span>
              <span className={`metric-value ${perfMetrics.memory_usage?.value > 150 ? 'warn' : ''}`}>
                {perfMetrics.memory_usage?.value?.toFixed(0) || '--'} {perfMetrics.memory_usage?.unit || ''}
              </span>
            </div>
            <div className="perf-metric">
              <span className="metric-label">场景数</span>
              <span className="metric-value">{scenes.length}</span>
            </div>
            <div className="perf-metric">
              <span className="metric-label">画布缩放</span>
              <span className="metric-value">{(canvasScale * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
