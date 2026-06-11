import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { GripVertical, Plus, Trash2, Eye, Save, ArrowLeft, Star, Type, List, CheckSquare, ChevronDown, CircleDot } from 'lucide-react';
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
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = React.memo(({
  question,
  isSelected,
  onSelect,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const typeInfo = QUESTION_TYPES.find(t => t.value === question.type);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, question.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, question.id)}
      onClick={onSelect}
      className={`group flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-indigo-50 border-2 border-indigo-500 shadow-md'
          : 'bg-white border-2 border-transparent hover:border-indigo-200 hover:shadow-sm'
      }`}
    >
      <div className="cursor-grab text-gray-400 hover:text-indigo-500 transition-colors">
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
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
});

QuestionCard.displayName = 'QuestionCard';

interface QuestionPreviewProps {
  question: Question;
}

const QuestionPreview: React.FC<QuestionPreviewProps> = ({ question }) => {
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
            <label key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <input
                type="radio"
                name={`preview-${question.id}`}
                value={opt}
                checked={singleValue === opt}
                onChange={(e) => setSingleValue(e.target.value)}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );
    case 'multiple':
      return (
        <div className="space-y-2">
          {question.options?.map((opt, idx) => (
            <label key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
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
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );
    case 'dropdown':
      return (
        <select
          value={dropdownValue}
          onChange={(e) => setDropdownValue(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
        >
          <option value="">请选择...</option>
          {question.options?.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case 'rating':
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                size={32}
                className={`transition-colors ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
              />
            </button>
          ))}
        </div>
      );
    case 'text':
      return (
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="请输入您的回答..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
          rows={3}
        />
      );
    default:
      return null;
  }
};

interface EditPanelProps {
  question: Question | null;
  onUpdate: (question: Question) => void;
}

const EditPanel: React.FC<EditPanelProps> = ({ question, onUpdate }) => {
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">问题类型</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {QUESTION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => onUpdate({ ...question, type: type.value, options: type.value === 'single' || type.value === 'multiple' || type.value === 'dropdown' ? (question.options || ['选项1', '选项2']) : undefined })}
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
          预览效果
        </h4>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-800 mb-3">
            {question.title || '问题标题'}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </div>
          <QuestionPreview question={question} />
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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const dragOverIdRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (surveyId) {
      dataStore.getSurvey(surveyId).then((s) => {
        setSurvey(s);
        if (s.questions.length > 0) {
          setSelectedQuestionId(s.questions[0].id);
        }
        setLoading(false);
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

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget as HTMLElement;
    const questionId = target.getAttribute('data-question-id') || target.closest('[data-question-id]')?.getAttribute('data-question-id');
    
    if (questionId && questionId !== dragOverIdRef.current) {
      dragOverIdRef.current = questionId;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        if (!survey || !draggedId || draggedId === questionId) return;
        
        const questions = [...survey.questions];
        const draggedIdx = questions.findIndex(q => q.id === draggedId);
        const targetIdx = questions.findIndex(q => q.id === questionId);
        
        if (draggedIdx === -1 || targetIdx === -1) return;
        
        const [removed] = questions.splice(draggedIdx, 1);
        questions.splice(targetIdx, 0, removed);
        
        const reordered = questions.map((q, idx) => ({ ...q, order: idx }));
        setSurvey({ ...survey, questions: reordered });
      });
    }
  }, [survey, draggedId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDraggedId(null);
    dragOverIdRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!survey) return;
    setSaving(true);
    try {
      await dataStore.updateSurvey(survey);
      alert('保存成功！');
    } catch (e) {
      alert('保存失败，请重试');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
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
              预览
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
                    <div key={question.id} data-question-id={question.id}>
                      <QuestionCard
                        question={question}
                        isSelected={selectedQuestionId === question.id}
                        onSelect={() => setSelectedQuestionId(question.id)}
                        onDelete={() => deleteQuestion(question.id)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:w-3/5 bg-white rounded-xl shadow-sm p-6 overflow-y-auto">
            <EditPanel
              question={selectedQuestion}
              onUpdate={updateQuestion}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
