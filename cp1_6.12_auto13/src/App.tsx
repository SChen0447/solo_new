import { useState, useEffect, useCallback } from 'react';
import type { Question, StatsData, AnswerFeedback } from './types';
import QuestionPanel from './components/QuestionPanel';
import StatsDashboard from './components/StatsDashboard';

type Mode = 'lecturer' | 'student';

interface CreateQuestionForm {
  type: 'single' | 'multiple' | 'boolean';
  title: string;
  options: string[];
  correctAnswer: number | number[];
  explanation: string;
}

const emptyForm: CreateQuestionForm = {
  type: 'single',
  title: '',
  options: ['', '', '', ''],
  correctAnswer: -1,
  explanation: '',
};

function App() {
  const [mode, setMode] = useState<Mode>('student');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateQuestionForm>({ ...emptyForm });
  const [activeTab, setActiveTab] = useState<'question' | 'stats'>('question');

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch('/api/questions');
      const data = await res.json();
      setQuestions(data.questions);
      setCurrentIndex(data.currentIndex);
    } catch {
      // ignore
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchCurrentIndex = useCallback(async () => {
    try {
      const res = await fetch('/api/questions/current');
      const data = await res.json();
      if (data.index !== currentIndex) {
        setCurrentIndex(data.index);
        setFeedback(null);
        setSelectedOptions([]);
        setSubmitted(false);
      }
    } catch {
      // ignore
    }
  }, [currentIndex]);

  useEffect(() => {
    fetchQuestions();
    fetchStats();
  }, [fetchQuestions, fetchStats]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCurrentIndex();
      fetchStats();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchCurrentIndex, fetchStats]);

  const handleSubmitAnswer = async () => {
    if (selectedOptions.length === 0 || !currentQuestion) return;
    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptions,
        }),
      });
      const data = await res.json();
      setFeedback(data);
      setSubmitted(true);
      fetchStats();
    } catch {
      // ignore
    }
  };

  const handleNextQuestion = async () => {
    await fetch('/api/questions/next', { method: 'POST' });
    setFeedback(null);
    setSelectedOptions([]);
    setSubmitted(false);
    fetchQuestions();
  };

  const handlePrevQuestion = async () => {
    await fetch('/api/questions/prev', { method: 'POST' });
    setFeedback(null);
    setSelectedOptions([]);
    setSubmitted(false);
    fetchQuestions();
  };

  const handleGotoQuestion = async (index: number) => {
    await fetch('/api/questions/goto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index }),
    });
    setFeedback(null);
    setSelectedOptions([]);
    setSubmitted(false);
    fetchQuestions();
  };

  const handleCreateQuestion = async () => {
    const { type, title, options, correctAnswer, explanation } = createForm;
    const filteredOptions = type === 'boolean' ? ['正确', '错误'] : options.filter((o) => o.trim() !== '');
    if (!title.trim() || filteredOptions.length < 2 || correctAnswer === -1 || (Array.isArray(correctAnswer) && correctAnswer.length === 0)) {
      return;
    }
    try {
      await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, options: filteredOptions, correctAnswer, explanation }),
      });
      setCreateForm({ ...emptyForm });
      setShowCreateForm(false);
      fetchQuestions();
    } catch {
      // ignore
    }
  };

  const handleReset = async () => {
    await fetch('/api/reset', { method: 'DELETE' });
    setFeedback(null);
    setSelectedOptions([]);
    setSubmitted(false);
    fetchQuestions();
    fetchStats();
  };

  const currentQuestion = questions[currentIndex] || null;

  const toggleOption = (optionIndex: number) => {
    if (submitted) return;
    if (currentQuestion?.type === 'multiple') {
      setSelectedOptions((prev) =>
        prev.includes(optionIndex) ? prev.filter((i) => i !== optionIndex) : [...prev, optionIndex]
      );
    } else {
      setSelectedOptions([optionIndex]);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">课堂实时答题系统</h1>
        <div className="mode-switcher">
          <button
            className={`mode-btn ${mode === 'student' ? 'active' : ''}`}
            onClick={() => setMode('student')}
          >
            学员模式
          </button>
          <button
            className={`mode-btn ${mode === 'lecturer' ? 'active' : ''}`}
            onClick={() => setMode('lecturer')}
          >
            讲师模式
          </button>
        </div>
      </header>

      <main className="app-main">
        {mode === 'lecturer' && (
          <div className="lecturer-controls">
            <div className="nav-controls">
              <button className="ctrl-btn" onClick={handlePrevQuestion} disabled={currentIndex === 0}>
                ← 上一题
              </button>
              <span className="question-indicator">
                {currentIndex + 1} / {questions.length}
              </span>
              <button className="ctrl-btn" onClick={handleNextQuestion} disabled={currentIndex >= questions.length - 1}>
                下一题 →
              </button>
              <button className="ctrl-btn accent" onClick={() => setShowCreateForm(!showCreateForm)}>
                {showCreateForm ? '收起' : '+ 新建题目'}
              </button>
              <button className="ctrl-btn danger" onClick={handleReset}>
                重置数据
              </button>
            </div>

            <div className="question-dots">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  className={`dot ${i === currentIndex ? 'active' : ''}`}
                  onClick={() => handleGotoQuestion(i)}
                  title={`第${i + 1}题`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {showCreateForm && (
              <div className="create-form card">
                <h3>创建新题目</h3>
                <div className="form-group">
                  <label>题目类型</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => {
                      const t = e.target.value as 'single' | 'multiple' | 'boolean';
                      setCreateForm({
                        ...createForm,
                        type: t,
                        options: t === 'boolean' ? ['正确', '错误'] : ['', '', '', ''],
                        correctAnswer: t === 'boolean' ? -1 : (t === 'multiple' ? [] : -1),
                      });
                    }}
                  >
                    <option value="single">单选题</option>
                    <option value="multiple">多选题</option>
                    <option value="boolean">判断题</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>题目标题</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="请输入题目内容"
                  />
                </div>
                {createForm.type !== 'boolean' && (
                  <div className="form-group">
                    <label>选项</label>
                    {createForm.options.map((opt, i) => (
                      <div key={i} className="option-input-row">
                        <span className="option-label">{String.fromCharCode(65 + i)}</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...createForm.options];
                            newOpts[i] = e.target.value;
                            setCreateForm({ ...createForm, options: newOpts });
                          }}
                          placeholder={`选项${String.fromCharCode(65 + i)}`}
                        />
                        {createForm.type === 'single' && (
                          <input
                            type="radio"
                            name="correct"
                            checked={createForm.correctAnswer === i}
                            onChange={() => setCreateForm({ ...createForm, correctAnswer: i })}
                          />
                        )}
                        {createForm.type === 'multiple' && (
                          <input
                            type="checkbox"
                            checked={Array.isArray(createForm.correctAnswer) && createForm.correctAnswer.includes(i)}
                            onChange={() => {
                              const current = Array.isArray(createForm.correctAnswer) ? createForm.correctAnswer : [];
                              const next = current.includes(i) ? current.filter((x) => x !== i) : [...current, i];
                              setCreateForm({ ...createForm, correctAnswer: next });
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {createForm.type === 'boolean' && (
                  <div className="form-group">
                    <label>正确答案</label>
                    <div className="boolean-answer">
                      <label>
                        <input
                          type="radio"
                          name="bool-correct"
                          checked={createForm.correctAnswer === 0}
                          onChange={() => setCreateForm({ ...createForm, correctAnswer: 0 })}
                        />
                        正确
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="bool-correct"
                          checked={createForm.correctAnswer === 1}
                          onChange={() => setCreateForm({ ...createForm, correctAnswer: 1 })}
                        />
                        错误
                      </label>
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label>解析（可选）</label>
                  <textarea
                    value={createForm.explanation}
                    onChange={(e) => setCreateForm({ ...createForm, explanation: e.target.value })}
                    placeholder="输入答案解析"
                    rows={3}
                  />
                </div>
                <button className="ctrl-btn accent submit-btn" onClick={handleCreateQuestion}>
                  添加题目
                </button>
              </div>
            )}

            <div className="tab-controls">
              <button
                className={`tab-btn ${activeTab === 'question' ? 'active' : ''}`}
                onClick={() => setActiveTab('question')}
              >
                题目预览
              </button>
              <button
                className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveTab('stats')}
              >
                统计看板
              </button>
            </div>
          </div>
        )}

        <div className="content-area">
          {mode === 'student' || activeTab === 'question' ? (
            <QuestionPanel
              question={currentQuestion}
              questionIndex={currentIndex}
              totalQuestions={questions.length}
              selectedOptions={selectedOptions}
              submitted={submitted}
              feedback={feedback}
              onToggleOption={toggleOption}
              onSubmit={handleSubmitAnswer}
            />
          ) : null}

          {(mode === 'lecturer' && activeTab === 'stats') && (
            <StatsDashboard stats={stats} />
          )}
        </div>

        {mode === 'student' && stats && stats.totalAnswers > 0 && (
          <div className="student-stats-toggle">
            <button
              className="ctrl-btn"
              onClick={() => setActiveTab(activeTab === 'stats' ? 'question' : 'stats')}
            >
              {activeTab === 'stats' ? '返回答题' : '查看统计'}
            </button>
          </div>
        )}

        {mode === 'student' && activeTab === 'stats' && (
          <div className="content-area">
            <StatsDashboard stats={stats} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
