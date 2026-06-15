import { Settings, Flame, Heart, Cpu, Leaf } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { PRESET_STYLES } from '../../utils/presets';
import './ControlPanel.css';

const presetIcons = [Flame, Heart, Cpu, Leaf];

export default function ControlPanel() {
  const emotionIntensity = useAppStore(state => state.emotionIntensity);
  const particleSize = useAppStore(state => state.particleSize);
  const backgroundBrightness = useAppStore(state => state.backgroundBrightness);
  const setEmotionIntensity = useAppStore(state => state.setEmotionIntensity);
  const setParticleSize = useAppStore(state => state.setParticleSize);
  const setBackgroundBrightness = useAppStore(state => state.setBackgroundBrightness);
  const applyPresetStyle = useAppStore(state => state.applyPresetStyle);
  const isMobileMenuOpen = useAppStore(state => state.isMobileMenuOpen);
  const toggleMobileMenu = useAppStore(state => state.toggleMobileMenu);

  const handleSliderChange = (
    setter: (value: number) => void,
    min: number,
    max: number
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setter(min + (value / 100) * (max - min));
  };

  const sliderValue = (value: number, min: number, max: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  return (
    <>
      <button
        className="mobile-toggle"
        onClick={toggleMobileMenu}
      >
        <Settings size={20} />
      </button>

      <div className={`control-panel ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="panel-header">
          <h2 className="panel-title">
            <Settings size={18} className="title-icon" />
            控制面板
          </h2>
          <button
            className="mobile-close"
            onClick={toggleMobileMenu}
          >
            ×
          </button>
        </div>

        <div className="control-section">
          <div className="control-label">
            <span>情绪强度</span>
            <span className="control-value">{Math.round(emotionIntensity)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue(emotionIntensity, 0, 100)}
            onChange={handleSliderChange(setEmotionIntensity, 0, 100)}
            className="control-slider"
            style={{
              background: `linear-gradient(to right, #6c5ce7 0%, #6c5ce7 ${sliderValue(emotionIntensity, 0, 100)}%, rgba(255,255,255,0.1) ${sliderValue(emotionIntensity, 0, 100)}%, rgba(255,255,255,0.1) 100%)`
            }}
          />
        </div>

        <div className="control-section">
          <div className="control-label">
            <span>粒子大小</span>
            <span className="control-value">{particleSize.toFixed(0)}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue(particleSize, 2, 8)}
            onChange={handleSliderChange(setParticleSize, 2, 8)}
            className="control-slider"
            style={{
              background: `linear-gradient(to right, #00e5ff 0%, #00e5ff ${sliderValue(particleSize, 2, 8)}%, rgba(255,255,255,0.1) ${sliderValue(particleSize, 2, 8)}%, rgba(255,255,255,0.1) 100%)`
            }}
          />
        </div>

        <div className="control-section">
          <div className="control-label">
            <span>背景亮度</span>
            <span className="control-value">{Math.round(backgroundBrightness * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue(backgroundBrightness, 0, 1)}
            onChange={handleSliderChange(setBackgroundBrightness, 0, 1)}
            className="control-slider"
            style={{
              background: `linear-gradient(to right, #ffd93d 0%, #ffd93d ${sliderValue(backgroundBrightness, 0, 1)}%, rgba(255,255,255,0.1) ${sliderValue(backgroundBrightness, 0, 1)}%, rgba(255,255,255,0.1) 100%)`
            }}
          />
        </div>

        <div className="presets-section">
          <h3 className="presets-title">预设风格</h3>
          <div className="preset-buttons">
            {PRESET_STYLES.map((preset, index) => {
              const IconComponent = presetIcons[index];
              return (
                <button
                  key={index}
                  className="preset-btn"
                  style={{ background: preset.color }}
                  onClick={() => applyPresetStyle(index)}
                  title={preset.name}
                >
                  <IconComponent size={18} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
