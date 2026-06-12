import { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DragHandle,
} from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';
import { FormTemplate, Question, QuestionType, Option } from '../../shared/types';

interface FormBuilderProps {
  templateId?: string;
  onBack: () => void;
  onPublish: (id: string) => void;
  onViewData: (id: string) => void;
}

interface QuestionTypeDef {
  type: QuestionType;
  name: string;
  icon: string;
}

const QUESTION_TYPES: QuestionTypeDef[] = [
  { type: 'radio', name: '单选题', icon: '◉' },
  { type: 'checkbox', name: '多选题', icon: '☑' },
  { type: 'text', name: '文本输入', icon: '▤' },
  { type: 'rating', name: '评分', icon: '★' },
  { type: 'dropdown', name: '下拉列表', icon: '▾' },
  { type: 'date', name: '日期选择', icon: '📅' },
];

const TYPE_LABELS: Record<QuestionType, string> = {
  radio: '单选题',
  checkbox: '多选题',
  text: '文本输入',
  rating: '评分题',
  dropdown: '下拉列表',
  date: '日期选择',
};

function createQuestion(type: QuestionType): Question {
  const base: Question = {
    id: uuidv4(),
    type,
    title: '',
    required: false,
  };
  if (type === 'radio' || type === 'checkbox' || type === 'dropdown') {
    base.options = [
      { id: uuidv4(), label: '选项 1' },
      { id: uuidv4(), label: '选项 2' },
    ];
  }
  if (type === 'rating') {
    base.ratingMax = 5;
  }
  if (type === 'text') {
    base.placeholder = '请输入...';
  }
  return base;
}

