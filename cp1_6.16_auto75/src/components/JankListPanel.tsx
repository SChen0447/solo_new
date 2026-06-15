import type { JankData } from '@/types';
import { formatTime, formatTimestamp } from '@/utils/stack';

interface JankListPanelProps {
  jankList: JankData[];
  startTime: number;
  collapsed: boolean;
  onToggle: () => void;
}

export function JankListPanel({ jankList, startTime, collapsed, onToggle }: JankListPanelProps) {
  return (
    <div className={`jank-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-header jank-header" onClick={onToggle}>
        <div className="header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z" />
          </svg>
          <h3 className="panel-title">卡顿检测</h3>
          {jankList.length > 0 && <span className="jank-count">{jankList.length}</span>}
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`collapse-icon ${collapsed ? 'rotated' : ''}`}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </div>
      {!collapsed && (
        <div className="jank-content">
          {jankList.length === 0 ? (
            <div className="empty-state small">
              <p>暂无卡顿记录</p>
              <p className="hint">单帧耗时超过100ms将被标记</p>
            </div>
          ) : (
            <div className="jank-list">
              {jankList.map((jank) => (
                <div key={jank.id} className="jank-item">
                  <div className="jank-duration">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#F44336">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" stroke="#fff" strokeWidth="2" fill="none" />
                    </svg>
                    <span className="duration-text">{formatTime(jank.duration)}</span>
                  </div>
                  <div className="jank-details">
                    <div className="jank-meta">
                      <span className="jank-time">{formatTimestamp(jank.timestamp, startTime)}</span>
                    </div>
                    <div className="jank-function">{jank.functionName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
