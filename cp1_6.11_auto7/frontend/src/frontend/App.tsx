import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { List } from 'react-window';
import {
  Survey,
  Question,
  QuestionType,
  StatisticsResult,
  AnswerItem,
  getSurveys,
  createSurvey,
  deleteSurvey,
  getStatistics,
  getSurveyByShareToken,
  submitResponse,
} from './api';

type View = 'list' | 'create' | 'edit' | 'fill' | 'stats' | 'fillSuccess';

interface EditableQuestion extends Omit<Question, 'id'> {
  _tempId: string;
}

const PRIMARY_COLOR = '#3F51B5';
const PRIMARY_LIGHT = '#7986CB';
const PRIMARY_DARK = '#303F9F';
const BG_LIGHT = '#F5F7FA';
const SIDEBAR_BG = '#1A1F36';
const SURVEY_ITEM_HEIGHT = 80;

const genTempId = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const defaultQuestion = (type: QuestionType): EditableQuestion => {
  const base = { _tempId: genTempId(), type, title: '', required: true };
  if (type === 'text') return base;
  return { ...base, options: ['选项1', '选项2'] };
};

const typeLabels: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  text: '文本题',
};

const typeIcons: Record<QuestionType, string> = {
  single: '◉',
  multiple: '☑',
  text: '✎',
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function RippleButton({
  children,
  onClick,
  style = {},
  className = '',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
}) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const btn = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.5);
      transform: scale(0);
      animation: rippleAnim 0.6s linear;
      pointer-events: none;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      z-index: 1;
    `;
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    onClick?.(e);
  };

  return (
    <button
      className={className}
      style={style}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  const colors = [PRIMARY_COLOR, '#5C6BC0', '#7986CB', '#9FA8DA', '#C5CAE9', '#3F51B5', '#303F9F', '#1A237E'];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ marginBottom: 12, fontSize: 13, color: '#666' }}>总回复：{total}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((item, idx) => {
          const pct = max === 0 ? 0 : (item.value / max) * 100;
          const percent = total === 0 ? 0 : ((item.value / total) * 100).toFixed(1);
          return (
            <div key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: '#333', fontWeight: 500 }}>{item.label}</span>
                <span style={{ color: '#666' }}>
                  {item.value} ({percent}%)
                </span>
              </div>
              <div style={{ height: 26, background: '#E8EAF6', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${colors[idx % colors.length]}, ${PRIMARY_LIGHT})`,
                    borderRadius: 4,
                    transition: 'width 0.6s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 8,
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    minWidth: item.value > 0 ? 28 : 0,
                  }}
                >
                  {item.value > 0 ? item.value : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Toast({ error, success }: { error: string; success: string }) {
  return (
    <>
      {error && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#F44336', color: 'white', padding: '12px 24px', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(244,67,54,0.4)', zIndex: 9999,
          animation: 'slideDown 0.3s ease-out', fontSize: 14, fontWeight: 500, maxWidth: '90%',
        }}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#4CAF50', color: 'white', padding: '12px 24px', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(76,175,80,0.4)', zIndex: 9999,
          animation: 'slideDown 0.3s ease-out', fontSize: 14, fontWeight: 500, maxWidth: '90%',
        }}>
          ✓ {success}
        </div>
      )}
    </>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 2px 12px rgba(63,81,181,0.06), 0 1px 4px rgba(0,0,0,0.04)',
  border: '1px solid rgba(63,81,181,0.08)',
};

const primaryBtnStyle: React.CSSProperties = {
  background: `linear-gradient(135deg, ${PRIMARY_COLOR}, ${PRIMARY_DARK})`,
  color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8,
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
  transition: 'transform 0.15s, box-shadow 0.15s',
  boxShadow: `0 2px 8px rgba(63,81,181,0.3)`,
};

const secondaryBtnStyle: React.CSSProperties = {
  background: 'white', color: PRIMARY_COLOR, border: `2px solid ${PRIMARY_COLOR}`,
  padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', transition: 'all 0.2s',
};

const cssAnimations = `
@keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
`;

interface SurveyRowProps {
  surveys: Survey[];
  selectedId: string | null;
  onSelect: (s: Survey) => void;
  onCopyShare: (s: Survey) => void;
  onDelete: (id: string) => void;
}

