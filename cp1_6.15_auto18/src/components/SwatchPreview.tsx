import React, { useMemo, useState } from 'react'
import {
  RGB,
  rgbToHex,
  getContrastColor,
  lightenColor,
  darkenColor,
} from '../hooks/useColorExtractor'

interface SwatchPreviewProps {
  colors: RGB[]
}

const HeartIcon: React.FC<{ className?: string; color?: string }> = ({ className, color = 'currentColor' }) => (
  <svg className={className} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const ArrowRightIcon: React.FC<{ className?: string; color?: string }> = ({ className, color = 'currentColor' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const StarIcon: React.FC<{ className?: string; color?: string }> = ({ className, color = 'currentColor' }) => (
  <svg className={className} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const PaletteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
)

const SwatchPreview: React.FC<SwatchPreviewProps> = ({ colors }) => {
  const previews = useMemo(() => {
    if (colors.length < 8) return null

    const gradientStart = colors[0]
    const gradientEnd = lightenColor(gradientStart, 0.45)
    const gradientStyle: React.CSSProperties = {
      background: `linear-gradient(180deg, ${rgbToHex(gradientStart)} 0%, ${rgbToHex(gradientEnd)} 100%)`,
    }

    const cardBgColor = colors[0]
    const cardTextColor = colors[4]
    const cardBgHex = rgbToHex(cardBgColor)
    const cardTextContrast = getContrastColor(cardBgColor)
    const isCardTextLight = cardTextContrast === '#ffffff'

    const adjustedCardTextColor = isCardTextLight
      ? (getLuminanceValue(cardTextColor) > 0.5 ? darkenColor(cardTextColor, 0.3) : lightenColor(cardTextColor, 0.2))
      : cardTextColor

    const cardStyle: React.CSSProperties = {
      backgroundColor: cardBgHex,
      color: rgbToHex(adjustedCardTextColor),
      boxShadow: `0 4px 20px ${cardBgHex}33`,
    }

    const btnBase = colors[1]
    const btnHover = colors[2]
    const btnTextColor = getContrastColor(btnBase)

    const btnStyle: React.CSSProperties = {
      backgroundColor: rgbToHex(btnBase),
      color: btnTextColor,
      '--hover-bg': rgbToHex(btnHover),
    } as React.CSSProperties

    const btnAltBase = colors[3]
    const btnAltHover = colors[4]
    const btnAltTextColor = getContrastColor(btnAltBase)

    const btnAltStyle: React.CSSProperties = {
      backgroundColor: rgbToHex(btnAltBase),
      color: btnAltTextColor,
      '--hover-bg': rgbToHex(btnAltHover),
    } as React.CSSProperties

    return {
      gradient: gradientStyle,
      card: cardStyle,
      btnBase: btnStyle,
      btnAlt: btnAltStyle,
      btnTextColor,
      btnAltTextColor,
      btnHoverHex: rgbToHex(btnHover),
      btnAltHoverHex: rgbToHex(btnAltHover),
    }
  }, [colors])

  const [btn1Hovered, setBtn1Hovered] = useState(false)
  const [btn2Hovered, setBtn2Hovered] = useState(false)

  if (!previews || colors.length < 8) {
    return (
      <section className="previews-section">
        <div className="empty-state">
          <PaletteIcon className="empty-state-icon" />
          <div className="empty-state-text">
            上传图片后将自动生成<br />三种搭配方案的微视觉预览
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="previews-section">
      <h2 className="section-title">自动搭配方案预览</h2>
      <div className="previews-grid" key={colors.map(c => rgbToHex(c)).join('-')}>
        <div className="preview-card">
          <div className="preview-card-title">方案一 · 单色渐变</div>
          <div className="gradient-preview" style={previews.gradient} />
        </div>

        <div className="preview-card">
          <div className="preview-card-title">方案二 · 互补色卡片</div>
          <div className="card-preview-wrapper">
            <div className="preview-card-inner" style={previews.card}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <StarIcon className="btn-icon" color={String(previews.card.color)} />
                精选设计灵感
              </div>
              <div className="card-desc">
                基于色板中的主色调打造的视觉方案，让界面更具凝聚力和专业感。
                色彩搭配经过对比度优化，确保阅读体验和视觉美感并存。
              </div>
            </div>
          </div>
        </div>

        <div className="preview-card">
          <div className="preview-card-title">方案三 · 邻居色按钮</div>
          <div className="button-preview-wrapper">
            <button
              className="preview-button"
              style={{
                backgroundColor: btn1Hovered ? previews.btnHoverHex : previews.btnBase.backgroundColor,
                color: previews.btnTextColor,
              }}
              onMouseEnter={() => setBtn1Hovered(true)}
              onMouseLeave={() => setBtn1Hovered(false)}
            >
              <HeartIcon className="btn-icon" color={previews.btnTextColor} />
              喜欢
            </button>
            <button
              className="preview-button"
              style={{
                backgroundColor: btn2Hovered ? previews.btnAltHoverHex : previews.btnAlt.backgroundColor,
                color: previews.btnAltTextColor,
              }}
              onMouseEnter={() => setBtn2Hovered(true)}
              onMouseLeave={() => setBtn2Hovered(false)}
            >
              了解详情
              <ArrowRightIcon className="btn-icon" color={previews.btnAltTextColor} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function getLuminanceValue(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export default SwatchPreview
