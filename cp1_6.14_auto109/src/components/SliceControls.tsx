import React from 'react'
import { useGeoStore } from '../store'

const SliceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
)

export const SliceControls: React.FC = () => {
  const sliceEnabled = useGeoStore((s) => s.sliceEnabled)
  const setSliceEnabled = useGeoStore((s) => s.setSliceEnabled)
  const sliceX = useGeoStore((s) => s.viewport.sliceX)
  const sliceZ = useGeoStore((s) => s.viewport.sliceZ)
  const setSliceX = useGeoStore((s) => s.setSliceX)
  const setSliceZ = useGeoStore((s) => s.setSliceZ)

  return (
    <div
      className="fixed bottom-4 left-4 z-50 p-3 rounded-xl"
      style={{
        backgroundColor: 'rgba(22, 33, 62, 0.85)',
        border: '1px solid rgba(79, 195, 247, 0.2)',
        backdropFilter: 'blur(8px)',
        minWidth: '220px',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <button
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            sliceEnabled ? 'bg-geo-accent/20 text-geo-accent' : 'text-geo-text/60 hover:bg-white/5'
          }`}
          onClick={() => setSliceEnabled(!sliceEnabled)}
        >
          <SliceIcon />
          <span>切片模式</span>
          <span
            className="w-2 h-2 rounded-full ml-1"
            style={{ backgroundColor: sliceEnabled ? '#4fc3f7' : '#666' }}
          />
        </button>
      </div>

      {sliceEnabled && (
        <div className="space-y-3 animate-fade-in">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-geo-text/70">X轴切片</label>
              <span className="text-xs text-geo-accent font-mono">{sliceX.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={sliceX}
              onChange={(e) => setSliceX(parseFloat(e.target.value))}
              className="geo-slider w-full"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-geo-text/70">Z轴切片</label>
              <span className="text-xs text-geo-accent font-mono">{sliceZ.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={sliceZ}
              onChange={(e) => setSliceZ(parseFloat(e.target.value))}
              className="geo-slider w-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}
