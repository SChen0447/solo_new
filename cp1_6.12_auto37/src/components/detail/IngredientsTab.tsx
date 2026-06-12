import { useEffect, useState, useCallback, useRef } from 'react';
import type { Recipe } from '../../types';
import { api } from '../../utils/api';

interface Props {
  recipe: Recipe;
  onChange: (patch: Partial<Recipe>) => void;
  onShowToast: (msg: string) => void;
}

const STORAGE_PREFIX = 'recipe_checked_';

export default function IngredientsTab({ recipe, onChange, onShowToast }: Props) {
  const storageKey = STORAGE_PREFIX + recipe.id;
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncing, setSyncing] = useState(false);

  // 乐观更新：立即生效，异步防抖同步后端
  const toggleCheck = useCallback((ingId: string, name: string) => {
    const t0 = performance.now();
    setChecked((prev) => {
      const next = { ...prev, [ingId]: !prev[ingId] };
      // 立即持久化到本地（快速）
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      const elapsed = performance.now() - t0;
      if (elapsed > 30) console.warn(`[性能警告] 勾选状态更新 ${elapsed.toFixed(0)}ms`);
      return next;
    });

    // 防抖同步后端
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSyncing(true);
      try {
        // 通过 notes 字段附加勾选元数据（模拟持久化字段）
        const meta = { __checked: JSON.parse(localStorage.getItem(storageKey) || '{}') };
        await api.updateRecipe(recipe.id, { notes: recipe.notes, ...(meta as any) });
      } catch {
        // 失败回滚提示
        onShowToast('⚠️ 同步失败，将在下次重试');
      } finally {
        setSyncing(false);
      }
    }, 350);
  }, [recipe.id, recipe.notes, storageKey, onShowToast]);

  // 加载时从后端恢复
  useEffect(() => {
    let cancelled = false;
    api.getRecipe(recipe.id).then((r) => {
      if (cancelled) return;
      const serverMeta = (r as any).__checked;
      if (serverMeta && typeof serverMeta === 'object') {
        setChecked((prev) => ({ ...prev, ...serverMeta }));
        try { localStorage.setItem(storageKey, JSON.stringify({ ...checked, ...serverMeta })); } catch {}
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]);

  const ownedCount = Object.values(checked).filter(Boolean).length;
  const progress = recipe.ingredients.length > 0 ? (ownedCount / recipe.ingredients.length) * 100 : 0;

  return (
    <div style={{ padding: 24 }}>
      {/* 进度条 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>食材准备进度</span>
          <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>
            {ownedCount} / {recipe.ingredients.length} 已就绪
            {syncing && <span style={{ marginLeft: 8, color: 'var(--primary)' }}>同步中...</span>}
          </span>
        </div>
        <div
          style={{
            height: 8,
            background: 'var(--bg-soft)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--accent), #8FB06E)',
              borderRadius: 999,
              transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </div>
      </div>

      {/* 食材列表 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {recipe.ingredients.map((ing, i) => {
          const isChecked = !!checked[ing.id];
          return (
            <label
              key={ing.id}
              htmlFor={`ing-${ing.id}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 16px',
                background: isChecked ? 'var(--accent-light)' : 'var(--bg)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${isChecked ? '#BED2A0' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                animation: `fadeInUp 0.3s ${i * 0.04}s both`,
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = isChecked ? 'var(--accent-light)' : 'var(--bg)';
              }}
            >
              <span
                style={{
                  position: 'relative',
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${isChecked ? 'var(--accent)' : '#c9b89e'}`,
                  background: isChecked ? 'var(--accent)' : '#fff',
                  flexShrink: 0,
                  marginTop: 1,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {isChecked && <span>✓</span>}
              </span>
              <input
                id={`ing-${ing.id}`}
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleCheck(ing.id, ing.name)}
                style={{ display: 'none' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    textDecoration: isChecked ? 'line-through' : 'none',
                    color: isChecked ? 'var(--accent)' : 'var(--text)',
                    transition: 'all 0.2s',
                    fontSize: 14.5,
                  }}
                >
                  {ing.name}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: isChecked ? '#8FA370' : 'var(--text-soft)',
                    marginTop: 2,
                  }}
                >
                  {ing.quantity}
                </div>
              </div>
              {isChecked && (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: '#fff',
                    color: 'var(--accent)',
                    fontWeight: 500,
                    alignSelf: 'center',
                  }}
                >
                  ✓ 已备齐
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* 快捷操作 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            const all: Record<string, boolean> = {};
            recipe.ingredients.forEach((ing) => { all[ing.id] = true; });
            setChecked(all);
            try { localStorage.setItem(storageKey, JSON.stringify(all)); } catch {}
            onShowToast('已全部标记为已备齐');
          }}
          style={quickBtnStyle}
        >
          ✓ 全部标记
        </button>
        <button
          onClick={() => {
            setChecked({});
            try { localStorage.setItem(storageKey, JSON.stringify({})); } catch {}
            onShowToast('已重置所有勾选');
          }}
          style={quickBtnStyle}
        >
          ↺ 重置
        </button>
      </div>
    </div>
  );
}

const quickBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 10,
  background: 'var(--bg-soft)',
  color: 'var(--text-soft)',
  fontSize: 13,
  fontWeight: 500,
  transition: 'all 0.2s',
};
