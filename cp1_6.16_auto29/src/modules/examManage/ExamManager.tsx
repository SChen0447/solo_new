import { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, FileText, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useExamStore } from '../../stores/examStore';
import QuestionImporter from './QuestionImporter';
import type { QuestionType, Question } from '../../types';

const ExamManager = () => {
  const { exams, createExam, updateExam, deleteExam, publishExam, addQuestion, updateQuestion, deleteQuestion } = useExamStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [showImporter, setShowImporter] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<QuestionType>('single');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [answer, setAnswer] = useState<string | string[]>('');
  const [score, setScore] = useState(2);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDuration(60);
    setShowCreateForm(false);
    setEditingExamId(null);
  };

  const resetQuestionForm = () => {
    setQuestionType('single');
    setQuestionText('');
    setOptions(['', '']);
    setAnswer('');
    setScore(2);
    setEditingQuestionId(null);
  };

  const handleCreateExam = () => {
    if (!title.trim()) return;
    if (editingExamId) {
      updateExam(editingExamId, { title, description, duration });
    } else {
      createExam(title, description, duration);
    }
    resetForm();
  };

  const handleEditExam = (examId: string) => {
    const exam = exams.find((e) => e.id === examId);
    if (exam) {
      setEditingExamId(examId);
      setTitle(exam.title);
      setDescription(exam.description);
      setDuration(exam.duration);
      setShowCreateForm(true);
    }
  };

  const handleAddQuestion = (examId: string) => {
    if (!questionText.trim()) return;

    const questionData: Omit<Question, 'id'> = {
      type: questionType,
      question: questionText,
      options: questionType === 'truefalse' ? ['正确', '错误'] : options.filter((o) => o.trim()),
      answer: answer,
      score,
    };

    if (editingQuestionId) {
      updateQuestion(examId, editingQuestionId, questionData);
    } else {
      addQuestion(examId, questionData);
    }
    resetQuestionForm();
  };

  const handleEditQuestion = (examId: string, question: Question) => {
    setEditingQuestionId(question.id);
    setQuestionType(question.type);
    setQuestionText(question.question);
    setOptions(question.options);
    setAnswer(question.answer);
    setScore(question.score);
    setExpandedExamId(examId);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const toggleAnswer = (option: string) => {
    if (questionType === 'multiple') {
      const currentAnswers = Array.isArray(answer) ? answer : [];
      if (currentAnswers.includes(option)) {
        setAnswer(currentAnswers.filter((a) => a !== option));
      } else {
        setAnswer([...currentAnswers, option]);
      }
    } else {
      setAnswer(option);
    }
  };

  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'single':
        return '单选题';
      case 'multiple':
        return '多选题';
      case 'truefalse':
        return '判断题';
    }
  };

  return (
    <div className="exam-manager">
      <div className="page-header">
        <h2 className="page-title">
          <FileText className="icon" />
          试卷管理
        </h2>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowImporter(true)}
          >
            <Plus className="icon-sm" />
            导入题库
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
            }}
          >
            <Plus className="icon-sm" />
            创建试卷
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="card form-card">
          <h3 className="form-title">
            {editingExamId ? '编辑试卷' : '创建新试卷'}
          </h3>
          <div className="form-group">
            <label className="form-label">试卷标题</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入试卷标题"
            />
          </div>
          <div className="form-group">
            <label className="form-label">试卷说明</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入试卷说明"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label className="form-label">考试时长（分钟）</label>
            <input
              type="number"
              className="form-input"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={1}
              max={300}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={resetForm}>
              取消
            </button>
            <button className="btn btn-primary" onClick={handleCreateExam}>
              {editingExamId ? '保存修改' : '创建试卷'}
            </button>
          </div>
        </div>
      )}

      <div className="exam-list">
        {exams.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-icon" />
            <p>暂无试卷，点击上方按钮创建</p>
          </div>
        ) : (
          exams.map((exam) => (
            <div key={exam.id} className="card exam-card">
              <div className="exam-card-header">
                <div className="exam-info">
                  <h3 className="exam-title">{exam.title}</h3>
                  <span
                    className={`status-badge ${exam.status === 'published' ? 'status-published' : 'status-draft'}`}
                  >
                    {exam.status === 'published' ? '已发布' : '草稿'}
                  </span>
                </div>
                <div className="exam-meta">
                  <span>{exam.questions.length} 道题</span>
                  <span>{exam.duration} 分钟</span>
                </div>
              </div>
              <p className="exam-description">{exam.description || '暂无说明'}</p>

              <div className="exam-card-actions">
                <button
                  className="btn-icon"
                  onClick={() => setExpandedExamId(expandedExamId === exam.id ? null : exam.id)}
                >
                  {expandedExamId === exam.id ? (
                    <ChevronUp className="icon-sm" />
                  ) : (
                    <ChevronDown className="icon-sm" />
                  )}
                  题目管理
                </button>
                {exam.status === 'draft' && (
                  <button
                    className="btn-icon text-success"
                    onClick={() => publishExam(exam.id)}
                  >
                    <Check className="icon-sm" />
                    发布
                  </button>
                )}
                <button
                  className="btn-icon"
                  onClick={() => handleEditExam(exam.id)}
                >
                  <Edit2 className="icon-sm" />
                  编辑
                </button>
                <button
                  className="btn-icon text-danger"
                  onClick={() => deleteExam(exam.id)}
                >
                  <Trash2 className="icon-sm" />
                  删除
                </button>
              </div>

              {expandedExamId === exam.id && (
                <div className="question-editor">
                  <h4 className="editor-title">题目列表</h4>

                  <div className="add-question-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">题型</label>
                        <select
                          className="form-select"
                          value={questionType}
                          onChange={(e) => {
                            setQuestionType(e.target.value as QuestionType);
                            setAnswer('');
                            if (e.target.value === 'truefalse') {
                              setOptions(['正确', '错误']);
                            } else if (options.length < 2) {
                              setOptions(['', '']);
                            }
                          }}
                        >
                          <option value="single">单选题</option>
                          <option value="multiple">多选题</option>
                          <option value="truefalse">判断题</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">分值</label>
                        <select
                          className="form-select"
                          value={score}
                          onChange={(e) => setScore(Number(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5].map((s) => (
                            <option key={s} value={s}>
                              {s} 分
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">题目内容</label>
                      <textarea
                        className="form-textarea"
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="请输入题目内容"
                        rows={2}
                      />
                    </div>

                    {questionType !== 'truefalse' && (
                      <div className="form-group">
                        <label className="form-label">选项</label>
                        <div className="options-list">
                          {options.map((opt, index) => (
                            <div key={index} className="option-item">
                              <span className="option-label">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <input
                                type="text"
                                className="form-input option-input"
                                value={opt}
                                onChange={(e) => updateOption(index, e.target.value)}
                                placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                              />
                              <button
                                className="btn-remove-option"
                                onClick={() => removeOption(index)}
                                disabled={options.length <= 2}
                              >
                                <X className="icon-xs" />
                              </button>
                              <button
                                className={`btn-answer-toggle ${
                                  questionType === 'multiple'
                                    ? Array.isArray(answer) && answer.includes(opt)
                                    : answer === opt
                                    ? 'is-answer'
                                    : ''
                                }`}
                                onClick={() => toggleAnswer(opt)}
                                title="设为正确答案"
                              >
                                {questionType === 'multiple'
                                  ? Array.isArray(answer) && answer.includes(opt)
                                    ? '✓'
                                    : '○'
                                  : answer === opt
                                  ? '✓'
                                  : '○'}
                              </button>
                            </div>
                          ))}
                          {questionType !== 'truefalse' && (
                            <button
                              className="btn-add-option"
                              onClick={addOption}
                            >
                              <Plus className="icon-xs" />
                              添加选项
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {questionType === 'truefalse' && (
                      <div className="form-group">
                        <label className="form-label">正确答案</label>
                        <div className="truefalse-options">
                          <button
                            className={`truefalse-btn ${answer === '正确' ? 'active' : ''}`}
                            onClick={() => setAnswer('正确')}
                          >
                            正确
                          </button>
                          <button
                            className={`truefalse-btn ${answer === '错误' ? 'active' : ''}`}
                            onClick={() => setAnswer('错误')}
                          >
                            错误
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="form-actions">
                      <button className="btn btn-secondary" onClick={resetQuestionForm}>
                        重置
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAddQuestion(exam.id)}
                      >
                        {editingQuestionId ? '修改题目' : '添加题目'}
                      </button>
                    </div>
                  </div>

                  <div className="questions-list">
                    {exam.questions.length === 0 ? (
                      <p className="empty-text">暂无题目，请添加</p>
                    ) : (
                      exam.questions.map((q, index) => (
                        <div key={q.id} className="question-item">
                          <div className="question-header">
                            <span className="question-number">第 {index + 1} 题</span>
                            <span className="question-type">{getTypeLabel(q.type)}</span>
                            <span className="question-score">{q.score} 分</span>
                            <div className="question-actions">
                              <button
                                className="btn-icon-sm"
                                onClick={() => handleEditQuestion(exam.id, q)}
                              >
                                <Edit2 className="icon-xs" />
                              </button>
                              <button
                                className="btn-icon-sm text-danger"
                                onClick={() => deleteQuestion(exam.id, q.id)}
                              >
                                <Trash2 className="icon-xs" />
                              </button>
                            </div>
                          </div>
                          <p className="question-text">{q.question}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showImporter && <QuestionImporter onClose={() => setShowImporter(false)} />}
    </div>
  );
};

export default ExamManager;
