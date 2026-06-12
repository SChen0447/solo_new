import React, { useState } from 'react';

interface ToolbarProps {
  searchKeyword: string;
  onSearch: (keyword: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExport: () => void;
  inputTopic: string;
  onInputChange: (value: string) => void;
  onGenerate: () => void;
  isMobilePanelOpen: boolean;
  onToggleMobilePanel: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  searchKeyword,
  onSearch,
  onExpandAll,
  onCollapseAll,
  onExport,
  inputTopic,
  onInputChange,
  onGenerate,
  isMobilePanelOpen,
  onToggleMobilePanel,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    onGenerate();
    setTimeout(() => setIsGenerating(false), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <>
      <button className="mobile-toggle-btn" onClick={onToggleMobilePanel}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className={`toolbar ${isMobilePanelOpen ? 'mobile-open' : ''}`}>
        <div className="toolbar-header">
          <div className="logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24" />
            </svg>
            <span>思维导图</span>
          </div>
        </div>

        <div className="toolbar-section">
          <label className="toolbar-label">输入主题</label>
          <div className="input-group">
            <input
              type="text"
              value={inputTopic}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：远程办公工具"
              className="topic-input"
            />
            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={isGenerating || !inputTopic.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              生成
            </button>
          </div>
        </div>

        <div className="toolbar-section">
          <label className="toolbar-label">搜索节点</label>
          <div className="search-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="输入关键词搜索..."
              className="search-input"
            />
          </div>
        </div>

        <div className="toolbar-section">
          <label className="toolbar-label">视图操作</label>
          <div className="button-row">
            <button className="toolbar-btn" onClick={onExpandAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              展开全部
            </button>
            <button className="toolbar-btn" onClick={onCollapseAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3H3v6M15 21h6v-6M3 3l7 7M21 21l-7-7" />
              </svg>
              收起全部
            </button>
          </div>
        </div>

        <div className="toolbar-section">
          <label className="toolbar-label">导出</label>
          <button className="toolbar-btn export-btn" onClick={onExport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            导出为图片
          </button>
        </div>

        <div className="toolbar-hint">
          <p>💡 提示</p>
          <ul>
            <li>双击节点编辑文字和备注</li>
            <li>拖拽节点可重排位置</li>
            <li>空格键 + 拖拽平移画布</li>
            <li>滚轮缩放画布</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Toolbar;
