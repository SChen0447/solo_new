import { useState, useCallback } from 'react';
import { useParseEngine } from './hooks/useParseEngine';
import { useLocalStorage } from './hooks/useLocalStorage';
import InputPanel from './components/InputPanel';
import RequirementList from './components/RequirementList';
import DiffView from './components/DiffView';
import { downloadMarkdown } from './utils/export';
import type { ParseResult } from './types';

type ViewMode = 'list' | 'diff';

export default function App() {
  const { parse } = useParseEngine();
  const storage = useLocalStorage();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [toast, setToast] = useState<string>('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const handleParseResult = useCallback((result: ParseResult) => {
    storage.setRequirements(result.requirements);
    storage.addToHistory(result);
    showToast(`解析完成，共 ${result.requirements.length} 条需求`);
  }, [storage, showToast]);

  const handleExport = () => {
    if (storage.requirements.length === 0) {
      showToast('暂无需求可导出');
      return;
    }
    downloadMarkdown(storage.requirements);
    showToast('Markdown文件已下载');
  };

  const handleApplyHistory = (result: ParseResult) => {
    storage.setRequirements(result.requirements);
    setViewMode('list');
    showToast('已应用历史版本');
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有需求条目吗？此操作不可撤销。')) {
      storage.clearAll();
      showToast('已清空所有需求');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">📝</span>
          <h1>智能需求文档生成器</h1>
        </div>
        <div className="app-actions desktop-actions">
          <button
            className="btn btn-secondary ripple"
            onClick={() => setViewMode(viewMode === 'list' ? 'diff' : 'list')}
          >
            {viewMode === 'list' ? '📊 对比视图' : '📋 列表视图'}
          </button>
          <button className="btn btn-secondary ripple" onClick={handleClearAll}>
            🗑 清空
          </button>
          <button className="btn btn-primary ripple" onClick={handleExport}>
            ⬇ 导出Markdown
          </button>
        </div>
      </header>

      <main className="app-main">
        {viewMode === 'list' ? (
          <div className="layout-two-col">
            <div className="col-left">
              <InputPanel onParse={parse} onResult={handleParseResult} />
            </div>
            <div className="col-right">
              <RequirementList
                requirements={storage.requirements}
                onReorder={storage.reorderRequirements}
                onUpdate={storage.updateRequirement}
                onDelete={storage.deleteRequirement}
                onAdd={storage.addRequirement}
              />
            </div>
          </div>
        ) : (
          <DiffView
            history={storage.history}
            onClose={() => setViewMode('list')}
            onApply={handleApplyHistory}
          />
        )}
      </main>

      <div className="mobile-fab-bar">
        <button className="fab-btn ripple" onClick={() => setViewMode(viewMode === 'list' ? 'diff' : 'list')}>
          {viewMode === 'list' ? '📊' : '📋'}
        </button>
        <button className="fab-btn ripple" onClick={handleClearAll}>
          🗑
        </button>
        <button className="fab-btn fab-primary ripple" onClick={handleExport}>
          ⬇
        </button>
      </div>

      {toast && (
        <div className="toast-enter">
          <div className="toast">{toast}</div>
        </div>
      )}
    </div>
  );
}