function SurveyListItem(props: any) {
  const { index, style, surveys, selectedId, onSelect, onCopyShare, onDelete } = props as {
    index: number;
    style: React.CSSProperties;
  } & SurveyRowProps;
  const s = surveys[index];
  const selected = selectedId === s.id;
  return (
    <div
      style={{
        ...style,
        padding: '6px 8px',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={() => onSelect(s)}
        style={{
          height: '100%',
          padding: '10px 12px',
          background: selected ? 'rgba(63,81,181,0.35)' : 'rgba(255,255,255,0.04)',
          borderRadius: 10,
          cursor: 'pointer',
          border: `1px solid ${selected ? PRIMARY_LIGHT : 'rgba(255,255,255,0.06)'}`,
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        }}
        onMouseLeave={(e) => {
          if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        }}
      >
        <div style={{
          fontSize: 13,
          fontWeight: selected ? 700 : 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'white',
        }}>
          {s.title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, opacity: 0.55, color: 'white' }}>
          <span>{s.questions.length} 题</span>
          <span>📊 {s.responseCount} 回复</span>
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
          <RippleButton
            onClick={(e) => { e.stopPropagation(); onCopyShare(s); }}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            🔗 分享
          </RippleButton>
          <RippleButton
            onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              background: 'rgba(244,67,54,0.25)',
              color: '#FFCDD2',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            🗑 删除
          </RippleButton>
        </div>
      </div>
    </div>
  );
}

function MobileTopBar({ onToggle, total }: { onToggle: () => void; total: number }) {
  return (
    <div className="mobile-topbar" style={{
      display: 'none',
      background: `linear-gradient(135deg, ${PRIMARY_COLOR}, ${PRIMARY_DARK})`,
      padding: '14px 16px',
      color: 'white',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onToggle}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 16 }}
          >
            ☰
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>📋 问卷系统</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>共 {total} 份问卷</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  open,
  surveys,
  searchTerm,
  onSearch,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  onCopyShare,
}: {
  open: boolean;
  surveys: Survey[];
  searchTerm: string;
  onSearch: (v: string) => void;
  selectedId: string | null;
  onSelect: (s: Survey) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onCopyShare: (s: Survey) => void;
}) {
  const rowProps = useMemo<any>(() => ({
    surveys,
    selectedId,
    onSelect,
    onCopyShare,
    onDelete,
  }), [surveys, selectedId, onSelect, onCopyShare, onDelete]);

  const sidebarStyle: React.CSSProperties = {
    width: open ? 320 : 0,
    minWidth: open ? 320 : 0,
    background: SIDEBAR_BG,
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'width 0.3s, min-width 0.3s',
    height: '100vh',
    position: 'sticky',
    top: 0,
  };

  return (
    <aside className={`sidebar ${open ? '' : 'closed'}`} style={sidebarStyle}>
      <div style={{
        padding: '24px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ fontSize: 28 }}>📋</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>问卷中心</h2>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Survey Design System</div>
          </div>
        </div>
        <RippleButton onClick={onCreate} style={{
          width: '100%',
          marginTop: 18,
          padding: '12px 16px',
          background: `linear-gradient(135deg, ${PRIMARY_LIGHT}, ${PRIMARY_COLOR})`,
          border: 'none',
          color: 'white',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: `0 4px 14px rgba(121,134,203,0.4)`,
        }}>
          + 创建新问卷
        </RippleButton>
      </div>

      <div style={{ padding: '14px 20px 10px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <input
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="搜索问卷..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px 10px 36px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              color: 'white',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: 14 }}>🔍</div>
        </div>
      </div>

      <div style={{
        padding: '4px 20px 12px',
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        display: 'flex',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span>问卷列表</span>
        <span>共 {surveys.length} 份</span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 12px 16px' }}>
        {surveys.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', fontSize: 13, opacity: 0.5 }}>
            {searchTerm ? '未找到匹配的问卷' : '暂无问卷'}
          </div>
        ) : (
          <List
            height={typeof window !== 'undefined' ? Math.min(surveys.length * SURVEY_ITEM_HEIGHT, 600) : 400}
            rowCount={surveys.length}
            rowHeight={SURVEY_ITEM_HEIGHT}
            width="100%"
            rowComponent={SurveyListItem}
            rowProps={rowProps}
            overscanCount={5}
            style={{ width: '100%' }}
          />
        )}
      </div>
    </aside>
  );
}

interface SortableQuestionCardProps {
  question: EditableQuestion;
  index: number;
  onRemove: () => void;
  onUpdate: (patch: Partial<EditableQuestion>) => void;
  onAddOption: () => void;
  onUpdateOption: (idx: number, val: string) => void;
  onRemoveOption: (idx: number) => void;
}

function SortableQuestionCard({
  question,
  index,
  onRemove,
  onUpdate,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: SortableQuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question._tempId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...cardStyle,
        marginBottom: 16,
        cursor: 'move',
        borderLeft: `4px solid ${PRIMARY_COLOR}`,
        ...style,
      }}
      {...attributes}
      {...listeners}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${PRIMARY_COLOR}, ${PRIMARY_DARK})`,
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14, flexShrink: 0,
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 10px',
              background: '#F0F2FF',
              color: PRIMARY_COLOR,
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
            }}>
              {typeIcons[question.type]} {typeLabels[question.type]}
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#666', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) => onUpdate({ required: e.target.checked })}
                style={{ accentColor: PRIMARY_COLOR }}
                onClick={(e) => e.stopPropagation()}
              />
              必填
            </label>
            <span style={{ fontSize: 11, color: '#BBB', marginLeft: 'auto' }}>
              ↕ 拖拽排序
            </span>
          </div>
          <input
            value={question.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder={`请输入第 ${index + 1} 题的问题标题`}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px',
              fontSize: 15,
              borderRadius: 8,
              border: '2px solid #E0E0E0',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s',
              fontWeight: 500,
            }}
            onFocus={(e) => (e.target.style.borderColor = PRIMARY_COLOR)}
            onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
          />
        </div>
        <RippleButton
          onClick={onRemove}
          style={{
            width: 32, height: 32,
            borderRadius: 8,
            border: 'none',
            background: '#FFEBEE',
            color: '#E53935',
            cursor: 'pointer',
            fontSize: 16,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </RippleButton>
      </div>

      {question.type !== 'text' && question.options && (
        <div style={{ paddingLeft: 48, display: 'flex', flexDirection: 'column', gap: 8 }}
          onClick={(e) => e.stopPropagation()}>
          {question.options.map((opt, optIdx) => (
            <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 22, height: 22,
                borderRadius: question.type === 'single' ? '50%' : 4,
                border: `2px solid ${PRIMARY_LIGHT}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontSize: 11, color: PRIMARY_COLOR, fontWeight: 700,
              }}>
                {question.type === 'single' ? '◉' : '☑'}
              </div>
              <input
                value={opt}
                onChange={(e) => onUpdateOption(optIdx, e.target.value)}
                placeholder={`选项 ${optIdx + 1}`}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: 14,
                  borderRadius: 6,
                  border: '1px solid #E0E0E0',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY_COLOR)}
                onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
              />
              <RippleButton
                onClick={() => onRemoveOption(optIdx)}
                style={{
                  width: 28, height: 28,
                  borderRadius: 6,
                  border: 'none',
                  background: '#F5F5F5',
                  color: '#999',
                  cursor: 'pointer',
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                ✕
              </RippleButton>
            </div>
          ))}
          <RippleButton
            onClick={onAddOption}
            style={{
              marginTop: 4,
              padding: '8px 14px',
              border: `1px dashed ${PRIMARY_LIGHT}`,
              background: '#FAFBFF',
              color: PRIMARY_COLOR,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              alignSelf: 'flex-start',
              fontFamily: 'inherit',
            }}
          >
            + 添加选项
          </RippleButton>
        </div>
      )}

      {question.type === 'text' && (
        <div style={{ paddingLeft: 48 }} onClick={(e) => e.stopPropagation()}>
          <textarea
            rows={3}
            placeholder="文本题预览 - 填写者将在此输入自由文本"
            disabled
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              fontSize: 13,
              borderRadius: 6,
              border: '1px dashed #CCC',
              background: '#FAFAFA',
              color: '#999',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      )}
    </div>
  );
}

