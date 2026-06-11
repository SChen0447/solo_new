import React, { useState, useMemo, useCallback } from 'react';
import { LayoutGrid, Clock, Plus, Search, X } from 'lucide-react';
import type { DropResult } from 'react-beautiful-dnd';
import KanbanBoard from '@/components/KanbanBoard';
import TimelineView from '@/components/TimelineView';
import { useKanban } from '@/hooks/useKanban';
import type { ViewMode, CardStatus } from '@/types';

const STATUS_MAP: Record<string, CardStatus> = {
  todo: 'todo',
  in_progress: 'in_progress',
  done: 'done',
};

export default function App() {
  const {
    cards,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    reorderInColumn,
    addCheckItem,
    toggleCheckItem,
    removeCheckItem,
  } = useKanban();

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [viewKey, setViewKey] = useState(0);

  const keyword = searchKeyword.trim().toLowerCase();

  const filteredCards = useMemo(() => {
    if (!keyword) return cards;
    return cards.filter(
      c =>
        c.title.toLowerCase().includes(keyword) ||
        c.assignee.toLowerCase().includes(keyword)
    );
  }, [cards, keyword]);

  const disabledCardIds = useMemo(() => {
    if (!keyword) return new Set<string>();
    const matched = new Set(
      filteredCards.map(c => c.id)
    );
    return new Set(cards.filter(c => !matched.has(c.id)).map(c => c.id));
  }, [cards, filteredCards, keyword]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const sourceStatus = STATUS_MAP[source.droppableId];
      const destStatus = STATUS_MAP[destination.droppableId];

      if (sourceStatus === destStatus) {
        reorderInColumn(draggableId, source.index, destination.index, sourceStatus);
      } else {
        moveCard(draggableId, destStatus, destination.index);
      }
    },
    [moveCard, reorderInColumn]
  );

  const handleViewSwitch = (mode: ViewMode) => {
    if (mode !== viewMode) {
      setViewMode(mode);
      setViewKey(prev => prev + 1);
    }
  };

  const handleCreate = () => {
    if (newTitle.trim() && newDate && newAssignee.trim()) {
      addCard({
        title: newTitle.trim(),
        date: newDate,
        assignee: newAssignee.trim(),
      });
      setNewTitle('');
      setNewDate('');
      setNewAssignee('');
      setShowCreateForm(false);
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
  };

  const sharedProps = {
    cards: filteredCards,
    onUpdate: updateCard,
    onDelete: deleteCard,
    onAddCheckItem: addCheckItem,
    onToggleCheckItem: toggleCheckItem,
    onRemoveCheckItem: removeCheckItem,
    disabledCardIds,
    searchKeyword,
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-logo">
            <LayoutGrid size={22} />
            里程碑看板
          </h1>
        </div>

        <div className="app-header-center">
          <div className="search-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="搜索卡片标题或负责人..."
              className="search-input"
            />
            {searchKeyword && (
              <button className="search-clear" onClick={() => setSearchKeyword('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="app-header-right">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'kanban' ? 'view-toggle-btn--active' : ''}`}
              onClick={() => handleViewSwitch('kanban')}
              title="泳道视图"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'timeline' ? 'view-toggle-btn--active' : ''}`}
              onClick={() => handleViewSwitch('timeline')}
              title="时间轴视图"
            >
              <Clock size={16} />
            </button>
          </div>
          <button className="btn btn-primary btn-create" onClick={() => setShowCreateForm(true)}>
            <Plus size={16} />
            新建
          </button>
        </div>
      </header>

      <main className="app-main" key={viewKey}>
        {viewMode === 'kanban' ? (
          <KanbanBoard
            {...sharedProps}
            onDragEnd={handleDragEnd}
          />
        ) : (
          <TimelineView
            {...sharedProps}
          />
        )}
      </main>

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content modal-content--create" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>新建里程碑</h2>
              <button className="modal-close" onClick={() => setShowCreateForm(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>标题</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={handleCreateKeyDown}
                  placeholder="输入里程碑标题"
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>截止日期</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="form-input date-input-animate"
                />
              </div>
              <div className="form-group">
                <label>负责人</label>
                <input
                  type="text"
                  value={newAssignee}
                  onChange={e => setNewAssignee(e.target.value)}
                  onKeyDown={handleCreateKeyDown}
                  placeholder="输入负责人"
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newDate || !newAssignee.trim()}
              >
                <Plus size={15} />
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
