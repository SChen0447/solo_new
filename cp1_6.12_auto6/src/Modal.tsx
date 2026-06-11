import { useState, useEffect, useRef } from 'preact/hooks'
import type { Inspiration } from './storage'

interface ModalProps {
  item: Inspiration | null
  onClose: () => void
  onUpdateNotes: (id: string, notes: string) => void
  onDelete: (id: string) => void
}

export function Modal({ item, onClose, onUpdateNotes, onDelete }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [notes, setNotes] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)
  const notesRef = useRef<string>('')

  useEffect(() => {
    if (item) {
      setNotes(item.notes || '')
      notesRef.current = item.notes || ''
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
    } else {
      setIsVisible(false)
    }
  }, [item?.id])

  useEffect(() => {
    if (!item) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [item])

  const handleClose = () => {
    if (notes !== notesRef.current && item) {
      onUpdateNotes(item.id, notes)
      notesRef.current = notes
    }
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const handleDelete = () => {
    if (!item) return
    if (confirm('确定要删除这个灵感吗？')) {
      onDelete(item.id)
      setIsVisible(false)
      setTimeout(onClose, 200)
    }
  }

  if (!item) return null

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  const getFavicon = (url: string) => {
    try {
      const u = new URL(url)
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`
    } catch {
      return ''
    }
  }

  return (
    <div
      class="modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      <div
        ref={modalRef}
        class="modal-content"
        style={{
          '--tag-color': item.colorTag,
          transform: isVisible
            ? 'scale(1) translateY(0)'
            : 'scale(0.85) translateY(30px)',
          opacity: isVisible ? 1 : 0
        }}
      >
        <div class="modal-header">
          <div class="modal-tag" style={{ background: item.colorTag }} />
          <h2 class="modal-title">{item.title || '无标题'}</h2>
          <button class="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        {item.url && (
          <a
            class="modal-link-preview"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="link-preview-icon" style={{ background: item.colorTag + '22' }}>
              {getFavicon(item.url) ? (
                <img src={getFavicon(item.url)} alt="" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }} />
              ) : (
                <span>🔗</span>
              )}
            </div>
            <div class="link-preview-info">
              <span class="link-preview-url">{item.url}</span>
              <span class="link-preview-domain">{getDomain(item.url)}</span>
            </div>
            <span class="link-preview-arrow">↗</span>
          </a>
        )}

        {item.description && (
          <div class="modal-section">
            <h4 class="modal-section-title">描述</h4>
            <p class="modal-description">{item.description}</p>
          </div>
        )}

        <div class="modal-section">
          <h4 class="modal-section-title">备注</h4>
          <textarea
            class="modal-notes"
            value={notes}
            onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
            onBlur={() => {
              if (notes !== notesRef.current) {
                onUpdateNotes(item.id, notes)
                notesRef.current = notes
              }
            }}
            placeholder="添加你的想法和备注..."
            rows={4}
          />
        </div>

        <div class="modal-footer">
          <span class="modal-created">
            创建于 {new Date(item.createdAt).toLocaleString('zh-CN')}
          </span>
          <button class="modal-delete" onClick={handleDelete}>
            删除
          </button>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 8, 30, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          transition: opacity 0.3s ease;
        }

        .modal-content {
          position: relative;
          background: rgba(30, 27, 75, 0.85);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border-radius: 20px;
          padding: 28px;
          width: 100%;
          max-width: 520px;
          max-height: 85vh;
          overflow-y: auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5),
                      0 0 60px rgba(58, 227, 116, 0.1);
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.3s ease;
        }

        .modal-content::-webkit-scrollbar {
          width: 6px;
        }

        .modal-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .modal-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
        }

        .modal-tag {
          width: 6px;
          min-height: 28px;
          border-radius: 3px;
          margin-top: 4px;
          flex-shrink: 0;
        }

        .modal-title {
          margin: 0;
          flex: 1;
          font-size: 22px;
          font-weight: 700;
          color: #f0f0ff;
          line-height: 1.3;
          word-break: break-word;
        }

        .modal-close {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
          line-height: 1;
          padding-bottom: 4px;
        }

        .modal-close:hover {
          background: rgba(255, 107, 107, 0.3);
          transform: rotate(90deg);
        }

        .modal-link-preview {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 20px;
          transition: all 0.2s ease;
        }

        .modal-link-preview:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(58, 227, 116, 0.3);
        }

        .link-preview-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .link-preview-icon img {
          width: 24px;
          height: 24px;
        }

        .link-preview-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .link-preview-url {
          font-size: 13px;
          color: #3ae374;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .link-preview-domain {
          font-size: 11px;
          color: rgba(200, 200, 230, 0.5);
        }

        .link-preview-arrow {
          color: rgba(255, 255, 255, 0.4);
          font-size: 18px;
          flex-shrink: 0;
        }

        .modal-section {
          margin-bottom: 20px;
        }

        .modal-section-title {
          margin: 0 0 10px 0;
          font-size: 13px;
          font-weight: 600;
          color: rgba(200, 200, 230, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .modal-description {
          margin: 0;
          font-size: 14px;
          color: rgba(220, 220, 240, 0.85);
          line-height: 1.7;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .modal-notes {
          width: 100%;
          min-height: 100px;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(10, 8, 30, 0.4);
          color: #e0e0f0;
          font-size: 14px;
          line-height: 1.6;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }

        .modal-notes:focus {
          outline: none;
          border-color: rgba(58, 227, 116, 0.5);
          box-shadow: 0 0 0 3px rgba(58, 227, 116, 0.1);
        }

        .modal-notes::placeholder {
          color: rgba(180, 180, 210, 0.3);
        }

        .modal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          margin-top: 8px;
        }

        .modal-created {
          font-size: 12px;
          color: rgba(180, 180, 210, 0.4);
        }

        .modal-delete {
          padding: 8px 18px;
          border-radius: 8px;
          border: none;
          background: rgba(255, 107, 107, 0.15);
          color: #ff6b6b;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-delete:hover {
          background: rgba(255, 107, 107, 0.3);
          transform: translateY(-1px);
        }

        @media (max-width: 480px) {
          .modal-content {
            padding: 20px;
            border-radius: 16px;
          }

          .modal-title {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  )
}
