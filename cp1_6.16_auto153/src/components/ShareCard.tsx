import { forwardRef, useImperativeHandle, useRef } from 'react'
import { toPng } from 'html-to-image'
import { Recipe } from '../store/recipeStore'

interface ShareCardProps {
  recipe: Recipe
}

export interface ShareCardRef {
  toPng: () => Promise<string>
}

const ShareCard = forwardRef<ShareCardRef, ShareCardProps>(({ recipe }, ref) => {
  const cardRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    toPng: async () => {
      if (!cardRef.current) return ''
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2
      })
      return dataUrl
    }
  }))

  const totalCost = recipe.ingredients.reduce((sum, ing) => sum + ing.amount * ing.pricePerGram, 0)
  const unitCost = recipe.yieldQuantity > 0 ? totalCost / recipe.yieldQuantity : 0
  const sellingPrice = unitCost * 2.5
  const grossMargin = unitCost > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : 0

  const stepsSummary = recipe.steps
    ? recipe.steps.split('\n').filter(line => line.trim()).slice(0, 3).join('；')
    : '暂无制作步骤'

  return (
    <div ref={cardRef} style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={cardIconStyle}>🍰</div>
        <h2 style={cardTitleStyle}>{recipe.name || '美味烘焙'}</h2>
        <div style={cardSubtitleStyle}>
          产量：{recipe.yieldQuantity} {recipe.yieldUnit || '个'} · 耗时：{recipe.prepTime}分钟
        </div>
      </div>

      <div style={cardSectionStyle}>
        <h3 style={sectionTitleStyle}>📋 食材清单</h3>
        <ul style={ingredientListStyle}>
          {recipe.ingredients.length > 0 ? (
            recipe.ingredients.map((ing) => (
              <li key={ing.id} style={ingredientItemStyle}>
                <span style={dotStyle}>●</span>
                <span style={ingredientNameStyle}>{ing.name}</span>
                <span style={ingredientAmountStyle}>{ing.amount}{ing.unit}</span>
              </li>
            ))
          ) : (
            <li style={{ ...ingredientItemStyle, color: '#999' }}>暂无食材</li>
          )}
        </ul>
      </div>

      <div style={cardSectionStyle}>
        <h3 style={sectionTitleStyle}>👨‍🍳 制作摘要</h3>
        <p style={stepsStyle}>{stepsSummary}</p>
      </div>

      <div style={costSectionStyle}>
        <div style={costItemStyle}>
          <div style={costLabelStyle}>总成本</div>
          <div style={costValueStyle}>¥ {totalCost.toFixed(2)}</div>
        </div>
        <div style={costDividerStyle}></div>
        <div style={costItemStyle}>
          <div style={costLabelStyle}>单份成本</div>
          <div style={costValueStyle}>¥ {unitCost.toFixed(2)}</div>
        </div>
        <div style={costDividerStyle}></div>
        <div style={costItemStyle}>
          <div style={costLabelStyle}>毛利率</div>
          <div style={{ ...costValueStyle, color: '#2E7D32' }}>{grossMargin.toFixed(1)}%</div>
        </div>
      </div>

      <div style={cardFooterStyle}>
        <span style={footerTextStyle}>烘焙配方管家 · 用心烘焙每一刻</span>
      </div>
    </div>
  )
})

ShareCard.displayName = 'ShareCard'

const cardStyle: React.CSSProperties = {
  width: '400px',
  backgroundColor: '#FFF8E1',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
}

const cardHeaderStyle: React.CSSProperties = {
  backgroundColor: '#795548',
  color: 'white',
  padding: '24px 20px',
  textAlign: 'center'
}

const cardIconStyle: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '8px'
}

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '24px',
  fontWeight: 700,
  color: 'white'
}

const cardSubtitleStyle: React.CSSProperties = {
  marginTop: '6px',
  fontSize: '13px',
  opacity: 0.9
}

const cardSectionStyle: React.CSSProperties = {
  padding: '16px 20px'
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: '12px',
  fontSize: '15px',
  fontWeight: 600,
  color: '#795548'
}

const ingredientListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0
}

const ingredientItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 0',
  fontSize: '14px',
  color: '#5D4037'
}

const dotStyle: React.CSSProperties = {
  color: '#8D6E63',
  fontSize: '8px',
  marginRight: '10px'
}

const ingredientNameStyle: React.CSSProperties = {
  flex: 1
}

const ingredientAmountStyle: React.CSSProperties = {
  fontWeight: 500,
  color: '#795548'
}

const stepsStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  lineHeight: 1.6,
  color: '#6D4C41'
}

const costSectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  padding: '16px 20px',
  backgroundColor: '#FFECB3',
  margin: '0 20px 16px',
  borderRadius: '10px'
}

const costItemStyle: React.CSSProperties = {
  textAlign: 'center',
  flex: 1
}

const costLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8D6E63',
  marginBottom: '4px'
}

const costValueStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#5D4037'
}

const costDividerStyle: React.CSSProperties = {
  width: '1px',
  height: '30px',
  backgroundColor: '#D7CCC8'
}

const cardFooterStyle: React.CSSProperties = {
  padding: '12px 20px',
  textAlign: 'center',
  borderTop: '1px dashed #D7CCC8'
}

const footerTextStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#A1887F'
}

export default ShareCard
