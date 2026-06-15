import { X, History, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function HistorySidebar() {
  const isOpen = useAppStore((s) => s.isHistoryOpen);
  const toggle = useAppStore((s) => s.toggleHistory);
  const history = useAppStore((s) => s.history);
  const restoreFromHistory = useAppStore((s) => s.restoreFromHistory);
  const clearHistory = useAppStore((s) => s.clearHistory);
  const historyId = useAppStore((s) => s.historyId);

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? 'show' : ''}`}
        onClick={toggle}
      />
      <aside className={`history-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            <History size={18} />
            <span>历史记录</span>
          </div>
          <div className="sidebar-actions">
            {history.length > 0 && (
              <button
                className="clear-btn"
                onClick={clearHistory}
                title="清空历史"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button className="close-btn" onClick={toggle}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="sidebar-content">
          {history.length === 0 ? (
            <div className="sidebar-empty">
              <div className="sidebar-empty-icon">
                <History size={40} />
              </div>
              <p>还没有配色记录</p>
              <p className="sidebar-empty-hint">上传图片提取配色后会自动保存到这里</p>
            </div>
          ) : (
            <ul className="history-list">
              {history.map((item) => (
                <li
                  key={item.id}
                  className={`history-item ${item.id === historyId ? 'active' : ''}`}
                  onClick={() => restoreFromHistory(item.id)}
                >
                  <div className="history-thumb-wrapper">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt="history thumbnail"
                        className="history-thumb"
                      />
                    ) : (
                      <div className="history-thumb-placeholder" />
                    )}
                  </div>
                  <div className="history-colors">
                    {item.extractedColors.slice(0, 5).map((c, i) => (
                      <span
                        key={i}
                        className="history-dot"
                        style={{ background: c.hex }}
                      />
                    ))}
                  </div>
                  <div className="history-meta">
                    <span className="history-time">
                      {formatTime(item.timestamp)}
                    </span>
                    <span className="history-desc">
                      {item.extractedColors[0]?.name || '配色方案'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
