import React, { useEffect, useState } from 'react';
import { Shop } from '../types';
import { fetchShops } from '../stores/apiStore';
import Card from '../components/Card';

const ShopList: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShops = async () => {
      try {
        const data = await fetchShops();
        setShops(data);
      } finally {
        setLoading(false);
      }
    };
    loadShops();
  }, []);

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  return (
    <div>
      <h1 style={styles.title}>宠物美容店</h1>
      <p style={styles.subtitle}>选择一家靠谱的美容店，给毛孩子最好的呵护</p>
      <div style={styles.grid}>
        {shops.map((shop) => (
          <Card key={shop.id} shop={shop} />
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  loading: {
    textAlign: 'center',
    padding: '60px 0',
    color: '#888',
    fontSize: '1rem',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#333',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#666',
    marginBottom: '24px',
    fontSize: '0.95rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
};

export default ShopList;
