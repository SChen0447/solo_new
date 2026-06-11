import React from 'react';
import { SignatureStyle } from '../signatureRenderer';
import { TextureType, textureConfigs } from '../textureManager';

interface ControlPanelProps {
  inputText: string;
  onInputChange: (text: string) => void;
  primaryColor: string;
  onPrimaryColorChange: (color: string) => void;
  secondaryColor: string;
  onSecondaryColorChange: (color: string) => void;
  selectedTexture: TextureType;
  onTextureChange: (texture: TextureType) => void;
  onGenerate: () => void;
  onDownload: () => void;
  isGenerating: boolean;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const styleOptions: { id: SignatureStyle; label: string; icon: string }[] = [
  { id: 'handwriting', label: '手写体', icon: '✍️' },
  { id: 'calligraphy', label: '书法体', icon: '🖌️' },
  { id: 'cartoon', label: '卡通体', icon: '🎨' }
];

const colorPresets = [
  '#2c3e50', '#8b0000', '#1a5490', '#2d5016',
  '#6b3fa0', '#c0392b', '#006400', '#8b4513'
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  inputText,
  onInputChange,
  primaryColor,
  onPrimaryColorChange,
  secondaryColor,
  onSecondaryColorChange,
  selectedTexture,
  onTextureChange,
  onGenerate,
  onDownload,
  isGenerating,
  isMobile = false,
  isOpen = true,
  onClose
}) => {
  const containerClass = isMobile
    ? `control-panel-mobile ${isOpen ? 'open' : 'closed'}`
    : 'control-panel';

  return (
    <div className={containerClass}>
      {isMobile && (
        <div className="panel-header">
          <span className="panel-title">控制面板</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
      )}
      
      <div className="panel-section">
        <label className="section-label">输入名字（2-4个汉字）</label>
        <input
          type="text"
          className="text-input"
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="请输入签名文字"
          maxLength={4}
        />
        <button 
          className="generate-btn"
          onClick={onGenerate}
          disabled={isGenerating || inputText.length < 2}
        >
          {isGenerating ? '生成中...' : '✨ 生成签名'}
        </button>
      </div>

      <div className="panel-section">
        <label className="section-label">签名颜色</label>
        <div className="color-row">
          <div className="color-item">
            <span className="color-label">主色</span>
            <div className="color-picker-wrapper">
              <input
                type="color"
                className="color-picker"
                value={primaryColor}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
              />
              <span className="color-hex">{primaryColor}</span>
            </div>
          </div>
          <div className="color-item">
            <span className="color-label">辅色</span>
            <div className="color-picker-wrapper">
              <input
                type="color"
                className="color-picker"
                value={secondaryColor}
                onChange={(e) => onSecondaryColorChange(e.target.value)}
              />
              <span className="color-hex">{secondaryColor}</span>
            </div>
          </div>
        </div>
        <div className="preset-colors">
          {colorPresets.map((color) => (
            <button
              key={color}
              className={`preset-color ${primaryColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onPrimaryColorChange(color)}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="panel-section">
        <label className="section-label">背景纹理</label>
        <div className="texture-grid">
          {textureConfigs.map((texture) => (
            <button
              key={texture.id}
              className={`texture-item ${selectedTexture === texture.id ? 'active' : ''}`}
              onClick={() => onTextureChange(texture.id)}
            >
              <div 
                className="texture-thumbnail"
                style={{ backgroundColor: texture.thumbnailColor }}
              />
              <span className="texture-name">{texture.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <button className="download-btn" onClick={onDownload}>
          📥 下载PNG图片
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
