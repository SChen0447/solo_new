import React from 'react';
import { Shop } from '../types';
import { useNavigate } from 'react-router-dom';
import './Card.css';

interface CardProps {
  shop: Shop;
}

const Card: React.FC<CardProps> = ({ shop }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/shop/${shop.id}`);
  };

  return (
    <div className="shop-card" onClick={handleClick}>
      <div className="shop-card-header">
        <h3 className="shop-card-name">{shop.name}</h3>
        <div className="shop-card-rating">
          <span>⭐</span>
          <span className="shop-card-rating-text">{shop.rating}</span>
        </div>
      </div>
      <p className="shop-card-address">📍 {shop.address}</p>
      <div className="shop-card-services">
        {shop.services.map((service) => (
          <span key={service.id} className="shop-card-service-tag">
            {service.name} ¥{service.price}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Card;
