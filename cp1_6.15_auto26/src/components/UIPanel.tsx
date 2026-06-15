import { useMemo } from 'react';
import { useBoneStore, HistoryRecord } from './BoneManager';
import { FragmentCard } from './FragmentCard';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

function ProgressRing({ progress, size = 60, strokeWidth = 5 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="progress-ring-container">
      <div className="progress-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            className="progress-ring-bg"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="progress-ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="progress-ring-text">{Math.round(progress)}%</span>
      </div>
      <span className="progress-label">拼接进度</span>
    </div>
  );
}

interface HistoryItemProps {
  record: HistoryRecord;
}

function HistoryItem({ record }: HistoryItemProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const getTypeClass = () => {
    switch (record.type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'drag';
    }
  };

  return (
    <div className="history-item">
      <span className={`history-dot ${getTypeClass()}`}></span>
      <div className="history-content">
        <div className="history-action">{record.action}</div>
        <div className="history-time">{formatTime(record.timestamp)}</div>
      </div>
    </div>
  );
}

interface UIPanelProps {
  leftCollapsed: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

export function UIPanel({ leftCollapsed, rightOpen, onToggleLeft, onToggleRight }: UIPanelProps) {
  const { fragments, selectedFragmentId, history, progress, setSelectedFragment, showError } = useBoneStore();

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  const handleFragmentClick = (id: string) => {
    setSelectedFragment(id === selectedFragmentId ? null : id);
  };

  return (
    <>
      {!leftCollapsed && (
        <aside className="left-panel">
          <div className="left-panel-header">
            <span className="left-panel-title">化石碎片库</span>
            <button
              className={`collapse-btn ${leftCollapsed ? 'collapsed' : ''}`}
              onClick={onToggleLeft}
              title="收起面板"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="fragment-list">
            {fragments.map((fragment) => (
              <FragmentCard
                key={fragment.id}
                fragment={fragment}
                onClick={() => handleFragmentClick(fragment.id)}
                isSelected={selectedFragmentId === fragment.id}
              />
            ))}
          </div>
        </aside>
      )}

      {leftCollapsed && (
        <button className="left-toggle-btn" onClick={onToggleLeft} title="展开碎片库">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <ProgressRing progress={progress} />

      <button
        className="history-btn"
        onClick={onToggleRight}
        title="历史记录"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <aside className={`right-panel ${rightOpen ? 'open' : ''}`}>
        <div className="right-panel-header">
          <span className="right-panel-title">操作历史</span>
          <button className="close-btn" onClick={onToggleRight} title="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="history-list">
          {sortedHistory.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '20px', fontSize: '13px' }}>
              暂无操作记录
            </div>
          ) : (
            sortedHistory.map((record) => (
              <HistoryItem key={record.id} record={record} />
            ))
          )}
        </div>
      </aside>

      {showError && <div className="error-toast">{showError}</div>}
    </>
  );
}
