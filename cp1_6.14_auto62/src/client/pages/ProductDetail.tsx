import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Product } from '../types';
import { useCartStore } from '../store/useCartStore';
import './ProductDetail.css';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  const toggleCart = useCartStore(state => state.toggleCart);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/products/${id}`);
      setProduct(res.data);
    } catch (err) {
      setError('加载产品详情失败');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getTotalPrice = () => {
    if (!product) return 0;
    return product.dailyRate * getDays();
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMinEndDate = () => {
    if (!startDate) return getMinDate();
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.stock === 0) {
      setError('该装备已租完');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (!startDate || !endDate || getDays() <= 0) {
      setError('请选择有效的租期');
      setTimeout(() => setError(''), 3000);
      return;
    }

    addItem({
      productId: product.id,
      productName: product.name,
      dailyRate: product.dailyRate,
      startDate,
      endDate,
      days: getDays()
    });

    setSuccessMsg('已加入购物车');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`star ${i < rating ? 'filled' : ''}`}>★</span>
    ));
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="error-message">产品不存在</div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      {error && <div className="error-banner">{error}</div>}
      {successMsg && <div className="success-banner">{successMsg}</div>}

      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="product-detail-container">
        <div className="product-image-section">
          <div 
            className="main-image-wrapper"
            onClick={() => setShowImageModal(true)}
          >
            <img src={product.imageUrl} alt={product.name} className="main-image" />
            <div className="zoom-hint">点击放大</div>
          </div>
        </div>

        <div className="product-info-section">
          <h1 className="product-title">{product.name}</h1>
          <div className="product-category-tag">{product.category}</div>
          
          <div className="product-price-large">
            <span className="price-symbol">¥</span>
            <span className="price-value">{product.dailyRate}</span>
            <span className="price-unit">/天</span>
          </div>

          <div className="stock-info">
            库存: <span className={product.stock > 0 ? 'in-stock' : 'out-of-stock'}>
              {product.stock}件
            </span>
          </div>

          <p className="product-description">{product.description}</p>

          <div className="specs-section">
            <h3>规格参数</h3>
            <ul className="specs-list">
              {Object.entries(product.specs).map(([key, value]) => (
                <li key={key}>
                  <span className="spec-label">{key}:</span>
                  <span className="spec-value">{value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rental-section">
            <h3>选择租期</h3>
            <div className="date-selectors">
              <div className="date-input-group">
                <label>开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  min={getMinDate()}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <label>结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  min={getMinEndDate()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>

            {getDays() > 0 && (
              <div className="price-summary">
                <span>共 {getDays()} 天</span>
                <span className="total-price">
                  总计: <strong>¥{getTotalPrice()}</strong>
                </span>
              </div>
            )}

            <button
              className={`add-to-cart-btn ${product.stock === 0 ? 'disabled' : ''}`}
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? '已租完' : '加入购物车'}
            </button>
          </div>
        </div>
      </div>

      <div className="reviews-section">
        <h2>用户评价</h2>
        <div className="reviews-list">
          {product.reviews.slice(0, 3).map(review => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <span className="review-user">{review.user}</span>
                <div className="review-stars">{renderStars(review.rating)}</div>
              </div>
              <p className="review-comment">{review.comment}</p>
              <span className="review-date">{review.date}</span>
            </div>
          ))}
        </div>
      </div>

      {showImageModal && (
        <div className="image-modal" onClick={() => setShowImageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={product.imageUrl} alt={product.name} className="modal-image" />
            <button className="close-modal" onClick={() => setShowImageModal(false)}>
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
