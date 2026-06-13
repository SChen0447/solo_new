/**
 * HomePage.tsx - 首页
 *
 * 展示季节分类轮播区（春/夏/秋/冬），每类显示5个商品缩略图
 * 数据流向：apiService.fetchProducts -> useState -> ProductCard props
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../services/apiService';
import { useCart } from '../context/CartContext';
import type { Product } from '../services/apiService';

const SEASONS = ['春', '夏', '秋', '冬'];
const SEASON_ICONS: Record<string, string> = { '春': '🌸', '夏': '☀️', '秋': '🍂', '冬': '❄️' };
const SEASON_COLORS: Record<string, string> = {
  '春': 'linear-gradient(135deg, #a8e063, #56ab2f)',
  '夏': 'linear-gradient(135deg, #f7971e, #ffd200)',
  '秋': 'linear-gradient(135deg, #f2994a, #f2c94c)',
  '冬': 'linear-gradient(135deg, #89f7fe, #66a6ff)',
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setProducts } = useCart();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [activeSeason, setActiveSeason] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    fetchProducts().then((data) => {
      setAllProducts(data.products);
      setProducts(data.products);
    });
  }, [setProducts]);

  const getSeasonProducts = (season: string): Product[] => {
    return allProducts.filter((p) => p.season.includes(season)).slice(0, 5);
  };

  const handleSeasonChange = (index: number) => {
    if (index === activeSeason || isTransitioning) return;
    setIsTransitioning(true);
    setActiveSeason(index);
    setSlideOffset(index * 100);
    setTimeout(() => setIsTransitioning(false), 400);
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-banner {
          background: linear-gradient(135deg, #4caf50 0%, #8bc34a 40%, #cddc39 70%, #ffeb3b 100%);
          color: #fff;
          padding: 60px 40px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .hero-banner::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(ellipse, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: fadeInUp 1s ease-out;
        }
        .season-tabs {
          display: flex;
          justify-content: center;
          gap: 0;
          padding: 24px 0 0;
          position: relative;
        }
        .season-tab {
          padding: 12px 32px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: rgba(255,255,255,0.8);
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
        }
        .season-tab:first-child { border-radius: 8px 0 0 8px; }
        .season-tab:last-child { border-radius: 0 8px 8px 0; }
        .season-tab.active {
          background: rgba(255,255,255,0.3);
          color: #fff;
        }
        .season-indicator {
          position: absolute;
          bottom: 0;
          height: 3px;
          background: rgba(255,255,255,0.7);
          border-radius: 2px;
          transition: left 0.4s cubic-bezier(0.4,0,0.2,1), width 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        .carousel-container {
          overflow: hidden;
          margin: 24px auto;
          max-width: 1200px;
          padding: 0 20px;
        }
        .carousel-track {
          display: flex;
          transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        .carousel-slide {
          min-width: 100%;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          padding: 8px 0;
        }
        .season-product-thumb {
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .season-product-thumb:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        .season-product-thumb img {
          width: 100%;
          height: 140px;
          object-fit: cover;
        }
        .season-product-thumb .thumb-info {
          padding: 10px 12px;
        }
        .season-product-thumb .thumb-name {
          font-size: 14px;
          font-weight: 600;
          color: #2d5016;
          margin: 0;
        }
        .season-product-thumb .thumb-price {
          font-size: 15px;
          font-weight: 700;
          color: #e67e22;
          margin: 4px 0 0;
        }
        .home-actions {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin: 32px 0;
        }
        .home-action-btn {
          padding: 14px 36px;
          border-radius: 6px;
          border: none;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
        }
        .home-action-btn:active { transform: scale(0.95); }
        @media (max-width: 768px) {
          .hero-banner { padding: 36px 20px; }
          .hero-banner h1 { font-size: 24px !important; }
          .carousel-slide { grid-template-columns: repeat(3, 1fr) !important; }
          .carousel-container { max-height: 60%; }
          .season-product-thumb img { height: 100px; }
          .home-actions { flex-direction: column; align-items: center; }
        }
      `}</style>

      <div className="hero-banner">
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 8px', position: 'relative' }}>
          🥬 鲜蔬直送
        </h1>
        <p style={{ fontSize: 18, opacity: 0.9, margin: 0, position: 'relative' }}>
          新鲜蔬果，产地直达，健康到家
        </p>

        <div className="season-tabs">
          {SEASONS.map((season, i) => (
            <button
              key={season}
              className={`season-tab ${i === activeSeason ? 'active' : ''}`}
              onClick={() => handleSeasonChange(i)}
            >
              {SEASON_ICONS[season]} {season}季
            </button>
          ))}
          <div
            className="season-indicator"
            style={{
              width: `${100 / SEASONS.length}%`,
              left: `${(activeSeason * 100) / SEASONS.length}%`,
            }}
          />
        </div>
      </div>

      <div className="carousel-container">
        <div
          className="carousel-track"
          style={{ transform: `translateX(-${slideOffset}%)` }}
        >
          {SEASONS.map((season) => {
            const seasonProducts = getSeasonProducts(season);
            return (
              <div key={season} className="carousel-slide">
                {seasonProducts.map((p) => (
                  <div
                    key={p.id}
                    className="season-product-thumb"
                    onClick={() => navigate(`/product/${p.id}`)}
                  >
                    <img src={p.imageUrl} alt={p.name} loading="lazy" />
                    <div className="thumb-info">
                      <p className="thumb-name">{p.name}</p>
                      <p className="thumb-price">¥{p.price.toFixed(1)}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="home-actions">
        <button
          className="home-action-btn"
          style={{ background: 'linear-gradient(135deg, #4caf50, #8bc34a)', color: '#fff' }}
          onClick={() => navigate('/products')}
        >
          浏览全部商品
        </button>
        <button
          className="home-action-btn"
          style={{ background: '#fff', color: '#4caf50', border: '2px solid #4caf50' }}
          onClick={() => navigate('/products?origin=有机')}
        >
          有机专区
        </button>
      </div>
    </>
  );
};

export default HomePage;
