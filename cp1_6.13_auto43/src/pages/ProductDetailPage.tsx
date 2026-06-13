/**
 * ProductDetailPage.tsx - 商品详情页
 *
 * 显示商品完整信息：大图、名称、价格、产地、营养成分表
 * 加入购物车按钮：悬停变橙色，点击变"已添加"+ 勾选动画
 * 数据流向：apiService.fetchProductById -> useState -> 渲染
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProductById } from '../services/apiService';
import { useCart } from '../context/CartContext';
import type { Product } from '../services/apiService';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, products } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id, 10);

    const cached = products.find((p) => p.id === numId);
    if (cached) {
      setProduct(cached);
      setLoading(false);
    } else {
      fetchProductById(numId)
        .then((data) => setProduct(data.product))
        .catch(() => navigate('/products'))
        .finally(() => setLoading(false));
    }
  }, [id, products, navigate]);

  const handleAddToCart = useCallback(async () => {
    if (!product || added) return;
    await addToCart(product.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [product, added, addToCart]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>;
  }

  if (!product) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>商品不存在</div>;
  }

  const nutritionEntries = Object.entries(product.nutrition);

  return (
    <>
      <style>{`
        @keyframes checkSlide {
          0% { opacity: 0; transform: translateX(-10px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .detail-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 32px;
        }
        .detail-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid #ddd;
          background: #fff;
          font-size: 14px;
          cursor: pointer;
          color: #666;
          margin-bottom: 24px;
          transition: background 0.2s;
        }
        .detail-back:hover { background: #f5f5f5; }
        .detail-layout {
          display: flex;
          gap: 40px;
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .detail-image-section {
          flex: 1;
          min-width: 0;
        }
        .detail-image-section img {
          width: 100%;
          height: 420px;
          object-fit: cover;
          display: block;
        }
        .detail-info-section {
          flex: 1;
          padding: 32px;
          display: flex;
          flex-direction: column;
        }
        .detail-name {
          font-size: 28px;
          font-weight: 700;
          color: #2d5016;
          margin: 0 0 12px;
        }
        .detail-price {
          font-size: 32px;
          font-weight: 800;
          color: #e67e22;
          margin: 0 0 16px;
        }
        .detail-tags {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .detail-tag {
          padding: 4px 14px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 600;
        }
        .detail-add-btn {
          margin-top: auto;
          padding: 16px 32px;
          border-radius: 8px;
          border: none;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          transition: background 0.3s, transform 0.15s;
          background: linear-gradient(135deg, #4caf50, #8bc34a);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .detail-add-btn:hover {
          background: linear-gradient(135deg, #e67e22, #f39c12);
        }
        .detail-add-btn:active { transform: scale(0.95); }
        .detail-add-btn.added {
          background: linear-gradient(135deg, #8bc34a, #4caf50);
        }
        .check-icon {
          display: inline-block;
          animation: checkSlide 0.3s ease-out;
        }
        .nutrition-section {
          margin-top: 32px;
        }
        .nutrition-title {
          font-size: 18px;
          font-weight: 700;
          color: #2d5016;
          margin: 0 0 12px;
        }
        .nutrition-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 8px;
          overflow: hidden;
        }
        .nutrition-table th {
          background: linear-gradient(135deg, #4caf50, #8bc34a);
          color: #fff;
          padding: 12px 16px;
          text-align: left;
          font-size: 14px;
        }
        .nutrition-table td {
          padding: 10px 16px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
          color: #555;
        }
        .nutrition-table tr:nth-child(even) td {
          background: #fafff5;
        }
        @media (max-width: 768px) {
          .detail-layout { flex-direction: column; }
          .detail-image-section img { height: 260px; }
          .detail-container { padding: 16px; }
          .detail-name { font-size: 22px; }
          .detail-price { font-size: 26px; }
        }
      `}</style>

      <div className="detail-container">
        <button className="detail-back" onClick={() => navigate(-1)}>
          ← 返回
        </button>

        <div className="detail-layout">
          <div className="detail-image-section">
            <img src={product.imageUrl} alt={product.name} />
          </div>

          <div className="detail-info-section">
            <h1 className="detail-name">{product.name}</h1>
            <p className="detail-price">¥{product.price.toFixed(1)}</p>

            <div className="detail-tags">
              <span className="detail-tag" style={{ background: 'rgba(76,175,80,0.1)', color: '#4caf50' }}>
                {product.origin}
              </span>
              {product.season.map((s) => (
                <span
                  key={s}
                  className="detail-tag"
                  style={{ background: 'rgba(255,152,0,0.1)', color: '#ff9800' }}
                >
                  {s}季
                </span>
              ))}
              <span className="detail-tag" style={{ background: 'rgba(33,150,243,0.1)', color: '#2196f3' }}>
                {product.category}
              </span>
            </div>

            <div className="nutrition-section">
              <h3 className="nutrition-title">📊 营养成分</h3>
              <table className="nutrition-table">
                <thead>
                  <tr>
                    <th>营养素</th>
                    <th>含量</th>
                  </tr>
                </thead>
                <tbody>
                  {nutritionEntries.map(([key, val]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              className={`detail-add-btn ${added ? 'added' : ''}`}
              onClick={handleAddToCart}
              style={{ marginTop: 24 }}
            >
              {added ? (
                <>
                  <span className="check-icon">✓</span>
                  已添加
                </>
              ) : (
                '加入购物车'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage;
