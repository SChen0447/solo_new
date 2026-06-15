import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Star, Check, Clock, AlertTriangle } from 'lucide-react';
import { useStore, Recipe } from '../store/useStore';

const ALLERGEN_INFO: Record<string, { name: string; emoji: string }> = {
  milk: { name: '牛奶', emoji: '🥛' },
  egg: { name: '鸡蛋', emoji: '🥚' },
  peanut: { name: '花生', emoji: '🥜' },
  tree_nut: { name: '坚果', emoji: '🌰' },
  soy: { name: '大豆', emoji: '🫘' },
  wheat: { name: '小麦', emoji: '🌾' },
  fish: { name: '鱼类', emoji: '🐟' },
  shellfish: { name: '甲壳类', emoji: '🦐' },
};

const NUTRIENT_INFO: { key: keyof Recipe['nutrition']; label: string; unit: string; max: number; color: string }[] = [
  { key: 'calories', label: '热量', unit: 'kcal', max: 800, color: '#ff6b35' },
  { key: 'protein', label: '蛋白质', unit: 'g', max: 50, color: '#f4a261' },
  { key: 'fat', label: '脂肪', unit: 'g', max: 60, color: '#e9c46a' },
  { key: 'carbs', label: '碳水', unit: 'g', max: 70, color: '#2a9d8f' },
  { key: 'fiber', label: '膳食纤维', unit: 'g', max: 12, color: '#264653' },
];

