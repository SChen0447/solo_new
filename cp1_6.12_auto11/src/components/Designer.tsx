import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { GripVertical, Plus, Trash2, Eye, Save, ArrowLeft, Star, Type, List, CheckSquare, ChevronDown, CircleDot, X, Send } from 'lucide-react';
import type { Survey, Question, QuestionType } from '../types';
import { QUESTION_TYPES } from '../types';
import { dataStore } from '../dataStore';

const questionTypeIcons: Record<QuestionType, React.ReactNode> = {
  single: <CircleDot size={16} />,
  multiple: <CheckSquare size={16} />,
  dropdown: <ChevronDown size={16} />,
  text: <Type size={16} />,
  rating: <Star size={16} />,
};

interface QuestionCardProps {
  question: Question;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = React.memo(({
  question,
  isSelected,
  onSelect,
  onDelete,
  onPreview,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
}) => {
  const typeInfo = QUESTION_TYPES.find(t => t.value === question.type);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, question.id)}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      data-question-id={question.id}
      className={`group flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${
        isSelected
          ? 'bg-indigo-50 border-2 border-indigo-500 shadow-md'
          : 'bg-white border-2 border-transparent hover:border-indigo-200 hover:shadow-sm'
      }`}
    >
      <div className="cursor-grab text-gray-400 hover:text-indigo-500 transition-colors active:cursor-grabbing">
        <GripVertical size={20} />
      </div>
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
        {questionTypeIcons[question.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 truncate">
          {question.title || '未命名问题'}
        </div>
        <div className="text-xs text-gray-500">
          {typeInfo?.label}
          {question.required && <span className="ml-2 text-red-500">· 必填</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
          title="预览"
        >
          <Eye size={18} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="删除"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
});

QuestionCard.displayName = 'QuestionCard';

interface QuestionPreviewProps {
  question: Question;
  demo?: boolean;
}

const QuestionPreviewRenderer: React.FC<QuestionPreviewProps> = ({ question, demo = false }) => {
  const [rating, setRating] = useState(0);
  const [singleValue, setSingleValue] = useState('');
  const [multiValue, setMultiValue] = useState<string[]>([]);
  const [dropdownValue, setDropdownValue] = useState('');
  const [textValue, setTextValue] = useState('');

  switch (question.type) {
    case 'single':
      return (
        <div className="space-y-2">
          {question.options?.map((opt, idx) => (
            <label
              key={idx}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-150 cursor-pointer group"
            >
              <input
                type="radio"
                name={`preview-${question.id}-${demo ? 'demo' : 'edit'}`}
                value={opt}
                checked={singleValue === opt}
                onChange={(e) => setSingleValue(e.target.value)}
                className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-gray-700 group-hover:text-indigo-700 transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      );
    case 'multiple':
      return (
        <div className="space-y-2">
          {question.options?.map((opt, idx) => (
            <label
              key={idx}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-150 cursor-pointer group"
            >
              <input
                type="checkbox"
                value={opt}
                checked={multiValue.includes(opt)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setMultiValue([...multiValue, opt]);
                  } else {
                    setMultiValue(multiValue.filter(v => v !== opt));
                  }
                }}
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-gray-700 group-hover:text-indigo-700 transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      );
    case 'dropdown':
      return (
        <select
          value={dropdownValue}
          onChange={(e) => setDropdownValue(e.target.value)}
          className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-700 hover:border-indigo-300"
        >
          <option value="">请选择...</option>
          {question.options?.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case 'rating':
      return (
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-2 transition-all duration-150 hover:scale-110"
            >
              <Star
                size={36}
                className={`transition-colors duration-150 ${
                  star <= rating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-4 text-gray-600">{rating} 分</span>
          )}
        </div>
      );
    case 'text':
      return (
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="请输入您的回答..."
          className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none hover:border-indigo-300"
          rows={4}
        />
      );
    default:
      return null;
  }
};

interface PreviewModalProps {
  question: Question | null;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ question, onClose }) => {
  if (!question) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalIn 0.25s ease-out' }}
      >
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              {questionTypeIcons[question.type]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">问题预览</h3>
              <p className="text-sm text-gray-500">
                {QUESTION_TYPES.find(t => t.value === question.type)?.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="flex items-start gap-2 mb-6">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-sm flex items-center justify-center font-medium">
              Q
            </span>
            <div className="flex-1">
              <h4 className="font-medium text-gray-800 text-lg">
                {question.title || '问题标题'}
                {question.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </h4>
            </div>
          </div>
          <div className="ml-8">
            <QuestionPreviewRenderer question={question} demo />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-medium hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Eye size={18} />
            关闭预览
          </button>
        </div>
      </div>
    </div>
  );
};

interface EditPanelProps {
  question: Question | null;
  onUpdate: (question: Question) => void;
  onPreview: () => void;
}

const EditPanel: React.FC<EditPanelProps> = ({ question, onUpdate, onPreview }) => {
  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <List size={48} className="mb-4 opacity-50" />
        <p>选择一个问题进行编辑</p>
        <p className="text-sm">或点击左侧"+"添加新问题</p>
      </div>
    );
  }

  const needsOptions = question.type === 'single' || question.type === 'multiple' || question.type === 'dropdown';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">编辑问题</h3>
        <button
          onClick={onPreview}
          className="px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Eye size={16} />
          预览效果
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">问题类型</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {QUESTION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => onUpdate({
                ...question,
                type: type.value,
                options: (type.value === 'single' || type.value === 'multiple' || type.value === 'dropdown')
                  ? (question.options || ['选项1', '选项2'])
                  : undefined,
              })}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                question.type === type.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-indigo-300 text-gray-600'
              }`}
            >
              {questionTypeIcons[type.value]}
              <span className="text-xs">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">问题标题</label>
        <input
          type="text"
          value={question.title}
          onChange={(e) => onUpdate({ ...question, title: e.target.value })}
          placeholder="请输入问题标题"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
        />
      </div>

      {needsOptions && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选项设置</label>
          <div className="space-y-2">
            {question.options?.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOptions = [...(question.options || [])];
                    newOptions[idx] = e.target.value;
                    onUpdate({ ...question, options: newOptions });
                  }}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                <button
                  onClick={() => {
                    const newOptions = question.options?.filter((_, i) => i !== idx) || [];
                    onUpdate({ ...question, options: newOptions });
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newOptions = [...(question.options || []), `选项${(question.options?.length || 0) + 1}`];
                onUpdate({ ...question, options: newOptions });
              }}
              className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-all"
            >
              <Plus size={18} className="inline mr-1" />
              添加选项
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="required"
          checked={question.required}
          onChange={(e) => onUpdate({ ...question, required: e.target.checked })}
          className="w-4 h-4 text-indigo-600 rounded"
        />
        <label htmlFor="required" className="text-sm text-gray-700">设置为必答题</label>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <Eye size={16} />
          实时预览
        </h4>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-800 mb-3">
            {question.title || '问题标题'}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </div>
          <QuestionPreviewRenderer question={question} />
        </div>
      </div>
    </div>
  );
};

export const Designer: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const dragStateRef = useRef({
    draggedIdx: -1,
    lastUpdateTime: 0,
    pendingTargetIdx: -1,
    rafId: null as number | null,
  });
  const questionsRef = useRef<Question[]>([]);

  useEffect(() => {
    if (survey) {
      questionsRef.current = survey.questions;
    }
  }, [survey]);

  useEffect(() => {
    if (surveyId) {
      dataStore.getSurvey(surveyId).then((s) => {
        if (s) {
          setSurvey(s);
          if (s.questions.length > 0) {
            setSelectedQuestionId(s.questions[0].id);
          }
          setLoading(false);
        } else {
          navigate('/');
        }
      }).catch(() => {
        navigate('/');
      });
    }
  }, [surveyId, navigate]);

  const selectedQuestion = useMemo(() => {
    return survey?.questions.find(q => q.id === selectedQuestionId) || null;
  }, [survey, selectedQuestionId]);

  const addQuestion = useCallback((type: QuestionType) => {
    if (!survey) return;
    const newQuestion: Question = {
      id: uuidv4(),
      type,
      title: '',
      required: false,
      order: survey.questions.length,
      options: (type === 'single' || type === 'multiple' || type === 'dropdown') ? ['选项1', '选项2'] : undefined,
    };
    const updated = {
      ...survey,
      questions: [...survey.questions, newQuestion],
    };
    setSurvey(updated);
    setSelectedQuestionId(newQuestion.id);
  }, [survey]);

  const deleteQuestion = useCallback((id: string) => {
    if (!survey) return;
    const remaining = survey.questions.filter(q => q.id !== id);
    const updated = {
      ...survey,
      questions: remaining.map((q, idx) => ({ ...q, order: idx })),
    };
    setSurvey(updated);
    if (selectedQuestionId === id) {
      setSelectedQuestionId(remaining[0]?.id || null);
    }
  }, [survey, selectedQuestionId]);

  const updateQuestion = useCallback((updatedQuestion: Question) => {
    if (!survey) return;
    const updated = {
      ...survey,
      questions: survey.questions.map(q =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      ),
    };
    setSurvey(updated);
  }, [survey]);

  const performReorder = useCallback((targetIdx: number) => {
    const state = dragStateRef.current;
    const questions = questionsRef.current;
    
    if (state.draggedIdx === -1 || targetIdx === -1 || state.draggedIdx === targetIdx) {
      return;
    }

    const reordered = [...questions];
    const [removed] = reordered.splice(state.draggedIdx, 1);
    reordered.splice(targetIdx, 0, removed);
    
    const finalQuestions = reordered.map((q, idx) => ({ ...q, order: idx }));
    
    setSurvey(prev => prev ? { ...prev, questions: finalQuestions } : null);
    state.draggedIdx = targetIdx;
    questionsRef.current = finalQuestions;
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    const idx = questionsRef.current.findIndex(q => q.id === id);
    dragStateRef.current.draggedIdx = idx;
    dragStateRef.current.lastUpdateTime = 0;
    dragStateRef.current.pendingTargetIdx = -1;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const state = dragStateRef.current;
    const now = performance.now();
    
    if (state.draggedIdx === -1) return;
    
    const target = e.currentTarget as HTMLElement;
    const questionEl = target.closest('[data-question-id]') as HTMLElement | null;
    if (!questionEl) return;
    
    const questionId = questionEl.getAttribute('data-question-id');
    if (!questionId) return;
    
    const targetIdx = questionsRef.current.findIndex(q => q.id === questionId);
    if (targetIdx === -1 || targetIdx === state.draggedIdx) return;
    
    const THROTTLE_MS = 50;
    
    if (now - state.lastUpdateTime >= THROTTLE_MS) {
      state.lastUpdateTime = now;
      state.pendingTargetIdx = -1;
      performReorder(targetIdx);
    } else {
      state.pendingTargetIdx = targetIdx;
      
      if (state.rafId === null) {
        state.rafId = requestAnimationFrame(() => {
          state.rafId = null;
          if (state.pendingTargetIdx !== -1 && state.pendingTargetIdx !== state.draggedIdx) {
            state.lastUpdateTime = performance.now();
            performReorder(state.pendingTargetIdx);
            state.pendingTargetIdx = -1;
          }
        });
      }
    }
  }, [performReorder]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const state = dragStateRef.current;
    
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    
    if (state.pendingTargetIdx !== -1 && state.pendingTargetIdx !== state.draggedIdx) {
      performReorder(state.pendingTargetIdx);
    }
    
    setDraggedId(null);
    state.draggedIdx = -1;
    state.pendingTargetIdx = -1;
    state.lastUpdateTime = 0;
  }, [performReorder]);

  const handleDragEnd = useCallback(() => {
    const state = dragStateRef.current;
    
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    
    setDraggedId(null);
    state.draggedIdx = -1;
    state.pendingTargetIdx = -1;
    state.lastUpdateTime = 0;
  }, []);

  const handleSave = useCallback(async () => {
    if (!survey) return;
    setSaving(true);
    try {
      const result = await dataStore.updateSurvey(survey);
      if (result) {
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed; top: 20px; right: 20px;
          background: #10B981; color: white;
          padding: 12px 20px; border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999; font-size: 14px;
          animation: slideIn 0.3s ease;
        `;
        toast.textContent = '保存成功！';
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.animation = 'slideOut 0.3s ease forwards';
          setTimeout(() => toast.remove(), 300);
        }, 2000);
      }
    } catch (e) {
      // 错误已在 dataStore 中处理
    } finally {
      setSaving(false);
    }
  }, [survey]);

  const updateSurveyTitle = useCallback((title: string) => {
    if (!survey) return;
    setSurvey({ ...survey, title });
  }, [survey]);

  const updateSurveyDescription = useCallback((description: string) => {
    if (!survey) return;
    setSurvey({ ...survey, description });
  }, [survey]);

  const handlePreview = useCallback((question: Question) => {
    setPreviewQuestion(question);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewQuestion(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F0F4F8]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!survey) return null;

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <input
                type="text"
                value={survey.title}
                onChange={(e) => updateSurveyTitle(e.target.value)}
                className="text-xl font-bold text-gray-800 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="问卷标题"
              />
              <input
                type="text"
                value={survey.description}
                onChange={(e) => updateSurveyDescription(e.target.value)}
                className="block text-sm text-gray-500 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none transition-colors mt-1 w-80"
                placeholder="问卷描述"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/viewer/${survey.id}`)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <Eye size={18} />
              填写预览
            </button>
            <button
              onClick={() => navigate(`/dashboard/${survey.id}`)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              查看统计
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
          <div className="lg:w-2/5 flex flex-col min-h-0">
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">添加问题</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {QUESTION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => addQuestion(type.value)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    {questionTypeIcons[type.value]}
                    <span className="text-xs">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm p-4 overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                问题列表 ({survey.questions.length})
              </h3>
              {survey.questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Plus size={48} className="mb-4 opacity-50" />
                  <p>还没有问题</p>
                  <p className="text-sm">点击上方按钮添加问题</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {survey.questions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      isSelected={selectedQuestionId === question.id}
                      onSelect={() => setSelectedQuestionId(question.id)}
                      onDelete={() => deleteQuestion(question.id)}
                      onPreview={() => handlePreview(question)}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedId === question.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:w-3/5 bg-white rounded-xl shadow-sm p-6 overflow-y-auto">
            <EditPanel
              question={selectedQuestion}
              onUpdate={updateQuestion}
              onPreview={() => selectedQuestion && handlePreview(selectedQuestion)}
            />
          </div>
        </div>
      </main>

      <PreviewModal question={previewQuestion} onClose={closePreview} />
    </div>
  );
};
