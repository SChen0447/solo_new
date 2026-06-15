import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from './store'
import { Header } from './components/Header'
import { ProductList } from './components/ProductList'
import { Viewer3D } from './components/Viewer3D'
import { CustomizationPanel } from './components/CustomizationPanel'
import { OrderForm } from './components/OrderForm'
import { AdminPanel } from './components/AdminPanel'
import type { CustomizationEngine } from './CustomizationEngine'
import type { Product } from './types'

export const MainComponent: React.FC = () => {
  const { 
    currentView, 
    selectedProduct, 
    setSelectedProduct,
    fetchProducts,
    addPreviewImage,
    clearPreviewImages
  } = useAppStore()

  const [customizationEngine, setCustomizationEngine] = useState<CustomizationEngine | null>(null)
  const [showOrderForm, setShowOrderForm] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleEngineReady = useCallback((engine: CustomizationEngine) => {
    setCustomizationEngine(engine)
  }, [])

  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product)
    clearPreviewImages()
    setShowOrderForm(false)
  }, [setSelectedProduct, clearPreviewImages])

  const handleCapturePreview = useCallback(async (angle: string) => {
    if (!customizationEngine) return

    try {
      const preview = await customizationEngine.captureAnglePreview(angle)
      if (preview) {
        addPreviewImage(preview)
      }
    } catch (error) {
      console.error('Failed to capture preview:', error)
    }
  }, [customizationEngine, addPreviewImage])

  const handleOrderSubmitSuccess = useCallback(() => {
    setShowOrderForm(false)
  }, [])

  return (
    <div className="app">
      <Header />
      
      {currentView === 'customize' ? (
        <div className="main-content">
          <ProductList onProductSelect={handleProductSelect} />
          
          <main className="center-section">
            <Viewer3D 
              customizationEngine={customizationEngine}
              selectedProduct={selectedProduct}
              onEngineReady={handleEngineReady}
            />
            
            {!showOrderForm ? (
              <div className="order-section">
                <button 
                  className="submit-btn order-toggle-btn"
                  onClick={() => setShowOrderForm(true)}
                >
                  填写订单信息
                </button>
              </div>
            ) : (
              <OrderForm onSubmitSuccess={handleOrderSubmitSuccess} />
            )}
          </main>
          
          <CustomizationPanel 
            customizationEngine={customizationEngine}
            onCapturePreview={handleCapturePreview}
          />
        </div>
      ) : (
        <AdminPanel />
      )}
    </div>
  )
}
