import React from 'react';
import { ToolType, PenSettings, TextSettings } from '../types';
import { roundTo } from '../utils';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  penSettings: PenSettings;
  onPenSettingsChange: (settings: Partial<PenSettings>) => void;
  textSettings: TextSettings;
  onTextSettingsChange: (settings: Partial<TextSettings>) => void;
  onClear: () => void;
  onExport: () => void;
}

const PenIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const EraserIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
    <path d="M22 21H7" />
    <path d="m5 11 9 9" />
  </svg>
);

const TextIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

const StickyNoteIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
    <path d="M15 3v4a2 2 0 0 0 2 2h4" />
  </svg>
);

const PanIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.5 10a2.5 2.5 0 0 0-2.5 2.5V13h-1.5V8.5a2.5 2.5 0 0 0-5 0V13H8V5.5a2.5 2.5 0 0 0-5 0V17a7 7 0 0 0 7 7h6a5 5 0 0 0 5-5v-4.5a2.5 2.5 0 0 0-2.5-2.5Z" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const DownloadIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const AlignLeftIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="6" x2="3" y2="6" />
    <line x1="15" y1="12" x2="3" y2="12" />
    <line x1="17" y1="18" x2="3" y2="18" />
  </svg>
);

const AlignCenterIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="6" x2="3" y2="6" />
    <line x1="17" y1="12" x2="7" y2="12" />
    <line x1="19" y1="18" x2="5" y2="18" />
  </svg>
);

const AlignRightIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="6" x2="3" y2="6" />
    <line x1="21" y1="12" x2="9" y2="12" />
    <line x1="21" y1="18" x2="7" y2="18" />
  </svg>
);

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  penSettings,
  onPenSettingsChange,
  textSettings,
  onTextSettingsChange,
  onClear,
  onExport
}) => {
  const showPenSettings = activeTool === 'pen' || activeTool === 'eraser';
  const showTextSettings = activeTool === 'text';

  return (
    <div className="toolbar">
      <div className="tool-group">
        <button
          className={`tool-btn ${activeTool === 'pen' ? 'active' : ''}`}
          onClick={() => onToolChange('pen')}
          title="画笔"
        >
          <PenIcon />
        </button>
        <button
          className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
          onClick={() => onToolChange('eraser')}
          title="橡皮擦"
        >
          <EraserIcon />
        </button>
        <button
          className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`}
          onClick={() => onToolChange('text')}
          title="文字"
        >
          <TextIcon />
        </button>
        <button
          className={`tool-btn ${activeTool === 'sticky' ? 'active' : ''}`}
          onClick={() => onToolChange('sticky')}
          title="便签"
        >
          <StickyNoteIcon />
        </button>
        <button
          className={`tool-btn ${activeTool === 'pan' ? 'active' : ''}`}
          onClick={() => onToolChange('pan')}
          title="平移"
        >
          <PanIcon />
        </button>
      </div>

      {showPenSettings && (
        <div className="tool-group">
          <input
            type="color"
            className="color-picker"
            value={penSettings.color}
            onChange={(e) => onPenSettingsChange({ color: e.target.value })}
            title="颜色"
          />
          <div className="slider-group">
            <label>粗细</label>
            <input
              type="range"
              min="1"
              max="30"
              value={penSettings.lineWidth}
              onChange={(e) => onPenSettingsChange({ lineWidth: Number(e.target.value) })}
            />
            <span className="value-display">{penSettings.lineWidth}px</span>
          </div>
          <div className="slider-group">
            <label>透明度</label>
            <input
              type="range"
              min="10"
              max="100"
              value={penSettings.opacity * 100}
              onChange={(e) => onPenSettingsChange({ opacity: Number(e.target.value) / 100 })}
            />
            <span className="value-display">{Math.round(penSettings.opacity * 100)}%</span>
          </div>
        </div>
      )}

      {showTextSettings && (
        <div className="tool-group">
          <input
            type="color"
            className="color-picker"
            value={textSettings.color}
            onChange={(e) => onTextSettingsChange({ color: e.target.value })}
            title="文字颜色"
          />
          <div className="slider-group">
            <label>字号</label>
            <input
              type="range"
              min="12"
              max="72"
              value={textSettings.fontSize}
              onChange={(e) => onTextSettingsChange({ fontSize: Number(e.target.value) })}
            />
            <span className="value-display">{textSettings.fontSize}px</span>
          </div>
          <div className="text-align-group">
            <button
              className={`text-align-btn ${textSettings.textAlign === 'left' ? 'active' : ''}`}
              onClick={() => onTextSettingsChange({ textAlign: 'left' })}
              title="左对齐"
            >
              <AlignLeftIcon />
            </button>
            <button
              className={`text-align-btn ${textSettings.textAlign === 'center' ? 'active' : ''}`}
              onClick={() => onTextSettingsChange({ textAlign: 'center' })}
              title="居中"
            >
              <AlignCenterIcon />
            </button>
            <button
              className={`text-align-btn ${textSettings.textAlign === 'right' ? 'active' : ''}`}
              onClick={() => onTextSettingsChange({ textAlign: 'right' })}
              title="右对齐"
            >
              <AlignRightIcon />
            </button>
          </div>
        </div>
      )}

      <div className="tool-group">
        <button
          className="tool-btn"
          onClick={onClear}
          title="清空画布"
        >
          <TrashIcon />
        </button>
        <button
          className="tool-btn"
          onClick={onExport}
          title="导出图片"
        >
          <DownloadIcon />
        </button>
      </div>
    </div>
  );
};
