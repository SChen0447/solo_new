import { useEffect, useState, useMemo, useCallback } from 'react';
import RecipeCard from '../components/RecipeCard';
import type { Recipe } from '../types';
import { api } from '../utils/api';
import { difficultyMeta } from '../utils/theme';
import { Link } from 'react-router-dom';

const SEASON_OPTIONS = [
  { value: '', label: '🌿 全部季节' },
  { value: '春季', label: '🌸 春季' },
  { value: '夏季', label: '☀️ 夏季' },
  { value: '秋季', label: '🍁 秋季' },
  { value: '冬季', label: '❄️ 冬季' },
];

const OCCASION_OPTIONS = [
  { value: '', label: '🎉 全部场合' },
  { value: '家常', label: '🍚 家常' },
  { value: '宴客', label: '🎊 宴客' },
  { value: '快手', label: '⚡ 快手' },
  { value: '健康', label: '🥗 健康' },
  { value: '甜品', label: '🍰 甜品' },
  { value: '硬菜', label: '🍖 硬菜' },
  { value: '节日', label: '🎈 节日' },
];

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('');
  const [occasion, setOccasion] = useState('');
  const [diff, setDiff] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getRecipes();
      setRecipes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    let res = recipes;
    const s = search.trim().toLowerCase();
    if (s) {
      res = res.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(s)) ||
          r.tags.some((t) => t.toLowerCase().includes(s))
      );
    }
    if (diff) res = res.filter((r) => r.difficulty === diff);
    if (season) res = res.filter((r) => r.tags.includes(season));
    if (occasion) res = res.filter((r) => r.tags.includes(occasion));
    return res;
  }, [recipes, search, diff, season, occasion]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [recipes]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      {/* Hero 区域 */}
      <section
        style={{
          background: 'linear-gradient(135deg, #F5E2DC 0%, #E5EBD9 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px 32px',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
        }}
        className="fade-in"
      >
        <div
          style={{
            position: 'absolute',
            width: 280, height: 280, borderRadius: '50%',
            background: 'rgba(255,255,255,0.35)',
            top: -100, right: -60,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(181, 85, 62, 0.08)',
            bottom: -50, left: -20,
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>
            ✨ WELCOME
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 10, lineHeight: 1.2 }}>
            发现你的专属<span style={{ color: 'var(--primary)' }}>美味灵感</span>
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 15, marginBottom: 20, maxWidth: 560 }}>
            按季节、场合挑选食谱，一键生成智能采购清单，让做饭变得简单又有趣 🍳
          </p>
          {/* 搜索框 */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              maxWidth: 720,
            }}
          >
            <div
              style={{
                flex: '1 1 280px',
                display: 'flex',
                alignItems: 'center',
                background: '#fff',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                padding: '0 16px',
                border: '1px solid var(--border)',
                transition: 'all 0.2s',
              }}
              className="search-wrap"
            >
              <span style={{ fontSize: 16, color: 'var(--text-soft)', marginRight: 10 }}>🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索食谱名称、食材或标签..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '12px 0',
                  background: 'transparent',
                  fontSize: 14,
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    fontSize: 14,
                    color: 'var(--text-soft)',
                    padding: '4px 8px',
                    borderRadius: 6,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  ✕
                </button>
              )}
            </div>
            <Link
              to="/recipe/new"
              style={{
                padding: '12px 22px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                boxShadow: '0 4px 12px rgba(181, 85, 62, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--primary-hover)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--primary)';
                (e.currentTarget as HTMLElement).style.transform = 'none';
              }}
            >
              + 新建食谱
            </Link>
          </div>
        </div>
      </section>

      {/* 筛选区域 */}
      <section
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          marginBottom: 24,
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border)',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
        className="fade-in"
      >
        <SelectWrap label="季节">
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            style={selectStyle}
          >
            {SEASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </SelectWrap>
        <SelectWrap label="场合">
          <select
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            style={selectStyle}
          >
            {OCCASION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </SelectWrap>
        <SelectWrap label="难度">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['', 'easy', 'medium', 'hard'] as const).map((d) => {
              const active = diff === d;
              const meta = d ? difficultyMeta[d] : null;
              return (
                <button
                  key={d || 'all'}
                  onClick={() => setDiff(d)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 500,
                    background: active ? (meta ? meta.bg : 'var(--primary-light)') : 'var(--bg-soft)',
                    color: active ? (meta ? meta.color : 'var(--primary)') : 'var(--text-soft)',
                    border: `1px solid ${active ? (meta ? meta.border : 'var(--primary)') : 'transparent'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  {d ? meta?.label : '全部'}
                </button>
              );
            })}
          </div>
        </SelectWrap>
        {(search || season || occasion || diff) && (
          <button
            onClick={() => {
              setSearch('');
              setSeason('');
              setOccasion('');
              setDiff('');
            }}
            style={{
              marginLeft: 'auto',
              padding: '7px 14px',
              borderRadius: 999,
              fontSize: 13,
              color: 'var(--text-soft)',
              background: 'transparent',
              border: '1px solid var(--border)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            ↺ 重置筛选
          </button>
        )}
      </section>

      {/* 统计信息 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }} className="fade-in">
        <div style={{ fontSize: 14, color: 'var(--text-soft)' }}>
          共 <span style={{ color: 'var(--text)', fontWeight: 600 }}>{filtered.length}</span> / {recipes.length} 个食谱
          {search && <span> · 关键词: <span style={{ color: 'var(--primary)', fontWeight: 500 }}>"{search}"</span></span>}
        </div>
      </div>

      {/* 热门标签 */}
      {allTags.length > 0 && !season && !occasion && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }} className="fade-in">
          <span style={{ fontSize: 13, color: 'var(--text-soft)', padding: '5px 0' }}>🏷️ 热门：</span>
          {allTags.slice(0, 12).map((t) => (
            <button
              key={t}
              onClick={() => {
                if (SEASON_OPTIONS.some((s) => s.value === t)) setSeason(t);
                else setOccasion(t);
              }}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 12.5,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-soft)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)';
                (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--card)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-soft)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              }}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* 食谱网格 */}
      {loading ? (
        <GridSkeleton />
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius-lg)',
            padding: '60px 24px',
            textAlign: 'center',
            border: '1px dashed var(--border)',
          }}
          className="fade-in"
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🍽️</div>
          <h3 style={{ fontSize: 20, marginBottom: 8 }}>还没有找到食谱</h3>
          <p style={{ color: 'var(--text-soft)', marginBottom: 20 }}>试试其他关键词，或者创建一个全新的食谱吧</p>
          <Link
            to="/recipe/new"
            style={{
              display: 'inline-block',
              padding: '10px 22px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(181, 85, 62, 0.25)',
            }}
          >
            + 创建食谱
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 20,
          }}
        >
          {filtered.map((r, i) => (
            <RecipeCard key={r.id} recipe={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '7px 30px 7px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  fontSize: 13,
  color: 'var(--text)',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A6655' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  transition: 'all 0.2s',
};

function SelectWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}:</span>
      {children}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 20,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              height: 180,
              background: 'linear-gradient(90deg, #f0ebe3 25%, #f8f4ec 50%, #f0ebe3 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
            }}
          />
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                height: 18, width: '60%', borderRadius: 4,
                background: 'linear-gradient(90deg, #f0ebe3 25%, #f8f4ec 50%, #f0ebe3 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }}
            />
            <div
              style={{
                height: 14, width: '40%', borderRadius: 4,
                background: 'linear-gradient(90deg, #f0ebe3 25%, #f8f4ec 50%, #f0ebe3 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }}
            />
            <div
              style={{
                height: 24, width: '30%', borderRadius: 999,
                background: 'linear-gradient(90deg, #f0ebe3 25%, #f8f4ec 50%, #f0ebe3 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }}
            />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
