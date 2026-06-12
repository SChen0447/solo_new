import { Link } from 'react-router-dom';
import type { Recipe } from '../types';
import { coverSchemes, difficultyMeta } from '../utils/theme';

interface Props {
  recipe: Recipe;
  index?: number;
}

export default function RecipeCard({ recipe, index = 0 }: Props) {
  const scheme = coverSchemes[recipe.coverScheme % coverSchemes.length];
  const diff = difficultyMeta[recipe.difficulty];

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      style={{
        display: 'block',
        background: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        animation: `fadeInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.06}s both`,
      }}
      className="recipe-card"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px) scale(1.01)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'none';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div
        style={{
          height: 180,
          background: scheme.grad,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            top: -80,
            right: -60,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            bottom: -50,
            left: -30,
          }}
        />
        <span style={{ fontSize: 64, position: 'relative', zIndex: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}>
          {recipe.emoji}
        </span>
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--text)',
              lineHeight: 1.4,
              flex: 1,
              wordBreak: 'break-word',
            }}
          >
            {recipe.name}
          </h3>
          <span
            style={{
              flexShrink: 0,
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 999,
              background: diff.bg,
              color: diff.color,
              border: `1px solid ${diff.border}`,
              fontWeight: 500,
            }}
          >
            {diff.label}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-soft)',
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          <span className="hourglass" style={{ fontSize: 14 }}>⏳</span>
          <span>{recipe.cookTime} 分钟</span>
        </div>
        {recipe.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {recipe.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11.5,
                  padding: '3px 10px',
                  borderRadius: 8,
                  background: 'var(--bg-soft)',
                  color: 'var(--text-soft)',
                }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
