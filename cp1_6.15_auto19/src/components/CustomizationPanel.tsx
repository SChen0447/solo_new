import React from 'react'
import { useAppStore } from '../store'
import { 
  LEATHER_OPTIONS, 
  STITCH_OPTIONS, 
  HARDWARE_OPTIONS,
  CAMERA_ANGLES,
  ANGLE_LABELS
} from '../types'
import type { CustomizationEngine } from '../CustomizationEngine'
import { orderManager } from '../OrderManager'

interface CustomizationPanelProps {
  customizationEngine: CustomizationEngine | null
  onCapturePreview: (angle: string) => Promise<void>
}

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({ 
  customizationEngine,
  onCapturePreview
}) => {
  const { 
    selectedProduct, 
    currentCustomization, 
    updateCustomization,
    previewImages
  } = useAppStore()

  const handleLeatherChange = (leather: typeof LEATHER_OPTIONS[0]) => {
    updateCustomization({ leather })
    customizationEngine?.updateLeather(leather)
  }

  const handleStitchChange = (stitch: typeof STITCH_OPTIONS[0]) => {
    updateCustomization({ stitch })
    customizationEngine?.updateStitch(stitch)
  }

  const handleHardwareChange = (hardware: typeof HARDWARE_OPTIONS[0]) => {
    updateCustomization({ hardware })
    customizationEngine?.updateHardware(hardware)
  }

  const totalPrice = selectedProduct 
    ? orderManager.calculateTotalPrice(selectedProduct.basePrice, currentCustomization)
    : 0

  const LeatherTextureSVG: React.FC<{ color: string }> = ({ color }) => (
    <svg width="100%" height="100%" viewBox="0 0 40 40">
      <defs>
        <pattern id={`leather-${color}`} patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill={color} />
          <circle cx="2" cy="2" r="0.5" fill="rgba(0,0,0,0.1)" />
          <circle cx="4" cy="4" r="0.5" fill="rgba(0,0,0,0.1)" />
        </pattern>
      </defs>
      <rect width="40" height="40" fill={`url(#leather-${color})`} />
    </svg>
  )

  const MetalGradientSVG: React.FC<{ color: string }> = ({ color }) => (
    <svg width="100%" height="100%" viewBox="0 0 44 44">
      <defs>
        <radialGradient id={`metal-${color}`} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="50%" stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <circle cx="22" cy="22" r="20" fill={`url(#metal-${color})`} />
      <circle cx="18" cy="18" r="6" fill="rgba(255,255,255,0.2)" />
    </svg>
  )

  return (
    <aside className="customization-panel">
      <div className="customization-content">
        <h2 className="section-title">定制选项</h2>
        
        <div className="customization-section">
          <h3 className="subsection-title">皮料材质</h3>
          <div className="leather-options">
            {LEATHER_OPTIONS.map((option) => (
              <button
                key={option.id}
                className={`leather-btn ${currentCustomization.leather.id === option.id ? 'selected' : ''}`}
                onClick={() => handleLeatherChange(option)}
                title={option.name}
              >
                <LeatherTextureSVG color={option.color} />
                <span className="option-label">{option.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="customization-section">
          <h3 className="subsection-title">缝线颜色</h3>
          <div className="stitch-options">
            {STITCH_OPTIONS.map((option) => (
              <button
                key={option.id}
                className={`stitch-btn ${currentCustomization.stitch.id === option.id ? 'selected' : ''}`}
                onClick={() => handleStitchChange(option)}
                title={option.name}
                style={{ backgroundColor: option.color }}
              />
            ))}
          </div>
        </div>

        <div className="customization-section">
          <h3 className="subsection-title">五金配件</h3>
          <div className="hardware-options">
            {HARDWARE_OPTIONS.map((option) => (
              <button
                key={option.id}
                className={`hardware-btn ${currentCustomization.hardware.id === option.id ? 'selected' : ''}`}
                onClick={() => handleHardwareChange(option)}
                title={option.name}
              >
                <MetalGradientSVG color={option.color} />
                <span className="option-label">{option.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="customization-section">
          <h3 className="subsection-title">多角度预览</h3>
          <div className="angle-buttons">
            {Object.keys(CAMERA_ANGLES).map((angle) => (
              <button
                key={angle}
                className="angle-btn"
                onClick={() => onCapturePreview(angle)}
              >
                {ANGLE_LABELS[angle]}
              </button>
            ))}
          </div>
        </div>

        <div className="preview-thumbnails">
          {previewImages.length > 0 ? (
            <div className="thumbnails-scroll">
              {previewImages.map((preview) => (
                <div key={preview.angle} className="thumbnail-item">
                  <img src={preview.dataUrl} alt={ANGLE_LABELS[preview.angle]} />
                  <span className="thumbnail-label">{ANGLE_LABELS[preview.angle]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-preview-hint">点击上方按钮生成预览图</p>
          )}
        </div>
      </div>

      <div className="order-submit-section">
        <div className="price-display">
          <span className="price-label">总价</span>
          <span className="price-value">¥{totalPrice}</span>
        </div>
        <p className="current-selection">
          已选：{currentCustomization.leather.name} · {currentCustomization.stitch.name}线 · {currentCustomization.hardware.name}
        </p>
      </div>
    </aside>
  )
}
