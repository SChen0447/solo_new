import React from 'react'
import type { Recipe, Difficulty } from './types'

interface RecipeListProps {
  recipes: Recipe[]
  onSelectRecipe: (id: string) => void
  onAddRecipe: () => void
}

const difficultyLabels: Record<Difficulty, string> = {
  simple: '简单',
  medium: '中等',
  hard: '困难'
}

const difficultyColors: Record<Difficulty, string> = {
  simple: '#81C784',
  medium: '#FFB74D',
  hard: '#E57373'
}

const presetCovers = [
  '🍜',
  '🍲',
  '🥘',
  '🍛',
  '🍝',
  '🥗',
  '🍱',
  '🥟',
  '🍰',
  '🍪',
  '🥧',
  '🍕'
]

function getCoverDisplay(coverImage: string): React.ReactNode {
  if (coverImage.startsWith('data:') || coverImage.startsWith('http')) {
    return (
      <img
        src={coverImage}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '8px 8px 0 0'
        }}
      />
    )
  }
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '64px',
        backgroundColor: '#FFE0B2',
        borderRadius: '8px 8px 0 0'
      }}
    >
      {coverImage || presetCovers[0]}
    </div>
  )
}

const RecipeList: React.FC<RecipeListProps> = ({ recipes, onSelectRecipe, onAddRecipe }) => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>食易换</h1>
        <p style={styles.subtitle}>智能食谱收藏与食材替换</p>
        <button className="fullwidth-btn" style={styles.addButton} onClick={onAddRecipe}>
          + 新增食谱
        </button>
      </div>

      {recipes.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🍳</div>
          <p style={styles.emptyText}>还没有收藏的食谱</p>
          <p style={styles.emptySubText}>点击上方按钮添加你的第一个食谱吧</p>
        </div>
      ) : (
        <div className="recipe-grid" style={styles.grid}>
          {recipes.map((recipe, index) => (
            <div
              key={recipe.id}
              onClick={() => onSelectRecipe(recipe.id)}
              style={{
                ...styles.card,
                animation: `fadeInUp 0.4s ease-out ${index * 80}ms both`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              <div style={styles.cardCover}>{getCoverDisplay(recipe.coverImage)}</div>
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>{recipe.name}</h3>
                <div style={styles.cardMeta}>
                  <span style={styles.metaItem}>⏱ {recipe.cookTime}分钟</span>
                  <span
                    style={{
                      ...styles.difficultyBadge,
                      backgroundColor: difficultyColors[recipe.difficulty]
                    }}
                  >
                    {difficultyLabels[recipe.difficulty]}
                  </span>
                </div>
              </div>
            </div>
          ))}
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
        @media (max-width: 768px) {
          .recipe-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .recipe-grid {
            grid-template-columns: 1fr !important;
          }
          .fullwidth-btn {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  title: {
    fontSize: '36px',
    color: '#FF7043',
    margin: '0 0 8px 0',
    fontWeight: 700
  },
  subtitle: {
    fontSize: '16px',
    color: '#8D6E63',
    margin: '0 0 20px 0'
  },
  addButton: {
    backgroundColor: '#FF7043',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(255, 112, 67, 0.3)'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  emptyText: {
    fontSize: '18px',
    color: '#4E342E',
    margin: '0 0 8px 0',
    fontWeight: 600
  },
  emptySubText: {
    fontSize: '14px',
    color: '#8D6E63',
    margin: 0
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column'
  },
  cardCover: {
    width: '100%',
    height: '160px'
  },
  cardBody: {
    padding: '16px'
  },
  cardTitle: {
    fontSize: '18px',
    color: '#4E342E',
    margin: '0 0 12px 0',
    fontWeight: 600,
    lineHeight: 1.4
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metaItem: {
    fontSize: '14px',
    color: '#8D6E63'
  },
  difficultyBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#FFFFFF',
    fontWeight: 500
  }
}

export default RecipeList
