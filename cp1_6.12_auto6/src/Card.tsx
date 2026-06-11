import { useState } from 'preact/hooks'
import type { Inspiration } from './storage'

interface CardProps {
  item: Inspiration
  index: number
  onClick: () => void
  onDragStart: () => void
  onDragOver: () => void
  onDrop: () => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
}

export function Card({
  item,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleDragStart = (e: DragEvent) => {
    if (!e.dataTransfer) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.id)
    onDragStart()
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.dataTransfer) return
    e.dataTransfer.dropEffect = 'move'
    onDragOver()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDrop()
  }

  const handleDragEnd = () => {
    onDragEnd()
  }

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      class="card"
      style={{
        opacity: isDragging ? 0.3 : 1,
        transform: isHovered && !isDragging
          ? 'translateY(-6px) scale(1.02)'
          : isDragOver
          ? 'translateY(-3px) scale(1.04)'
          : 'translateY(0) scale(1)',
        boxShadow: isHovered && !isDragging
          ? '0 24px 48px rgba(0, 0, 0, 0.4), 0 0 40px rgba(58, 227, 116, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : isDragOver
          ? '0 16px 32px rgba(58, 227, 116, 0.25), 0 0 30px rgba(58, 227, 116, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 10px 30px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        borderColor: isDragOver ? 'rgba(58, 227, 116, 0.6)' : 'rgba(255, 255, 255, 0.08)',
        transition: isDragging ? 'none' : 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
      } as any}
    >
      <div class="card-glass" />
      <div class="card-tag" style={{ background: `linear-gradient(180deg, ${item.colorTag} 0%, ${item.colorTag}99 100%)` }} />
      <div class="card-content">
        <h3 class="card-title">{item.title || '无标题'}</h3>
        {item.url && (
          <a
            class="card-url"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <span class="card-url-icon">🔗</span>
            {getDomain(item.url)}
          </a>
        )}
        {item.description && (
          <p class="card-desc">{item.description}</p>
        )}
      </div>
      <div class="card-footer">
        <span class="card-date">
          {new Date(item.createdAt).toLocaleDateString('zh-CN')}
        </span>
        <div class="card-drag-hint" title="拖拽排序">
          <span />
          <span />
          <span />
        </div>
      </div>

      <style>{`
        .card {
          position: relative;
          border-radius: 16px;
          padding: 20px;
          cursor: grab;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
          transform-style: preserve-3d;
        }

        .card-glass {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(20, 18, 55, 0.6) 100%);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          z-index: 0;
        }

        .card > *:not(.card-glass):not(.card-tag) {
          position: relative;
          z-index: 1;
        }

        .card:active {
          cursor: grabbing;
        }

        .card-tag {
          position: absolute;
          top: 0;
          left: 0;
          width: 5px;
          height: 100%;
          z-index: 2;
          box-shadow: 2px 0 10px currentColor;
        }

        .card-content {
          margin-left: 10px;
        }

        .card-title {
          margin: 0 0 10px 0;
          font-size: 16px;
          font-weight: 600;
          color: #f0f0ff;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-url {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #3ae374;
          text-decoration: none;
          margin-bottom: 12px;
          opacity: 0.9;
          transition: opacity 0.2s;
          word-break: break-all;
        }

        .card-url-icon {
          font-size: 11px;
          opacity: 0.7;
        }

        .card-url:hover {
          opacity: 1;
          text-decoration: underline;
        }

        .card-desc {
          margin: 0;
          font-size: 13px;
          color: rgba(200, 200, 230, 0.75);
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          margin-left: 10px;
        }

        .card-date {
          font-size: 11px;
          color: rgba(180, 180, 210, 0.5);
        }

        .card-drag-hint {
          display: flex;
          gap: 3px;
          opacity: 0.35;
          cursor: grab;
          padding: 4px;
        }

        .card-drag-hint:hover {
          opacity: 0.6;
        }

        .card-drag-hint span {
          width: 3px;
          height: 3px;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  )
}
