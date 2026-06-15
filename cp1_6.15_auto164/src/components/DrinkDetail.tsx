import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Drink, Note } from '../utils/api';
import NotesFeed from './NotesFeed';

const moodEmojis: { [key: string]: { emoji: string; label: string } } = {
  happy: { emoji: '😊', label: '开心' },
  relaxed: { emoji: '😌', label: '悠闲' },
  energized: { emoji: '⚡', label: '提神' },
  disappointed: { emoji: '😔', label: '失望' },
  surprised: { emoji: '✨', label: '惊喜' }
};

const moodOrder = ['happy', 'relaxed', 'energized', 'disappointed', 'surprised'] as const;

const DrinkDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [drink, setDrink] = useState<Drink | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [newNote, setNewNote] = useState<Note | null>(null);
  
  const [customizations, setCustomizations] = useState({
    milkType: '',
    syrupFlavor: '',
    temperature: '',
    espressoShots: 2,
    iceLevel: 50
  });

  const [noteContent, setNoteContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<keyof typeof moodEmojis | null>(null);
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    const loadDrink = async () => {
      if (!id) return;
      try {
        const data = await api.getDrink(id);
        setDrink(data);
        setCustomizations({
          milkType: data.customizations.milkTypes[0],
          syrupFlavor: data.customizations.syrupFlavors[0],
          temperature: data.customizations.temperatures[0],
          espressoShots: data.customizations.espressoShots.default,
          iceLevel: data.customizations.iceLevels.default
        });
      } finally {
        setLoading(false);
      }
    };
    loadDrink();
  }, [id]);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2500);
  };

  const addToCart = async () => {
    if (!drink) return;
    
    await api.createOrder({
      drinkId: drink.id,
      customizations
    });
    showToast(`✓ ${drink.name} 已加入购物车`);
  };

  const submitNote = async () => {
    if (!drink || !noteContent.trim() || !selectedMood || submittingNote) return;
    
    setSubmittingNote(true);
    try {
      const note = await api.createNote({
        drinkId: drink.id,
        content: noteContent.trim(),
        mood: selectedMood
      });
      setNewNote(note);
      setNoteContent('');
      setSelectedMood(null);
      showToast('✓ 笔记已保存');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (!drink) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>饮品不存在</div>
        <button style={styles.backButton} onClick={() => navigate('/')}>返回菜单</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate('/')}>← 返回菜单</button>

      <div style={styles.content} className="drink-detail-content">
        <div style={styles.headerSection}>
          <img
            src={drink.image}
            alt={drink.name}
            style={styles.mainImage}
            onClick={() => setSelectedImage(drink.image)}
          />
          <div style={styles.headerInfo}>
            <h1 style={styles.drinkName}>{drink.name}</h1>
            <p style={styles.drinkPrice}>¥{drink.price}</p>
            <p style={styles.drinkDesc}>{drink.description}</p>
          </div>
        </div>

        <div style={styles.customizationSection}>
          <h2 style={styles.sectionTitle}>定制您的饮品</h2>
          
          {drink.customizations.milkTypes.length > 1 && (
            <div style={styles.selectRow}>
              <label style={styles.label}>牛奶类型</label>
              <select
                value={customizations.milkType}
                onChange={(e) => setCustomizations(prev => ({ ...prev, milkType: e.target.value }))}
                style={styles.select}
              >
                {drink.customizations.milkTypes.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {drink.customizations.syrupFlavors.length > 1 && (
            <div style={styles.selectRow}>
              <label style={styles.label}>糖浆口味</label>
              <select
                value={customizations.syrupFlavor}
                onChange={(e) => setCustomizations(prev => ({ ...prev, syrupFlavor: e.target.value }))}
                style={styles.select}
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
                value={customizations.temperature}
                onChange={(e) => setCustomizations(prev => ({ ...prev, temperature: e.target.value }))}
                style={styles.select}
              >
                {drink.customizations.temperatures.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {drink.customizations.espressoShots.min !== drink.customizations.espressoShots.max && (
            <div style={styles.sliderRow}>
              <label style={styles.label}>浓缩份数: {customizations.espressoShots}</label>
              <input
                type="range"
                min={drink.customizations.espressoShots.min}
                max={drink.customizations.espressoShots.max}
                value={customizations.espressoShots}
                onChange={(e) => setCustomizations(prev => ({ ...prev, espressoShots: Number(e.target.value) }))}
                style={styles.slider}
              />
            </div>
          )}

          {drink.customizations.iceLevels.min !== drink.customizations.iceLevels.max && (
            <div style={styles.sliderRow}>
              <label style={styles.label}>冰块量: {customizations.iceLevel}%</label>
              <input
                type="range"
                min={drink.customizations.iceLevels.min}
                max={drink.customizations.iceLevels.max}
                value={customizations.iceLevel}
                onChange={(e) => setCustomizations(prev => ({ ...prev, iceLevel: Number(e.target.value) }))}
                style={styles.slider}
              />
            </div>
          )}

          <button style={styles.addButton} onClick={addToCart}>
            加入购物车
          </button>
        </div>

        <div style={styles.noteSection}>
          <h2 style={styles.sectionTitle}>写下你的风味笔记</h2>
          
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value.slice(0, 200))}
            placeholder="记录这杯咖啡带给你的感受..."
            maxLength={200}
            style={styles.textarea}
          />
          <div style={styles.charCount}>{noteContent.length}/200</div>

          <div style={styles.moodSelector}>
            <span style={styles.moodLabel}>此刻心情：</span>
            <div style={styles.moodOptions}>
              {moodOrder.map((mood) => (
                <button
                  key={mood}
                  style={{
                    ...styles.moodButton,
                    transform: selectedMood === mood ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: selectedMood === mood ? '0 4px 12px rgba(255,138,128,0.3)' : 'none'
                  }}
                  onClick={() => setSelectedMood(selectedMood === mood ? null : mood)}
                >
                  <span style={styles.moodEmoji}>{moodEmojis[mood].emoji}</span>
                  {selectedMood === mood && (
                    <span style={styles.moodTextLabel}>{moodEmojis[mood].label}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            style={{
              ...styles.submitNoteButton,
              opacity: !noteContent.trim() || !selectedMood ? 0.5 : 1
            }}
            onClick={submitNote}
            disabled={!noteContent.trim() || !selectedMood || submittingNote}
          >
            {submittingNote ? '提交中...' : '发布笔记'}
          </button>
        </div>

        <NotesFeed drinkId={drink.id} newNote={newNote} />
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
        .drink-detail-content > * {
          animation: fadeInUp 0.5s ease forwards;
          opacity: 0;
        }
        .drink-detail-content > *:nth-child(1) { animation-delay: 0s; }
        .drink-detail-content > *:nth-child(2) { animation-delay: 0.1s; }
        .drink-detail-content > *:nth-child(3) { animation-delay: 0.2s; }
        .drink-detail-content > *:nth-child(4) { animation-delay: 0.3s; }
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
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#5d4037',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '10px 15px',
    marginBottom: '20px',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease'
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  headerSection: {
    display: 'flex',
    gap: '24px',
    marginBottom: '30px',
    flexWrap: 'wrap',
    '@media (max-width: 600px)': {
      flexDirection: 'column'
    }
  },
  mainImage: {
    width: '300px',
    height: '300px',
    borderRadius: '12px',
    objectFit: 'cover',
    cursor: 'zoom-in',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    '@media (max-width: 600px)': {
      width: '100%',
      height: '250px'
    }
  },
  headerInfo: {
    flex: 1,
    minWidth: '250px'
  },
  drinkName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '32px',
    color: '#5d4037',
    margin: '0 0 8px',
    fontWeight: 700
  },
  drinkPrice: {
    fontSize: '24px',
    color: '#ff8a80',
    margin: '0 0 16px',
    fontWeight: 600
  },
  drinkDesc: {
    fontSize: '15px',
    color: '#8d6e63',
    lineHeight: 1.7,
    margin: 0
  },
  sectionTitle: {
    fontSize: '20px',
    color: '#5d4037',
    margin: '0 0 20px',
    fontWeight: 600,
    fontFamily: "'Playfair Display', serif"
  },
  customizationSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
  },
  selectRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  label: {
    fontSize: '14px',
    color: '#5d4037',
    minWidth: '100px',
    fontWeight: 500
  },
  select: {
    flex: 1,
    minWidth: '150px',
    padding: '10px 14px',
    border: '1px solid #d7ccc8',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    color: '#5d4037',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none'
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  slider: {
    flex: 1,
    minWidth: '150px',
    height: '4px',
    appearance: 'none',
    backgroundColor: '#4fc3f7',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  addButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#5d4037',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'all 0.15s ease'
  },
  noteSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '14px',
    border: '1px solid transparent',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    color: '#5d4037',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: 1.6
  },
  charCount: {
    textAlign: 'right',
    fontSize: '12px',
    color: '#bcaaa4',
    marginTop: '4px',
    marginBottom: '16px'
  },
  moodSelector: {
    marginBottom: '16px'
  },
  moodLabel: {
    fontSize: '14px',
    color: '#5d4037',
    fontWeight: 500,
    display: 'block',
    marginBottom: '12px'
  },
  moodOptions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  moodButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    minWidth: '60px'
  },
  moodEmoji: {
    fontSize: '42px'
  },
  moodTextLabel: {
    fontSize: '12px',
    color: '#ff8a80',
    fontWeight: 500
  },
  submitNoteButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#ff8a80',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
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
  error: {
    textAlign: 'center',
    padding: '100px 0',
    color: '#e57373',
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

export default DrinkDetail;
