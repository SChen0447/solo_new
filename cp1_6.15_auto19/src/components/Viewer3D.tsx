import React, { useRef, useEffect } from 'react'
import { CustomizationEngine } from '../CustomizationEngine'
import type { Product } from '../types'

interface Viewer3DProps {
  customizationEngine: CustomizationEngine | null
  selectedProduct: Product | null
  onEngineReady: (engine: CustomizationEngine) => void
}

export const Viewer3D: React.FC<Viewer3DProps> = ({ 
  customizationEngine,
  selectedProduct,
  onEngineReady
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<CustomizationEngine | null>(null)

  useEffect(() => {
    if (!containerRef.current || engineRef.current) return

    const engine = new CustomizationEngine()
    engine.init(containerRef.current)
    engineRef.current = engine
    onEngineReady(engine)

    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [onEngineReady])

  useEffect(() => {
    if (customizationEngine && selectedProduct) {
      const startTime = performance.now()
      customizationEngine.loadProduct(selectedProduct)
      const elapsed = performance.now() - startTime
      console.log(`[Viewer3D] Product loaded in ${elapsed.toFixed(2)}ms`)
    }
  }, [customizationEngine, selectedProduct])

  return (
    <div className="viewer-3d">
      <div className="viewer-header">
        <h2 className="section-title">
          {selectedProduct ? selectedProduct.name : '3D 预览区'}
        </h2>
        {selectedProduct && (
          <p className="product-desc-inline">{selectedProduct.description}</p>
        )}
      </div>
      <div ref={containerRef} className="viewer-container" />
      <div className="viewer-hint">
        <span>💡 拖拽旋转 · 滚轮缩放</span>
      </div>
    </div>
  )
}
