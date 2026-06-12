import { useEffect, useState, lazy, Suspense, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Recipe } from '../types';
import { api } from '../utils/api';
import { coverSchemes, difficultyMeta } from '../utils/theme';

const IngredientsTab = lazy(() => import('../components/detail/IngredientsTab'));
const StepsTab = lazy(() => import('../components/detail/StepsTab'));
const NotesTab = lazy(() => import('../components/detail/NotesTab'));

type TabKey = 'ingredients' | 'steps' | 'notes';

const TAB_ORDER: TabKey[] = ['ingredients', 'steps', 'notes'];

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('ingredients');
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [inShopping, setInShopping] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const loadStart = useRef<number>(0);

  useEffect(() => {
    if (!id) return;
    loadStart.current = performance.now();
    setLoading(true);
    let cancelled = false;
    api.getRecipe(id).then((r) => {
      if (cancelled) return;
      setRecipe(r);
      setLoading(false);
      const t = performance.now() - loadStart.current;
      if (t > 200) console.warn(`[性能警告] 详情页加载 ${t.toFixed(0)}ms，超过200ms阈值`);
    });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const key = 'recipe_book_selected';
    const saved = localStorage.getItem(key);
    if (saved && id) {
      try {
        const arr = JSON.parse(saved);
        setInShopping(Array.isArray(arr) && arr.includes(id));
      } catch {}
    }
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const changeTab = useCallback((next: TabKey) => {
    if (next === tab) return;
    const curIdx = TAB_ORDER.indexOf(tab);
    const nextIdx = TAB_ORDER.indexOf(next);
    setSlideDir(nextIdx > curIdx ? 1 : -1);
    const t0 = performance.now();
    setTab(next);
    queueMicrotask(() => {
      const elapsed = performance.now() - t0;
      if (elapsed > 200) console.warn(`[性能警告] 标签切换 ${elapsed.toFixed(0)}ms，超过200ms阈值`);
    });
  }, [tab]);

  const toggleShopping = () => {
    if (!id || !recipe) return;
    const key = 'recipe_book_selected';
    let arr: string[] = [];
    try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    if (inShopping) {
      arr = arr.filter((x) => x !== id);
      setToast('已从采购清单移除');
    } else {
      arr = Array.from(new Set([...arr, id]));
      setToast(`《${recipe.name}》已加入采购清单`);
    }
    localStorage.setItem(key, JSON.stringify(arr));
    setInShopping((v) => !v);
    window.dispatchEvent(new Event('shopping-updated'));
  };

  const updateRecipe = (patch: Partial<Recipe>) => {
    if (!recipe) return;
    setRecipe({ ...recipe, ...patch });
  };

  const updateNotesDebounced = useDebouncedFn(async (notes: string) => {
    if (!recipe) return;
    try { await api.updateRecipe(recipe.id, { notes }); }
    catch { console.error('保存笔记失败'); }
  }, 400);

  if (loading) return <DetailSkeleton />;
  if (!recipe) return <NotFound />;

  const scheme = coverSchemes[recipe.coverScheme % coverSchemes.length];
  const diff = difficultyMeta[recipe.difficulty];
  const tabIdx = TAB_ORDER.indexOf(tab);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 48px' }}>
      {/* Hero 大图区域 */}
      <div
        style={{
          height: 300,
          background: scheme.grad,
          position: 'relative',
          overflow: 'hidden',
          marginBottom: -40,
        }}
        className="fade-in"
      >
        <div
          style={{
            position: 'absolute',
            width: 500, height: 500, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            top: -200, right: -100,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 300, height: 300, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            bottom: -120, left: -40,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 140, height: 140, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            top: 40, left: '40%',
          }}
        />
        {/* 抽象装饰 */}
        <svg
          style={{ position: 'absolute', bottom: -2, left: 0, width: '100%', height: 80 }}
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
        >
          <path
            d="M0,80 L1440,80 L1440,40 C1200,10 960,60 720,30 C480,0 240,60 0,32 L0,80 Z"
            fill="var(--bg)"
          />
        </svg>
        <div
          style={{
            maxWidth: 1100, margin: '0 auto', padding: '32px 24px 0',
            position: 'relative', zIndex: 2, height: '100%',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              background: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.35)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)'; }}
          >
            ← 返回
          </Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={toggleShopping}
              style={{
                padding: '8px 16px',
                background: inShopping ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(8px)',
                color: inShopping ? 'var(--accent)' : '#fff',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: inShopping ? 'none' : '1px solid rgba(255,255,255,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {inShopping ? '✓ 已加入' : '🛒 加入采购清单'}
            </button>
            <button
              onClick={() => navigate(`/recipe/${recipe.id}/edit`)}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: '1px solid rgba(255,255,255,0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.35)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)'; }}
            >
              ✏️ 编辑
            </button>
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      <div style={{ padding: '0 24px', position: 'relative', zIndex: 3 }}>
        {/* 头部卡片 */}
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            gap: 24,
            alignItems: 'center',
            marginBottom: 24,
          }}
          className="fade-in-up"
        >
          <div
            style={{
              width: 88, height: 88,
              borderRadius: 20,
              background: scheme.grad,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 44,
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              flexShrink: 0,
            }}
          >
            {recipe.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 10, lineHeight: 1.2 }}>
              {recipe.name}
            </h1>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text-soft)', fontSize: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="hourglass" style={{ fontSize: 14 }}>⏳</span>
                <span>{recipe.cookTime} 分钟</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: 999,
                    background: diff.bg,
                    color: diff.color,
                    border: `1px solid ${diff.border}`,
                    fontWeight: 500,
                    fontSize: 12.5,
                  }}
                >
                  {diff.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📝</span>
                <span>{recipe.steps.length} 个步骤</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🥗</span>
                <span>{recipe.ingredients.length} 种食材</span>
              </div>
            </div>
            {recipe.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {recipe.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 12,
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: 'var(--accent-light)',
                      color: 'var(--accent)',
                      fontWeight: 500,
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 标签页 */}
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
          }}
          className="fade-in-up"
        >
          {/* Tab 栏 */}
          <div
            style={{
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              padding: '4px 8px 0',
              background: 'var(--bg-soft)',
              position: 'sticky',
              top: 73,
              zIndex: 10,
            }}
          >
            {([
              { k: 'ingredients', label: '🥗 食材列表', count: recipe.ingredients.length },
              { k: 'steps', label: '👨‍🍳 步骤说明', count: recipe.steps.length },
              { k: 'notes', label: '📝 用户笔记' },
            ] as const).map((t) => {
              const active = tab === t.k;
              return (
                <button
                  key={t.k}
                  onClick={() => changeTab(t.k as TabKey)}
                  style={{
                    position: 'relative',
                    padding: '14px 20px',
                    fontSize: 14.5,
                    fontWeight: active ? 600 : 500,
                    color: active ? 'var(--primary)' : 'var(--text-soft)',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-soft)';
                  }}
                >
                  <span>{t.label}</span>
                  {t.count !== undefined && (
                    <span
                      style={{
                        padding: '1px 8px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        background: active ? 'var(--primary-light)' : 'rgba(122, 102, 85, 0.1)',
                        color: active ? 'var(--primary)' : 'var(--text-soft)',
                      }}
                    >
                      {t.count}
                    </span>
                  )}
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0, left: 12, right: 12,
                        height: 3,
                        borderRadius: '3px 3px 0 0',
                        background: 'var(--primary)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab 内容容器 */}
          <div style={{ position: 'relative', overflow: 'hidden', minHeight: 300 }}>
            <div
              key={tab}
              style={{
                animation: slideDir === 1 ? 'slideRight 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'slideLeft 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <Suspense fallback={<TabLoading tabIdx={tabIdx} />}>
                {tab === 'ingredients' && recipe && (
                  <IngredientsTab recipe={recipe} onChange={(patch) => updateRecipe(patch)} onShowToast={(msg) => setToast(msg)} />
                )}
                {tab === 'steps' && recipe && <StepsTab recipe={recipe} />}
                {tab === 'notes' && recipe && (
                  <NotesTab
                    recipe={recipe}
                    onUpdate={(notes) => {
                      updateRecipe({ notes });
                      updateNotesDebounced(notes);
                    }}
                  />
                )}
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 22px',
            background: 'rgba(60, 46, 37, 0.94)',
            color: '#fff',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            zIndex: 1000,
            animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function useDebouncedFn<T extends (...a: any[]) => any>(fn: T, delay = 300) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

function TabLoading({ tabIdx }: { tabIdx: number }) {
  const messages = ['加载食材中...', '加载步骤中...', '加载笔记中...'];
  return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-soft)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }} className="hourglass">⏳</div>
      <p>{messages[tabIdx] || '加载中...'}</p>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🤔</div>
      <h2 style={{ marginBottom: 10 }}>找不到该食谱</h2>
      <p style={{ color: 'var(--text-soft)', marginBottom: 20 }}>它可能已被删除或不存在</p>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          padding: '10px 22px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--primary)',
          color: '#fff',
          fontWeight: 500,
        }}
      >
        返回首页
      </Link>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ height: 300, background: 'linear-gradient(90deg, #eee5d6 25%, #f5ede1 50%, #eee5d6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      <div style={{ padding: '0 24px', marginTop: -40 }}>
        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-md)', display: 'flex', gap: 24, marginBottom: 24 }}>
          <div style={{ width: 88, height: 88, borderRadius: 20, background: 'linear-gradient(90deg, #eee5d6 25%, #f5ede1 50%, #eee5d6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ height: 24, width: '30%', borderRadius: 6, background: 'linear-gradient(90deg, #eee5d6 25%, #f5ede1 50%, #eee5d6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            <div style={{ height: 14, width: '50%', borderRadius: 4, background: 'linear-gradient(90deg, #eee5d6 25%, #f5ede1 50%, #eee5d6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          </div>
        </div>
        <div style={{ height: 400, background: 'linear-gradient(90deg, #eee5d6 25%, #f5ede1 50%, #eee5d6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', borderRadius: 'var(--radius-lg)' }} />
      </div>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
