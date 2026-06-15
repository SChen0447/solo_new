import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionType, Quiz } from './quizEngine';

interface QuestionStats {
  questionIndex: number;
  questionId: string;
  correctCount: number;
  totalSubmissions: number;
  correctRate: number;
}

interface QuizStats {
  quizId: string;
  title: string;
  isOpen: boolean;
  submittedCount: number;
  totalQuestions: number;
  questionStats: QuestionStats[];
  submissions: { id: string; studentName: string; submittedAt: number; score: number }[];
}

interface QuestionForm {
  id: string;
  type: QuestionType;
  description: string;
  options: { label: string; value: string }[];
  correctSingle: string;
  correctMultiple: string[];
  correctFill: string;
  explanation: string;
}

const createEmptyQuestion = (): QuestionForm => ({
  id: uuidv4(),
  type: 'single',
  description: '',
  options: [
    { label: 'A', value: '' },
    { label: 'B', value: '' },
    { label: 'C', value: '' },
    { label: 'D', value: '' }
  ],
  correctSingle: '',
  correctMultiple: [],
  correctFill: '',
  explanation: ''
});

export default function TeacherPanel() {
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionForm[]>([createEmptyQuestion()]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(true);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [statsSubmittedCount, setStatsSubmittedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (stats) {
      animateNumber(statsSubmittedCount, stats.submittedCount, setStatsSubmittedCount, 200);
    }
  }, [stats?.submittedCount]);

  const animateNumber = (
    from: number,
    to: number,
    setter: (v: number) => void,
    duration: number
  ) => {
    const startTime = performance.now();
    const startVal = from;
    const diff = to - startVal;
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setter(Math.round(startVal + diff * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const addQuestion = () => {
    if (questions.length < 20) {
      setQuestions([...questions, createEmptyQuestion()]);
    }
  };

  const removeQuestion = (qid: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== qid));
    }
  };

  const updateQuestion = (qid: string, patch: Partial<QuestionForm>) => {
    setQuestions(
      questions.map((q) => (q.id === qid ? { ...q, ...patch } : q))
    );
  };

  const addOption = (qid: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qid && q.options.length < 6) {
          const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
          return {
            ...q,
            options: [...q.options, { label: labels[q.options.length], value: '' }]
          };
        }
        return q;
      })
    );
  };

  const removeOption = (qid: string, idx: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qid && q.options.length > 2) {
          const newOptions = q.options.filter((_, i) => i !== idx);
          const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
          return {
            ...q,
            options: newOptions.map((o, i) => ({ ...o, label: labels[i] }))
          };
        }
        return q;
      })
    );
  };

  const toggleMultipleOption = (qid: string, label: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qid) {
          const has = q.correctMultiple.includes(label);
          return {
            ...q,
            correctMultiple: has
              ? q.correctMultiple.filter((l) => l !== label)
              : [...q.correctMultiple, label]
          };
        }
        return q;
      })
    );
  };

  const publishQuiz = async () => {
    setError(null);
    if (!quizTitle.trim()) {
      setError('请填写测验标题');
      return;
    }
    const validQuestions: Question[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.description.trim()) {
        setError(`第 ${i + 1} 题：请填写题目描述`);
        return;
      }
      if (q.type === 'single' || q.type === 'multiple') {
        const filledOptions = q.options.filter((o) => o.value.trim());
        if (filledOptions.length < 2) {
          setError(`第 ${i + 1} 题：至少填写2个选项`);
          return;
        }
        if (q.type === 'single' && !q.correctSingle) {
          setError(`第 ${i + 1} 题：请选择正确答案`);
          return;
        }
        if (q.type === 'multiple' && q.correctMultiple.length === 0) {
          setError(`第 ${i + 1} 题：请选择至少一个正确答案`);
          return;
        }
      }
      if (q.type === 'fill' && !q.correctFill.trim()) {
        setError(`第 ${i + 1} 题：请填写正确答案`);
        return;
      }

      let correctAnswer: string | string[];
      if (q.type === 'single') correctAnswer = q.correctSingle;
      else if (q.type === 'multiple') correctAnswer = [...q.correctMultiple];
      else correctAnswer = q.correctFill.trim();

      validQuestions.push({
        id: q.id,
        type: q.type,
        description: q.description.trim(),
        options: q.options.filter((o) => o.value.trim()),
        correctAnswer,
        explanation: q.explanation.trim()
      });
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quizTitle.trim(), questions: validQuestions })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || '发布失败');
      setInviteCode(data.inviteCode);
      setCurrentQuizId(data.quiz.id);
      setIsQuizOpen(true);
      setShowInviteModal(true);
      startStatsPolling(data.quiz.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setLoading(false);
    }
  };

  const startStatsPolling = (quizId: string) => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    const fetchStats = async () => {
      try {
        const resp = await fetch(`/api/quizzes/${quizId}/stats`);
        const data = await resp.json();
        if (resp.ok) {
          setStats(data);
          setIsQuizOpen(data.isOpen);
        }
      } catch (e) {
        console.error('拉取统计失败:', e);
      }
    };
    fetchStats();
    statsIntervalRef.current = setInterval(fetchStats, 2000);
  };

  const toggleSubmitEntry = async () => {
    if (!currentQuizId) return;
    try {
      const resp = await fetch(`/api/quizzes/${currentQuizId}/toggle`, {
        method: 'PUT'
      });
      const data = await resp.json();
      if (resp.ok) {
        setIsQuizOpen(data.isOpen);
      }
    } catch (e) {
      console.error('切换失败:', e);
    }
  };

  const getRateColor = (rate: number) => {
    const ratio = rate / 100;
    const r = Math.round(244 + (76 - 244) * ratio);
    const g = Math.round(67 + (175 - 67) * ratio);
    const b = Math.round(54 + (80 - 54) * ratio);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {currentQuizId && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            backgroundColor: '#333',
            color: '#FFF',
            padding: '16px 24px',
            borderRadius: 8,
            marginBottom: 24,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: 15 }}>
            已提交: <strong style={{ color: '#FF9800' }}>{statsSubmittedCount}</strong>
            <span style={{ opacity: 0.6, marginLeft: 4 }}>人</span>
          </div>
          <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>正确率分布</div>
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-end',
                flexWrap: 'wrap'
              }}
            >
              {stats?.questionStats.map((qs) => (
                <div key={qs.questionId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 40,
                      height: 30,
                      borderRadius: 4,
                      backgroundColor: '#555',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${qs.correctRate}%`,
                        backgroundColor: getRateColor(qs.correctRate),
                        transition: 'all 0.4s ease',
                        borderRadius: '4px 4px 0 0'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11 }}>Q{qs.questionIndex}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>{qs.correctRate}%</div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              setInviteCode(inviteCode);
              setShowInviteModal(true);
            }}
            style={{
              backgroundColor: '#FF9800',
              color: '#FFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            查看邀请码
          </button>
          <button
            onClick={toggleSubmitEntry}
            style={{
              backgroundColor: isQuizOpen ? '#F44336' : '#4CAF50',
              color: '#FFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {isQuizOpen ? '关闭提交' : '开启提交'}
          </button>
        </div>
      )}

      {!currentQuizId && (
        <div
          style={{
            backgroundColor: '#FFF',
            padding: 24,
            borderRadius: 8,
            border: '1px solid #E0E0E0',
            marginBottom: 16
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: '#212121' }}>
            ✏️ 创建新测验
          </h2>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#424242', fontWeight: 500 }}>
              测验标题
            </label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="例如：第三章 函数与极限 小测"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '2px solid #E0E0E0',
                borderRadius: 4,
                fontSize: 15,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#1976D2')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#E0E0E0')}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questions.map((q, qIdx) => (
              <div
                key={q.id}
                style={{
                  border: '1px solid #E0E0E0',
                  borderRadius: 8,
                  padding: 24,
                  backgroundColor: '#FAFAFA'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontWeight: 600, color: '#1976D2' }}>第 {qIdx + 1} 题</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #E0E0E0',
                        borderRadius: 4,
                        fontSize: 13,
                        backgroundColor: '#FFF'
                      }}
                    >
                      <option value="single">单选题</option>
                      <option value="multiple">多选题</option>
                      <option value="fill">填空题</option>
                    </select>
                    {questions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(q.id)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #F44336',
                          color: '#F44336',
                          backgroundColor: '#FFF',
                          borderRadius: 4,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#424242' }}>题目描述</label>
                  <textarea
                    value={q.description}
                    onChange={(e) => updateQuestion(q.id, { description: e.target.value })}
                    placeholder="输入题目内容..."
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #E0E0E0',
                      borderRadius: 4,
                      fontSize: 14,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#1976D2')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#E0E0E0')}
                  />
                </div>

                {(q.type === 'single' || q.type === 'multiple') && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <label style={{ fontSize: 13, color: '#424242' }}>
                        选项 (最多6个)
                      </label>
                      {q.options.length < 6 && (
                        <button
                          onClick={() => addOption(q.id)}
                          style={{
                            padding: '4px 10px',
                            border: '1px solid #1976D2',
                            color: '#1976D2',
                            backgroundColor: '#FFF',
                            borderRadius: 4,
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          + 添加选项
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.options.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {q.type === 'single' ? (
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={q.correctSingle === opt.label}
                              onChange={() => updateQuestion(q.id, { correctSingle: opt.label })}
                              style={{ width: 18, height: 18, accentColor: '#1976D2', cursor: 'pointer' }}
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={q.correctMultiple.includes(opt.label)}
                              onChange={() => toggleMultipleOption(q.id, opt.label)}
                              style={{ width: 18, height: 18, accentColor: '#1976D2', cursor: 'pointer' }}
                            />
                          )}
                          <span style={{ fontWeight: 600, color: '#424242', minWidth: 24 }}>{opt.label}.</span>
                          <input
                            type="text"
                            value={opt.value}
                            onChange={(e) => {
                              const newOptions = [...q.options];
                              newOptions[idx] = { ...opt, value: e.target.value };
                              updateQuestion(q.id, { options: newOptions });
                            }}
                            placeholder={`选项 ${opt.label} 内容`}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: '1px solid #E0E0E0',
                              borderRadius: 4,
                              fontSize: 14,
                              outline: 'none'
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#1976D2')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#E0E0E0')}
                          />
                          {q.options.length > 2 && (
                            <button
                              onClick={() => removeOption(q.id, idx)}
                              style={{
                                padding: '4px 10px',
                                border: 'none',
                                color: '#999',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                fontSize: 18
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>
                      {q.type === 'single' ? '💡 点击左侧圆圈标记正确答案' : '💡 勾选左侧方框标记所有正确答案'}
                    </div>
                  </div>
                )}

                {q.type === 'fill' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#424242' }}>正确答案</label>
                    <input
                      type="text"
                      value={q.correctFill}
                      onChange={(e) => updateQuestion(q.id, { correctFill: e.target.value })}
                      placeholder="输入填空题的正确答案"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #E0E0E0',
                        borderRadius: 4,
                        fontSize: 14,
                        outline: 'none'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#1976D2')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#E0E0E0')}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#424242' }}>答案解析 (学生提交后可见)</label>
                  <textarea
                    value={q.explanation}
                    onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                    placeholder="输入解题思路、知识点解析..."
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #E0E0E0',
                      borderRadius: 4,
                      fontSize: 14,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#1976D2')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#E0E0E0')}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button
              onClick={addQuestion}
              style={{
                padding: '10px 20px',
                border: '2px dashed #1976D2',
                color: '#1976D2',
                backgroundColor: '#FFF',
                borderRadius: 4,
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              + 添加题目
            </button>
            <div style={{ flex: 1 }} />
            {error && (
              <div style={{ alignSelf: 'center', color: '#F44336', fontSize: 14 }}>{error}</div>
            )}
            <button
              onClick={publishQuiz}
              disabled={loading}
              style={{
                padding: '12px 32px',
                backgroundColor: loading ? '#90CAF9' : '#1976D2',
                color: '#FFF',
                border: 'none',
                borderRadius: 4,
                fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(25,118,210,0.3)'
              }}
            >
              {loading ? '发布中...' : '🚀 发布测验'}
            </button>
          </div>
        </div>
      )}

      {stats && (
        <div
          style={{
            backgroundColor: '#FFF',
            padding: 24,
            borderRadius: 8,
            border: '1px solid #E0E0E0'
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#212121' }}>
            📊 提交记录
          </h3>
          {stats.submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
              暂无学生提交，请等待...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E0E0E0' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: '#757575' }}>姓名</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: '#757575' }}>得分</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: '#757575' }}>提交时间</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.submissions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '10px 12px', fontSize: 14 }}>{s.studentName}</td>
                      <td style={{ padding: '10px 12px', fontSize: 14 }}>
                        <span
                          style={{
                            padding: '2px 10px',
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 600,
                            color: s.score === stats.totalQuestions
                              ? '#4CAF50'
                              : s.score >= stats.totalQuestions / 2
                              ? '#FF9800'
                              : '#F44336',
                            backgroundColor: s.score === stats.totalQuestions
                              ? '#E8F5E9'
                              : s.score >= stats.totalQuestions / 2
                              ? '#FFF3E0'
                              : '#FFEBEE'
                          }}
                        >
                          {s.score}/{stats.totalQuestions}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: '#757575' }}>
                        {new Date(s.submittedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showInviteModal && inviteCode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFF',
              padding: 40,
              borderRadius: 12,
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              minWidth: 360,
              animation: 'inviteModalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both'
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: '#212121' }}>
              测验已发布！
            </h2>
            <p style={{ fontSize: 14, color: '#757575', marginBottom: 24 }}>
              请将邀请码分享给学生
            </p>
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: 8,
                color: '#1976D2',
                backgroundColor: '#E3F2FD',
                padding: '16px 24px',
                borderRadius: 8,
                marginBottom: 8,
                fontFamily: 'Courier New, monospace'
              }}
            >
              {inviteCode}
            </div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 28 }}>
              学生页面: {window.location.origin}/#/student
            </div>
            <button
              onClick={() => setShowInviteModal(false)}
              style={{
                padding: '10px 36px',
                backgroundColor: '#1976D2',
                color: '#FFF',
                border: 'none',
                borderRadius: 4,
                fontSize: 15,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              我知道了
            </button>
          </div>
          <style>{`
            @keyframes inviteModalIn {
              0% { transform: scale(0.5); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
