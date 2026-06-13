/**
 * ProductCard.tsx - 商品卡片组件
 *
 * 接收商品数据 props，渲染图片、名称、价格、产地标签
 * 点击后跳转商品详情页，点击"加入购物车"触发绿色脉冲光晕 + Web Audio 叮声
 * 数据流向：CartContext.addToCart <- 本组件调用
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import type { Product } from '../services/apiService';

interface ProductCardProps {
  product: Product;
}

let audioCtx: AudioContext | null = null;

function playDingSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window as any).AudioContext() || new (window as any).webkitAudioContext();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    // Web Audio API not available
  }
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  imageWrapper: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  info: {
    padding: '12px 16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: 600,
    color: '#2d5016',
    margin: 0,
  },
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  price: {
    fontSize: 18,
    fontWeight: 700,
    color: '#e67e22',
  },
  originTag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
    background: 'rgba(76,175,80,0.1)',
    color: '#4caf50',
    marginRight: 6,
  },
  cartBtn: {
    padding: '6px 16px',
    borderRadius: 6,
    border: 'none',
    background: 'linear-gradient(135deg, #4caf50, #8bc34a)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.15s, opacity 0.15s',
    flexShrink: 0,
  },
  pulseOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    pointerEvents: 'none' as const,
    animation: 'greenPulse 1s ease-out forwards',
  },
};

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [showPulse, setShowPulse] = useState(false);

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleAddToCart = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowPulse(true);
      playDingSound();

      await addToCart(product.id, 1);

      setTimeout(() => setShowPulse(false), 1000);
    },
    [addToCart, product.id]
  );

  return (
    <>
      <style>{`
        @keyframes greenPulse {
          0% { box-shadow: 0 0 0 0 rgba(76,175,80,0.6); }
          50% { box-shadow: 0 0 20px 10px rgba(76,175,80,0.3); }
          100% { box-shadow: 0 0 0 0 rgba(76,175,80,0); }
        }

        .product-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15) !important;
        }

        .product-card .cart-btn:hover {
          opacity: 0.9;
        }

        .product-card .cart-btn:active {
          transform: scale(0.95);
        }

        @media (max-width: 768px) {
          .product-card-list {
            grid-template-columns: 1fr !important;
          }
          .product-card .image-wrapper {
            height: 150px !important;
          }
        }
      `}</style>
      <div
        className="product-card"
        style={styles.card}
        onClick={handleCardClick}
      >
        {showPulse && <div style={styles.pulseOverlay} />}
        <div className="image-wrapper" style={styles.imageWrapper}>
          <img
            src={product.imageUrl}
            alt={product.name}
            style={styles.image}
            loading="lazy"
          />
        </div>
        <div style={styles.info}>
          <div>
            <span style={styles.originTag}>{product.origin}</span>
            {product.season && product.season.map((s) => (
              <span key={s} style={{ ...styles.originTag, background: 'rgba(255,152,0,0.1)', color: '#ff9800' }}>
                {s}季
              </span>
            ))}
          </div>
          <p style={styles.name}>{product.name}</p>
          <div style={styles.priceRow}>
            <span style={styles.price}>¥{product.price.toFixed(1)}</span>
            <button
              className="cart-btn"
              style={styles.cartBtn}
              onClick={handleAddToCart}
            >
              加入购物车
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductCard;
