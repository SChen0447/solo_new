import { useState, useEffect, useCallback } from 'react';
import type { Recipe } from '../../types';

interface Props { recipe: Recipe; }

export default function StepsTab({ recipe }: Props) {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= recipe.steps.length) return;
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
    setAnimKey((k) => k + 1);
  }, [current, recipe.steps.length]);

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(current + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, goTo]);

  return (
    <div style={{ padding: 24 }}>
      {/* 步骤进度时间线 */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 8,
        }}
      >
        {recipe.steps.map((step, i) => {
          const isActive = i === current;
          const isDone = i < current;
          return (
            <button
              key={step.id}
              onClick={() => goTo(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 999,
                background: isActive ? 'var(--primary-light)' : isDone ? 'var(--accent-light)' : 'transparent',
                color: isActive ? 'var(--primary)' : isDone ? 'var(--accent)' : 'var(--text-soft)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.25s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isDone) (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)';
              }}
              onMouseLeave={(e) => {
                if (!isActive && !isDone) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'var(--primary)' : isDone ? 'var(--accent)' : '#fff',
                  color: isActive || isDone ? '#fff' : 'var(--text-soft)',
                  fontSize: 12, fontWeight: 700,
                  border: `1px solid ${isActive ? 'var(--primary)' : isDone ? 'var(--accent)' : 'var(--border)'}`,
                  transition: 'all 0.25s',
                }}
              >
                {isDone ? '✓' : i + 1}
              </span>
              <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {step.emoji} 步骤 {i + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* 当前步骤大图卡片 */}
      {recipe.steps.length > 0 && (
        <div
          key={animKey}
          style={{
            background: 'var(--bg-soft)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 32px',
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden',
            animation: direction === 1 ? 'slideRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'slideLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            minHeight: 240,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -30, right: -30,
              width: 140, height: 140, borderRadius: '50%',
              background: 'rgba(181, 85, 62, 0.08)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -40, left: -20,
              width: 180, height: 180, borderRadius: '50%',
              background: 'rgba(107, 128, 70, 0.08)',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div
                style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: 'linear-gradient(135deg, var(--primary), #E8A87C)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32,
                  boxShadow: '0 8px 24px rgba(181, 85, 62, 0.25)',
                  flexShrink: 0,
                }}
              >
                {recipe.steps[current].emoji || '🍳'}
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>
                  STEP {current + 1} / {recipe.steps.length}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {getStepTitle(recipe.steps[current].description)}
                </div>
              </div>
            </div>
            <p
              style={{
                fontSize: 16.5,
                lineHeight: 1.75,
                color: 'var(--text)',
                paddingLeft: 80,
                animation: 'fadeInUp 0.5s 0.15s both',
              }}
            >
              {recipe.steps[current].description}
            </p>
          </div>
        </div>
      )}

      {/* 导航按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          style={{
            flex: 1,
            maxWidth: 200,
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            background: current === 0 ? 'var(--bg-soft)' : '#fff',
            color: current === 0 ? 'var(--text-soft)' : 'var(--text)',
            border: '1px solid var(--border)',
            fontSize: 14,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: current === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (current !== 0) (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          }}
        >
          ← 上一步
        </button>
        {current === recipe.steps.length - 1 ? (
          <div
            style={{
              flex: 1,
              maxWidth: 200,
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent), #8FB06E)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 6px 16px rgba(107, 128, 70, 0.35)',
              animation: 'popIn 0.5s both',
            }}
          >
            🎉 大功告成！
          </div>
        ) : (
          <button
            onClick={() => goTo(current + 1)}
            style={{
              flex: 1,
              maxWidth: 200,
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(181, 85, 62, 0.25)',
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
            下一步 →
          </button>
        )}
      </div>

      {/* 所有步骤列表 */}
      <div>
        <div style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 12, fontWeight: 500 }}>
          📋 全部步骤一览
        </div>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 17, top: 10, bottom: 10, width: 2,
              background: 'linear-gradient(to bottom, var(--accent), var(--primary))',
              opacity: 0.2,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recipe.steps.map((step, i) => {
              const isActive = i === current;
              const isDone = i < current;
              return (
                <button
                  key={step.id}
                  onClick={() => goTo(i)}
                  style={{
                    display: 'flex',
                    gap: 14,
                    padding: '12px 12px 12px 8px',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'var(--primary-light)' : isDone ? 'transparent' : 'transparent',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.25s',
                    position: 'relative',
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = isActive ? 'var(--primary-light)' : 'transparent';
                  }}
                >
                  <span
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isActive
                        ? 'var(--primary)'
                        : isDone
                        ? 'var(--accent)'
                        : '#fff',
                      color: isActive || isDone ? '#fff' : 'var(--text-soft)',
                      fontSize: 13, fontWeight: 700,
                      border: `2px solid ${isActive ? 'var(--primary)' : isDone ? 'var(--accent)' : 'var(--border)'}`,
                      flexShrink: 0,
                      zIndex: 1,
                      transition: 'all 0.25s',
                      transform: isActive ? 'scale(1.08)' : 'scale(1)',
                      boxShadow: isActive ? '0 4px 12px rgba(181, 85, 62, 0.3)' : 'none',
                    }}
                  >
                    {isDone ? '✓' : step.emoji || i + 1}
                  </span>
                  <div style={{ flex: 1, paddingTop: 6, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'var(--primary)' : isDone ? 'var(--accent)' : 'var(--text)',
                        fontSize: 14.5,
                        lineHeight: 1.55,
                      }}
                    >
                      <span style={{ opacity: isDone ? 0.75 : 1 }}>{step.description}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getStepTitle(desc: string): string {
  const first = desc.split(/[，。,；;]/)[0].trim();
  if (first.length <= 14) return first;
  return first.slice(0, 14) + '...';
}
