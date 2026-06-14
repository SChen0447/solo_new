import React from 'react'
import { useGeoStore } from '../store'

export const FPSMonitor: React.FC = () => {
  const fps = useGeoStore((s) => s.fps)
  const performanceMode = useGeoStore((s) => s.performanceMode)

  const color = fps > 50 ? '#4caf50' : fps >= 30 ? '#ff9800' : '#f44336'

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1">
      {performanceMode === 'optimized' && (
        <div className="px-3 py-1.5 rounded-lg text-xs animate-fade-in"
          style={{
            backgroundColor: 'rgba(255, 152, 0, 0.15)',
            color: '#ff9800',
            border: '1px solid rgba(255, 152, 0, 0.3)',
          }}
        >
          ⚡ 性能优化模式已启用
        </div>
      )}
      <div
        className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold"
        style={{
          backgroundColor: 'rgba(0,0,0,0.6)',
          color,
          border: `1px solid ${color}33`,
        }}
      >
        {fps} FPS
      </div>
    </div>
  )
}
