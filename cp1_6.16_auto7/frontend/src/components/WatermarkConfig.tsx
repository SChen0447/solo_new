import { useRef } from 'react';
import { WatermarkConfigType, POSITION_OPTIONS } from '../types';

interface WatermarkConfigProps {
  config: WatermarkConfigType;
  onChange: (config: WatermarkConfigType) => void;
  onUploadWatermark?: (file: File) => Promise<string | null>;
  watermarkImageId?: string | null;
  watermarkImagePreview?: string;
  disabled?: boolean;
}

export const WatermarkConfig: React.FC<WatermarkConfigProps> = ({
  config,
  onChange,
  onUploadWatermark,
  watermarkImagePreview,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = <K extends keyof WatermarkConfigType>(
    key: K,
    value: WatermarkConfigType[K]
  ) => {
    onChange({ ...config, [key]: value });
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadWatermark) {
      await onUploadWatermark(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="watermark-config">
      <div className="config-section">
        <h3 className="config-title">水印类型</h3>
        <div className="type-toggle">
          <button
            className={`type-btn ${config.type === 'text' ? 'active' : ''}`}
            onClick={() => handleChange('type', 'text')}
            disabled={disabled}
          >
            文字水印
          </button>
          <button
            className={`type-btn ${config.type === 'image' ? 'active' : ''}`}
            onClick={() => handleChange('type', 'image')}
            disabled={disabled}
          >
            图片水印
          </button>
        </div>
      </div>

      {config.type === 'text' && (
        <>
          <div className="config-section">
            <label className="config-label">水印文字</label>
            <input
              type="text"
              className="config-input"
              value={config.text}
              onChange={e => handleChange('text', e.target.value)}
              placeholder="输入水印文字"
              disabled={disabled}
              maxLength={50}
            />
          </div>

          <div className="config-section">
            <label className="config-label">
              字体大小: <span className="value-badge">{config.font_size}px</span>
            </label>
            <input
              type="range"
              className="config-slider"
              min="12"
              max="120"
              value={config.font_size}
              onChange={e => handleChange('font_size', parseInt(e.target.value))}
              disabled={disabled}
            />
          </div>

          <div className="config-section">
            <label className="config-label">文字颜色</label>
            <div className="color-picker-row">
              <input
                type="color"
                className="config-color"
                value={config.font_color}
                onChange={e => handleChange('font_color', e.target.value)}
                disabled={disabled}
              />
              <input
                type="text"
                className="config-input color-input"
                value={config.font_color}
                onChange={e => handleChange('font_color', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
        </>
      )}

      {config.type === 'image' && (
        <div className="config-section">
          <label className="config-label">水印图片</label>
          <div className="watermark-image-upload">
            {watermarkImagePreview ? (
              <div className="watermark-preview">
                <img src={watermarkImagePreview} alt="水印预览" />
                <button
                  className="remove-watermark-btn"
                  onClick={() => onChange({ ...config, type: 'text' })}
                  disabled={disabled}
                >
                  移除
                </button>
              </div>
            ) : (
              <div
                className="watermark-drop-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p>点击上传水印图片</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handleWatermarkUpload}
              style={{ display: 'none' }}
              disabled={disabled}
            />
          </div>

          <div className="config-section">
            <label className="config-label">
              缩放比例: <span className="value-badge">{(config.scale * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              className="config-slider"
              min="5"
              max="100"
              value={config.scale * 100}
              onChange={e => handleChange('scale', parseInt(e.target.value) / 100)}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      <div className="config-section">
        <label className="config-label">
          透明度: <span className="value-badge">{(config.opacity * 100).toFixed(0)}%</span>
        </label>
        <input
          type="range"
          className="config-slider"
          min="10"
          max="100"
          value={config.opacity * 100}
          onChange={e => handleChange('opacity', parseInt(e.target.value) / 100)}
          disabled={disabled}
        />
      </div>

      <div className="config-section">
        <label className="config-label">水印位置</label>
        <select
          className="config-select"
          value={config.position}
          onChange={e => handleChange('position', e.target.value)}
          disabled={disabled}
        >
          {POSITION_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="position-visual">
          {POSITION_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={`position-dot ${config.position === opt.value ? 'active' : ''}`}
              onClick={() => handleChange('position', opt.value)}
              style={{
                left: opt.value.includes('left') ? '10%' : opt.value.includes('right') ? '90%' : '50%',
                top: opt.value.includes('top') ? '10%' : opt.value.includes('bottom') ? '90%' : '50%',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
