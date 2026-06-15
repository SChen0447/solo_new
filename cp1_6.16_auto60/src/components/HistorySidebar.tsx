import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import toast from 'react-hot-toast';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');

  if (isToday) {
    return `今天 ${hh}:${mm}:${ss}`;
  }

  const MM = (d.getMonth() + 1).toString().padStart(2, '0');
  const DD = d.getDate().toString().padStart(2, '0');
  return `${MM}-${DD} ${hh}:${mm}`;
}

export const HistorySidebar: React.FC = () => {
  const historyList = useAppStore((s) => s.historyList);
  const activeId = useAppStore((s) => s.ui.activeHistoryId);
  const restoreHistory = useAppStore((s) => s.restoreHistory);
  const clearHistory = useAppStore((s) => s.clearHistory);
  const [clickedId, setClickedId] = useState<string | null>(null);

  const handleClick = (id: string) => {
    setClickedId(id);
    restoreHistory(id);
    toast.success('已恢复历史版本');
    setTimeout(() => setClickedId(null), 300);
  };

  const handleClear = () => {
    if (historyList.length === 0) return;
    if (confirm('确定要清空所有历史记录吗？')) {
      clearHistory();
      toast.success('历史记录已清空');
    }
  };

  return (
    <aside className="history-sidebar">
      <div className="sidebar-header">
        <span>📋 历史记录</span>
        <span style={{ fontSize: '11px', color: '#858585' }}>{historyList.length}/10</span>
      </div>
      <div className="history-list">
        {historyList.length === 0 ? (
          <div className="history-empty">
            暂无历史记录
            <br />
            <br />
            点击顶部「保存快照」按钮保存当前对比
          </div>
        ) : (
          historyList.map((item, index) => (
            <div
              key={item.id}
              className={`history-item ${activeId === item.id ? 'active' : ''} ${
                clickedId === item.id ? 'clicked' : ''
              }`}
              onClick={() => handleClick(item.id)}
              style={{
                transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="history-time">
                #{historyList.length - index} {formatTime(item.timestamp)}
              </div>
              <div className="history-diff-count">
                {item.diffResult.totalVisualDiffs > 0
                  ? `${item.diffResult.totalVisualDiffs} 处视觉差异`
                  : '无视觉差异'}
              </div>
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '10px',
                  color: activeId === item.id ? '#546e7a' : '#666',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <span style={{ color: '#22863a' }}>+{item.diffResult.addedCount}</span>
                <span style={{ color: '#d73a49' }}>-{item.diffResult.removedCount}</span>
                <span style={{ color: '#e36209' }}>~{item.diffResult.modifiedCount}</span>
              </div>
            </div>
          ))
        )}
      </div>
      {historyList.length > 0 && (
        <div
          style={{
            padding: '8px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button
            onClick={handleClear}
            style={{
              width: '100%',
              padding: '6px',
              fontSize: '11px',
              backgroundColor: 'rgba(244, 67, 54, 0.15)',
              color: '#ef5350',
              borderRadius: '4px',
            }}
          >
            🗑️ 清空历史
          </button>
        </div>
      )}
    </aside>
  );
};

export default HistorySidebar;
