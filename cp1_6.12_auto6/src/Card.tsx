import { useState } from 'preact/hooks'
import type { Inspiration } from './storage'

interface CardProps {
  item: Inspiration
  index: number
  onClick: () => void
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
}

export function Card({
  item,
  index,
  onClick,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleDragStart = (e: DragEvent) => {
    if (!e.dataTransfer) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    onDragStart(index)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (!e.dataTransfer) return
    e.dataTransfer.dropEffect = 'move'
    onDragOver(index)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
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
        '--tag-color': item.colorTag,
        opacity: isDragging ? 0.4 : 1,
        transform: isHovered && !isDragging
          ? 'translateY(-6px) scale(1.02)'
          : isDragOver
          ? 'scale(1.03)'
          : 'translateY(0) scale(1)',
        boxShadow: isHovered && !isDragging
          ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(58, 227, 116, 0.15)'
          : '0 8px 24px rgba(0, 0, 0, 0.25)',
        borderColor: isDragOver ? 'rgba(58, 227, 116, 0.6)' : 'rgba(255, 255, 255, 0.08)',
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      } as any}
    >
      <div class="card-tag" style={{ background: item.colorTag }} />
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
        <div class="card-drag-hint">
          <span />
          <span />
          <span />
        </div>
      </div>

      <style>{`
        .card {
          position: relative;
          background: rgba(30, 27, 75, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 20px;
          cursor: grab;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
        }

        .card:active {
          cursor: grabbing;
        }

        .card-tag {
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          border-radius: 16px 0 0 16px;
        }

        .card-content {
          margin-left: 8px;
        }

        .card-title {
          margin: 0 0 8px 0;
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
          display: inline-block;
          font-size: 12px;
          color: #3ae374;
          text-decoration: none;
          margin-bottom: 10px;
          opacity: 0.9;
          transition: opacity 0.2s;
          word-break: break-all;
        }

        .card-url:hover {
          opacity: 1;
          text-decoration: underline;
        }

        .card-desc {
          margin: 0;
          font-size: 13px;
          color: rgba(200, 200, 230, 0.7);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          margin-left: 8px;
        }

        .card-date {
          font-size: 11px;
          color: rgba(180, 180, 210, 0.5);
        }

        .card-drag-hint {
          display: flex;
          gap: 3px;
          opacity: 0.4;
        }

        .card-drag-hint span {
          width: 3px;
          height: 3px;
          background: #fff;
          border-radius: 50%;
        }
      `}</style>
    </div>
  )
}
