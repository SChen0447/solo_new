import { useState, useEffect, useRef } from 'react';
import type { Question, QuestionResult, StudentAnswer } from './quizEngine';

interface QuizView {
  id: string;
  inviteCode: string;
  title: string;
  questions: Question[];
  isOpen: boolean;
  createdAt: number;
}

interface SubmitResponse {
  submissionId: string;
  results: QuestionResult[];
  score: number;
  total: number;
}

export default function StudentQuiz() {
  const [step, setStep] = useState<'join' | 'quiz' | 'result'>('join');
  const [inviteCode, setInviteCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [quiz, setQuiz] = useState<QuizView | null>(null);
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map());
  const [submitResults, setSubmitResults] = useState<QuestionResult[]>([]);
  const [finalScore, setFinalScore] = useState({ score: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [animatedResults, setAnimatedResults] = useState<Set<string>>(new Set());
  const expandedRefs = useRef<Set<string>>(new Set());

  const joinQuiz = async () => {
    setError(null);
    if (!inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }
    if (!studentName.trim()) {
      setError('请输入您的姓名');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`/api/quizzes/by-code/${inviteCode.trim().toUpperCase()}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || '加入失败');
      setQuiz(data);
      const initAnswers = new Map<string, string | string[]>();
      data.questions.forEach((q: Question) => {
        initAnswers.set(q.id, q.type === 'multiple' ? [] : '');
      });
      setAnswers(initAnswers);
      setStep('quiz');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入失败');
    } finally {
      setLoading(false);
    }
  };

  const setSingleAnswer = (qid: string, value: string) => {
    setAnswers((prev) => new Map(prev).set(qid, value));
  };

  const toggleMultipleAnswer = (qid: string, value: string) => {
    setAnswers((prev) => {
      const curr = prev.get(qid) as string[] || [];
      const has = curr.includes(value);
      const next = has ? curr.filter((v) => v !== value) : [...curr, value];
      return new Map(prev).set(qid, next);
    });
  };

  const setFillAnswer = (qid: string, value: string) => {
    setAnswers((prev) => new Map(prev).set(qid, value));
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: StudentAnswer[] = quiz.questions.map((q) => ({
        questionId: q.id,
        answer: answers.get(q.id) || (q.type === 'multiple' ? [] : '')
      }));
      const resp = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: studentName.trim().slice(0, 10), answers: payload })
      });
      const data: SubmitResponse = await resp.json();
      if (!resp.ok) throw new Error(data as any || '提交失败');

      setSubmitResults(data.results);
      setFinalScore({ score: data.score, total: data.total });
      setStep('result');
      setShowResults(true);

      data.results.forEach((r, idx) => {
        setTimeout(() => {
          setAnimatedResults((prev) => {
            const next = new Set(prev);
            next.add(r.questionId);
            return next;
          });
        }, idx * 80);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getResultFor = (qid: string) => submitResults.find((r) => r.questionId === qid);

  const getCorrectLabelText = (q: Question, correctAnswer: string | string[]): string => {
    if (!q.options) return String(correctAnswer);
    const arr = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    const found = q.options.filter((o) => arr.includes(o.label));
    if (found.length === 0) return String(correctAnswer);
    return found.map((o) => `${o.label}. ${o.value}`).join('；');
  };

  const getUserLabelText = (q: Question, userAnswer: string | string[]): string => {
    if (!q.options) return String(userAnswer) || '（未作答）';
    const arr = Array.isArray(userAnswer) ? userAnswer : userAnswer ? [userAnswer] : [];
    if (arr.length === 0) return '（未作答）';
    const found = q.options.filter((o) => arr.includes(o.label));
    if (found.length === 0) return String(userAnswer);
    return found.map((o) => `${o.label}. ${o.value}`).join('；');
  };

  const isAnswered = (q: Question) => {
    const a = answers.get(q.id);
    if (q.type === 'multiple') return Array.isArray(a) && a.length > 0;
    return typeof a === 'string' && a.trim() !== '';
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <style>{`
        @keyframes checkRotate {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes crossShake {
          0% { transform: scale(0) translateX(-20px); opacity: 0; }
          20% { transform: scale(1.2) translateX(10px); }
          40% { transform: scale(1) translateX(-8px); }
          60% { transform: scale(1) translateX(5px); }
          80% { transform: scale(1) translateX(-2px); }
          100% { transform: scale(1) translateX(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes optionBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .question-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
        }
        @media (max-width: 768px) {
          .question-card-inner {
            padding: 16px !important;
          }
        }
      `}</style>

      {step === 'join' && (
        <div
          style={{
            backgroundColor: '#FFF',
            padding: 40,
            borderRadius: 8,
            border: '1px solid #E0E0E0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            maxWidth: 440,
            margin: '40px auto'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎓</div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#212121', marginBottom: 6 }}>
              加入课堂测验
            </h2>
            <p style={{ fontSize: 14, color: '#757575' }}>
              请输入老师提供的邀请码
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#424242', fontWeight: 500 }}>
              邀请码
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="请输入6位邀请码"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #E0E0E0',
                  borderRadius: 4,
                  fontSize: 20,
                  letterSpacing: 4,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  fontFamily: 'Courier New, monospace',
                  fontWeight: 600
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1976D2';
                  e.currentTarget.style.borderWidth = '3px';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(25,118,210,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E0E0E0';
                  e.currentTarget.style.borderWidth = '2px';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#424242', fontWeight: 500 }}>
              您的姓名
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value.slice(0, 10))}
              placeholder="请输入您的姓名（最多10字）"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #E0E0E0',
                borderRadius: 4,
                fontSize: 15,
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#1976D2';
                e.currentTarget.style.borderWidth = '3px';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(25,118,210,0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E0E0E0';
                e.currentTarget.style.borderWidth = '2px';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <div style={{ textAlign: 'right', marginTop: 4, fontSize: 12, color: '#999' }}>
              {studentName.length}/10
            </div>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#FFEBEE',
                color: '#F44336',
                padding: '10px 14px',
                borderRadius: 4,
                fontSize: 14,
                marginBottom: 16
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={joinQuiz}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#90CAF9' : '#1976D2',
              color: '#FFF',
              border: 'none',
              borderRadius: 4,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(25,118,210,0.3)',
              transition: 'transform 0.15s ease'
            }}
            onMouseDown={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#FFF',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.3s linear infinite'
                  }}
                />
                加载中...
              </span>
            ) : '开始答题 →'}
          </button>
        </div>
      )}

      {(step === 'quiz' || step === 'result') && quiz && (
        <div>
          <div
            style={{
              backgroundColor: '#FFF',
              padding: '20px 24px',
              borderRadius: 8,
              border: '1px solid #E0E0E0',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: '#212121', marginBottom: 4 }}>
                📝 {quiz.title}
              </h2>
              <div style={{ fontSize: 13, color: '#757575' }}>
                共 {quiz.questions.length} 题 · 姓名：<strong>{studentName}</strong>
              </div>
            </div>
            {step === 'result' && (
              <div
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  backgroundColor: finalScore.score === finalScore.total
                    ? '#E8F5E9'
                    : finalScore.score >= finalScore.total / 2
                    ? '#FFF3E0'
                    : '#FFEBEE',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: 12, color: '#757575', marginBottom: 2 }}>得分</div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: finalScore.score === finalScore.total
                      ? '#4CAF50'
                      : finalScore.score >= finalScore.total / 2
                      ? '#FF9800'
                      : '#F44336'
                  }}
                >
                  {finalScore.score}
                  <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.7 }}>/{finalScore.total}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {quiz.questions.map((q, qIdx) => {
              const result = step === 'result' ? getResultFor(q.id) : null;
              const isAnimated = animatedResults.has(q.id);
              const isCorrect = result?.isCorrect;

              return (
                <div
                  key={q.id}
                  className="question-card"
                  style={{
                    backgroundColor: step === 'result' && isAnimated
                      ? isCorrect
                        ? 'rgba(76, 175, 80, 0.08)'
                        : 'rgba(244, 67, 54, 0.08)'
                      : '#FFF',
                    border: '1px solid',
                    borderColor: step === 'result' && isAnimated
                      ? isCorrect
                        ? 'rgba(76, 175, 80, 0.4)'
                        : 'rgba(244, 67, 54, 0.4)'
                      : '#E0E0E0',
                    borderRadius: 8,
                    transition: 'all 0.3s ease, box-shadow 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {step === 'result' && isAnimated && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 6,
                        backgroundColor: isCorrect ? '#4CAF50' : '#F44336'
                      }}
                    />
                  )}
                  <div className="question-card-inner" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {step === 'result' && isAnimated && (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: isCorrect ? '#4CAF50' : '#F44336',
                            color: '#FFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: 2,
                            animation: isCorrect ? 'checkRotate 0.3s ease both' : 'crossShake 0.3s ease both',
                            fontSize: 18,
                            fontWeight: 700
                          }}
                        >
                          {isCorrect ? '✓' : '✕'}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
                          <span
                            style={{
                              padding: '2px 10px',
                              borderRadius: 10,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: '#E3F2FD',
                              color: '#1976D2',
                              flexShrink: 0
                            }}
                          >
                            {q.type === 'single' ? '单选' : q.type === 'multiple' ? '多选' : '填空'}
                          </span>
                          <span style={{ fontWeight: 600, color: '#424242', fontSize: 14 }}>
                            第 {qIdx + 1} 题
                          </span>
                          {step === 'quiz' && isAnswered(q) && (
                            <span style={{ fontSize: 12, color: '#4CAF50' }}>✓ 已作答</span>
                          )}
                        </div>
                        <div style={{ fontSize: 16, color: '#212121', lineHeight: 1.6, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
                          {q.description}
                        </div>

                        {q.type === 'single' && q.options && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {q.options.map((opt) => {
                              const selected = answers.get(q.id) === opt.label;
                              const correctForResult = step === 'result' && (
                                Array.isArray(result?.correctAnswer)
                                  ? result.correctAnswer.includes(opt.label)
                                  : result?.correctAnswer === opt.label
                              );
                              const wrongForResult = step === 'result' && selected && !correctForResult;
                              return (
                                <label
                                  key={opt.label}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                    padding: '12px 14px',
                                    borderRadius: 6,
                                    cursor: step === 'quiz' ? 'pointer' : 'default',
                                    backgroundColor: step === 'result'
                                      ? correctForResult
                                        ? 'rgba(76, 175, 80, 0.1)'
                                        : wrongForResult
                                        ? 'rgba(244, 67, 54, 0.1)'
                                        : 'transparent'
                                      : 'transparent',
                                    border: '1px solid',
                                    borderColor: step === 'result'
                                      ? correctForResult
                                        ? 'rgba(76, 175, 80, 0.4)'
                                        : wrongForResult
                                        ? 'rgba(244, 67, 54, 0.4)'
                                        : 'transparent'
                                      : selected
                                      ? 'rgba(25, 118, 210, 0.3)'
                                      : 'transparent',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: '50%',
                                      border: '2px solid',
                                      borderColor: selected ? '#1976D2' : '#BDBDBD',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      marginTop: 1,
                                      position: 'relative',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onClick={() => {
                                      if (step === 'quiz') {
                                        setSingleAnswer(q.id, opt.label);
                                        (event?.target as HTMLElement)?.animate(
                                          [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
                                          { duration: 150, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
                                        );
                                      }
                                    }}
                                  >
                                    {selected && (
                                      <div
                                        style={{
                                          width: 10,
                                          height: 10,
                                          borderRadius: '50%',
                                          backgroundColor: step === 'result'
                                            ? correctForResult
                                              ? '#4CAF50'
                                              : '#F44336'
                                            : '#1976D2',
                                          animation: 'optionBounce 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, marginRight: 8, color: '#424242' }}>
                                      {opt.label}.
                                    </span>
                                    <span style={{ color: '#212121' }}>{opt.value}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {q.type === 'multiple' && q.options && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {q.options.map((opt) => {
                              const selectedArr = (answers.get(q.id) as string[]) || [];
                              const selected = selectedArr.includes(opt.label);
                              const correctForResult = step === 'result' && (
                                Array.isArray(result?.correctAnswer)
                                  ? result.correctAnswer.includes(opt.label)
                                  : result?.correctAnswer === opt.label
                              );
                              const userHasButWrong = step === 'result' && selected && !correctForResult;
                              return (
                                <label
                                  key={opt.label}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                    padding: '12px 14px',
                                    borderRadius: 6,
                                    cursor: step === 'quiz' ? 'pointer' : 'default',
                                    backgroundColor: step === 'result'
                                      ? correctForResult
                                        ? 'rgba(76, 175, 80, 0.1)'
                                        : userHasButWrong
                                        ? 'rgba(244, 67, 54, 0.1)'
                                        : 'transparent'
                                      : 'transparent',
                                    border: '1px solid',
                                    borderColor: step === 'result'
                                      ? correctForResult
                                        ? 'rgba(76, 175, 80, 0.4)'
                                        : userHasButWrong
                                        ? 'rgba(244, 67, 54, 0.4)'
                                        : 'transparent'
                                      : selected
                                      ? 'rgba(25, 118, 210, 0.3)'
                                      : 'transparent',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: 4,
                                      border: '2px solid',
                                      borderColor: selected ? '#1976D2' : '#BDBDBD',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      marginTop: 1,
                                      backgroundColor: selected
                                        ? (step === 'result'
                                            ? correctForResult
                                              ? '#4CAF50'
                                              : '#F44336'
                                            : '#1976D2')
                                        : 'transparent',
                                      transition: 'all 0.15s ease',
                                      color: '#FFF',
                                      fontSize: 13,
                                      fontWeight: 700
                                    }}
                                    onClick={() => {
                                      if (step === 'quiz') {
                                        toggleMultipleAnswer(q.id, opt.label);
                                      }
                                    }}
                                  >
                                    {selected && '✓'}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, marginRight: 8, color: '#424242' }}>
                                      {opt.label}.
                                    </span>
                                    <span style={{ color: '#212121' }}>{opt.value}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {q.type === 'fill' && (
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              value={(answers.get(q.id) as string) || ''}
                              onChange={(e) => setFillAnswer(q.id, e.target.value)}
                              placeholder="请输入您的答案..."
                              disabled={step === 'result'}
                              style={{
                                width: '100%',
                                padding: '8px 4px',
                                border: 'none',
                                borderBottom: `2px solid ${step === 'result'
                                  ? (isCorrect ? '#4CAF50' : '#F44336')
                                  : (answers.get(q.id) ? '#1976D2' : '#9E9E9E')}`,
                                borderRadius: 0,
                                fontSize: 16,
                                outline: 'none',
                                backgroundColor: 'transparent',
                                transition: 'border-color 0.2s ease, border-width 0.2s ease'
                              }}
                              onFocus={(e) => {
                                if (step === 'quiz') {
                                  e.currentTarget.style.borderBottomColor = '#1976D2';
                                  e.currentTarget.style.borderBottomWidth = '3px';
                                }
                              }}
                              onBlur={(e) => {
                                if (step === 'quiz') {
                                  e.currentTarget.style.borderBottomWidth = '2px';
                                  if (!e.currentTarget.value) {
                                    e.currentTarget.style.borderBottomColor = '#9E9E9E';
                                  }
                                }
                              }}
                            />
                          </div>
                        )}

                        {step === 'result' && isAnimated && (
                          <div
                            style={{
                              marginTop: 20,
                              paddingTop: 16,
                              borderTop: `1px dashed ${isCorrect ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)'}`,
                              overflow: 'hidden'
                            }}
                          >
                            <ExplanationBlock
                              expanded={expandedRefs.current.has(q.id) || true}
                              result={result!}
                              question={q}
                              isCorrect={isCorrect!}
                              onFirstRender={() => {
                                expandedRefs.current.add(q.id);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {step === 'quiz' && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              {error && (
                <div
                  style={{
                    backgroundColor: '#FFEBEE',
                    color: '#F44336',
                    padding: '10px 14px',
                    borderRadius: 4,
                    fontSize: 14,
                    marginBottom: 16,
                    maxWidth: 400,
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }}
                >
                  ⚠️ {error}
                </div>
              )}
              <button
                onClick={submitQuiz}
                disabled={submitting}
                style={{
                  padding: '14px 56px',
                  backgroundColor: submitting ? '#90CAF9' : '#FF9800',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(255,152,0,0.35)',
                  transition: 'transform 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10
                }}
                onMouseDown={(e) => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              >
                {submitting && (
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      border: '3px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#FFF',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.3s linear infinite'
                    }}
                  />
                )}
                {submitting ? '提交中...' : '📮 提交答案'}
              </button>
            </div>
          )}

          {step === 'result' && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button
                onClick={() => {
                  setStep('join');
                  setInviteCode('');
                  setStudentName('');
                  setQuiz(null);
                  setAnswers(new Map());
                  setSubmitResults([]);
                  setShowResults(false);
                  setAnimatedResults(new Set());
                  expandedRefs.current.clear();
                }}
                style={{
                  padding: '10px 32px',
                  backgroundColor: '#FFF',
                  color: '#1976D2',
                  border: '2px solid #1976D2',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                ← 回到加入页面
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ExplanationBlockProps {
  expanded: boolean;
  result: QuestionResult;
  question: Question;
  isCorrect: boolean;
  onFirstRender: () => void;
}

function ExplanationBlock({ result, question, isCorrect, onFirstRender }: ExplanationBlockProps) {
  const [height, setHeight] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onFirstRender();
    requestAnimationFrame(() => {
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight);
      }
    });
    const t1 = setTimeout(() => setOpacity(1), 50);
    return () => clearTimeout(t1);
  }, []);

  return (
    <div
      style={{
        height,
        opacity,
        transition: 'height 0.4s ease-out, opacity 0.3s ease',
        overflow: 'hidden'
      }}
    >
      <div ref={contentRef}>
        {!isCorrect && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#F44336',
                marginBottom: 4
              }}
            >
              ❌ 您的答案：
            </div>
            <div style={{ fontSize: 14, color: '#F44336', padding: '4px 0' }}>
              {getUserAnswerText(question, result.userAnswer)}
            </div>
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#4CAF50',
              marginBottom: 4
            }}
          >
            ✅ 正确答案：
          </div>
          <div style={{ fontSize: 14, color: '#4CAF50', padding: '4px 0' }}>
            {getCorrectAnswerText(question, result.correctAnswer)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#1976D2',
              marginBottom: 4
            }}
          >
            💡 解析：
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#757575',
              lineHeight: 1.7,
              padding: '4px 0',
              whiteSpace: 'pre-wrap'
            }}
          >
            {result.explanation || '暂无解析'}
          </div>
        </div>
      </div>
    </div>
  );
}

function getCorrectAnswerText(q: Question, correctAnswer: string | string[]): string {
  if (q.type === 'fill' || !q.options) return String(correctAnswer);
  const arr = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
  const found = q.options.filter((o) => arr.includes(o.label));
  if (found.length === 0) return String(correctAnswer);
  return found.map((o) => `${o.label}. ${o.value}`).join('；');
}

function getUserAnswerText(q: Question, userAnswer: string | string[]): string {
  if (q.type === 'fill' || !q.options) {
    const val = Array.isArray(userAnswer) ? userAnswer.join('') : userAnswer;
    return val && val.trim() ? val : '（未作答）';
  }
  const arr = Array.isArray(userAnswer) ? userAnswer : userAnswer ? [userAnswer] : [];
  if (arr.length === 0) return '（未作答）';
  const found = q.options.filter((o) => arr.includes(o.label));
  if (found.length === 0) return String(userAnswer);
  return found.map((o) => `${o.label}. ${o.value}`).join('；');
}
