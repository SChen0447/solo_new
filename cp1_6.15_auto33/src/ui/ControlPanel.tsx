import { useRef } from 'react';
import { useAppStore, ColorTheme, themeNames, themeColors } from '../store';
import './ControlPanel.css';

interface ControlPanelProps {
  onExportImage: () => void;
  onExportData: () => void;
}

const themes: ColorTheme[] = ['neon', 'aurora', 'lava', 'cyberpunk', 'galaxy', 'pastel'];

export default function ControlPanel({ onExportImage, onExportData }: ControlPanelProps) {
  const {
    sensitivity,
    particleCount,
    colorTheme,
    fps,
    volume,
    bpm,
    setSensitivity,
    setParticleCount,
    setColorTheme,
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="control-panel">
      <h2 className="panel-title">控制面板</h2>

      <div className="panel-section">
        <label className="section-label">
          灵敏度 <span className="value">{sensitivity.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={sensitivity}
          onChange={(e) => setSensitivity(parseFloat(e.target.value))}
          className="slider sensitivity-slider"
        />
        <div className="slider-labels">
          <span>低</span>
          <span>高</span>
        </div>
      </div>

      <div className="panel-section">
        <label className="section-label">
          粒子数量 <span className="value">{particleCount}</span>
        </label>
        <input
          type="range"
          min="50"
          max="200"
          step="10"
          value={particleCount}
          onChange={(e) => setParticleCount(parseInt(e.target.value))}
          className="slider particle-slider"
        />
        <div className="slider-labels">
          <span>50</span>
          <span>200</span>
        </div>
      </div>

      <div className="panel-section">
        <label className="section-label">颜色主题</label>
        <div className="theme-grid">
          {themes.map((theme) => (
            <button
              key={theme}
              className={`theme-btn ${colorTheme === theme ? 'active' : ''}`}
              onClick={() => setColorTheme(theme)}
              title={themeNames[theme]}
            >
              <div 
                className="theme-preview"
                style={{
                  background: `linear-gradient(135deg, ${themeColors[theme].lowFreq}, ${themeColors[theme].midFreqEnd}, ${themeColors[theme].particleStart})`,
                }}
              />
              <span className="theme-name">{themeNames[theme]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section stats-section">
        <div className="stat-item">
          <span className="stat-label">音量</span>
          <div className="stat-bar">
            <div 
              className="stat-fill volume-fill"
              style={{ width: `${volume}%` }}
            />
          </div>
          <span className="stat-value">{volume}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">BPM</span>
          <span className="stat-value bpm-value">{bpm.toFixed(1)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">FPS</span>
          <span className={`stat-value ${fps < 40 ? 'low' : ''}`}>{Math.round(fps)}</span>
        </div>
      </div>

      <div className="panel-section export-section">
        <button className="export-btn image-export" onClick={onExportImage}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          导出截图
        </button>
        <button className="export-btn data-export" onClick={onExportData}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          导出数据
        </button>
      </div>
    </div>
  );
}
