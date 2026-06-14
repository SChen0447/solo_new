import React, { useState } from 'react'
import { useGeoStore } from '../store'

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const ResetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
)

export const ViewpointToolbar: React.FC = () => {
  const savedViewpoints = useGeoStore((s) => s.savedViewpoints)
  const saveViewpoint = useGeoStore((s) => s.saveViewpoint)
  const removeViewpoint = useGeoStore((s) => s.removeViewpoint)
  const viewport = useGeoStore((s) => s.viewport)
  const setViewport = useGeoStore((s) => s.setViewport)
  const setAnimatingCamera = useGeoStore((s) => s.setAnimatingCamera)
  const setSliceEnabled = useGeoStore((s) => s.setSliceEnabled)
  const resetView = useGeoStore((s) => s.resetView)

  const handleSave = () => {
    if (savedViewpoints.length >= 3) return
    const canvas = document.querySelector('canvas')
    let thumbnail = ''
    if (canvas) {
      thumbnail = canvas.toDataURL('image/jpeg', 0.3)
    }
    saveViewpoint(`视点 ${savedViewpoints.length + 1}`, thumbnail)
  }

  const handleRestore = (viewpointId: string) => {
    const vp = savedViewpoints.find((v) => v.id === viewpointId)
    if (!vp) return
    setViewport({
      cameraPosition: vp.cameraPosition,
      sliceX: vp.sliceX,
      sliceZ: vp.sliceZ,
      selectedLayerId: vp.selectedLayerId,
    })
    setSliceEnabled(vp.sliceX !== 2.5 || vp.sliceZ !== 2.5)
    setAnimatingCamera(true)
    setTimeout(() => setAnimatingCamera(false), 1100)
  }

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-white/10"
          style={{
            backgroundColor: 'rgba(22, 33, 62, 0.8)',
            color: '#4fc3f7',
            border: '1px solid rgba(79, 195, 247, 0.2)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={handleSave}
          disabled={savedViewpoints.length >= 3}
          title="保存当前视角"
        >
          <CameraIcon />
          <span>保存视角</span>
        </button>

        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-white/10"
          style={{
            backgroundColor: 'rgba(22, 33, 62, 0.8)',
            color: '#4fc3f7',
            border: '1px solid rgba(79, 195, 247, 0.2)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={resetView}
          title="复位视角"
        >
          <ResetIcon />
          <span>复位</span>
        </button>
      </div>

      {savedViewpoints.length > 0 && (
        <div className="flex gap-2">
          {savedViewpoints.map((vp) => (
            <div
              key={vp.id}
              className="relative group cursor-pointer rounded-lg overflow-hidden transition-all hover:scale-105"
              style={{
                width: '80px',
                height: '60px',
                border: '1px solid rgba(79, 195, 247, 0.3)',
                backgroundColor: 'rgba(22, 33, 62, 0.9)',
                backdropFilter: 'blur(8px)',
              }}
              onClick={() => handleRestore(vp.id)}
              title={vp.name}
            >
              {vp.thumbnail ? (
                <img
                  src={vp.thumbnail}
                  alt={vp.name}
                  className="w-full h-full object-cover opacity-70"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-geo-accent/50 text-xs">
                  {vp.name}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-geo-text text-[9px] text-center py-0.5">
                {vp.name}
              </div>
              <button
                className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded-full bg-red-500/80 text-white text-[8px] transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  removeViewpoint(vp.id)
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
