import { useState } from 'react';
import { useAppStore, formatCreatedAt } from './store';

export function HistoryPanel() {
  const history = useAppStore((s) => s.history);
  const loadFromHistory = useAppStore((s) => s.loadFromHistory);
  const renameArtwork = useAppStore((s) => s.renameArtwork);
  const deleteArtwork = useAppStore((s) => s.deleteArtwork);
  const currentLoadedId = useAppStore((s) => s.currentLoadedId);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <aside className="history-section">
      <div className="history-header">
        <div className="history-title">
          <span>历史作品</span>
          {history.length > 0 && (
            <span className="history-count">{history.length}</span>
          )}
        </div>
      </div>

      <div className="history-list">
        {history.length === 0 ? (
          <div className="history-empty">
            暂无作品
            <br />
            在左侧绘制并转换后
            <br />
            会自动保存到这里
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="history-item"
              onClick={(e) => {
                // 如果点击的是输入框或删除按钮，不触发加载
                const t = e.target as HTMLElement;
                if (
                  t.tagName === 'INPUT' ||
                  t.classList.contains('delete-btn')
                ) {
                  return;
                }
                loadFromHistory(item.id);
                setEditingId(null);
              }}
              style={{
                borderColor: currentLoadedId === item.id ? '#6c5ce7' : undefined,
                background: currentLoadedId === item.id ? '#f0edff' : undefined,
              }}
            >
              <img
                src={item.thumbnail}
                alt={item.name}
                className="history-thumb"
                draggable={false}
              />
              <div className="history-info">
                {editingId === item.id ? (
                  <input
                    className="history-name-input"
                    defaultValue={item.name}
                    autoFocus
                    onBlur={(e) => {
                      renameArtwork(item.id, e.target.value.trim());
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameArtwork(item.id, e.currentTarget.value.trim());
                        setEditingId(null);
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    className="history-name"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(item.id);
                    }}
                    title="点击重命名"
                  >
                    {item.name}
                  </div>
                )}
                <div className="history-time">
                  <span>{formatCreatedAt(item.createdAt)}</span>
                  <button
                    className="delete-btn"
                    title="删除"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定删除作品"${item.name}"吗？`)) {
                        deleteArtwork(item.id);
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
