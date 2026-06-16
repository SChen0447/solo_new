import { Link } from 'react-router-dom'
import { useRecipeStore } from '../store/recipeStore'
import { useEffect } from 'react'

export default function Home() {
  const { recipes, loadRecipes } = useRecipeStore()

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  return (
    <div style={containerStyle}>
      <div style={heroStyle}>
        <div style={heroContentStyle}>
          <h1 style={heroTitleStyle}>🍰 烘焙配方管家</h1>
          <p style={heroDescStyle}>
            专业的烘焙配方管理与成本核算工具<br />
            让每一次烘焙都精准可控
          </p>
          <div style={heroActionsStyle}>
            <Link to="/recipes/new" style={primaryBtnStyle}>
              ➕ 创建新配方
            </Link>
            <Link to="/recipes" style={secondaryBtnStyle}>
              📋 查看配方列表
            </Link>
          </div>
        </div>
        <div style={heroImageStyle}>
          <div style={heroIconStyle}>🧁</div>
        </div>
      </div>

      <div style={featuresStyle}>
        <div style={featureCardStyle}>
          <div style={featureIconStyle}>📝</div>
          <h3 style={featureTitleStyle}>配方管理</h3>
          <p style={featureDescStyle}>
            创建和编辑配方，精确管理每种食材的用量，支持20+种基础食材预设
          </p>
        </div>
        <div style={featureCardStyle}>
          <div style={featureIconStyle}>💰</div>
          <h3 style={featureTitleStyle}>成本核算</h3>
          <p style={featureDescStyle}>
            自动计算食材总成本、单个成品成本和估算毛利率，精确到分
          </p>
        </div>
        <div style={featureCardStyle}>
          <div style={featureIconStyle}>📦</div>
          <h3 style={featureTitleStyle}>库存管理</h3>
          <p style={featureDescStyle}>
            实时跟踪食材库存，低库存时红色闪烁警告，及时补充原料
          </p>
        </div>
        <div style={featureCardStyle}>
          <div style={featureIconStyle}>🖼️</div>
          <h3 style={featureTitleStyle}>分享卡片</h3>
          <p style={featureDescStyle}>
            一键生成精美的配方分享卡片，支持下载为PNG图片
          </p>
        </div>
      </div>

      {recipes.length > 0 && (
        <div style={recentSectionStyle}>
          <h2 style={sectionTitleStyle}>🔥 最近配方</h2>
          <div style={recipeGridStyle}>
            {recipes.slice(0, 3).map(recipe => {
              const totalCost = recipe.ingredients.reduce((sum, ing) => sum + ing.amount * ing.pricePerGram, 0)
              const unitCost = recipe.yieldQuantity > 0 ? totalCost / recipe.yieldQuantity : 0
              return (
                <Link
                  key={recipe.id}
                  to={`/recipes/${recipe.id}`}
                  style={recipeCardStyle}
                >
                  <div style={recipeCardHeaderStyle}>
                    <span style={recipeEmojiStyle}>🍪</span>
                    <h3 style={recipeNameStyle}>{recipe.name}</h3>
                  </div>
                  <div style={recipeMetaStyle}>
                    <span>产量：{recipe.yieldQuantity}{recipe.yieldUnit}</span>
                    <span>耗时：{recipe.prepTime}分钟</span>
                  </div>
                  <div style={recipeCostStyle}>
                    <span>单份成本 ¥{unitCost.toFixed(2)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto'
}

const heroStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '40px',
  backgroundColor: 'white',
  borderRadius: '20px',
  padding: '48px 40px',
  marginBottom: '32px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
}

const heroContentStyle: React.CSSProperties = {
  flex: 1
}

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '36px',
  color: '#5D4037',
  fontWeight: 700,
  marginBottom: '16px'
}

const heroDescStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  color: '#8D6E63',
  lineHeight: 1.8,
  marginBottom: '28px'
}

const heroActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px'
}

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 28px',
  backgroundColor: '#795548',
  color: 'white',
  textDecoration: 'none',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: 500,
  transition: 'background-color 0.2s'
}

const secondaryBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 28px',
  backgroundColor: '#FFF3E0',
  color: '#795548',
  textDecoration: 'none',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: 500,
  border: '2px solid #FFCC80'
}

const heroImageStyle: React.CSSProperties = {
  width: '200px',
  height: '200px',
  backgroundColor: '#FFF8E1',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const heroIconStyle: React.CSSProperties = {
  fontSize: '100px'
}

const featuresStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '20px',
  marginBottom: '32px'
}

const featureCardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '24px 20px',
  textAlign: 'center',
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
}

const featureIconStyle: React.CSSProperties = {
  fontSize: '36px',
  marginBottom: '12px'
}

const featureTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  color: '#5D4037',
  fontWeight: 600,
  marginBottom: '8px'
}

const featureDescStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: '#8D6E63',
  lineHeight: 1.6
}

const recentSectionStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '28px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '20px',
  color: '#5D4037',
  fontWeight: 600,
  marginBottom: '20px'
}

const recipeGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '16px'
}

const recipeCardStyle: React.CSSProperties = {
  backgroundColor: '#FFF8E1',
  borderRadius: '12px',
  padding: '20px',
  textDecoration: 'none',
  transition: 'transform 0.2s, box-shadow 0.2s'
}

const recipeCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '12px'
}

const recipeEmojiStyle: React.CSSProperties = {
  fontSize: '28px'
}

const recipeNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  color: '#5D4037',
  fontWeight: 600
}

const recipeMetaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontSize: '13px',
  color: '#8D6E63',
  marginBottom: '12px'
}

const recipeCostStyle: React.CSSProperties = {
  paddingTop: '12px',
  borderTop: '1px dashed #D7CCC8',
  fontSize: '14px',
  fontWeight: 600,
  color: '#795548'
}