const styles = `
.detail-wrap { padding: 32px 0 60px; }
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius);
  background: #fff;
  border: 1px solid #eee;
  color: var(--text);
  font-size: 14px;
  margin-bottom: 20px;
  transition: all var(--transition);
  position: relative;
  overflow: hidden;
}
.back-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.hero-image {
  width: 100%;
  height: 320px;
  background: linear-gradient(135deg, #ffe0b2 0%, #ffcc80 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 28px;
  overflow: hidden;
  box-shadow: var(--shadow);
}
.hero-image::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%);
}
.hero-title {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #6b3a0f;
}
.hero-emoji { font-size: 72px; margin-bottom: 12px; }
.hero-name { font-size: 36px; font-weight: 700; margin-bottom: 8px; }
.hero-time { font-size: 16px; opacity: 0.85; display: flex; align-items: center; gap: 6px; justify-content: center; }

.action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}
.fav-btn {
  position: relative;
  overflow: hidden;
  background: #fff;
  border: 2px solid #e0d0bf;
  padding: 10px 24px;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease-out;
  color: var(--text);
}
.fav-btn:hover { border-color: var(--warning); }
.fav-btn .star-wrap {
  display: inline-flex;
  transition: transform 0.3s ease-out;
}
.fav-btn.active {
  background: linear-gradient(135deg, #fff9e6, #fff3cc);
  border-color: var(--warning);
  color: #c79500;
}
.fav-btn.active .star-wrap {
  transform: rotate(360deg) scale(1.2);
}

.three-cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.col-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow);
  transition: transform var(--transition), box-shadow var(--transition);
}
.col-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
}
.col-title {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid #fff0e6;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ing-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.ing-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  transition: background 0.2s;
}
.ing-item.matched { background: #eafaf1; color: #1e7f4b; }
.ing-item .check {
  color: #27ae60;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.ing-item .dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f0e6d8;
  flex-shrink: 0;
}

.nutri-bars { display: flex; flex-direction: column; gap: 14px; }
.nutri-row { display: flex; flex-direction: column; gap: 6px; }
.nutri-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-light);
}
.nutri-label strong { color: var(--text); }
.nutri-track {
  height: 22px;
  background: #f8f0e8;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}
.nutri-fill {
  height: 100%;
  border-radius: 6px;
  width: 0;
  animation: fillNutri 0.8s ease-out forwards;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  font-size: 11px;
  color: #fff;
  font-weight: 600;
}
@keyframes fillNutri {
  from { width: 0; }
}

.aller-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.aller-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 8px;
  font-size: 11px;
  text-align: center;
  background: #faf6f0;
  color: var(--text-light);
  transition: all 0.2s;
}
.aller-item .a-emoji { font-size: 22px; }
.aller-item.present {
  background: #fdecea;
  color: var(--danger);
  font-weight: 600;
  animation: flash 1.2s ease-in-out infinite;
}
@keyframes flash {
  0%, 100% { background: #fdecea; transform: scale(1); }
  50% { background: #fbd6d2; transform: scale(1.06); }
}
.no-aller {
  padding: 16px;
  background: #eafaf1;
  border-radius: 8px;
  color: #1e7f4b;
  text-align: center;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

@media (max-width: 960px) {
  .three-cols { grid-template-columns: 1fr 1fr; }
  .hero-image { height: 240px; }
  .hero-name { font-size: 28px; }
}
@media (max-width: 640px) {
  .three-cols { grid-template-columns: 1fr; }
  .hero-name { font-size: 22px; }
  .aller-grid { grid-template-columns: repeat(4, 1fr); }
}
`;

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const { userIngredients, favorites, addFavorite, removeFavorite, isFavorite } = useStore();
  const [animKey, setAnimKey] = useState(0);
  const fav = !!id && isFavorite(id);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios
      .get(`/api/recipe/${id}`)
      .then((res) => alive && setRecipe(res.data.recipe))
      .catch(() => alive && setErr('菜谱加载失败'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  function toggleFav(e: React.MouseEvent<HTMLButtonElement>) {
    if (!recipe) return;
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const d = Math.max(btn.clientWidth, btn.clientHeight);
    const r = d / 2;
    circle.style.width = circle.style.height = `${d}px`;
    circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - r}px`;
    circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - r}px`;
    circle.classList.add('ripple');
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 500);

    if (fav) removeFavorite(recipe.id);
    else addFavorite(recipe.id, recipe.name);
    setAnimKey((k) => k + 1);
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="loading" style={{ borderColor: 'rgba(255,107,53,0.2)', borderTopColor: 'var(--primary)' }} />
        <div style={{ marginTop: 12, color: 'var(--text-light)' }}>加载菜谱详情...</div>
      </div>
    );
  }
  if (err || !recipe) {
    return (
      <div className="container" style={{ padding: '60px 24px' }}>
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> 返回首页
        </button>
        <div className="empty">
          <div className="empty-icon">😵</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{err || '菜谱不存在'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-wrap">
      <style>{styles}</style>
      <div className="container">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> 返回搜索
        </button>

        <div className="hero-image">
          <div className="hero-title">
            <div className="hero-emoji">🍲</div>
            <div className="hero-name">{recipe.name}</div>
            <div className="hero-time">
              <Clock size={16} /> 预计烹饪时长 {recipe.cookTime} 分钟
            </div>
          </div>
        </div>

        <div className="action-bar">
          <button
            className={`fav-btn${fav ? ' active' : ''}`}
            onClick={toggleFav}
            key={animKey}
          >
            <span className="star-wrap">
              {fav ? (
                <Star size={18} fill="#f1c40f" stroke="#f1c40f" />
              ) : (
                <Star size={18} />
              )}
            </span>
            {fav ? '已收藏' : '收藏菜谱'}
          </button>
        </div>

        <div className="three-cols">
          <div className="col-card">
            <div className="col-title">
              <span>🥗</span> 食材清单
            </div>
            <ul className="ing-list">
              {recipe.ingredients.map((ing) => {
                const matched =
                  userIngredients.some(
                    (u) => u === ing || u.includes(ing) || ing.includes(u)
                  );
                return (
                  <li key={ing} className={`ing-item${matched ? ' matched' : ''}`}>
                    {matched ? <Check className="check" /> : <span className="dot" />}
                    <span>{ing}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="col-card">
            <div className="col-title">
              <span>📊</span> 营养成分
            </div>
            <div className="nutri-bars">
              {NUTRIENT_INFO.map((n, i) => {
                const v = recipe.nutrition[n.key];
                const pct = Math.min(100, Math.round((v / n.max) * 100));
                return (
                  <div className="nutri-row" key={n.key}>
                    <div className="nutri-label">
                      <span>{n.label}</span>
                      <strong>
                        {v} {n.unit}
                      </strong>
                    </div>
                    <div className="nutri-track">
                      <div
                        className="nutri-fill"
                        style={{
                          width: `${pct}%`,
                          background: n.color,
                          animationDelay: `${i * 100}ms`,
                        }}
                      >
                        {pct >= 30 ? `${pct}%` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-card">
            <div className="col-title">
              <span>⚠️</span> 过敏原警告
            </div>
            {recipe.allergens.length === 0 ? (
              <div className="no-aller">
                <Check size={18} /> 不含 8 种常见过敏原
              </div>
            ) : (
              <div className="aller-grid">
                {Object.entries(ALLERGEN_INFO).map(([key, info]) => {
                  const present = recipe.allergens.includes(key);
                  return (
                    <div
                      key={key}
                      className={`aller-item${present ? ' present' : ''}`}
                      title={present ? `含${info.name}，过敏者慎食` : `不含${info.name}`}
                    >
                      <span className="a-emoji">{info.emoji}</span>
                      <span>
                        {info.name}
                        {present && (
                          <span style={{ display: 'block', fontSize: 10 }}>
                            含此成分
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {recipe.allergens.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--danger)',
                  fontSize: 12,
                  padding: '8px 10px',
                  background: '#fdecea',
                  borderRadius: 6,
                }}
              >
                <AlertTriangle size={14} />
                请确认无相关过敏史后食用
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
