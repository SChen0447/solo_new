import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Send, ArrowLeft, AlertCircle } from 'lucide-react';
import type { Survey, Question } from '../types';
import { dataStore } from '../dataStore';

interface FormValues {
  [questionId: string]: any;
}

interface QuestionRenderProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

const SingleQuestion: React.FC<QuestionRenderProps> = ({ question, value, onChange }) => {
  return (
    <div className="space-y-2">
      {question.options?.map((opt, idx) => (
        <label
          key={idx}
          className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-150 cursor-pointer group"
        >
          <div className="relative">
            <input
              type="radio"
              name={question.id}
              value={opt}
              checked={value === opt}
              onChange={(e) => onChange(e.target.value)}
              className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
          </div>
          <span className="text-gray-700 group-hover:text-indigo-700 transition-colors">{opt}</span>
        </label>
      ))}
    </div>
  );
};

const MultipleQuestion: React.FC<QuestionRenderProps> = ({ question, value, onChange }) => {
  const currentValue = Array.isArray(value) ? value : [];
  
  const handleChange = (opt: string, checked: boolean) => {
    if (checked) {
      onChange([...currentValue, opt]);
    } else {
      onChange(currentValue.filter((v: string) => v !== opt));
    }
  };

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
            checked={currentValue.includes(opt)}
            onChange={(e) => handleChange(opt, e.target.checked)}
            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <span className="text-gray-700 group-hover:text-indigo-700 transition-colors">{opt}</span>
        </label>
      ))}
    </div>
  );
};

const DropdownQuestion: React.FC<QuestionRenderProps> = ({ question, value, onChange }) => {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-700 hover:border-indigo-300"
    >
      <option value="">请选择...</option>
      {question.options?.map((opt, idx) => (
        <option key={idx} value={opt}>{opt}</option>
      ))}
    </select>
  );
};

const RatingQuestion: React.FC<QuestionRenderProps> = ({ question, value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  const currentValue = typeof value === 'number' ? value : 0;

  return (
    <div className="flex items-center gap-3">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-2 transition-all duration-150 hover:scale-110"
        >
          <Star
            size={36}
            className={`transition-colors duration-150 ${
              star <= (hovered || currentValue)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
      {currentValue > 0 && (
        <span className="ml-4 text-gray-600">{currentValue} 分</span>
      )}
    </div>
  );
};

const TextQuestion: React.FC<QuestionRenderProps> = ({ question, value, onChange }) => {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="请输入您的回答..."
      className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none hover:border-indigo-300"
      rows={4}
    />
  );
};

const QuestionRenderer: React.FC<QuestionRenderProps> = (props) => {
  switch (props.question.type) {
    case 'single':
      return <SingleQuestion {...props} />;
    case 'multiple':
      return <MultipleQuestion {...props} />;
    case 'dropdown':
      return <DropdownQuestion {...props} />;
    case 'rating':
      return <RatingQuestion {...props} />;
    case 'text':
      return <TextQuestion {...props} />;
    default:
      return null;
  }
};

export const Viewer: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (surveyId) {
      dataStore.getSurvey(surveyId).then((s) => {
        setSurvey(s);
        setLoading(false);
      }).catch(() => {
        navigate('/');
      });
    }
  }, [surveyId, navigate]);

  const handleValueChange = useCallback((questionId: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [questionId]: value,
    }));
    setErrors(prev => {
      if (prev[questionId]) {
        const { [questionId]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!survey) return false;
    const newErrors: { [key: string]: string } = {};
    
    survey.questions.forEach((q) => {
      if (q.required) {
        const value = formValues[q.id];
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0) || (typeof value === 'number' && value === 0)) {
          newErrors[q.id] = '此题为必答题';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [survey, formValues]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey || !surveyId) return;
    
    if (!validateForm()) {
      const firstError = document.querySelector('[data-error="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    try {
      const answers = survey.questions
        .filter(q => formValues[q.id] !== undefined && formValues[q.id] !== null && formValues[q.id] !== '' && !(Array.isArray(formValues[q.id]) && formValues[q.id].length === 0))
        .map(q => ({
          questionId: q.id,
          value: formValues[q.id],
        }));
      
      await dataStore.submitAnswers({
        surveyId,
        answers,
      });
      
      navigate(`/dashboard/${surveyId}`);
    } catch (err) {
      alert('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }, [survey, surveyId, formValues, validateForm, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F0F4F8]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!survey) return null;

  return (
    <div className="min-h-screen bg-[#F0F4F8] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={20} />
          返回首页
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-8 text-white">
            <h1 className="text-2xl font-bold mb-2">{survey.title}</h1>
            {survey.description && (
              <p className="text-indigo-100">{survey.description}</p>
            )}
            <div className="mt-4 text-sm text-indigo-200">
              共 {survey.questions.length} 题
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {survey.questions.map((question, index) => (
              <div
                key={question.id}
                data-error={!!errors[question.id]}
                className={`pb-8 mb-8 ${
                  index < survey.questions.length - 1
                    ? 'border-b border-gray-200'
                    : ''
                }`}
              >
                <div className="flex items-start gap-2 mb-4">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-sm flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800 text-lg">
                      {question.title}
                      {question.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </h3>
                  </div>
                </div>

                <div className="ml-8">
                  <QuestionRenderer
                    question={question}
                    value={formValues[question.id]}
                    onChange={(value) => handleValueChange(question.id, value)}
                    error={errors[question.id]}
                  />
                  {errors[question.id] && (
                    <div className="mt-2 flex items-center gap-1 text-red-500 text-sm">
                      <AlertCircle size={14} />
                      {errors[question.id]}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-medium text-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
              >
                <Send size={20} />
                {submitting ? '提交中...' : '提交问卷'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