function CreateView({
  title,
  onTitleChange,
  questions,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onDragEnd,
  onSubmit,
  onCancel,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  questions: EditableQuestion[];
  onAddQuestion: (t: QuestionType) => void;
  onRemoveQuestion: (id: string) => void;
  onUpdateQuestion: (id: string, patch: Partial<EditableQuestion>) => void;
  onAddOption: (id: string) => void;
  onUpdateOption: (id: string, idx: number, val: string) => void;
  onRemoveOption: (id: string, idx: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const questionIds = useMemo(() => questions.map((q) => q._tempId), [questions]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    onDragEnd(event);
  };

  const activeQuestion = activeId ? questions.find((q) => q._tempId === activeId) : null;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <RippleButton onClick={onCancel} style={secondaryBtnStyle}>← 取消</RippleButton>
        <h2 style={{ margin: 0, flex: 1, minWidth: 200, color: PRIMARY_DARK }}>✏️ 创建新问卷</h2>
        <div style={{ fontSize: 13, color: '#666' }}>
          已添加 <strong style={{ color: PRIMARY_COLOR }}>{questions.length}</strong> 个问题（至少 5 个）
        </div>
        <RippleButton onClick={onSubmit} style={{ ...primaryBtnStyle, padding: '10px 28px' }}>
          ✓ 发布问卷
        </RippleButton>
      </div>

      <div style={{ ...cardStyle, marginBottom: 20, animation: 'fadeInUp 0.4s' }}>
        <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8, fontWeight: 600 }}>
          问卷标题 <span style={{ color: '#F44336' }}>*</span>
        </label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="请输入问卷标题，例如：关于XX产品的用户满意度调查"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '14px 16px',
            fontSize: 17,
            borderRadius: 10,
            border: '2px solid #E0E0E0',
            outline: 'none',
            fontWeight: 600,
            transition: 'border-color 0.2s',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => (e.target.style.borderColor = PRIMARY_COLOR)}
          onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
        />
      </div>

      <div style={{ ...cardStyle, marginBottom: 20, animation: 'fadeInUp 0.4s 0.05s both' }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 12, fontWeight: 600 }}>
          ➕ 添加题型（点击下方按钮添加问题）
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(['single', 'multiple', 'text'] as QuestionType[]).map((t) => (
            <RippleButton
              key={t}
              onClick={() => onAddQuestion(t)}
              style={{
                padding: '10px 18px',
                border: `2px dashed ${PRIMARY_LIGHT}`,
                background: '#F8F9FF',
                color: PRIMARY_COLOR,
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {typeIcons[t]} 添加{typeLabels[t]}
            </RippleButton>
          ))}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
          {questions.map((q, idx) => (
            <SortableQuestionCard
              key={q._tempId}
              question={q}
              index={idx}
              onRemove={() => onRemoveQuestion(q._tempId)}
              onUpdate={(patch) => onUpdateQuestion(q._tempId, patch)}
              onAddOption={() => onAddOption(q._tempId)}
              onUpdateOption={(optIdx, val) => onUpdateOption(q._tempId, optIdx, val)}
              onRemoveOption={(optIdx) => onRemoveOption(q._tempId, optIdx)}
            />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeQuestion ? (
            <div style={{
              ...cardStyle,
              marginBottom: 16,
              borderLeft: `4px solid ${PRIMARY_COLOR}`,
              boxShadow: '0 10px 40px rgba(63,81,181,0.3)',
              opacity: 0.9,
            }}>
              <div style={{ color: '#666', fontSize: 14 }}>正在拖拽: {activeQuestion.title || '未命名问题'}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingBottom: 40 }}>
        <RippleButton onClick={onCancel} style={{ ...secondaryBtnStyle, flex: 1, padding: '14px 24px' }}>
          取消
        </RippleButton>
        <RippleButton onClick={onSubmit} style={{ ...primaryBtnStyle, flex: 2, padding: '14px 24px', fontSize: 16 }}>
          ✓ 发布问卷并生成分享链接
        </RippleButton>
      </div>
    </div>
  );
}

function ListView({ total, onCreate }: { total: number; onCreate: () => void }) {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{
        textAlign: 'center',
        padding: '40px 20px 60px',
        animation: 'fadeInUp 0.5s ease-out',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
        <h1 style={{ fontSize: 32, margin: '0 0 8px', color: PRIMARY_DARK }}>在线问卷设计与收集系统</h1>
        <p style={{ fontSize: 15, color: '#666', margin: '0 0 24px' }}>
          创建自定义问卷 · 收集回复 · 可视化分析数据
        </p>
        <RippleButton onClick={onCreate} style={{
          ...primaryBtnStyle,
          padding: '14px 32px',
          fontSize: 16,
        }}>
          + 立即创建问卷
        </RippleButton>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 18,
        marginBottom: 40,
      }}>
        {[
          { icon: '📝', title: '三种题型', desc: '单选、多选、文本自由组合' },
          { icon: '🔗', title: '一键分享', desc: '生成唯一链接，支持跨平台分享' },
          { icon: '📊', title: '实时统计', desc: '柱状图直观展示选项分布' },
          { icon: '📱', title: '响应式设计', desc: '完美适配桌面和移动端' },
        ].map((item, i) => (
          <div key={i} style={{
            ...cardStyle,
            padding: 22,
            animation: `fadeInUp 0.5s ease-out ${0.1 * i}s both`,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>{item.icon}</div>
            <h3 style={{ margin: '0 0 6px', color: PRIMARY_DARK, fontSize: 15 }}>{item.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#666', lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <div style={{
        ...cardStyle,
        background: `linear-gradient(135deg, ${PRIMARY_COLOR}, ${PRIMARY_DARK})`,
        color: 'white',
        textAlign: 'center',
        animation: 'fadeIn 0.5s ease-out 0.4s both',
      }}>
        <div style={{ fontSize: 18, marginBottom: 6 }}>当前系统中共有 <strong>{total}</strong> 份问卷</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>请在左侧导航栏中选择问卷查看统计，或创建新的问卷</div>
      </div>
    </div>
  );
}

function StatsView({
  data,
  onBack,
  onCopyShare,
}: {
  data: { survey: Survey; statistics: StatisticsResult[]; totalResponses: number };
  onBack: () => void;
  onCopyShare: () => void;
}) {
  const { survey, statistics, totalResponses } = data;
  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <RippleButton onClick={onBack} style={secondaryBtnStyle}>
          ← 返回
        </RippleButton>
        <h2 style={{ margin: 0, flex: 1, minWidth: 200, color: PRIMARY_DARK, animation: 'fadeInUp 0.4s' }}>
          📊 数据统计
        </h2>
        <RippleButton onClick={onCopyShare} style={secondaryBtnStyle}>
          🔗 复制分享链接
        </RippleButton>
      </div>

      <div style={{
        ...cardStyle,
        background: `linear-gradient(135deg, ${PRIMARY_COLOR}, ${PRIMARY_DARK})`,
        color: 'white',
        marginBottom: 20,
        animation: 'fadeInUp 0.4s ease-out',
      }}>
        <h1 style={{ margin: '0 0 10px', fontSize: 24 }}>{survey.title}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, fontSize: 14, opacity: 0.95 }}>
          <div>📝 {survey.questions.length} 个问题</div>
          <div>📊 {totalResponses} 份回复</div>
          <div>🕐 创建于 {formatDate(survey.createdAt)}</div>
          <div>🔑 Token: {survey.shareToken}</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14,
        marginBottom: 20,
      }}>
        <div style={{ ...cardStyle, textAlign: 'center', animation: 'fadeInUp 0.4s 0.05s both' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: PRIMARY_COLOR }}>{totalResponses}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>总回复数</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center', animation: 'fadeInUp 0.4s 0.1s both' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#4CAF50' }}>{survey.questions.length}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>问题数量</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center', animation: 'fadeInUp 0.4s 0.15s both' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#FF9800' }}>
            {statistics.filter((s) => s.type === 'single').length}
          </div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>单选题</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center', animation: 'fadeInUp 0.4s 0.2s both' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#E91E63' }}>
            {statistics.filter((s) => s.type === 'text').length}
          </div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>文本题</div>
        </div>
      </div>

      {statistics.map((stat, idx) => (
        <div
          key={stat.questionId}
          style={{
            ...cardStyle,
            marginBottom: 16,
            animation: `fadeInUp 0.4s ease-out ${0.2 + idx * 0.05}s both`,
          }}
        >
          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              background: PRIMARY_COLOR,
              color: 'white',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}>
              Q{idx + 1} · {typeIcons[stat.type]} {typeLabels[stat.type]}
            </div>
          </div>
          <h3 style={{ margin: '8px 0 4px', fontSize: 16, color: '#2C3E50' }}>{stat.title}</h3>

          {(stat.type === 'single' || stat.type === 'multiple') && stat.optionCounts && (
            <BarChart data={Object.entries(stat.optionCounts).map(([label, value]) => ({ label, value }))} />
          )}

          {stat.type === 'text' && stat.textAnswers && (
            <div style={{ marginTop: 12 }}>
              {stat.textAnswers.length === 0 ? (
                <div style={{ padding: 16, background: '#FAFAFA', borderRadius: 8, color: '#999', fontSize: 13, textAlign: 'center' }}>
                  暂无文本回复
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>共 {stat.textAnswers.length} 条回复</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                    {stat.textAnswers.map((text, i) => (
                      <div key={i} style={{
                        padding: '12px 14px',
                        background: 'linear-gradient(90deg, #F0F2FF, #FAFBFF)',
                        borderRadius: 8,
                        borderLeft: `3px solid ${PRIMARY_COLOR}`,
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: '#333',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>回复 #{i + 1}</div>
                        {text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FillView({
  survey,
  answers,
  onAnswerChange,
  onSubmit,
  error,
  success,
}: {
  survey: Survey;
  answers: Record<string, string | string[]>;
  onAnswerChange: (qid: string, value: string | string[]) => void;
  onSubmit: () => void;
  error: string;
  success: string;
}) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ ...cardStyle, background: `linear-gradient(135deg, ${PRIMARY_COLOR}, ${PRIMARY_DARK})`, color: 'white', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>{survey.title}</h1>
        <div style={{ marginTop: 12, opacity: 0.9, fontSize: 14 }}>
          共 {survey.questions.length} 个问题 · 请认真填写
        </div>
      </div>

      {survey.questions.map((q, idx) => (
        <div key={q.id} style={{ ...cardStyle, marginBottom: 16, animation: `fadeInUp 0.4s ease-out ${idx * 0.05}s both` }}>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{
              background: PRIMARY_COLOR,
              color: 'white',
              borderRadius: '50%',
              width: 28, height: 28,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
              marginTop: 2,
            }}>
              {idx + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#2C3E50', marginBottom: 4 }}>
                {q.title}
                {q.required && <span style={{ color: '#F44336', marginLeft: 4 }}>*</span>}
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>{typeLabels[q.type]}</div>
            </div>
          </div>

          {q.type === 'single' && q.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 36 }}>
              {q.options.map((opt, i) => {
                const checked = answers[q.id] === opt;
                return (
                  <label key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    border: `2px solid ${checked ? PRIMARY_COLOR : '#E0E0E0'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: checked ? '#F0F2FF' : '#FAFAFA',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: `2px solid ${checked ? PRIMARY_COLOR : '#BBB'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {checked && <div style={{ width: 10, height: 10, borderRadius: '50%', background: PRIMARY_COLOR }} />}
                    </div>
                    <input
                      type="radio"
                      style={{ display: 'none' }}
                      checked={checked}
                      onChange={() => onAnswerChange(q.id, opt)}
                    />
                    <span style={{ color: '#333' }}>{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {q.type === 'multiple' && q.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 36 }}>
              {q.options.map((opt, i) => {
                const cur = (answers[q.id] as string[]) || [];
                const checked = cur.includes(opt);
                return (
                  <label key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    border: `2px solid ${checked ? PRIMARY_COLOR : '#E0E0E0'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: checked ? '#F0F2FF' : '#FAFAFA',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: `2px solid ${checked ? PRIMARY_COLOR : '#BBB'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: checked ? PRIMARY_COLOR : 'white',
                      flexShrink: 0,
                      color: 'white', fontSize: 12, fontWeight: 700,
                    }}>
                      {checked && '✓'}
                    </div>
                    <input
                      type="checkbox"
                      style={{ display: 'none' }}
                      checked={checked}
                      onChange={() => {
                        const arr = [...((answers[q.id] as string[]) || [])];
                        if (checked) {
                          onAnswerChange(q.id, arr.filter((x) => x !== opt));
                        } else {
                          onAnswerChange(q.id, [...arr, opt]);
                        }
                      }}
                    />
                    <span style={{ color: '#333' }}>{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {q.type === 'text' && (
            <div style={{ paddingLeft: 36 }}>
              <textarea
                rows={4}
                value={(answers[q.id] as string) || ''}
                onChange={(e) => onAnswerChange(q.id, e.target.value)}
                placeholder="请输入您的回答..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  fontSize: 14,
                  borderRadius: 8,
                  border: '2px solid #E0E0E0',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY_COLOR)}
                onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
              />
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <RippleButton onClick={onSubmit} style={{ ...primaryBtnStyle, flex: 1, fontSize: 16, padding: '14px 24px' }}>
          提交问卷
        </RippleButton>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('list');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [totalSurveys, setTotalSurveys] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [fillToken, setFillToken] = useState<string | null>(null);
  const [fillSurvey, setFillSurvey] = useState<Survey | null>(null);
  const [statsData, setStatsData] = useState<{
    survey: Survey;
    statistics: StatisticsResult[];
    totalResponses: number;
  } | null>(null);

  const [surveyTitle, setSurveyTitle] = useState('');
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [fillAnswers, setFillAnswers] = useState<Record<string, string | string[]>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSurveys(1, 200);
      setSurveys(res.data);
      setTotalSurveys(res.total);
    } catch (e: any) {
      setError(e.message || '加载问卷列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('share/')) {
      const token = hash.split('/')[1];
      if (token) {
        setFillToken(token);
        setView('fill');
        getSurveyByShareToken(token)
          .then((s) => setFillSurvey(s))
          .catch((e) => setError(e.message || '问卷不存在'));
        return;
      }
    }
    loadSurveys();
  }, [loadSurveys]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash.startsWith('share/')) {
        const token = hash.split('/')[1];
        if (token) {
          setFillToken(token);
          setView('fill');
          getSurveyByShareToken(token)
            .then((s) => { setFillSurvey(s); setError(''); })
            .catch((e) => setError(e.message || '问卷不存在'));
        }
      } else if (hash === '' && view === 'fill') {
        setView('list');
        setFillSurvey(null);
        loadSurveys();
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [view, loadSurveys]);

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); }
  }, [error]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);

  const filteredSurveys = useMemo(() => {
    if (!searchTerm.trim()) return surveys;
    const term = searchTerm.toLowerCase();
    return surveys.filter((s) => s.title.toLowerCase().includes(term));
  }, [surveys, searchTerm]);

  const startCreate = () => {
    setSurveyTitle('');
    setQuestions([
      { ...defaultQuestion('single'), title: '', options: ['选项A', '选项B', '选项C'] },
      { ...defaultQuestion('multiple'), title: '', options: ['选项1', '选项2', '选项3', '选项4'] },
      { ...defaultQuestion('single'), title: '', options: ['是', '否', '不确定'] },
      { ...defaultQuestion('text'), title: '' },
      { ...defaultQuestion('multiple'), title: '', options: ['选项甲', '选项乙', '选项丙'] },
    ]);
    setSelectedSurveyId(null);
    setView('create');
  };

  const addQuestion = (type: QuestionType) => {
    setQuestions((q) => [...q, defaultQuestion(type)]);
  };

  const removeQuestion = (tempId: string) => {
    if (questions.length <= 5) { setError('至少需要保留5个问题'); return; }
    setQuestions((q) => q.filter((x) => x._tempId !== tempId));
  };

  const updateQuestion = (tempId: string, patch: Partial<EditableQuestion>) => {
    setQuestions((q) => q.map((x) => (x._tempId === tempId ? { ...x, ...patch } : x)));
  };

  const addOption = (tempId: string) => {
    setQuestions((q) => q.map((x) => {
      if (x._tempId !== tempId || x.type === 'text') return x;
      const opts = [...(x.options || []), `选项${(x.options?.length || 0) + 1}`];
      return { ...x, options: opts };
    }));
  };

  const updateOption = (tempId: string, idx: number, val: string) => {
    setQuestions((q) => q.map((x) => {
      if (x._tempId !== tempId || x.type === 'text') return x;
      const opts = [...(x.options || [])];
      opts[idx] = val;
      return { ...x, options: opts };
    }));
  };

  const removeOption = (tempId: string, idx: number) => {
    setQuestions((q) => q.map((x) => {
      if (x._tempId !== tempId || x.type === 'text') return x;
      if ((x.options?.length || 0) <= 2) {
        setError('至少需要保留2个选项');
        return x;
      }
      const opts = [...(x.options || [])];
      opts.splice(idx, 1);
      return { ...x, options: opts };
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((q) => q._tempId === active.id);
        const newIndex = items.findIndex((q) => q._tempId === over.id);
        if (oldIndex >= 0 && newIndex >= 0) {
          return arrayMove(items, oldIndex, newIndex);
        }
        return items;
      });
    }
  };

  const handleCreateSubmit = async () => {
    if (!surveyTitle.trim()) { setError('请输入问卷标题'); return; }
    if (questions.length < 5) { setError('至少需要5个问题'); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title.trim()) { setError(`第 ${i + 1} 个问题标题不能为空`); return; }
      if ((q.type === 'single' || q.type === 'multiple') && (q.options?.length || 0) < 2) {
        setError(`第 ${i + 1} 个问题至少需要2个选项`); return;
      }
    }
    try {
      const t0 = performance.now();
      const created = await createSurvey({
        title: surveyTitle.trim(),
        questions: questions.map(({ _tempId, ...q }) => q),
      });
      const t1 = performance.now();
      setSuccess(`问卷创建成功！分享链接生成用时 ${(created.shareLinkGeneratedMs ?? t1 - t0).toFixed(0)}ms`);
      setSelectedSurveyId(created.id);
      setView('stats');
      loadStats(created.id);
      loadSurveys();
    } catch (e: any) {
      setError(e.message || '创建失败');
    }
  };

  const loadStats = async (id: string) => {
    try {
      const res = await getStatistics(id);
      setStatsData(res);
      for (let i = 0; i < 8; i++) {
        const randomAnswers: AnswerItem[] = res.survey.questions.map((q) => {
          if (q.type === 'text') {
            return { questionId: q.id, value: `这是一条示例回复 ${i + 1}` };
          }
          if (q.type === 'single') {
            const opts = q.options || [];
            return { questionId: q.id, value: opts[Math.floor(Math.random() * opts.length)] };
          }
          const opts = q.options || [];
          const pick = opts.filter(() => Math.random() > 0.4);
          return { questionId: q.id, value: pick.length ? pick : [opts[0]] };
        });
        try { await submitResponse(id, randomAnswers); } catch { break; }
      }
      const finalRes = await getStatistics(id);
      setStatsData(finalRes);
    } catch (e: any) {
      setError(e.message || '加载统计数据失败');
    }
  };

  const handleDeleteSurvey = async (id: string) => {
    if (!confirm('确定要删除这份问卷吗？所有回复数据将无法恢复。')) return;
    try {
      await deleteSurvey(id);
      setSuccess('问卷已删除');
      loadSurveys();
      if (selectedSurveyId === id) {
        setSelectedSurveyId(null);
        setStatsData(null);
        setView('list');
      }
    } catch (e: any) {
      setError(e.message || '删除失败');
    }
  };

  const handleSelectSurvey = (s: Survey) => {
    setSelectedSurveyId(s.id);
    setView('stats');
    loadStats(s.id);
  };

  const copyShareLink = (s: Survey) => {
    const link = `${window.location.origin}${window.location.pathname}#share/${s.shareToken}`;
    navigator.clipboard?.writeText(link).then(
      () => setSuccess('分享链接已复制到剪贴板'),
      () => setError('复制失败，请手动复制：' + link)
    );
  };

  const handleFillSubmit = async () => {
    if (!fillSurvey) return;
    const answers: AnswerItem[] = [];
    for (const q of fillSurvey.questions) {
      const val = fillAnswers[q.id];
      if (q.required) {
        if (q.type === 'text') {
          if (typeof val !== 'string' || !val.trim()) {
            setError(`请回答必填问题：${q.title}`); return;
          }
        } else {
          if (Array.isArray(val) ? val.length === 0 : !val) {
            setError(`请回答必填问题：${q.title}`); return;
          }
        }
      }
      if (val !== undefined) {
        answers.push({ questionId: q.id, value: val });
      }
    }
    try {
      await submitResponse(fillSurvey.id, answers);
      setView('fillSuccess');
    } catch (e: any) {
      setError(e.message || '提交失败');
    }
  };

  const goHome = () => {
    window.location.hash = '';
    setView('list');
    setFillSurvey(null);
    setFillAnswers({});
    loadSurveys();
  };

  const baseStyles: React.CSSProperties = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    background: BG_LIGHT,
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    color: '#2C3E50',
  };

  if (view === 'fill' || view === 'fillSuccess') {
    if (error && view === 'fill' && !fillSurvey) {
      return (
        <div style={{ ...baseStyles, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={cardStyle}>
            <h2 style={{ color: '#F44336', marginTop: 0 }}>无法加载问卷</h2>
            <p style={{ color: '#666' }}>{error}</p>
            <RippleButton onClick={goHome} style={primaryBtnStyle}>返回首页</RippleButton>
          </div>
        </div>
      );
    }
    if (!fillSurvey && view === 'fill') {
      return (
        <div style={{ ...baseStyles, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 18, color: '#666' }}>加载中...</div>
        </div>
      );
    }
    if (view === 'fillSuccess') {
      return (
        <div style={{ ...baseStyles, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ ...cardStyle, maxWidth: 500, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ color: PRIMARY_COLOR, marginTop: 0 }}>提交成功！</h2>
            <p style={{ color: '#666', lineHeight: 1.6 }}>
              感谢您的填写，您的回答对我们非常重要。提交后不可修改。
            </p>
            <RippleButton onClick={goHome} style={primaryBtnStyle}>返回首页</RippleButton>
          </div>
        </div>
      );
    }
    return (
      <div style={{ ...baseStyles, padding: '32px 16px' }}>
        <Toast error={error} success={success} />
        <style>{cssAnimations}</style>
        {fillSurvey && (
          <FillView
            survey={fillSurvey}
            answers={fillAnswers}
            onAnswerChange={(qid, val) => setFillAnswers((a) => ({ ...a, [qid]: val }))}
            onSubmit={handleFillSubmit}
            error={error}
            success={success}
          />
        )}
      </div>
    );
  }

  return (
    <div style={baseStyles}>
      <Toast error={error} success={success} />
      <style>{cssAnimations}</style>

      {view !== 'create' && <MobileTopBar onToggle={() => setSidebarOpen((s) => !s)} total={totalSurveys} />}

      <div className="main-layout" style={{ display: 'flex', minHeight: '100vh' }}>
        {view !== 'create' && (
          <Sidebar
            open={sidebarOpen}
            surveys={filteredSurveys}
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            selectedId={selectedSurveyId}
            onSelect={handleSelectSurvey}
            onCreate={startCreate}
            onDelete={handleDeleteSurvey}
            onCopyShare={copyShareLink}
          />
        )}

        <div className="content-area" style={{
          flex: 1,
          padding: view === 'create' ? '40px 24px' : '32px 40px',
          transition: 'padding 0.3s',
          overflowX: 'hidden',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999', animation: 'pulse 1.5s infinite' }}>
              加载中...
            </div>
          ) : (
            <>
              {view === 'list' && !selectedSurveyId && (
                <ListView total={totalSurveys} onCreate={startCreate} />
              )}
              {view === 'stats' && statsData && (
                <StatsView
                  data={statsData}
                  onBack={() => { setSelectedSurveyId(null); setStatsData(null); setView('list'); }}
                  onCopyShare={() => copyShareLink(statsData.survey)}
                />
              )}
              {view === 'create' && (
                <CreateView
                  title={surveyTitle}
                  onTitleChange={setSurveyTitle}
                  questions={questions}
                  onAddQuestion={addQuestion}
                  onRemoveQuestion={removeQuestion}
                  onUpdateQuestion={updateQuestion}
                  onAddOption={addOption}
                  onUpdateOption={updateOption}
                  onRemoveOption={removeOption}
                  onDragEnd={handleDragEnd}
                  onSubmit={handleCreateSubmit}
                  onCancel={() => { setView('list'); loadSurveys(); }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

