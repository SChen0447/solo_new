import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Drink } from '../utils/api';

const MenuPage = () => {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [customizations, setCustomizations] = useState<{
    [key: string]: {
      milkType: string;
      syrupFlavor: string;
      temperature: string;
      espressoShots: number;
      iceLevel: number;
    };
  }>({});

  const navigate = useNavigate();

  useEffect(() => {
    const loadDrinks = async () => {
      try {
        const data = await api.getDrinks();
        setDrinks(data);
        const initialCustomizations: typeof customizations = {};
        data.forEach(drink => {
          initialCustomizations[drink.id] = {
            milkType: drink.customizations.milkTypes[0],
            syrupFlavor: drink.customizations.syrupFlavors[0],
            temperature: drink.customizations.temperatures[0],
            espressoShots: drink.customizations.espressoShots.default,
            iceLevel: drink.customizations.iceLevels.default
          };
        });
        setCustomizations(initialCustomizations);
      } finally {
        setLoading(false);
      }
    };
    loadDrinks();
  }, []);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2500);
  };

  const addToCart = async (drink: Drink) => {
    const cust = customizations[drink.id];
    if (!cust) return;
    
    await api.createOrder({
      drinkId: drink.id,
      customizations: cust
    });
    showToast(`✓ ${drink.name} 已加入购物车`);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>风味日记</h1>
        <p style={styles.subtitle}>当季精选饮品</p>
      </header>

      <div style={styles.grid}>
        {drinks.map((drink, index) => {
          const cust = customizations[drink.id];
          if (!cust) return null;
          
          return (
            <div
              key={drink.id}
              style={{
                ...styles.card,
                animationDelay: `${index * 0.1}s`,
                opacity: 0,
                animation: `fadeInUp 0.5s ease forwards ${index * 0.1}s`
              }}
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest('button') && 
                    !(e.target as HTMLElement).closest('select') &&
                    !(e.target as HTMLElement).closest('input')) {
                  navigate(`/drink/${drink.id}`);
                }
              }}
            >
              <div style={styles.cardHeader}>
                <img
                  src={drink.thumbnail}
                  alt={drink.name}
                  style={styles.thumbnail}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(drink.image);
                  }}
                />
                <div style={styles.cardInfo}>
                  <h3 style={styles.drinkName}>{drink.name}</h3>
                  <p style={styles.drinkPrice}>¥{drink.price}</p>
                </div>
              </div>
              
              <p style={styles.drinkDesc}>{drink.description}</p>

              <div style={styles.customizationSection}>
                {drink.customizations.milkTypes.length > 1 && (
                  <div style={styles.selectRow}>
                    <label style={styles.label}>牛奶</label>
                    <select
                      value={cust.milkType}
                      onChange={(e) => setCustomizations(prev => ({
                        ...prev,
                        [drink.id]: { ...prev[drink.id], milkType: e.target.value }
                      }))}
                      style={styles.select}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {drink.customizations.milkTypes.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                {drink.customizations.syrupFlavors.length > 1 && (
                  <div style={styles.selectRow}>
                    <label style={styles.label}>糖浆</label>
                    <select
                      value={cust.syrupFlavor}
                      onChange={(e) => setCustomizations(prev => ({
                        ...prev,
                        [drink.id]: { ...prev[drink.id], syrupFlavor: e.target.value }
                      }))}
                      style={styles.select}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {drink.customizations.syrupFlavors.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {drink.customizations.temperatures.length > 1 && (
                  <div style={styles.selectRow}>
                    <label style={styles.label}>温度</label>
                    <select
                      value={cust.temperature}
                      onChange={(e) => setCustomizations(prev => ({
                        ...prev,
                        [drink.id]: { ...prev[drink.id], temperature: e.target.value }
                      }))}
                      style={styles.select}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {drink.customizations.temperatures.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {drink.customizations.espressoShots.min !== drink.customizations.espressoShots.max && (
                  <div style={styles.sliderRow}>
                    <label style={styles.label}>浓缩: {cust.espressoShots}份</label>
                    <input
                      type="range"
                      min={drink.customizations.espressoShots.min}
                      max={drink.customizations.espressoShots.max}
                      value={cust.espressoShots}
                      onChange={(e) => setCustomizations(prev => ({
                        ...prev,
                        [drink.id]: { ...prev[drink.id], espressoShots: Number(e.target.value) }
                      }))}
                      style={styles.slider}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {drink.customizations.iceLevels.min !== drink.customizations.iceLevels.max && (
                  <div style={styles.sliderRow}>
                    <label style={styles.label}>冰块: {cust.iceLevel}%</label>
                    <input
                      type="range"
                      min={drink.customizations.iceLevels.min}
                      max={drink.customizations.iceLevels.max}
                      value={cust.iceLevel}
                      onChange={(e) => setCustomizations(prev => ({
                        ...prev,
                        [drink.id]: { ...prev[drink.id], iceLevel: Number(e.target.value) }
                      }))}
                      style={styles.slider}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>

              <button
                style={styles.addButton}
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(drink);
                }}
              >
                加入购物车
              </button>
            </div>
          );
        })}
      </div>

      {selectedImage && (
        <div style={styles.modalOverlay} onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Full size" style={styles.modalImage} />
        </div>
      )}

      {toast.show && (
        <div style={styles.toast}>
          <span style={styles.toastIcon}>✓</span>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f0eb',
    padding: '20px',
    fontFamily: "'Noto Sans SC', sans-serif"
  },
  header: {
    textAlign: 'center',
    padding: '40px 20px 30px',
    animation: 'fadeInUp 0.5s ease forwards',
    opacity: 0
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '36px',
    color: '#5d4037',
    margin: 0,
    fontWeight: 700
  },
  subtitle: {
    color: '#8d6e63',
    fontSize: '16px',
    marginTop: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr'
    }
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  cardHeader: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  thumbnail: {
    width: '75px',
    height: '75px',
    borderRadius: '8px',
    objectFit: 'cover',
    cursor: 'zoom-in'
  },
  cardInfo: {
    flex: 1
  },
  drinkName: {
    fontSize: '18px',
    color: '#5d4037',
    margin: 0,
    fontWeight: 600
  },
  drinkPrice: {
    fontSize: '16px',
    color: '#ff8a80',
    margin: '4px 0 0',
    fontWeight: 600
  },
  drinkDesc: {
    fontSize: '13px',
    color: '#8d6e63',
    margin: 0,
    lineHeight: 1.5
  },
  customizationSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingTop: '8px',
    borderTop: '1px solid #e8e0d8'
  },
  selectRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  label: {
    fontSize: '12px',
    color: '#8d6e63',
    minWidth: '50px'
  },
  select: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid #d7ccc8',
    borderRadius: '6px',
    backgroundColor: '#fafafa',
    color: '#5d4037',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none'
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  slider: {
    flex: 1,
    height: '4px',
    appearance: 'none',
    backgroundColor: '#4fc3f7',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  addButton: {
    marginTop: '8px',
    padding: '10px 20px',
    backgroundColor: '#5d4037',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  loading: {
    textAlign: 'center',
    padding: '100px 0',
    color: '#8d6e63',
    fontSize: '16px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalImage: {
    maxWidth: '90%',
    maxHeight: '90%',
    borderRadius: '12px',
    objectFit: 'contain'
  },
  toast: {
    position: 'fixed',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#c8e6c9',
    color: '#2e7d32',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1001,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    animation: 'fadeInUp 0.3s ease'
  },
  toastIcon: {
    fontSize: '16px'
  }
};

export default MenuPage;
