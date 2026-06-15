import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useOrderStore } from '../stores/orderStore'

const OrderPreview: React.FC = () => {
  const {
    flowers,
    packaging,
    card,
    setCurrentPage,
    submitOrder
  } = useOrderStore()

  const bouquetRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLCanvasElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')

  const drawBouquet = useCallback(() => {
    const canvas = bouquetRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 400
    canvas.height = 400

    ctx.fillStyle = packaging?.color || '#fafafa'
    ctx.fillRect(0, 0, 400, 400)

    ctx.font = '80px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    flowers.forEach((f) => {
      ctx.fillText(f.emoji, f.x + 50, f.y + 50)
    })
  }, [flowers, packaging])

  const drawCard = useCallback(() => {
    const canvas = cardRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 300
    canvas.height = 200

    ctx.fillStyle = card.backgroundColor
    ctx.fillRect(0, 0, 300, 200)

    ctx.strokeStyle = '#333'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    card.doodles.forEach((path) => {
      if (path.length < 2) return
      ctx.beginPath()
      ctx.moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y)
      }
      ctx.stroke()
    })

    if (card.text) {
      ctx.font = '20px cursive'
      ctx.fillStyle = '#333'
      ctx.textAlign = 'center'
      ctx.fillText(card.text, 150, 180)
    }
  }, [card])

  useEffect(() => {
    drawBouquet()
    drawCard()
  }, [drawBouquet, drawCard])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const orderNo = await submitOrder()
      setOrderNumber(orderNo)
      setIsSubmitting(false)
      setShowConfirm(true)
    } catch {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    setCurrentPage('customize')
  }

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const ripple = document.createElement('span')
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    ripple.style.width = ripple.style.height = `${size}px`
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`
    ripple.classList.add('ripple')

    button.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
  }

  const flowerNames = flowers.map((f) => f.name).join('、')

  return (
    <div className="order-preview">
      <div className="preview-header">
        <h2>订单预览</h2>
      </div>

      <div className="preview-content">
        <div className="preview-images">
          <div className="preview-section">
            <h3>花束效果图</h3>
            <div className="bouquet-preview-wrapper">
              <canvas ref={bouquetRef} className="bouquet-preview" />
            </div>
          </div>

          <div className="preview-section">
            <h3>祝福卡片</h3>
            <div className="card-preview-wrapper">
              <canvas ref={cardRef} className="card-preview" />
            </div>
          </div>
        </div>

        <div className="order-summary">
          <h3>订单摘要</h3>
          <div className="summary-item">
            <span className="summary-label">花材：</span>
            <span className="summary-value">
              {flowerNames || '未选择花材'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">包装样式：</span>
            <span className="summary-value">
              {packaging?.name || '未选择'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">祝福语：</span>
            <span className="summary-value">
              {card.text ? `"${card.text}"` : '无'}
            </span>
          </div>
        </div>
      </div>

      <div className="preview-actions">
        <button
          className="btn btn-secondary"
          onClick={(e) => { handleRipple(e); handleBack() }}
          disabled={isSubmitting}
        >
          返回编辑
        </button>
        <button
          className="btn btn-primary"
          onClick={(e) => { handleRipple(e); handleSubmit() }}
          disabled={isSubmitting}
        >
          提交订单
        </button>
      </div>

      {isSubmitting && (
        <div className="loading-overlay">
          <div className="loading-flower">🌸</div>
          <p>正在提交订单...</p>
        </div>
      )}

      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🎉 订单已提交！</h3>
            <p className="order-number">订单编号：{orderNumber}</p>
            <button
              className="btn btn-primary confirm-btn"
              onClick={() => setShowConfirm(false)}
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderPreview
