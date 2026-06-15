import { useState } from 'react'
import { useStore } from '@/store'
import { PartType, PartColor, COLOR_MAP, PART_LABELS, COLOR_LABELS } from '@/types'
import './PartsPalette.css'

const PART_TYPES: PartType[] = ['plate2x2', 'brick2x4', 'cube1x1', 'slope']
const COLORS: PartColor[] = ['red', 'blue', 'yellow', 'green']

export default function PartsPalette() {
  const {
    selectedPartType,
    selectedColor,
    setSelectedPartType,
    setSelectedColor,
    isPartsPaletteOpen,
    setPartsPaletteOpen,
  } = useStore()

  const [activeTab, setActiveTab] = useState<'parts' | 'colors'>('parts')

  const handleDragStart = (e: React.DragEvent, type: PartType, color: PartColor) => {
    e.dataTransfer.setData('partType', type)
    e.dataTransfer.setData('partColor', color)
    e.dataTransfer.effectAllowed = 'copy'
    setSelectedPartType(type)
    setSelectedColor(color)
  }

  const PartIcon = ({ type, color }: { type: PartType; color: PartColor }) => {
    const bgColor = COLOR_MAP[color]
    const iconStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }

    const baseStyle: React.CSSProperties = {
      backgroundColor: bgColor,
      borderRadius: '4px',
      boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.2), inset 2px 2px 0 rgba(255,255,255,0.2)',
    }

    switch (type) {
      case 'plate2x2':
        return (
          <div style={iconStyle}>
            <div style={{ ...baseStyle, width: '48px', height: '12px' }} />
          </div>
        )
      case 'brick2x4':
        return (
          <div style={iconStyle}>
            <div style={{ ...baseStyle, width: '56px', height: '28px' }} />
          </div>
        )
      case 'cube1x1':
        return (
          <div style={iconStyle}>
            <div style={{ ...baseStyle, width: '32px', height: '32px' }} />
          </div>
        )
      case 'slope':
        return (
          <div style={iconStyle}>
            <div
              style={{
                ...baseStyle,
                width: '44px',
                height: '32px',
                clipPath: 'polygon(0 100%, 100% 100%, 100% 0)',
              }}
            />
          </div>
        )
    }
  }

  return (
    <>
      <button
        className={`palette-toggle ${isPartsPaletteOpen ? 'hidden' : ''}`}
        onClick={() => setPartsPaletteOpen(true)}
      >
        🧱
      </button>

      <div className={`parts-palette ${isPartsPaletteOpen ? 'open' : ''}`}>
        <div className="palette-header">
          <h2>零件库</h2>
          <button className="close-btn" onClick={() => setPartsPaletteOpen(false)}>
            ✕
          </button>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'parts' ? 'active' : ''}`}
            onClick={() => setActiveTab('parts')}
          >
            形状
          </button>
          <button
            className={`tab ${activeTab === 'colors' ? 'active' : ''}`}
            onClick={() => setActiveTab('colors')}
          >
            颜色
          </button>
        </div>

        <div className="selected-info">
          <div className="selected-preview">
            <PartIcon type={selectedPartType} color={selectedColor} />
          </div>
          <div className="selected-text">
            <span>{PART_LABELS[selectedPartType]}</span>
            <span style={{ color: COLOR_MAP[selectedColor] }}>
              {COLOR_LABELS[selectedColor]}
            </span>
          </div>
        </div>

        {activeTab === 'parts' && (
          <div className="parts-grid">
            {PART_TYPES.map((type) => (
              <div
                key={type}
                className={`part-item ${selectedPartType === type ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, type, selectedColor)}
                onClick={() => setSelectedPartType(type)}
              >
                <PartIcon type={type} color={selectedColor} />
                <span className="part-label">{PART_LABELS[type]}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="colors-grid">
            {COLORS.map((color) => (
              <div
                key={color}
                className={`color-item ${selectedColor === color ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, selectedPartType, color)}
                onClick={() => setSelectedColor(color)}
              >
                <div
                  className="color-swatch"
                  style={{ backgroundColor: COLOR_MAP[color] }}
                />
                <span className="color-label">{COLOR_LABELS[color]}</span>
              </div>
            ))}
          </div>
        )}

        <div className="all-combinations">
          <h3>快速拖拽</h3>
          <div className="combinations-grid">
            {PART_TYPES.map((type) => (
              <div key={type} className="combination-row">
                <span className="row-label">{PART_LABELS[type]}</span>
                <div className="combination-colors">
                  {COLORS.map((color) => (
                    <div
                      key={`${type}-${color}`}
                      className="combination-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, type, color)}
                      title={`${PART_LABELS[type]} - ${COLOR_LABELS[color]}`}
                    >
                      <PartIcon type={type} color={color} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