export default function FormBuilder({
  templateId,
  onBack,
  onPublish,
  onViewData,
}: FormBuilderProps) {
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    } else {
      setTemplate({
        id: '',
        title: '未命名问卷',
        description: '请输入问卷描述...',
        questions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setLoading(false);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = (patch: Partial<FormTemplate>) => {
    setTemplate((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const addQuestion = (type: QuestionType) => {
    if (!template) return;
    const q = createQuestion(type);
    updateTemplate({ questions: [...template.questions, q] });
    setSelectedId(q.id);
  };

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    if (!template) return;
    updateTemplate({
      questions: template.questions.map((q) =>
        q.id === id ? { ...q, ...patch } : q
      ),
    });
  };

  const deleteQuestion = (id: string) => {
    if (!template) return;
    const newQuestions = template.questions.filter((q) => q.id !== id);
    const cleanedQuestions = newQuestions.map((q) => {
      if (q.condition && q.condition.questionId === id) {
        const { condition, ...rest } = q;
        return rest;
      }
      return q;
    });
    updateTemplate({ questions: cleanedQuestions });
    if (selectedId === id) setSelectedId(null);
  };

  const addOption = (questionId: string) => {
    if (!template) return;
    updateTemplate({
      questions: template.questions.map((q) => {
        if (q.id !== questionId || !q.options) return q;
        return {
          ...q,
          options: [
            ...q.options,
            { id: uuidv4(), label: `选项 ${q.options.length + 1}` },
          ],
        };
      }),
    });
  };

  const updateOption = (questionId: string, optId: string, label: string) => {
    if (!template) return;
    updateTemplate({
      questions: template.questions.map((q) => {
        if (q.id !== questionId || !q.options) return q;
        return {
          ...q,
          options: q.options.map((o) =>
            o.id === optId ? { ...o, label } : o
          ),
        };
      }),
    });
  };

  const deleteOption = (questionId: string, optId: string) => {
    if (!template) return;
    updateTemplate({
      questions: template.questions.map((q) => {
        if (q.id !== questionId || !q.options) return q;
        if (q.options.length <= 1) return q;
        return {
          ...q,
          options: q.options.filter((o) => o.id !== optId),
        };
      }),
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !template) return;
    const items = Array.from(template.questions);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    updateTemplate({ questions: items });
  };

  const handleSidebarDragStart = (e: React.DragEvent, type: QuestionType) => {
    e.dataTransfer.setData('questionType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('questionType') as QuestionType;
    if (type) addQuestion(type);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const saveTemplate = async (): Promise<string | null> => {
    if (!template) return null;
    setSaving(true);
    try {
      if (template.id) {
        const res = await fetch(`/api/templates/${template.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(template),
        });
        if (res.ok) {
          const data = await res.json();
          setTemplate(data);
          return data.id;
        }
      } else {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: template.title,
            description: template.description,
            questions: template.questions,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setTemplate(data);
          return data.id;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
    return null;
  };

  const handlePublish = async () => {
    const id = await saveTemplate();
    if (id) {
      setShowPublishModal(true);
    }
  };

  const selectedQuestion = template?.questions.find((q) => q.id === selectedId);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!template) return null;

  const shareUrl = template.id
    ? `${window.location.origin}${window.location.pathname}#/form/${template.id}`
    : '';

  const conditionalQuestionOptions = template.questions.filter(
    (q) =>
      (q.type === 'radio' || q.type === 'dropdown') &&
      q.id !== selectedId &&
      q.options &&
      q.options.length > 0
  );

  return (
    <div>
      <div className="builder-toolbar">
        <button className="back-btn" onClick={onBack}>
          ← 返回
        </button>
        <div className="toolbar-title-input">
          <input
            value={template.title}
            onChange={(e) => updateTemplate({ title: e.target.value })}
            placeholder="问卷标题"
          />
        </div>
        <div className="toolbar-actions">
          <button
            className={`btn ${previewMode ? 'btn-accent' : 'btn-secondary'}`}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? '✎ 编辑模式' : '👁 预览模式'}
          </button>
          {template.id && (
            <button
              className="btn btn-secondary"
              onClick={() => onViewData(template.id)}
            >
              📊 查看数据
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={saving}
          >
            {saving ? '保存中...' : '🚀 发布'}
          </button>
        </div>
      </div>

      <div className="form-builder">
        {!previewMode && (
          <div className="builder-sidebar">
            <h4>问题类型</h4>
            {QUESTION_TYPES.map((qt) => (
              <div
                key={qt.type}
                className="question-type-item"
                draggable
                onDragStart={(e) => handleSidebarDragStart(e, qt.type)}
                onClick={() => addQuestion(qt.type)}
              >
                <div className="question-type-icon">{qt.icon}</div>
                <div className="question-type-name">{qt.name}</div>
              </div>
            ))}
          </div>
        )}

        <div
          className="builder-canvas"
          onDrop={!previewMode ? handleCanvasDrop : undefined}
          onDragOver={!previewMode ? handleCanvasDragOver : undefined}
        >
          <div
            style={{
              background: 'var(--primary)',
              color: 'white',
              padding: previewMode ? '32px' : '20px',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 20,
            }}
          >
            {previewMode ? (
              <>
                <h1 style={{ color: 'white', marginBottom: 8 }}>{template.title}</h1>
                <p style={{ opacity: 0.9 }}>{template.description}</p>
              </>
            ) : (
              <div>
                <input
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    width: '100%',
                    outline: 'none',
                    padding: '4px 0',
                    marginBottom: 8,
                    borderBottom: '1px dashed rgba(255,255,255,0.3)',
                  }}
                  value={template.title}
                  onChange={(e) => updateTemplate({ title: e.target.value })}
                />
                <textarea
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '0.95rem',
                    width: '100%',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: 40,
                    padding: 0,
                    lineHeight: 1.6,
                  }}
                  value={template.description}
                  onChange={(e) => updateTemplate({ description: e.target.value })}
                />
              </div>
            )}
          </div>

          {template.questions.length === 0 ? (
            <div
              className="dropzone"
              onDrop={!previewMode ? handleCanvasDrop : undefined}
              onDragOver={!previewMode ? handleCanvasDragOver : undefined}
            >
              <p style={{ fontSize: '2rem', marginBottom: 12 }}>📋</p>
              <p>从左侧拖拽问题类型到这里</p>
              <p style={{ fontSize: '0.85rem', marginTop: 6, opacity: 0.7 }}>
                或点击左侧类型快速添加
              </p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="questions">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    style={{
                      minHeight: snapshot.isDraggingOver ? 100 : 0,
                    }}
                  >
                    {template.questions.map((q, index) => (
                      <Draggable
                        key={q.id}
                        draggableId={q.id}
                        index={index}
                        isDragDisabled={previewMode}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`question-card ${
                              selectedId === q.id ? 'selected' : ''
                            } ${snapshot.isDragging ? 'dragging' : ''}`}
                            style={provided.draggableProps.style}
                            onClick={() => !previewMode && setSelectedId(q.id)}
                          >
                            <div className="question-header">
                              {!previewMode && (
                                <DragHandle {...provided.dragHandleProps}>
                                  <div className="drag-handle" title="拖拽调整顺序">
                                    ⋮⋮
                                  </div>
                                </DragHandle>
                              )}
                              <div style={{ flex: 1 }}>
                                {!previewMode ? (
                                  <div className="question-title-edit">
                                    <div style={{ marginBottom: 6 }}>
                                      <span className="question-type-badge">
                                        {TYPE_LABELS[q.type]}
                                      </span>
                                      {q.required && (
                                        <span className="required-badge">*必填</span>
                                      )}
                                      {q.condition && (
                                        <span
                                          className="badge"
                                          style={{
                                            marginLeft: 6,
                                            background: 'rgba(255,107,107,0.1)',
                                            color: 'var(--accent)',
                                          }}
                                        >
                                          ⚡ 条件显示
                                        </span>
                                      )}
                                    </div>
                                    <textarea
                                      value={q.title}
                                      onChange={(e) =>
                                        updateQuestion(q.id, { title: e.target.value })
                                      }
                                      placeholder="请输入问题标题"
                                      rows={q.title.includes('\n') ? 2 : 1}
                                    />
                                  </div>
                                ) : (
                                  <div className="render-question-title">
                                    {q.title || '未命名问题'}
                                    {q.required && (
                                      <span className="required-badge">*</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {!previewMode && (
                                <button
                                  className="question-delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteQuestion(q.id);
                                  }}
                                  title="删除问题"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            <div className="question-body">
                              {!previewMode ? (
                                <QuestionEditor
                                  question={q}
                                  updateQuestion={(p) => updateQuestion(q.id, p)}
                                  addOption={() => addOption(q.id)}
                                  updateOption={(oid, label) =>
                                    updateOption(q.id, oid, label)
                                  }
                                  deleteOption={(oid) => deleteOption(q.id, oid)}
                                />
                              ) : (
                                <QuestionPreview question={q} />
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {!previewMode && (
          <div className="builder-properties">
            <h4>属性面板</h4>
            {!selectedQuestion ? (
              <div style={{ padding: '0 8px', color: 'var(--text-hint)', fontSize: '0.85rem' }}>
                选择一个问题以编辑属性
              </div>
            ) : (
              <>
                <div className="property-group">
                  <div className="property-switch">
                    <span className="property-label" style={{ margin: 0 }}>
                      必填
                    </span>
                    <div
                      className={`switch ${selectedQuestion.required ? 'on' : ''}`}
                      onClick={() =>
                        updateQuestion(selectedQuestion.id, {
                          required: !selectedQuestion.required,
                        })
                      }
                    >
                      <div className="switch-knob" />
                    </div>
                  </div>
                </div>

                {(selectedQuestion.type === 'text') && (
                  <div className="property-group">
                    <label className="property-label">占位文本</label>
                    <input
                      className="property-input"
                      value={selectedQuestion.placeholder || ''}
                      onChange={(e) =>
                        updateQuestion(selectedQuestion.id, {
                          placeholder: e.target.value,
                        })
                      }
                      placeholder="请输入占位文本"
                    />
                  </div>
                )}

                {selectedQuestion.type === 'rating' && (
                  <div className="property-group">
                    <label className="property-label">
                      评分最大值（当前：{selectedQuestion.ratingMax || 5}）
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={10}
                      value={selectedQuestion.ratingMax || 5}
                      onChange={(e) =>
                        updateQuestion(selectedQuestion.id, {
                          ratingMax: parseInt(e.target.value),
                        })
                      }
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                <div className="property-group">
                  <label className="property-label">条件显示</label>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-hint)', marginBottom: 8 }}>
                    设置后此问题仅在满足条件时显示
                  </div>

                  <select
                    className="select-property"
                    value={selectedQuestion.condition?.questionId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        const { condition, ...rest } = selectedQuestion;
                        updateQuestion(selectedQuestion.id, rest);
                      } else {
                        const targetQ = template.questions.find(
                          (qq) => qq.id === val
                        );
                        const firstOpt = targetQ?.options?.[0]?.id || '';
                        updateQuestion(selectedQuestion.id, {
                          condition: {
                            questionId: val,
                            operator: 'equals',
                            value: firstOpt,
                          },
                        });
                      }
                    }}
                  >
                    <option value="">无条件（始终显示）</option>
                    {conditionalQuestionOptions.map((cq) => (
                      <option key={cq.id} value={cq.id}>
                        当问题：{cq.title.slice(0, 20) || cq.id}
                      </option>
                    ))}
                  </select>

                  {selectedQuestion.condition && (
                    <>
                      <div style={{ height: 10 }} />
                      <select
                        className="select-property"
                        value={selectedQuestion.condition.operator}
                        onChange={(e) =>
                          updateQuestion(selectedQuestion.id, {
                            condition: {
                              ...selectedQuestion.condition!,
                              operator: e.target.value as any,
                            },
                          })
                        }
                      >
                        <option value="equals">选项等于</option>
                        <option value="not_equals">选项不等于</option>
                      </select>
                      <div style={{ height: 10 }} />
                      <select
                        className="select-property"
                        value={selectedQuestion.condition.value}
                        onChange={(e) =>
                          updateQuestion(selectedQuestion.id, {
                            condition: {
                              ...selectedQuestion.condition!,
                              value: e.target.value,
                            },
                          })
                        }
                      >
                        {(() => {
                          const condQ = template.questions.find(
                            (qq) => qq.id === selectedQuestion.condition!.questionId
                          );
                          return condQ?.options?.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ));
                        })()}
                      </select>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showPublishModal && (
        <div className="modal-overlay" onClick={() => setShowPublishModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>🚀 问卷已发布</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              复制以下链接分享给用户填写：
            </p>
            <div className="share-link-box">
              <input value={shareUrl} readOnly />
              <button
                className="btn btn-primary"
                style={{ padding: '10px 16px' }}
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                }}
              >
                复制
              </button>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowPublishModal(false)}
              >
                关闭
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowPublishModal(false);
                  onPublish(template.id!);
                }}
              >
                打开填写页 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuestionEditorProps {
  question: Question;
  updateQuestion: (patch: Partial<Question>) => void;
  addOption: () => void;
  updateOption: (optId: string, label: string) => void;
  deleteOption: (optId: string) => void;
}

function QuestionEditor({
  question,
  addOption,
  updateOption,
  deleteOption,
}: QuestionEditorProps) {
  if (question.type === 'radio' || question.type === 'checkbox' || question.type === 'dropdown') {
    return (
      <>
        <ul className="option-list">
          {question.options?.map((opt) => (
            <li key={opt.id} className="option-item">
              <div
                className={
                  question.type === 'checkbox' ? 'option-checkbox' : 'option-radio'
                }
              />
              <input
                className="option-input"
                value={opt.label}
                onChange={(e) => updateOption(opt.id, e.target.value)}
                placeholder="选项内容"
              />
              <button
                className="option-delete"
                onClick={() => deleteOption(opt.id)}
                title="删除选项"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button className="add-option-btn" onClick={addOption}>
          ＋ 添加选项
        </button>
      </>
    );
  }

  if (question.type === 'rating') {
    const max = question.ratingMax || 5;
    return (
      <div className="rating-preview">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className="rating-star">★</span>
        ))}
        <span style={{ marginLeft: 10, color: 'var(--text-hint)', fontSize: '0.85rem', alignSelf: 'center' }}>
          共 {max} 级
        </span>
      </div>
    );
  }

  if (question.type === 'text') {
    return (
      <input
        className="text-input-preview"
        placeholder={question.placeholder || '用户将在此处输入文本...'}
        disabled
      />
    );
  }

  if (question.type === 'date') {
    return <input className="date-input-preview" type="date" disabled />;
  }

  return null;
}

function QuestionPreview({ question }: { question: Question }) {
  if (question.type === 'radio') {
    return (
      <div className="render-radio-group">
        {question.options?.map((o) => (
          <label key={o.id} className="render-radio-item">
            <div className="render-radio-circle" />
            <span className="render-option-label">{o.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'checkbox') {
    return (
      <div className="render-checkbox-group">
        {question.options?.map((o) => (
          <label key={o.id} className="render-checkbox-item">
            <div className="render-checkbox-box" />
            <span className="render-option-label">{o.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'dropdown') {
    return (
      <select className="render-select" disabled>
        <option value="">请选择...</option>
        {question.options?.map((o) => (
          <option key={o.id}>{o.label}</option>
        ))}
      </select>
    );
  }

  if (question.type === 'rating') {
    const max = question.ratingMax || 5;
    return (
      <div className="render-rating-group">
        {Array.from({ length: max }, (_, i) => (
          <button key={i} className="render-rating-btn">
            ★
          </button>
        ))}
      </div>
    );
  }

  if (question.type === 'text') {
    return (
      <textarea
        className="render-textarea"
        placeholder={question.placeholder || ''}
        disabled
      />
    );
  }

  if (question.type === 'date') {
    return <input className="render-date-input" type="date" disabled />;
  }

  return null;
}
