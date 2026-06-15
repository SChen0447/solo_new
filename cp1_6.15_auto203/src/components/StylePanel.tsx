import React from 'react';
import { useFontStore } from '../store';
import { StyleParams } from '../types';
import './StylePanel.css';

const StylePanel: React.FC = () => {
  const { styleParams, updateStyleParams } = useFontStore();

  const handleChange = (key: keyof StyleParams, value: number | string) => {
    updateStyleParams({ [key]: value } as Partial<StyleParams>);
  };

  return (
    <div className="style-panel">
      <h3 className="style-panel__title">样式微调</h3>

      <div className="style-panel__row">
        <label className="style-panel__label">标题字号</label>
        <div className="style-panel__control">
          <input
            type="range"
            min="18"
            max="48"
            value={styleParams.titleFontSize}
            onChange={(e) => handleChange('titleFontSize', Number(e.target.value))}
            className="style-panel__slider"
          />
          <span className="style-panel__value">{styleParams.titleFontSize}px</span>
        </div>
      </div>

      <div className="style-panel__row">
        <label className="style-panel__label">正文字号</label>
        <div className="style-panel__control">
          <input
            type="range"
            min="12"
            max="24"
            value={styleParams.bodyFontSize}
            onChange={(e) => handleChange('bodyFontSize', Number(e.target.value))}
            className="style-panel__slider"
          />
          <span className="style-panel__value">{styleParams.bodyFontSize}px</span>
        </div>
      </div>

      <div className="style-panel__row">
        <label className="style-panel__label">行高</label>
        <div className="style-panel__control">
          <input
            type="range"
            min="1.2"
            max="2"
            step="0.1"
            value={styleParams.lineHeight}
            onChange={(e) => handleChange('lineHeight', Number(e.target.value))}
            className="style-panel__slider"
          />
          <span className="style-panel__value">{styleParams.lineHeight}</span>
        </div>
      </div>

      <div className="style-panel__row">
        <label className="style-panel__label">字间距</label>
        <div className="style-panel__control">
          <input
            type="range"
            min="0"
            max="0.1"
            step="0.005"
            value={styleParams.letterSpacing}
            onChange={(e) => handleChange('letterSpacing', Number(e.target.value))}
            className="style-panel__slider"
          />
          <span className="style-panel__value">{styleParams.letterSpacing.toFixed(3)}em</span>
        </div>
      </div>

      <div className="style-panel__row">
        <label className="style-panel__label">标题颜色</label>
        <input
          type="color"
          value={styleParams.titleColor}
          onChange={(e) => handleChange('titleColor', e.target.value)}
          className="style-panel__color"
        />
      </div>

      <div className="style-panel__row">
        <label className="style-panel__label">正文颜色</label>
        <input
          type="color"
          value={styleParams.bodyColor}
          onChange={(e) => handleChange('bodyColor', e.target.value)}
          className="style-panel__color"
        />
      </div>

      <div className="style-panel__row">
        <label className="style-panel__label">引用颜色</label>
        <input
          type="color"
          value={styleParams.quoteColor}
          onChange={(e) => handleChange('quoteColor', e.target.value)}
          className="style-panel__color"
        />
      </div>
    </div>
  );
};

export default StylePanel;
