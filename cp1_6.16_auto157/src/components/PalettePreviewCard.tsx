import { useMemo, useState, MouseEvent } from 'react';
import {
  ColorPalette,
  ContrastScore,
  getContrastRatio,
  calculateScore,
  levelColor
} from '../utils/colorUtils';

interface PalettePreviewCardProps {
  palette: ColorPalette;
  label: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export default function PalettePreviewCard({ palette, label }: PalettePreviewCardProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const score: ContrastScore = useMemo(() => {
    const primaryBg = getContrastRatio(palette.primary, palette.background);
    const textBg = getContrastRatio(palette.text, palette.background);
    return calculateScore(primaryBg, textBg);
  }, [palette]);

  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 200);
  };

  const getOverallLevel = (): '优' | '良' | '差' => {
    if (score.primaryBgLevel === '优' && score.textBgLevel === '优') return '优';
    if (score.primaryBgLevel === '差' || score.textBgLevel === '差') return '差';
    return '良';
  };

  const overallLevel = getOverallLevel();
  const overallColor = levelColor(overallLevel);

  return (
    <div
      style={{
        flex: 1,
        minWidth: '320px',
        background: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          padding: '12px 20px',
          background: '#F3F4F6',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: '13px', color: '#6B7280' }}>{palette.name}</span>
      </div>

      <div
        style={{
          padding: '24px',
          background: palette.background,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            background: `linear-gradient(90deg, ${palette.primary}, ${palette.accent}, ${palette.secondary})`,
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'titleGradient 1s ease-in-out infinite alternate'
          }}
        >
          色彩的艺术
        </div>

        <p style={{
          fontSize: '16px',
          lineHeight: 1.5,
          color: palette.text
        }}>
          这是一段示例正文文字，用于展示配色方案在实际阅读场景下的可读性效果。好的配色能够让用户在阅读时感到舒适，减少视觉疲劳，提升整体用户体验。
        </p>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            style={{
              padding: '10px 24px',
              background: palette.primary,
              color: palette.background,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: `0 2px 8px ${palette.primary}40`
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = `0 4px 16px ${palette.primary}60`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = `0 2px 8px ${palette.primary}40`;
            }}
          >
            主要操作
          </button>
          <a
            href="#"
            onClick={e => e.preventDefault()}
            style={{
              color: palette.primary,
              fontSize: '14px',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              padding: '4px 0'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '0.7';
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            文字链接按钮
          </a>
        </div>

        <div
          onClick={handleCardClick}
          style={{
            position: 'relative',
            borderRadius: '12px',
            border: `1px solid ${palette.secondary}80`,
            padding: '16px',
            background: `${palette.secondary}0A`,
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = palette.secondary;
            e.currentTarget.style.background = `${palette.secondary}15`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = `${palette.secondary}80`;
            e.currentTarget.style.background = `${palette.secondary}0A`;
          }}
        >
          {ripples.map(ripple => (
            <span
              key={ripple.id}
              className="ripple-effect"
              style={{
                left: ripple.x - 20,
                top: ripple.y - 20,
                width: 40,
                height: 40,
                background: `${palette.accent}50`
              }}
            />
          ))}
          <div style={{ fontSize: '15px', fontWeight: 600, color: palette.text, marginBottom: '6px' }}>
            示例卡片标题
          </div>
          <div style={{ fontSize: '13px', color: palette.text, opacity: 0.75 }}>
            点击卡片查看涟漪波纹反馈效果，这个交互用于测试配色方案在用户操作场景下的视觉呈现。
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            {[palette.primary, palette.secondary, palette.accent].map((c, i) => (
              <span
                key={i}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: c,
                  border: `2px solid ${palette.background}`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '16px 20px',
          background: '#FAFAFA',
          borderTop: '1px solid #E5E7EB'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6B7280' }}>综合评分</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: overallColor }}>{score.totalScore}</span>
            <span style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: `${overallColor}15`,
              color: overallColor,
              fontWeight: 600
            }}>
              {overallLevel}
            </span>
          </div>
        </div>

        <div
          style={{
            width: '100%',
            height: '8px',
            background: '#E5E7EB',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '12px'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${score.totalScore}%`,
              background: overallColor,
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#6B7280' }}>主色 vs 背景色</span>
            <span style={{ color: levelColor(score.primaryBgLevel) }}>
              {score.primaryBg}:1 · {score.primaryBgLevel}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#6B7280' }}>文字 vs 背景色</span>
            <span style={{ color: levelColor(score.textBgLevel) }}>
              {score.textBg}:1 · {score.textBgLevel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
