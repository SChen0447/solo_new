import { useRef, useState } from 'react';

type ToolType = 'pen' | 'rectangle' | 'circle' | 'sticky' | 'image' | 'select';

interface ToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  fillColor: string;
  onFillColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onShare: () => void;
  onImageUpload: (file: File) => void;
  connected: boolean;
}

const Toolbar = ({
  currentTool,
  onToolChange,
  strokeColor,
  onStrokeColorChange,
  fillColor,
  onFillColorChange,
  strokeWidth,
  onStrokeWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onShare,
  onImageUpload,
  connected
}: ToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const tools: { id: ToolType; label: string; icon: string }[] = [
    { id: 'select', label: '选择', icon: '↖' },
    { id: 'pen', label: '画笔', icon: '✏️' },
    { id: 'rectangle', label: '矩形', icon: '▢' },
    { id: 'circle', label: '圆形', icon: '○' },
    { id: 'sticky', label: '便签', icon: '📝' },
    { id: 'image', label: '图片', icon: '🖼️' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <h3 className="toolbar-title">绘图工具</h3>
        <div className="tool-grid">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`tool-btn ${currentTool === tool.id ? 'active' : ''}`}
              onClick={() => {
                onToolChange(tool.id);
                if (tool.id === 'image') {
                  fileInputRef.current?.click();
                }
              }}
              title={tool.label}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-label">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-title">颜色设置</h3>
        <div className="color-section">
          <div className="color-item">
            <label className="color-label">边框颜色</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => onStrokeColorChange(e.target.value)}
                className="color-input"
              />
              <span className="color-value">{strokeColor}</span>
            </div>
          </div>
          <div className="color-item">
            <label className="color-label">填充颜色</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                onChange={(e) => onFillColorChange(e.target.value)}
                className="color-input"
              />
              <button
                className={`transparent-btn ${fillColor === 'transparent' ? 'active' : ''}`}
                onClick={() => onFillColorChange(fillColor === 'transparent' ? '#ffffff' : 'transparent')}
                title="透明填充"
              >
                透明
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-title">笔触大小</h3>
        <div className="stroke-section">
          <input
            type="range"
            min="1"
            max="30"
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
            className="stroke-slider"
          />
          <div className="stroke-preview">
            <div
              className="stroke-dot"
              style={{ width: strokeWidth * 2, height: strokeWidth * 2 }}
            />
            <span className="stroke-value">{strokeWidth}px</span>
          </div>
        </div>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-title">操作</h3>
        <div className="action-buttons">
          <button
            className="action-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
          >
            <span>↶</span> 撤销
          </button>
          <button
            className="action-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="重做 (Ctrl+Shift+Z)"
          >
            <span>↷</span> 重做
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-title">图片上传</h3>
        <div
          className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="upload-icon">📁</p>
          <p className="upload-text">拖拽图片到此处</p>
          <p className="upload-hint">或点击选择文件</p>
          <p className="upload-size">支持 PNG/JPG/WebP，最大5MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className="toolbar-section">
        <div className="action-buttons">
          <button className="export-btn" onClick={onExport}>
            📥 导出图片
          </button>
          <button className="share-btn" onClick={onShare}>
            🔗 分享房间
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot" />
          <span>{connected ? '已连接' : '连接中...'}</span>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
