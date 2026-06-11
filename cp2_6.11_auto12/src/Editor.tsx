import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Survey, Question, QuestionType } from './types';

const API = '/api/surveys';

interface EditorProps {
  survey: Survey | null;
  onSurveyUpdate: (survey: Survey) => void;
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: string }[] = [
  { type: 'single', label: '单选题', icon: '◉' },
  { type: 'multiple', label: '多选题', icon: '☑' },
  { type: 'rating', label: '评分题', icon: '★' },
];

export default function Editor({ survey, onSurveyUpdate }: EditorProps) {
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<QuestionType | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(survey);
  const [showPublishLink, setShowPublishLink] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragOverPreview, setIsDragOverPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentSurvey(survey);
  }, [survey]);

  const handleCreateSurvey = useCallback(async () => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newSurveyTitle || '未命名问卷' }),
    });
    const s: Survey = await res.json();
    setCurrentSurvey(s);
    onSurveyUpdate(s);
    setNewSurveyTitle('');
  }, [newSurveyTitle, onSurveyUpdate]);

  const apiCall = useCallback(
    async (path: string, method: string = 'POST', body?: unknown) => {
      if (!currentSurvey) return;
      const res = await fetch(`${API}/${currentSurvey.id}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const updated: Survey = await res.json();
      setCurrentSurvey(updated);
      onSurveyUpdate(updated);
    },
    [currentSurvey, onSurveyUpdate]
  );

  const handleDragStart = useCallback((type: QuestionType) => {
    setDragType(type);
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isDragging]);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragType) {
        setDropIndex(index);
        setIsDragOverPreview(true);
      }
    },
    [dragType]
  );

  const handlePreviewDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (dragType) {
        setIsDragOverPreview(true);
      }
    },
    [dragType]
  );

  const handlePreviewDragLeave = useCallback(() => {
    setIsDragOverPreview(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, index: number) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('questionType') as QuestionType;
      if (!type || !currentSurvey) return;
      await apiCall('/questions', 'POST', { type, index });
      setDragType(null);
      setDropIndex(null);
      setIsDragging(false);
      setIsDragOverPreview(false);
    },
    [apiCall, currentSurvey]
  );

  const handlePreviewDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('questionType') as QuestionType;
      if (!type || !currentSurvey) return;
      await apiCall('/questions', 'POST', { type, index: currentSurvey.questions.length });
      setDragType(null);
      setDropIndex(null);
      setIsDragging(false);
      setIsDragOverPreview(false);
    },
    [apiCall, currentSurvey]
  );

  const handleDragEnd = useCallback(() => {
    setDragType(null);
    setDropIndex(null);
    setIsDragging(false);
    setIsDragOverPreview(false);
  }, []);

  const handleAddQuestion = useCallback(
    async (type: QuestionType) => {
      if (!currentSurvey) return;
      await apiCall('/questions', 'POST', { type });
    },
    [apiCall, currentSurvey]
  );

  const handleTitleChange = useCallback(
    async (title: string) => {
      if (!currentSurvey) return;
      await apiCall('/title', 'PUT', { title });
    },
    [apiCall, currentSurvey]
  );

  const handleQuestionTitleChange = useCallback(
    async (questionId: string, title: string) => {
      if (!currentSurvey) return;
      await apiCall(`/questions/${questionId}`, 'PUT', { title });
    },
    [apiCall, currentSurvey]
  );

  const handleDeleteQuestion = useCallback(
    async (questionId: string) => {
      if (!currentSurvey) return;
      await apiCall(`/questions/${questionId}`, 'DELETE');
    },
    [apiCall, currentSurvey]
  );

  const handleAddOption = useCallback(
    async (questionId: string) => {
      if (!currentSurvey) return;
      await apiCall(`/questions/${questionId}/options`, 'POST');
    },
    [apiCall, currentSurvey]
  );

  const handleOptionTextChange = useCallback(
    async (questionId: string, optionId: string, text: string) => {
      if (!currentSurvey) return;
      await apiCall(`/questions/${questionId}/options/${optionId}`, 'PUT', { text });
    },
    [apiCall, currentSurvey]
  );

  const handleDeleteOption = useCallback(
    async (questionId: string, optionId: string) => {
      if (!currentSurvey) return;
      await apiCall(`/questions/${questionId}/options/${optionId}`, 'DELETE');
    },
    [apiCall, currentSurvey]
  );

  const handlePublish = useCallback(async () => {
    if (!currentSurvey) return;
    await apiCall('/publish', 'POST');
    setShowPublishLink(true);
  }, [apiCall, currentSurvey]);

  const handleReset = useCallback(async () => {
    if (!currentSurvey) return;
    await apiCall('/reset', 'POST');
  }, [apiCall, currentSurvey]);

  if (!currentSurvey) {
    return (
      <div style={styles.createContainer}>
        <div style={styles.createCard}>
          <h2 style={styles.createTitle}>创建新问卷</h2>
          <input
            style={styles.createInput}
            placeholder="输入问卷标题..."
            value={newSurveyTitle}
            onChange={(e) => setNewSurveyTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSurvey()}
          />
          <button style={styles.createBtn} onClick={handleCreateSurvey}>
            创建问卷
          </button>
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div style={styles.sidebarInner}>
      <h3 style={styles.sidebarTitle}>题目类型</h3>
      {QUESTION_TYPES.map((qt) => (
        <div
          key={qt.type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('questionType', qt.type);
            e.dataTransfer.effectAllowed = 'copy';
            handleDragStart(qt.type);
          }}
          onDragEnd={handleDragEnd}
          onClick={() => handleAddQuestion(qt.type)}
          style={{
            ...styles.typeBtn,
            opacity: dragType === qt.type ? 0.5 : 1,
            transform: dragType === qt.type ? 'scale(0.98)' : 'scale(1)',
          }}
        >
          <span style={styles.typeIcon}>{qt.icon}</span>
          <span>{qt.label}</span>
        </div>
      ))}
      <div style={styles.sidebarDivider} />
      <button
        style={styles.publishBtn}
        onClick={handlePublish}
        disabled={currentSurvey.published}
      >
        {currentSurvey.published ? '已发布' : '发布问卷'}
      </button>
      {currentSurvey.published && (
        <button style={styles.resetBtn} onClick={handleReset}>
          撤销发布（清空数据）
        </button>
      )}
      {showPublishLink && currentSurvey.published && (
        <div style={styles.publishLinkBox}>
          填写链接：
          <a
            href={`/fill/${currentSurvey.id}`}
            target="_blank"
            rel="noreferrer"
            style={styles.publishLink}
          >
            {window.location.origin}/fill/{currentSurvey.id}
          </a>
        </div>
      )}
    </div>
  );

  const ghostInfo = dragType ? QUESTION_TYPES.find((qt) => qt.type === dragType) : null;

  return (
    <div className="editor-layout" style={styles.editorLayout}>
      {isDragging && ghostInfo && (
        <div
          ref={ghostRef}
          style={{
            ...styles.dragGhost,
            left: dragPosition.x + 15,
            top: dragPosition.y + 15,
          }}
        >
          <span style={styles.dragGhostIcon}>{ghostInfo.icon}</span>
          <span>{ghostInfo.label}</span>
        </div>
      )}
      <button className="drawer-toggle" style={styles.drawerToggle} onClick={() => setDrawerOpen(!drawerOpen)}>
        ☰
      </button>
      {drawerOpen && <div className="drawer-overlay" style={styles.drawerOverlay} onClick={() => setDrawerOpen(false)} />}
      <div
        className={`sidebar ${drawerOpen ? 'drawer-open' : ''}`}
        style={{
          ...styles.sidebar,
          ...(drawerOpen ? styles.drawerOpen : {}),
        }}
      >
        {sidebarContent}
      </div>
      <div className="main-content" style={styles.mainContent} ref={previewRef}>
        <div style={styles.surveyHeader}>
          <input
            style={styles.surveyTitleInput}
            value={currentSurvey.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="问卷标题"
          />
        </div>
        <div
          style={{
            ...styles.dropZone,
            ...(isDragOverPreview ? styles.dropZoneHighlight : {}),
          }}
          onDragOver={handlePreviewDragOver}
          onDrop={handlePreviewDrop}
          onDragLeave={handlePreviewDragLeave}
        >
          {currentSurvey.questions.length === 0 && (
            <div style={styles.emptyHint}>从左侧拖拽题目类型到此处</div>
          )}
          {currentSurvey.questions.map((q, idx) => (
            <React.Fragment key={q.id}>
              {dropIndex === idx && <div style={styles.dropIndicator} />}
              <QuestionCard
                question={q}
                isEditing={editingQId === q.id}
                onEdit={() => setEditingQId(editingQId === q.id ? null : q.id)}
                onTitleChange={(title) => handleQuestionTitleChange(q.id, title)}
                onDelete={() => handleDeleteQuestion(q.id)}
                onAddOption={() => handleAddOption(q.id)}
                onOptionTextChange={(oid, text) => handleOptionTextChange(q.id, oid, text)}
                onDeleteOption={(oid) => handleDeleteOption(q.id, oid)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
              />
            </React.Fragment>
          ))}
          {dropIndex === currentSurvey.questions.length && (
            <div style={styles.dropIndicator} />
          )}
        </div>
      </div>
    </div>
  );
}

interface QuestionCardProps {
  question: Question;
  isEditing: boolean;
  onEdit: () => void;
  onTitleChange: (title: string) => void;
  onDelete: () => void;
  onAddOption: () => void;
  onOptionTextChange: (optionId: string, text: string) => void;
  onDeleteOption: (optionId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function QuestionCard({
  question,
  isEditing,
  onEdit,
  onTitleChange,
  onDelete,
  onAddOption,
  onOptionTextChange,
  onDeleteOption,
  onDragOver,
  onDrop,
}: QuestionCardProps) {
  const typeLabel =
    question.type === 'single' ? '单选题' : question.type === 'multiple' ? '多选题' : '评分题';

  return (
    <div
      style={styles.questionCard}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div style={styles.questionHeader}>
        <span style={styles.questionBadge}>{typeLabel}</span>
        <span
          style={styles.questionTitle}
          onClick={onEdit}
        >
          {isEditing ? (
            <input
              style={styles.inlineInput}
              value={question.title}
              onChange={(e) => onTitleChange(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            question.title
          )}
        </span>
        <button style={styles.deleteBtn} onClick={onDelete} title="删除题目">
          ✕
        </button>
      </div>
      {question.type === 'rating' ? (
        <div style={styles.ratingPreview}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} style={styles.ratingStar}>
              ★
            </span>
          ))}
        </div>
      ) : (
        <div style={styles.optionsList}>
          {question.options.map((opt) => (
            <div key={opt.id} style={styles.optionRow}>
              <span style={styles.optionRadio}>
                {question.type === 'single' ? '○' : '□'}
              </span>
              {isEditing ? (
                <div style={styles.optionEditRow}>
                  <input
                    style={styles.optionInput}
                    value={opt.text}
                    onChange={(e) => onOptionTextChange(opt.id, e.target.value)}
                  />
                  <button
                    style={styles.optionDeleteBtn}
                    onClick={() => onDeleteOption(opt.id)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span style={styles.optionText}>{opt.text}</span>
              )}
            </div>
          ))}
          {isEditing && question.options.length < 10 && (
            <button style={styles.addOptionBtn} onClick={onAddOption}>
              + 添加选项
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  createContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#f5f7fa',
  },
  createCard: {
    background: '#fff',
    borderRadius: 16,
    padding: 48,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
    maxWidth: 480,
    width: '100%',
  },
  createTitle: {
    margin: '0 0 24px',
    fontSize: 24,
    color: '#333',
  },
  createInput: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d0d5dd',
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    boxSizing: 'border-box' as const,
  },
  createBtn: {
    padding: '12px 32px',
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer',
  },
  editorLayout: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f5f7fa',
    position: 'relative' as const,
  },
  dragGhost: {
    position: 'fixed' as const,
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    background: 'rgba(74, 144, 217, 0.85)',
    color: '#fff',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    pointerEvents: 'none' as const,
    boxShadow: '0 4px 16px rgba(74, 144, 217, 0.4)',
    backdropFilter: 'blur(4px)',
    opacity: 0.8,
    transform: 'translate(0, 0)',
  },
  dragGhostIcon: {
    fontSize: 18,
  },
  drawerToggle: {
    display: 'none',
    position: 'fixed' as const,
    top: 12,
    left: 12,
    zIndex: 1001,
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    width: 40,
    height: 40,
    fontSize: 20,
    cursor: 'pointer',
  },
  drawerOverlay: {
    display: 'none',
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    zIndex: 999,
  },
  sidebar: {
    width: '20%',
    minWidth: 240,
    maxWidth: 320,
    background: '#fff',
    borderRight: '1px solid #e5e7eb',
    padding: 24,
    boxSizing: 'border-box' as const,
    flexShrink: 0,
    overflowY: 'auto' as const,
  },
  drawerOpen: {},
  sidebarInner: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  sidebarTitle: {
    margin: '0 0 8px',
    fontSize: 16,
    color: '#666',
    fontWeight: 600,
  },
  typeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: '#e8f0fe',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    color: '#3b6cb5',
    cursor: 'grab',
    transition: 'transform 0.15s cubic-bezier(0.4,0,0.2,1), box-shadow 0.15s cubic-bezier(0.4,0,0.2,1), opacity 0.15s',
    fontWeight: 500,
    userSelect: 'none' as const,
  },
  typeIcon: {
    fontSize: 20,
  },
  sidebarDivider: {
    height: 1,
    background: '#e5e7eb',
    margin: '8px 0',
  },
  publishBtn: {
    padding: '12px 16px',
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: 600,
  },
  resetBtn: {
    padding: '10px 16px',
    background: '#fff',
    color: '#e74c3c',
    border: '1px solid #e74c3c',
    borderRadius: 10,
    fontSize: 14,
    cursor: 'pointer',
  },
  publishLinkBox: {
    padding: 10,
    background: '#f0fdf4',
    borderRadius: 8,
    fontSize: 13,
    color: '#166534',
    wordBreak: 'break-all' as const,
  },
  publishLink: {
    color: '#2563eb',
    textDecoration: 'underline',
  },
  mainContent: {
    flex: 4,
    padding: 32,
    overflowY: 'auto' as const,
  },
  surveyHeader: {
    marginBottom: 24,
  },
  surveyTitleInput: {
    width: '100%',
    fontSize: 28,
    fontWeight: 700,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#1a1a2e',
    padding: '8px 0',
    borderBottom: '2px solid transparent',
    transition: 'border-color 0.2s cubic-bezier(0.4,0,0.2,1)',
  },
  dropZone: {
    minHeight: 400,
    transition: 'border-color 0.2s cubic-bezier(0.4,0,0.2,1), background-color 0.2s cubic-bezier(0.4,0,0.2,1)',
    border: '2px dashed transparent',
    borderRadius: 12,
    padding: 4,
  },
  dropZoneHighlight: {
    borderColor: '#4a90d9',
    backgroundColor: 'rgba(74, 144, 217, 0.05)',
  },
  emptyHint: {
    textAlign: 'center' as const,
    padding: 64,
    color: '#9ca3af',
    fontSize: 18,
    border: '2px dashed #d0d5dd',
    borderRadius: 12,
  },
  dropIndicator: {
    height: 4,
    background: '#4a90d9',
    borderRadius: 2,
    margin: '4px 0',
    transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
  },
  questionCard: {
    background: '#fff',
    borderRadius: '0 12px 12px 0',
    borderTopLeftRadius: 12,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    borderLeft: '4px solid #4a90d9',
    transition: 'box-shadow 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1)',
    cursor: 'pointer',
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  questionBadge: {
    padding: '2px 10px',
    background: '#e8f0fe',
    color: '#3b6cb5',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
  questionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a2e',
  },
  inlineInput: {
    width: '100%',
    fontSize: 16,
    fontWeight: 600,
    border: 'none',
    outline: 'none',
    borderBottom: '2px solid #4a90d9',
    padding: '4px 0',
    background: 'transparent',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 6,
    transition: 'color 0.15s cubic-bezier(0.4,0,0.2,1), background 0.15s cubic-bezier(0.4,0,0.2,1)',
  },
  ratingPreview: {
    display: 'flex',
    gap: 8,
    padding: '8px 0',
  },
  ratingStar: {
    fontSize: 28,
    color: '#f59e0b',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  optionRadio: {
    fontSize: 16,
    color: '#9ca3af',
  },
  optionText: {
    fontSize: 15,
    color: '#374151',
  },
  optionEditRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  optionInput: {
    flex: 1,
    fontSize: 14,
    border: 'none',
    outline: 'none',
    borderBottom: '1px solid #4a90d9',
    padding: '2px 0',
    background: 'transparent',
  },
  optionDeleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: 13,
    padding: '2px 6px',
  },
  addOptionBtn: {
    background: 'none',
    border: '1px dashed #9ca3af',
    borderRadius: 6,
    padding: '6px 12px',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: 13,
    marginTop: 4,
  },
};

const mobileMediaQuery = '@media (max-width: 1023px)';
const globalStyle = document.createElement('style');
globalStyle.textContent = `
  * {
    box-sizing: border-box;
  }
  ${mobileMediaQuery} {
    .editor-layout {
      min-width: 1024px !important;
    }
    .editor-layout .drawer-toggle { display: block !important; }
    .editor-layout .sidebar {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      bottom: 0 !important;
      z-index: 1000 !important;
      transform: translateX(-100%) !important;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    .editor-layout .drawer-open {
      transform: translateX(0) !important;
    }
    .editor-layout .drawer-overlay {
      display: block !important;
    }
    .editor-layout .main-content {
      flex: 1 !important;
      padding: 60px 16px 16px !important;
    }
  }
`;
document.head.appendChild(globalStyle);
