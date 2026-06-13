import React from 'react';
import { Shop } from '../types';
import { useNavigate } from 'react-router-dom';

interface CardProps {
  shop: Shop;
}

const Card: React.FC<CardProps> = ({ shop }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/shop/${shop.id}`);
  };

  return (
    <div style={styles.card} onClick={handleClick}>
      <div style={styles.cardHeader}>
        <h3 style={styles.shopName}>{shop.name}</h3>
        <div style={styles.rating}>
          <span style={styles.star}>⭐</span>
          <span style={styles.ratingText}>{shop.rating}</span>
        </div>
      </div>
      <p style={styles.address}>📍 {shop.address}</p>
      <div style={styles.services}>
        {shop.services.map((service) => (
          <span key={service.id} style={styles.serviceTag}>
            {service.name} ¥{service.price}
          </span>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'linear-gradient(135deg, #E3F2FD 0%, #E8F5E9 100%)',
    borderRadius: '12px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    userSelect: 'none',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  shopName: {
    fontSize: '1.15rem',
    fontWeight: '600',
    color: '#333',
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  star: {
    fontSize: '1rem',
  },
  ratingText: {
    fontWeight: '600',
    color: '#FF8C00',
    fontSize: '0.95rem',
  },
  address: {
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '16px',
  },
  services: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  serviceTag: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    color: '#555',
    fontWeight: '500',
  },
};

export default Card;
