import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useRecipeStore } from '../store/recipeStore'

export default function RecipeList() {
  const { recipes, loadRecipes } = useRecipeStore()

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  const calculateCost = (recipe: any) => {
    const total = recipe.ingredients.reduce((sum: number, ing: any) => sum + ing.amount * ing.pricePerGram, 0)
    const unit = recipe.yieldQuantity > 0 ? total / recipe.yieldQuantity : 0
    return { total, unit }
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={pageTitleStyle}>📋 配方列表</h2>
        <Link to="/recipes/new" style={addBtnStyle}>
          ➕ 创建新配方
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>🍰</div>
          <h3 style={emptyTitleStyle}>暂无配方</h3>
          <p style={emptyDescStyle}>点击上方按钮创建你的第一个烘焙配方吧！</p>
        </div>
      ) : (
        <div style={recipeGridStyle}>
          {recipes.map(recipe => {
            const { total, unit } = calculateCost(recipe)
            return (
              <Link
                key={recipe.id}
                to={`/recipes/${recipe.id}`}
                style={recipeCardStyle}
              >
                <div style={recipeHeaderStyle}>
                  <span style={recipeEmojiStyle}>🧁</span>
                  <h3 style={recipeNameStyle}>{recipe.name}</h3>
                </div>

                <div style={recipeMetaStyle}>
                  <div style={metaItemStyle}>
                    <span style={metaLabelStyle}>产量</span>
                    <span style={metaValueStyle}>{recipe.yieldQuantity} {recipe.yieldUnit}</span>
                  </div>
                  <div style={metaItemStyle}>
                    <span style={metaLabelStyle}>耗时</span>
                    <span style={metaValueStyle}>{recipe.prepTime} 分钟</span>
                  </div>
                  <div style={metaItemStyle}>
                    <span style={metaLabelStyle}>食材数</span>
                    <span style={metaValueStyle}>{recipe.ingredients.length} 种</span>
                  </div>
                </div>

                <div style={costRowStyle}>
                  <div style={costItemStyle}>
                    <span style={costLabelStyle}>总成本</span>
                    <span style={costValueStyle}>¥ {total.toFixed(2)}</span>
                  </div>
                  <div style={costDividerStyle}></div>
                  <div style={costItemStyle}>
                    <span style={costLabelStyle}>单份</span>
                    <span style={costValueStyle}>¥ {unit.toFixed(2)}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto'
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px'
}

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '28px',
  color: '#5D4037',
  fontWeight: 700
}

const addBtnStyle: React.CSSProperties = {
  padding: '12px 24px',
  backgroundColor: '#795548',
  color: 'white',
  textDecoration: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500
}

const emptyStateStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '60px 40px',
  textAlign: 'center',
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
}

const emptyIconStyle: React.CSSProperties = {
  fontSize: '64px',
  marginBottom: '16px'
}

const emptyTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '20px',
  color: '#5D4037',
  fontWeight: 600,
  marginBottom: '8px'
}

const emptyDescStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '14px',
  color: '#8D6E63'
}

const recipeGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '20px'
}

const recipeCardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '20px',
  textDecoration: 'none',
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  transition: 'transform 0.2s, box-shadow 0.2s'
}

const recipeHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '16px'
}

const recipeEmojiStyle: React.CSSProperties = {
  fontSize: '32px'
}

const recipeNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '18px',
  color: '#5D4037',
  fontWeight: 600,
  flex: 1
}

const recipeMetaStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '16px',
  paddingBottom: '16px',
  borderBottom: '1px solid #EFEBE9'
}

const metaItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
}

const metaLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#A1887F'
}

const metaValueStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#5D4037',
  fontWeight: 500
}

const costRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around'
}

const costItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  flex: 1
}

const costLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#A1887F'
}

const costValueStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#795548',
  fontWeight: 700
}

const costDividerStyle: React.CSSProperties = {
  width: '1px',
  height: '24px',
  backgroundColor: '#D7CCC8'
}
