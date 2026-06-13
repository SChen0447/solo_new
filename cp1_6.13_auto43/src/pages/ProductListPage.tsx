/**
 * ProductListPage.tsx - 商品列表页
 *
 * 支持按产地筛选，网格布局展示商品卡片
 * 数据流向：apiService.fetchProductsDebounced -> useState -> ProductCard props
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProducts, fetchProductsDebounced } from '../services/apiService';
import { useCart } from '../context/CartContext';
import type { Product } from '../services/apiService';
import ProductCard from '../components/ProductCard';

const ORIGINS = [
  { value: 'all', label: '全部产地' },
  { value: '本地', label: '本地' },
  { value: '进口', label: '进口' },
  { value: '有机', label: '有机' },
];

const ProductListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setProducts } = useCart();
  const [products, setLocalProducts] = useState<Product[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState(searchParams.get('origin') || 'all');
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(
    (origin: string) => {
      setLoading(true);
      if (origin === 'all') {
        fetchProducts().then((data) => {
          setLocalProducts(data.products);
          setProducts(data.products);
          setLoading(false);
        });
      } else {
        fetchProductsDebounced({ origin }, (data) => {
          setLocalProducts(data.products);
          setProducts(data.products);
          setLoading(false);
        });
      }
    },
    [setProducts]
  );

  useEffect(() => {
    loadProducts(selectedOrigin);
  }, [selectedOrigin, loadProducts]);

  const handleOriginChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedOrigin(value);
    if (value === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ origin: value });
    }
  };

  return (
    <>
      <style>{`
        .product-list-header {
          background: linear-gradient(135deg, #4caf50, #8bc34a);
          padding: 24px 32px;
          color: #fff;
        }
        .product-list-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 16px;
        }
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .filter-label {
          font-size: 14px;
          font-weight: 600;
          opacity: 0.9;
        }
        .origin-select {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          background: rgba(255,255,255,0.2);
          color: #fff;
          cursor: pointer;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .origin-select option { color: #333; background: #fff; }
        .product-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          padding: 24px 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .product-grid-loading {
          text-align: center;
          padding: 60px;
          color: #999;
          font-size: 16px;
        }
        @media (max-width: 1024px) {
          .product-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .product-grid {
            grid-template-columns: 1fr !important;
            padding: 16px;
          }
          .product-list-header { padding: 16px; }
          .product-list-header h1 { font-size: 20px; }
        }
      `}</style>

      <div className="product-list-header">
        <h1>🛒 商品列表</h1>
        <div className="filter-bar">
          <span className="filter-label">按产地筛选：</span>
          <select
            className="origin-select"
            value={selectedOrigin}
            onChange={handleOriginChange}
          >
            {ORIGINS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 14, opacity: 0.8 }}>
            共 {products.length} 件商品
          </span>
        </div>
      </div>

      {loading ? (
        <div className="product-grid-loading">加载中...</div>
      ) : (
        <div className="product-grid product-card-list">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  );
};

export default ProductListPage;
