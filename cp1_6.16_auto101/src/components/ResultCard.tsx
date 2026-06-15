import React, { useRef, useEffect, useState } from 'react'
import { DiffResult } from '../core/DiffCalculator'
import '../styles/ResultCard.css'

interface ResultCardProps {
  viewport: number
  diffResult: DiffResult
  isExpanded: boolean
  onClick: () => void
  isSelected: boolean
  onSelect: (selected: boolean) => void
}

const ResultCard: React.FC<ResultCardProps> = ({
  viewport,
  diffResult,
  isExpanded,
  onClick,
  isSelected,
  onSelect
}) => {
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (diffResult && thumbnailCanvasRef.current) {
      const canvas = thumbnailCanvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const thumbWidth = 160
        const thumbHeight = Math.floor((diffResult.height / diffResult.width) * thumbWidth)
        canvas.width = thumbWidth
        canvas.height = thumbHeight

        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = diffResult.width
        tempCanvas.height = diffResult.height
        const tempCtx = tempCanvas.getContext('2d')!
        tempCtx.putImageData(diffResult.overlayImageData, 0, 0)

        ctx.drawImage(tempCanvas, 0, 0, thumbWidth, thumbHeight)
      }
    }
  }, [diffResult])

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(!isSelected)
  }

  return (
    <div
      className={`result-card ${isExpanded ? 'expanded' : ''} ${hovered ? 'hovered' : ''} ${
        isSelected ? 'selected' : ''
      }`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="card-checkbox" onClick={handleCheckboxClick}>
        <input type="checkbox" checked={isSelected} onChange={() => {}} readOnly />
      </div>

      <div className="card-thumbnail">
        <canvas ref={thumbnailCanvasRef} className="thumbnail-canvas" />
        <div className="viewport-tag">{viewport}px</div>
      </div>

      <div className="card-info">
        <div className="card-title">{viewport}px 视口</div>
        <div className="card-stats">
          <span className="stat diff-stat">
            <span className="stat-icon">
              <svg viewBox="0 0 16 16" width="12" height="12">
                <circle cx="8" cy="8" r="6" fill="currentColor" />
              </svg>
            </span>
            {diffResult.diffCount.toLocaleString()} 像素差异
          </span>
          <span className="stat percent-stat">{diffResult.diffPercentage.toFixed(2)}%</span>
        </div>
      </div>

      <div className="card-expand-icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d={isExpanded ? 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z' : 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z'} />
        </svg>
      </div>

      {isExpanded && (
        <div className="card-expanded-content">
          <div className="expanded-stats">
            <div className="expanded-stat">
              <div className="expanded-stat-value">{diffResult.diffCount.toLocaleString()}</div>
              <div className="expanded-stat-label">差异像素数</div>
            </div>
            <div className="expanded-stat">
              <div className="expanded-stat-value">{diffResult.diffPercentage.toFixed(2)}%</div>
              <div className="expanded-stat-label">差异比例</div>
            </div>
            <div className="expanded-stat">
              <div className="expanded-stat-value">{diffResult.hashSimilarity.toFixed(1)}</div>
              <div className="expanded-stat-label">哈希相似度</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResultCard
