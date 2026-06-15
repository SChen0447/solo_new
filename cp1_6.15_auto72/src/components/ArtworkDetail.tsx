import { useState, useEffect, useRef } from 'react'
import type { Artwork } from '@/types'
import { exhibitionApi } from '@/api/exhibitionApi'
import './ArtworkDetail.css'

interface ArtworkDetailProps {
  artwork: Artwork | null
  onClose: () => void
}

const ArtworkDetail = ({ artwork, onClose }: ArtworkDetailProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const visitorIdRef = useRef<string>(`visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

  useEffect(() => {
    if (artwork) {
      setIsVisible(true)
      startTimeRef.current = Date.now()
    } else {
      setIsVisible(false)
    }
  }, [artwork])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && artwork) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [artwork])

  const handleClose = () => {
    if (artwork && startTimeRef.current) {
      const duration = (Date.now() - startTimeRef.current) / 1000
      exhibitionApi.postVisitLog(artwork.id, duration, visitorIdRef.current).catch(console.error)
    }
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!artwork) return null

  return (
    <div
      className={`artwork-detail-overlay ${isVisible ? 'visible' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={`artwork-detail-card ${isVisible ? 'visible' : ''}`}>
        <button className="artwork-detail-close" onClick={handleClose}>
          ×
        </button>
        <div className="artwork-detail-header">
          <h2 className="artwork-detail-title">{artwork.name}</h2>
          <div className="artwork-detail-author">
            <span className="artwork-detail-label">作者</span>
            <span className="artwork-detail-author-name">{artwork.author}</span>
          </div>
        </div>
        <div className="artwork-detail-meta">
          <div className="artwork-detail-meta-item">
            <span className="artwork-detail-label">创作年份</span>
            <span className="artwork-detail-value">{artwork.year}</span>
          </div>
        </div>
        <div className="artwork-detail-description">
          <span className="artwork-detail-label">作品简介</span>
          <p className="artwork-detail-description-text">{artwork.description}</p>
        </div>
      </div>
    </div>
  )
}

export default ArtworkDetail
