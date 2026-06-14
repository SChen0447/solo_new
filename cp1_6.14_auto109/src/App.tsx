import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { SceneViewer } from './modules/visualization/SceneViewer'
import { AnnotationPanel } from './modules/annotation/AnnotationPanel'
import { FPSMonitor } from './components/FPSMonitor'
import { ViewpointToolbar } from './components/ViewpointToolbar'
import { SliceControls } from './components/SliceControls'

const Loading: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-geo-bg z-50">
    <div className="text-center">
      <div className="w-10 h-10 border-2 border-geo-accent/30 border-t-geo-accent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-geo-text/60 text-sm">加载地质模型中...</p>
    </div>
  </div>
)

const App: React.FC = () => {
  return (
    <div className="flex w-full h-full bg-geo-bg">
      <div className="relative flex-1" style={{ width: '70%' }}>
        <Suspense fallback={<Loading />}>
          <Canvas
            camera={{
              position: [8, 6, 8],
              fov: 50,
              near: 0.1,
              far: 100,
            }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: 'default',
            }}
            dpr={[1, 2]}
            style={{ background: '#1a1a2e' }}
          >
            <SceneViewer />
          </Canvas>
        </Suspense>
        <ViewpointToolbar />
        <SliceControls />
        <FPSMonitor />

        <div
          className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] text-geo-text/40"
          style={{
            backgroundColor: 'rgba(22, 33, 62, 0.6)',
            backdropFilter: 'blur(4px)',
          }}
        >
          鼠标拖拽旋转 · 滚轮缩放 · 点击选择地层
        </div>
      </div>

      <div
        className="h-full panel-scroll overflow-y-auto"
        style={{
          width: '30%',
          minWidth: '300px',
          backgroundColor: 'rgba(22, 33, 62, 0.95)',
          backdropFilter: 'blur(8px)',
          borderLeft: '1px solid rgba(79, 195, 247, 0.1)',
        }}
      >
        <div className="p-3 border-b border-white/10">
          <h1 className="text-base font-bold text-geo-text tracking-wide">
            🌍 地质分层探索
          </h1>
          <p className="text-[10px] text-geo-text/40 mt-0.5">
            3D交互式地质分层数据探索与标注平台
          </p>
        </div>
        <AnnotationPanel />
      </div>
    </div>
  )
}

export default App
