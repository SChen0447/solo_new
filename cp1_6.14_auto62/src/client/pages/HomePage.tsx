import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import './HomePage.css';

const categories = ['all', '帐篷', '背包', '登山杖', '炉具'];
const categoryLabels: Record<string, string> = {
  all: '全部',
  '帐篷': '帐篷',
  '背包': '背包',
  '登山杖': '登山杖',
  '炉具': '炉具'
};

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100);
  const [search, setSearch] = useState('');
  const [filterKey, setFilterKey] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, [category, minPrice, maxPrice, search]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (category !== 'all') params.category = category;
      if (minPrice > 0) params.minPrice = String(minPrice);
      if (maxPrice < 100) params.maxPrice = String(maxPrice);
      if (search) params.search = search;

      const res = await axios.get('/api/products', { params });
      setProducts(res.data);
      setFilterKey(prev => prev + 1);
    } catch (err) {
      setError('加载产品列表失败');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      {error && <div className="error-banner">{error}</div>}
      
      <div className="filter-bar">
        <div className="filter-container">
          <div className="filter-left">
            <div className="filter-item">
              <label>类别:</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="category-select"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>价格区间:</label>
              <div className="price-range">
                <span className="price-label">¥{minPrice}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="price-slider"
                />
                <span className="price-label">¥{maxPrice}</span>
              </div>
            </div>
          </div>

          <div className="filter-right">
            <div className="search-box">
              <input
                type="text"
                placeholder="搜索装备..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="products-section">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>加载中...</p>
          </div>
        ) : (
          <div className="products-grid" key={filterKey}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="empty-products">
            <p>没有找到符合条件的装备</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
