import { Theme, Gradient, THEMES, GRADIENTS, GRADIENT_NAMES } from '../types'

interface StylePanelProps {
  theme: Theme
  fontSize: number
  borderRadius: number
  gradient: Gradient
  onThemeChange: (theme: Theme) => void
  onFontSizeChange: (size: number) => void
  onBorderRadiusChange: (radius: number) => void
  onGradientChange: (gradient: Gradient) => void
  onGenerate: () => void
}

const themeIcons: Record<Theme, string> = {
  dark: '#1e1e1e',
  light: '#ffffff',
  monokai: '#272822',
  dracula: '#282a36',
  github: '#0d1117',
}

export default function StylePanel({
  theme,
  fontSize,
  borderRadius,
  gradient,
  onThemeChange,
  onFontSizeChange,
  onBorderRadiusChange,
  onGradientChange,
  onGenerate,
}: StylePanelProps) {
  return (
    <div className="style-panel">
      <h3>样式设置</h3>

      <div className="theme-selector">
        <label>主题</label>
        <div className="theme-buttons">
          {(Object.keys(THEMES) as Theme[]).map((t) => (
            <button
              key={t}
              className={`theme-btn ${theme === t ? 'active' : ''}`}
              onClick={() => onThemeChange(t)}
            >
              <span
                className="theme-icon"
                style={{
                  backgroundColor: themeIcons[t],
                  border: t === 'light' ? '1px solid #d0d0d0' : 'none',
                }}
              />
              {THEMES[t].name}
            </button>
          ))}
        </div>
      </div>

      <div className="slider-control">
        <label>
          <span>字号</span>
          <span className="slider-value">{fontSize}px</span>
        </label>
        <input
          type="range"
          min="12"
          max="20"
          step="1"
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
        />
      </div>

      <div className="slider-control">
        <label>
          <span>窗口圆角</span>
          <span className="slider-value">{borderRadius}px</span>
        </label>
        <input
          type="range"
          min="0"
          max="20"
          step="1"
          value={borderRadius}
          onChange={(e) => onBorderRadiusChange(Number(e.target.value))}
        />
      </div>

      <div className="gradient-selector">
        <label>背景渐变</label>
        <div className="gradient-options">
          {(Object.keys(GRADIENTS) as Gradient[]).map((g) => (
            <div
              key={g}
              className={`gradient-option ${gradient === g ? 'active' : ''}`}
              style={{ background: GRADIENTS[g] }}
              onClick={() => onGradientChange(g)}
              title={GRADIENT_NAMES[g]}
            />
          ))}
        </div>
      </div>

      <button className="generate-btn" onClick={onGenerate}>
        生成快照
      </button>
    </div>
  )
}
