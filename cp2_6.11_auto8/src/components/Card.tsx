import React, { useState, memo } from 'react';
import { Calendar, User, X, Plus, Trash2, Check } from 'lucide-react';
import dayjs from 'dayjs';
import type { Card as CardType } from '@/types';

interface CardProps {
  card: CardType;
  onUpdate: (id: string, data: Partial<CardType>) => void;
  onDelete: (id: string) => void;
  onAddCheckItem: (cardId: string, text: string) => void;
  onToggleCheckItem: (cardId: string, itemId: string) => void;
  onRemoveCheckItem: (cardId: string, itemId: string) => void;
  isDragDisabled?: boolean;
  isDimmed?: boolean;
  searchKeyword?: string;
}

function highlightText(text: string, keyword: string): React.ReactNode {
  if (!keyword.trim()) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase()
      ? <mark key={i} className="search-highlight">{part}</mark>
      : part
  );
}

const CardComponent: React.FC<CardProps> = ({
  card,
  onUpdate,
  onDelete,
  onAddCheckItem,
  onToggleCheckItem,
  onRemoveCheckItem,
  isDragDisabled = false,
  isDimmed = false,
  searchKeyword = '',
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDate, setEditDate] = useState(card.date);
  const [editAssignee, setEditAssignee] = useState(card.assignee);
  const [newCheckText, setNewCheckText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const completedCount = card.checklist.filter(ci => ci.done).length;
  const totalCount = card.checklist.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleOpenModal = () => {
    setEditTitle(card.title);
    setEditDate(card.date);
    setEditAssignee(card.assignee);
    setShowModal(true);
  };

  const handleSave = () => {
    onUpdate(card.id, {
      title: editTitle,
      date: editDate,
      assignee: editAssignee,
    });
    setShowModal(false);
  };

  const handleAddCheckItem = () => {
    const trimmed = newCheckText.trim();
    if (trimmed) {
      onAddCheckItem(card.id, trimmed);
      setNewCheckText('');
    }
  };

  const handleCheckKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCheckItem();
    }
  };

  const handleDelete = () => {
    onDelete(card.id);
    setShowModal(false);
  };

  const statusLabel: Record<string, string> = {
    todo: '待办',
    in_progress: '进行中',
    done: '已完成',
  };

  return (
    <>
      <div
        className={`card ${isDragDisabled ? 'card-disabled' : ''} ${isDimmed ? 'card-dimmed' : ''}`}
        onClick={handleOpenModal}
      >
        <div className="card-header">
          <span className={`card-status-badge card-status-badge--${card.status}`}>
            {statusLabel[card.status]}
          </span>
        </div>
        <h3 className="card-title">
          {highlightText(card.title, searchKeyword)}
        </h3>
        <div className="card-meta">
          <span className="card-meta-item">
            <Calendar size={13} />
            {dayjs(card.date).format('YYYY-MM-DD')}
          </span>
          <span className="card-meta-item">
            <User size={13} />
            {highlightText(card.assignee, searchKeyword)}
          </span>
        </div>
        {totalCount > 0 && (
          <div className="card-progress">
            <div className="card-progress-bar">
              <div className="card-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="card-progress-text">{completedCount}/{totalCount}</span>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>编辑里程碑</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>标题</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>截止日期</label>
                <div className="date-picker-wrapper">
                  <button
                    type="button"
                    className="date-toggle-btn"
                    onClick={() => setShowDatePicker(prev => !prev)}
                  >
                    <Calendar size={15} />
                    {dayjs(editDate).format('YYYY-MM-DD')}
                  </button>
                  <div className={`date-picker-dropdown ${showDatePicker ? 'date-picker-dropdown--open' : ''}`}>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => {
                        setEditDate(e.target.value);
                        setShowDatePicker(false);
                      }}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>负责人</label>
                <input
                  type="text"
                  value={editAssignee}
                  onChange={e => setEditAssignee(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>检查项</label>
                <div className="checklist">
                  {card.checklist.map(item => (
                    <div key={item.id} className="checklist-item">
                      <button
                        className={`checklist-checkbox ${item.done ? 'checklist-checkbox--checked' : ''}`}
                        onClick={() => onToggleCheckItem(card.id, item.id)}
                      >
                        {item.done && (
                          <svg className="checkmark-svg" viewBox="0 0 12 12">
                            <path
                              className="checkmark-path"
                              d="M2 6l3 3 5-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                      <span className={`checklist-text ${item.done ? 'checklist-text--done' : ''}`}>
                        {item.text}
                      </span>
                      <button
                        className="checklist-delete"
                        onClick={() => onRemoveCheckItem(card.id, item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="checklist-add">
                    <input
                      type="text"
                      value={newCheckText}
                      onChange={e => setNewCheckText(e.target.value)}
                      onKeyDown={handleCheckKeyDown}
                      placeholder="添加检查项..."
                      className="form-input checklist-add-input"
                    />
                    <button
                      className="checklist-add-btn"
                      onClick={handleAddCheckItem}
                      disabled={!newCheckText.trim()}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleDelete}>
                <Trash2 size={15} />
                删除
              </button>
              <div className="modal-footer-right">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                  <Check size={15} />
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const CardItem = memo(CardComponent);
