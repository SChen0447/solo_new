import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import RecipeDetail from './pages/RecipeDetail';
import RecipeEdit from './pages/RecipeEdit';
import type { Recipe, ShoppingList } from './types';
import { api } from './utils/api';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/recipe/new" element={<RecipeEdit />} />
            <Route path="/recipe/:id/edit" element={<RecipeEdit />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <ShoppingPanel />
    </BrowserRouter>
  );
}

function Header() {
  return (
    <header
      style={{
        background: 'rgba(250, 246, 240, 0.85)',
        backdropFilter: 'saturate(180%) blur(12px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #B5553E 0%, #C38D9E 50%, #6B8046 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 12px rgba(181, 85, 62, 0.25)',
            }}
          >
            🍳
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>食谱书</div>
            <div style={{ fontSize: 11, color: 'var(--text-soft)', letterSpacing: 0.5 }}>SMART COOKBOOK</div>
          </div>
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 14,
              color: isActive ? 'var(--primary)' : 'var(--text-soft)',
              background: isActive ? 'var(--primary-light)' : 'transparent',
              fontWeight: isActive ? 600 : 500,
              transition: 'all 0.2s',
            })}
          >
            🏠 首页
          </NavLink>
          <Link
            to="/recipe/new"
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(181, 85, 62, 0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--primary)'; }}
          >
            + 创建食谱
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-soft)',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-soft)',
        fontSize: 13,
      }}
    >
      <div>🍽️ 用心烹饪，用爱生活 · Smart Recipe Book © 2026</div>
    </footer>
  );
}

const SHOPPING_KEY = 'recipe_book_selected';

function ShoppingPanel() {
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [list, setList] = useState<ShoppingList | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(SHOPPING_KEY);
    if (saved) {
      try { setIds(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SHOPPING_KEY, JSON.stringify(ids));
    if (ids.length === 0) {
      setRecipes([]);
      setList(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      api.getRecipes().then((rs) => rs.filter((r) => ids.includes(r.id))),
      api.getShoppingList(ids),
    ]).then(([rs, sl]) => {
      if (!cancelled) {
        setRecipes(rs);
        setList(sl);
      }
    });
    return () => { cancelled = true; };
  }, [ids]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SHOPPING_KEY && e.newValue) {
        try { setIds(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    const onCustom = () => {
      const saved = localStorage.getItem(SHOPPING_KEY);
      if (saved) { try { setIds(JSON.parse(saved)); } catch {} }
    };
    window.addEventListener('shopping-updated', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('shopping-updated', onCustom);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 26,
          boxShadow: '0 8px 24px rgba(107, 128, 70, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      >
        🛒
        {ids.length > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 22,
              height: 22,
              padding: '0 6px',
              borderRadius: 11,
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg)',
            }}
          >
            {ids.length}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(60, 46, 37, 0.4)',
            zIndex: 200,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(460px, 100%)',
              height: '100%',
              background: 'var(--bg)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideRight 0.3s ease-out',
            }}
          >
            <div
              style={{
                padding: 20,
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>🛒 智能采购清单</h2>
                <p style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4 }}>
                  已选 {ids.length} 个食谱
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-soft)', fontSize: 18,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {ids.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-soft)' }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🧺</div>
                  <p>还没有选择食谱</p>
                  <p style={{ fontSize: 13, marginTop: 8 }}>在食谱详情页点击"加入采购清单"吧</p>
                </div>
              ) : (
                <div className="fade-in">
                  {recipes.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 8, fontWeight: 500 }}>已选食谱</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {recipes.map((r) => (
                          <span
                            key={r.id}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '6px 10px 6px 12px',
                              background: 'var(--card)',
                              borderRadius: 999,
                              fontSize: 13,
                              boxShadow: 'var(--shadow-sm)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <span>{r.emoji}</span>
                            <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.name}
                            </span>
                            <button
                              onClick={() => {
                                const next = ids.filter((i) => i !== r.id);
                                setIds(next);
                                window.dispatchEvent(new Event('shopping-updated'));
                              }}
                              style={{
                                width: 20, height: 20, borderRadius: '50%',
                                background: 'var(--bg-soft)', color: 'var(--text-soft)',
                                fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {list && (
                    <div>
                      <div
                        style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
                          marginBottom: 20,
                        }}
                      >
                        <div style={{ padding: 12, background: 'var(--card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{list.totalItems}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>全部食材</div>
                        </div>
                        <div style={{ padding: 12, background: 'var(--card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{list.needToBuy}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>需购买</div>
                        </div>
                        <div style={{ padding: 12, background: 'var(--card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{list.alreadyHave}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>家中已有</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 8, fontWeight: 500 }}>食材明细</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {list.items.map((it, i) => (
                          <div
                            key={it.name + i}
                            style={{
                              padding: '12px 14px',
                              background: it.inPantry ? 'var(--accent-light)' : 'var(--card)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 12,
                              animation: `fadeInUp 0.3s ${i * 0.03}s both`,
                            }}
                          >
                            <span style={{ fontSize: 18, marginTop: 1 }}>{it.inPantry ? '✅' : '🛒'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600 }}>{it.name}</span>
                                {it.inPantry && (
                                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#fff', color: 'var(--accent)', fontWeight: 500 }}>
                                    家中已有
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginTop: 3 }}>
                                {it.quantities.join(' + ')}
                              </div>
                              {it.recipeSources.length > 1 && (
                                <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 4 }}>
                                  来自 {it.recipeSources.map((s) => `《${s}》`).join(' · ')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {ids.length > 0 && (
              <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => {
                    setIds([]);
                    window.dispatchEvent(new Event('shopping-updated'));
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-soft)',
                    color: 'var(--text-soft)',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#e8d9c0'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)'; }}
                >
                  清空清单
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
