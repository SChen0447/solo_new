import React, { useCallback, useRef, useEffect } from 'react'
import { CHARACTERS, PROPS } from './assets'
import { eventBus } from './eventBus'
import { perfMonitor } from './performance'
import type { Asset, DragStartEvent } from './types'
import './AssetPanel.css'

export const AssetPanel: React.FC = () => {
  const dragImageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = document.createElement('div')
    el.className = 'drag-ghost'
    el.style.position = 'fixed'
    el.style.pointerEvents = 'none'
    el.style.zIndex = '9999'
    el.style.display = 'none'
    document.body.appendChild(el)
    dragImageRef.current = el

    return () => {
      if (dragImageRef.current) {
        document.body.removeChild(dragImageRef.current)
      }
    }
  }, [])

  const handleDragStart = useCallback((
    e: React.DragEvent<HTMLDivElement>,
    asset: Asset
  ) => {
    perfMonitor.startDragTimer()

    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('application/json', JSON.stringify(asset))

    const ghost = dragImageRef.current
    if (ghost) {
      ghost.innerHTML = `
        <div class="drag-ghost-content">
          <span style="font-size: 48px;">${asset.emoji}</span>
        </div>
      `
      ghost.style.display = 'block'
      e.dataTransfer.setDragImage(ghost, 40, 40)
    }

    const event: DragStartEvent = {
      asset,
      clientX: e.clientX,
      clientY: e.clientY
    }
    eventBus.emit('drag:start', event)
  }, [])

  const handleDragEnd = useCallback(() => {
    perfMonitor.endDragTimer()
    if (dragImageRef.current) {
      dragImageRef.current.style.display = 'none'
    }
    eventBus.emit('drag:end', undefined as any)
  }, [])

  const renderAssetCard = (asset: Asset) => (
    <div
      key={asset.id}
      className={`asset-card ${asset.type}`}
      draggable
      onDragStart={(e) => handleDragStart(e, asset)}
      onDragEnd={handleDragEnd}
    >
      <div
        className="asset-avatar"
        style={asset.type === 'character'
          ? { borderColor: (asset as any).color }
          : undefined
        }
      >
        <span className="asset-emoji">{asset.emoji}</span>
      </div>
      <div className="asset-name">{asset.name}</div>
    </div>
  )

  return (
    <aside className="asset-panel">
      <div className="panel-header">
        <h2>🎨 资源库</h2>
      </div>

      <div className="panel-section">
        <h3>👤 角色</h3>
        <div className="asset-grid">
          {CHARACTERS.map(renderAssetCard)}
        </div>
      </div>

      <div className="panel-section">
        <h3>🎭 道具</h3>
        <div className="asset-grid">
          {PROPS.map(renderAssetCard)}
        </div>
      </div>
    </aside>
  )
}

export default AssetPanel
