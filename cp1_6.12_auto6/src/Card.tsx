import { useState } from 'preact/hooks'
import type { Inspiration } from './storage'

interface CardProps {
  item: Inspiration
  index: number
  onClick: () => void
  onDragStart: (e: DragEvent) => void
  onDragEnter: () => void
  onDragLeave: () => void
  onDrop: () => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
}

export function Card({
  item,
  onClick,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleDragStart = (e: DragEvent) => {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      try {
        e.dataTransfer.setData('text/plain', item.id)
        const target = e.currentTarget as HTMLElement
        e.dataTransfer.setDragImage(target, target.offsetWidth / 2, target.offsetHeight / 2)
      } catch {}
    }
    onDragStart(e)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    onDragEnter()
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    const current = e.currentTarget as HTMLElement
    const related = e.relatedTarget as HTMLElement | null
    if (related && current.contains(related)) return
    onDragLeave()
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
    <article
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      class="card"
      style={{
        '--tag': item.colorTag,
        opacity: isDragging ? 0.35 : 1,
        transform: isHovered && !isDragging
          ? 'translate3d(0, -7px, 0) scale(1.02)'
          : isDragOver
          ? 'translate3d(0, -4px, 0) scale(1.045)'
          : 'translate3d(0, 0, 0) scale(1)',
        boxShadow: isHovered && !isDragging
          ? '0 28px 56px rgba(0,0,0,0.42), 0 0 42px rgba(58,227,116,0.17), inset 0 1px 0 rgba(255,255,255,0.1)'
          : isDragOver
          ? '0 20px 40px rgba(58,227,116,0.28), 0 0 34px rgba(58,227,116,0.22), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 12px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
        borderColor: isDragOver ? 'rgba(58,227,116,0.65)' : 'rgba(255,255,255,0.08)',
        transition: isDragging ? 'none' : 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease, border-color 0.3s ease, opacity 0.25s ease'
      } as any}
    >
      <div class="card-glass" aria-hidden="true" />
      <div class="card-border" aria-hidden="true" />
      <div class="card-tag" aria-hidden="true" />

      <div class="card-body">
        <h3 class="card-title">{item.title || '无标题'}</h3>
        {item.url && (
          <a
            class="card-url"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <span class="card-url-ico">🔗</span>
            <span class="card-url-text">{getDomain(item.url)}</span>
          </a>
        )}
        {item.description && (
          <p class="card-desc">{item.description}</p>
        )}
      </div>

      <footer class="card-foot">
        <span class="card-date">
          {new Date(item.createdAt).toLocaleDateString('zh-CN')}
        </span>
        <div class="card-handle" title="拖拽排序">
          <span /><span /><span />
          <span /><span /><span />
        </div>
      </footer>

      <style>{`
        .card {
          position: relative;
          border-radius: 18px;
          padding: 22px 22px 18px 24px;
          cursor: grab;
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
          transform-style: preserve-3d;
          will-change: transform;
        }

        .card:active { cursor: grabbing; }

        .card-glass {
          position: absolute;
          inset: 0;
          background: linear-gradient(145deg, rgba(32,28,80,0.72) 0%, rgba(22,20,58,0.62) 55%, rgba(26,22,68,0.68) 100%);
          backdrop-filter: blur(26px) saturate(190%);
          -webkit-backdrop-filter: blur(26px) saturate(190%);
          z-index: 0;
        }

        .card-border {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.06) 100%);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 1;
        }

        .card-tag {
          position: absolute;
          top: 0;
          left: 0;
          width: 5px;
          height: 100%;
          background: linear-gradient(180deg, var(--tag) 0%, color-mix(in srgb, var(--tag) 70%, transparent) 100%);
          z-index: 3;
          box-shadow: 3px 0 12px color-mix(in srgb, var(--tag) 45%, transparent);
        }

        .card-body,
        .card-foot {
          position: relative;
          z-index: 2;
        }

        .card-body { margin-left: 8px; }

        .card-title {
          margin: 0 0 10px 0;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #f2f2ff;
          line-height: 1.42;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-url {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          max-width: 100%;
          font-size: 12px;
          color: #7cffb0;
          text-decoration: none;
          margin-bottom: 12px;
          padding: 4px 10px;
          border-radius: 9999px;
          background: rgba(58,227,116,0.1);
          border: 1px solid rgba(58,227,116,0.18);
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .card-url:hover {
          background: rgba(58,227,116,0.18);
          border-color: rgba(58,227,116,0.32);
        }

        .card-url-ico {
          font-size: 10px;
          opacity: 0.85;
          line-height: 1;
        }

        .card-url-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-desc {
          margin: 0;
          font-size: 13px;
          color: rgba(205,205,235,0.78);
          line-height: 1.62;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin-left: 8px;
        }

        .card-date {
          font-size: 11px;
          color: rgba(185,185,215,0.52);
          letter-spacing: 0.02em;
        }

        .card-handle {
          display: grid;
          grid-template-columns: repeat(3, 3px);
          grid-auto-rows: 3px;
          gap: 3px;
          opacity: 0.38;
          padding: 4px;
          cursor: grab;
          transition: opacity 0.2s ease;
        }

        .card-handle:hover { opacity: 0.7; }
        .card-handle:active { cursor: grabbing; }

        .card-handle span {
          width: 3px;
          height: 3px;
          background: #fff;
          border-radius: 9999px;
          box-shadow: 0 0 4px rgba(255,255,255,0.25);
        }
      `}</style>
    </article>
  )
}
