import React, { useState, useEffect } from 'react';
import type { Survey, QuestionResponse } from './types';

interface FillSurveyProps {
  surveyId: string;
}

export default function FillSurvey({ surveyId }: FillSurveyProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, QuestionResponse>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}`)
      .then((r) => {
        if (!r.ok) throw new Error('未找到问卷');
        return r.json();
      })
      .then((data: Survey) => {
        setSurvey(data);
        const init: Record<string, QuestionResponse> = {};
        for (const q of data.questions) {
          init[q.id] = {
            questionId: q.id,
            selectedOptionIds: [],
            ratingValue: undefined,
          };
        }
        setAnswers(init);
      })
      .catch(() => setError('问卷不存在或未发布'));
  }, [surveyId]);

  const handleToggleOption = (questionId: string, optionId: string, isMultiple: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId];
      if (!current) return prev;
      if (isMultiple) {
        const exists = current.selectedOptionIds.includes(optionId);
        return {
          ...prev,
          [questionId]: {
            ...current,
            selectedOptionIds: exists
              ? current.selectedOptionIds.filter((id) => id !== optionId)
              : [...current.selectedOptionIds, optionId],
          },
        };
      } else {
        return {
          ...prev,
          [questionId]: {
            ...current,
            selectedOptionIds: [optionId],
          },
        };
      }
    });
  };

  const handleRating = (questionId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        ratingValue: value,
      },
    }));
  };

  const handleSubmit = async () => {
    const answerList = Object.values(answers);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerList }),
      });
      if (!res.ok) throw new Error('提交失败');
      setSubmitted(true);
    } catch {
      setError('提交失败，请重试');
    }
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>{error}</div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>✅</div>
          <h2 style={styles.successTitle}>提交成功</h2>
          <p style={styles.successText}>感谢您的参与！</p>
          <a href="#/" style={styles.backLink}>返回首页</a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.surveyTitle}>{survey.title}</h1>
        {survey.questions.map((q, qIdx) => (
          <div key={q.id} style={styles.questionBlock}>
            <h3 style={styles.questionTitle}>
              {qIdx + 1}. {q.title}
              <span style={styles.requiredMark}>*</span>
            </h3>
            {q.type === 'rating' ? (
              <div style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    style={{
                      ...styles.ratingBtn,
                      ...(answers[q.id]?.ratingValue === n ? styles.ratingBtnActive : {}),
                    }}
                    onClick={() => handleRating(q.id, n)}
                  >
                    ★ {n}
                  </button>
                ))}
              </div>
            ) : (
              <div style={styles.optionsBlock}>
                {q.options.map((opt) => (
                  <label key={opt.id} style={styles.optionLabel}>
                    <input
                      type={q.type === 'multiple' ? 'checkbox' : 'radio'}
                      name={`q-${q.id}`}
                      checked={answers[q.id]?.selectedOptionIds.includes(opt.id) || false}
                      onChange={() => handleToggleOption(q.id, opt.id, q.type === 'multiple')}
                      style={styles.optionInput}
                    />
                    <span style={styles.optionLabelText}>{opt.text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
        <button style={styles.submitBtn} onClick={handleSubmit}>
          提交问卷
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f7fa',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '40px 16px',
  },
  loading: {
    fontSize: 18,
    color: '#9ca3af',
    marginTop: 80,
  },
  errorCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 40,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 600,
  },
  successCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 48,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    margin: '0 0 8px',
    fontSize: 24,
    color: '#10b981',
  },
  successText: {
    margin: '0 0 24px',
    color: '#6b7280',
    fontSize: 16,
  },
  backLink: {
    color: '#4a90d9',
    textDecoration: 'underline',
    fontSize: 15,
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    padding: '32px 40px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    maxWidth: 720,
    width: '100%',
  },
  surveyTitle: {
    margin: '0 0 28px',
    fontSize: 26,
    fontWeight: 800,
    color: '#1a1a2e',
    paddingBottom: 16,
    borderBottom: '2px solid #e5e7eb',
  },
  questionBlock: {
    marginBottom: 28,
  },
  questionTitle: {
    margin: '0 0 12px',
    fontSize: 17,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  requiredMark: {
    color: '#ef4444',
    marginLeft: 4,
  },
  ratingRow: {
    display: 'flex',
    gap: 8,
  },
  ratingBtn: {
    padding: '8px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    background: '#fff',
    fontSize: 16,
    cursor: 'pointer',
    transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
    color: '#9ca3af',
  },
  ratingBtnActive: {
    borderColor: '#f59e0b',
    background: '#fffbeb',
    color: '#f59e0b',
    fontWeight: 700,
  },
  optionsBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  optionInput: {
    width: 18,
    height: 18,
    accentColor: '#4a90d9',
  },
  optionLabelText: {
    fontSize: 15,
    color: '#374151',
  },
  submitBtn: {
    marginTop: 8,
    padding: '14px 40px',
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};
