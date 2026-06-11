import React from 'react';
import { AnnotationType, PRESET_COLORS, ToolState } from './types';

interface ToolbarProps {
  tool: ToolState;
  onToolChange: (tool: ToolState) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onShare?: () => void;
  readOnly?: boolean;
}

const SelectIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
  </svg>
);

const RectIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="1" />
  </svg>
);

const CircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="8" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="19" x2="19" y2="5" />
    <polyline points="9 5 19 5 19 15" />
  </svg>
);

const BrushIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
  </svg>
);

const UndoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const RedoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const tools: Array<{ type: ToolState['type']; icon: React.ReactNode; label: string }> = [
  { type: 'select', icon: <SelectIcon />, label: '选择' },
  { type: 'rectangle', icon: <RectIcon />, label: '矩形' },
  { type: 'circle', icon: <CircleIcon />, label: '圆形' },
  { type: 'arrow', icon: <ArrowIcon />, label: '箭头' },
  { type: 'brush', icon: <BrushIcon />, label: '画笔' },
];

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onShare,
  readOnly,
}) => {
  return (
    <div className="toolbar">
      {!readOnly && (
        <>
          <div className="toolbar-group">
            {tools.map((t) => (
              <button
                key={t.type}
                className={`toolbar-btn ${tool.type === t.type ? 'active' : ''}`}
                onClick={() => onToolChange({ ...tool, type: t.type })}
                title={t.label}
              >
                {t.icon}
              </button>
            ))}
          </div>

          <div className="toolbar-group">
            <div className="color-palette">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-btn ${tool.color === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => onToolChange({ ...tool, color })}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="toolbar-group">
            <div className="stroke-control">
              <span className="stroke-label">粗细</span>
              <input
                type="range"
                min="1"
                max="10"
                value={tool.strokeWidth}
                onChange={(e) => onToolChange({ ...tool, strokeWidth: Number(e.target.value) })}
                className="stroke-slider"
              />
              <span className="stroke-value">{tool.strokeWidth}px</span>
            </div>
          </div>
        </>
      )}

      <div className="toolbar-group">
        {!readOnly && (
          <>
            <button
              className="toolbar-btn"
              onClick={onUndo}
              disabled={!canUndo}
              title="撤销"
            >
              <UndoIcon />
            </button>
            <button
              className="toolbar-btn"
              onClick={onRedo}
              disabled={!canRedo}
              title="重做"
            >
              <RedoIcon />
            </button>
          </>
        )}
        {onShare && (
          <button className="toolbar-btn share-btn" onClick={onShare} title="分享">
            <ShareIcon />
          </button>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
