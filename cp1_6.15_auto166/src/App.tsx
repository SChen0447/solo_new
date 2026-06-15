import React, { useState } from 'react'
import { useOrderStore, FLOWER_LIST, PACKAGING_LIST, FlowerItem } from './stores/orderStore'
import CustomizationCanvas from './components/CustomizationCanvas'
import CardCanvas from './components/CardCanvas'
import OrderPreview from './pages/OrderPreview'

const App: React.FC = () => {
  const {
    packaging,
    setPackaging,
    setCurrentPage,
    currentPage,
    flowers
  } = useOrderStore()

  const [isCardOpen, setIsCardOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedFlowerId, setSelectedFlowerId] = useState<string | null>(null)

  const handleFlowerDragStart = (e: React.DragEvent, flower: FlowerItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(flower))
    e.dataTransfer.effectAllowed = 'copy'
    ;(e.target as HTMLElement).dataset.flowerEmoji = flower.emoji
    setSelectedFlowerId(flower.id)
  }

  const handleFlowerDragEnd = () => {
    setSelectedFlowerId(null)
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

  const handlePreview = () => {
    setCurrentPage('preview')
  }

  if (currentPage === 'preview') {
    return <OrderPreview />
  }

  return (
    <div className="app">
      <button
        className="mobile-menu-toggle"
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
      >
        ☰
      </button>

      <aside className={`side-panel ${isDrawerOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h1>💐 花坊定制</h1>
        </div>

        <div className="panel-section">
          <h3>花材选择</h3>
          <div className="flower-list">
            {FLOWER_LIST.map((flower) => (
              <div
                key={flower.id}
                className={`flower-card ${selectedFlowerId === flower.id ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleFlowerDragStart(e, flower)}
                onDragEnd={handleFlowerDragEnd}
                onClick={() => setSelectedFlowerId(flower.id)}
                title={`拖拽 ${flower.name} 到画布`}
              >
                <div className="flower-thumb">
                  <span>{flower.emoji}</span>
                </div>
                <span className="flower-name">{flower.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h3>包装样式</h3>
          <div className="packaging-list">
            {PACKAGING_LIST.map((style) => (
              <div
                key={style.id}
                className={`packaging-card ${packaging?.id === style.id ? 'selected' : ''}`}
                onClick={() => setPackaging(style)}
              >
                <div
                  className="packaging-preview"
                  style={{ backgroundColor: style.color }}
                >
                  {packaging?.id === style.id && (
                    <span className="check-icon">✓</span>
                  )}
                </div>
                <span className="packaging-name">{style.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-footer">
          <p className="hint">提示：双击画布上的花材可删除</p>
        </div>
      </aside>

      <main className="main-content">
        <div className="main-header">
          <h2>定制您的专属花束</h2>
          <p>选择花材、设计卡片，打造独一无二的心意</p>
        </div>

        <div className="canvas-area">
          <CustomizationCanvas packaging={packaging} />
        </div>

        <div className="action-area">
          <button
            className="btn btn-outline"
            onClick={(e) => { handleRipple(e); setIsCardOpen(true) }}
          >
            ✏️ 设计卡片
          </button>
          <button
            className="btn btn-primary"
            onClick={(e) => { handleRipple(e); handlePreview() }}
            disabled={flowers.length === 0}
          >
            预览订单 →
          </button>
        </div>
      </main>

      <CardCanvas isOpen={isCardOpen} onClose={() => setIsCardOpen(false)} />

      {isDrawerOpen && (
        <div
          className="drawer-overlay"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
    </div>
  )
}

export default App
