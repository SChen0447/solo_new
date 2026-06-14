import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  style?: React.CSSProperties;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, style }) => {
  const navigate = useNavigate();

  const getStockColor = () => {
    if (product.stock > 20) return '#27ae60';
    if (product.stock > 0) return '#f39c12';
    return '#e74c3c';
  };

  const handleClick = () => {
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="product-card" style={style} onClick={handleClick}>
      <div className="stock-dot" style={{ backgroundColor: getStockColor() }}></div>
      {product.stock === 0 && <div className="sold-out-badge">已租完</div>}
      <div className="product-image-wrapper">
        <img src={product.imageUrl} alt={product.name} className="product-image" />
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <div className="product-category">{product.category}</div>
        <div className="product-price">
          <span className="price-symbol">¥</span>
          <span className="price-value">{product.dailyRate}</span>
          <span className="price-unit">/天</span>
        </div>
        <div className="product-stock">
          库存: {product.stock}件
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
