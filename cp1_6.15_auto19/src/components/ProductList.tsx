import React from 'react'
import { useAppStore } from '../store'
import type { Product } from '../types'

interface ProductListProps {
  onProductSelect: (product: Product) => void
}

const categoryIcons: Record<string, string> = {
  wallet: '👛',
  handbag: '👜',
  cardholder: '💳',
  belt: '🪢'
}

export const ProductList: React.FC<ProductListProps> = ({ onProductSelect }) => {
  const { products, selectedProduct } = useAppStore()

  return (
    <aside className="product-list">
      <h2 className="section-title">产品目录</h2>
      <div className="product-cards">
        {products.map((product) => (
          <div
            key={product.id}
            className={`product-card ${selectedProduct?.id === product.id ? 'selected' : ''}`}
            onClick={() => onProductSelect(product)}
          >
            <div className="product-icon">
              {categoryIcons[product.category] || '📦'}
            </div>
            <div className="product-info">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-desc">{product.description}</p>
              <p className="product-price">¥{product.basePrice}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
