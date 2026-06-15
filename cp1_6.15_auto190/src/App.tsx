import React, { useState, useCallback } from 'react';
import { useReadingStore } from './store/readingStore';
import { BookShelf } from './modules/bookShelf/BookShelf';
import { ReadingCalendar } from './modules/readingCalendar/ReadingCalendar';

interface NewShelfModalProps {
  onClose: () => void;
}

const NewShelfModal: React.FC<NewShelfModalProps> = ({ onClose }) => {
  const addShelf = useReadingStore((s) => s.addShelf);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#8b5a2b');

  const presetColors = [
    '#8b5a2b', '#5c6bc0', '#66bb6a',
    '#ef5350', '#ffa726', '#26c6da',
    '#ab47bc', '#ec407a',
  ];

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('请输入书架名称');
      return;
    }
    addShelf(name.trim(), color);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">➕ 新建书架</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-field" style={{ marginBottom: 20 }}>
            <label className="form-label">书架名称</label>
            <input
              className="form-input"
              placeholder="例如：科幻世界、人文历史..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>
          <div className="form-field">
            <label className="form-label">标识颜色</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {presetColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: c,
                    border: color === c ? '3px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    boxShadow: color === c ? '0 0 0 2px var(--bg-card), 0 0 0 4px var(--accent)' : undefined,
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>创建书架</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const activeModule = useReadingStore((s) => s.activeModule);
  const sidebarCollapsed = useReadingStore((s) => s.sidebarCollapsed);
  const shelves = useReadingStore((s) => s.shelves);
  const books = useReadingStore((s) => s.books);
  const removeShelf = useReadingStore((s) => s.removeShelf);
  const setActiveModule = useReadingStore((s) => s.setActiveModule);
  const toggleSidebar = useReadingStore((s) => s.toggleSidebar);

  const [showNewShelfModal, setShowNewShelfModal] = useState(false);

  const totalBooks = books.length;
  const totalShelves = shelves.length;

  const pageTitle = activeModule === 'bookshelf' ? '📚 我的藏书' : '📅 阅读日历';

  const handleShelfNavClick = useCallback(() => {
    setActiveModule('bookshelf');
  }, [setActiveModule]);

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">📖</div>
          <div className="sidebar-title">魔法书阁</div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeModule === 'bookshelf' ? 'active' : ''}`}
            onClick={() => setActiveModule('bookshelf')}
          >
            <span className="nav-icon">📚</span>
            <span>我的藏书</span>
          </button>
          <button
            className={`nav-item ${activeModule === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveModule('calendar')}
          >
            <span className="nav-icon">📅</span>
            <span>阅读日历</span>
          </button>
          <button className="nav-item" style={{ marginTop: 8 }}>
            <span className="nav-icon">📊</span>
            <span>统计概览</span>
          </button>
          <button className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>设置</span>
          </button>
        </nav>

        <div className="sidebar-shelves">
          <div className="sidebar-shelves-title">
            <span>我的书架 ({totalShelves})</span>
            <button
              className="add-shelf-btn"
              onClick={() => setShowNewShelfModal(true)}
              title="新建书架"
            >
              +
            </button>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '40vh', padding: '0 4px' }}>
            <button
              className={`shelf-list-item ${activeModule === 'bookshelf' ? 'active' : ''}`}
              onClick={handleShelfNavClick}
            >
              <span className="shelf-color-dot" style={{ backgroundColor: '#888' }} />
              <span style={{ flex: 1, textAlign: 'left' }}>全部 ({totalBooks})</span>
            </button>
            {shelves.map((shelf) => {
              const count = books.filter((b) => b.shelfId === shelf.id).length;
              return (
                <div
                  key={shelf.id}
                  style={{ position: 'relative' }}
                >
                  <button
                    className="shelf-list-item"
                    onClick={handleShelfNavClick}
                    title={`${shelf.name} - ${count}本书`}
                  >
                    <span
                      className="shelf-color-dot"
                      style={{ backgroundColor: shelf.color }}
                    />
                    <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {shelf.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {count}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定删除书架「${shelf.name}」？其中的书籍会被移至未分类。`)) {
                        removeShelf(shelf.id);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      fontSize: 14,
                      color: 'var(--text-muted)',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                    }}
                    className="delete-shelf-btn-hover"
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
                    title="删除书架"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              className="toggle-sidebar-btn"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {sidebarCollapsed ? '☰' : '◀'}
            </button>
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span>共藏书 <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{totalBooks}</span> 本</span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span>{shelves.length} 个书架</span>
          </div>
        </header>

        <main className="content-area">
          {activeModule === 'bookshelf' ? <BookShelf /> : <ReadingCalendar />}
        </main>
      </div>

      {showNewShelfModal && (
        <NewShelfModal onClose={() => setShowNewShelfModal(false)} />
      )}
    </div>
  );
};

export default App;
