import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  User,
  GraduationCap,
  Award,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { useExamStore } from '../../stores/examStore';
import { useScoreStore } from '../../stores/scoreStore';
import type { Exam, Question } from '../../types';

const ExamEngine = () => {
  const {
    exams,
    examState,
    startExam,
    setCurrentQuestionIndex,
    setAnswer,
    submitExam,
    resetExamState,
  } = useExamStore();
  const { addScore } = useScoreStore();

  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentExam = exams.find((e) => e.id === examState.currentExamId);
  const currentQuestion =
    currentExam?.questions[examState.currentQuestionIndex];
  const publishedExams = exams.filter((e) => e.status === 'published');

  useEffect(() => {
    if (!examState.startTime || !currentExam || examState.isSubmitted) return;

    const totalSeconds = currentExam.duration * 60;
    const elapsed = Math.floor((Date.now() - examState.startTime) / 1000);
    const remaining = Math.max(0, totalSeconds - elapsed);
    setTimeLeft(remaining);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examState.startTime, currentExam, examState.isSubmitted]);

  useEffect(() => {
    if (timeLeft <= 60 && timeLeft > 0) {
      const blinkTimer = setInterval(() => {
        setIsBlinking((prev) => !prev);
      }, 500);
      return () => clearInterval(blinkTimer);
    } else {
      setIsBlinking(false);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartExam = (exam: Exam) => {
    if (!studentId.trim() || !studentName.trim()) return;
    startExam(exam.id);
    setSelectedExamId(null);
  };

  const handleAnswerSelect = (option: string) => {
    if (!currentQuestion || examState.isSubmitted) return;

    if (currentQuestion.type === 'multiple') {
      const currentAnswers = Array.isArray(examState.answers[currentQuestion.id])
        ? (examState.answers[currentQuestion.id] as string[])
        : [];
      if (currentAnswers.includes(option)) {
        setAnswer(
          currentQuestion.id,
          currentAnswers.filter((a) => a !== option)
        );
      } else {
        setAnswer(currentQuestion.id, [...currentAnswers, option]);
      }
    } else {
      setAnswer(currentQuestion.id, option);
    }
  };

  const isOptionSelected = (option: string) => {
    if (!currentQuestion) return false;
    const answer = examState.answers[currentQuestion.id];
    if (Array.isArray(answer)) {
      return answer.includes(option);
    }
    return answer === option;
  };

  const handleSubmit = useCallback(() => {
    if (!currentExam || examState.isSubmitted) return;
    const result = submitExam(studentId, studentName, className || undefined);
    if (result) {
      addScore(result);
    }
  }, [currentExam, examState.isSubmitted, studentId, studentName, className, submitExam, addScore]);

  const handleBackToList = () => {
    resetExamState();
    setStudentId('');
    setStudentName('');
    setClassName('');
  };

  const answeredCount = currentExam
    ? Object.keys(examState.answers).filter(
        (qid) => examState.answers[qid] !== undefined && examState.answers[qid] !== ''
      ).length
    : 0;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'single':
        return '单选题';
      case 'multiple':
        return '多选题';
      case 'truefalse':
        return '判断题';
      default:
        return '';
    }
  };

  if (!examState.currentExamId) {
    return (
      <div className="exam-engine">
        <div className="page-header">
          <h2 className="page-title">
            <GraduationCap className="icon" />
            考试中心
          </h2>
        </div>

        <div className="card student-info-card">
          <h3 className="card-title">学生信息</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <User className="icon-xs" />
                学号
              </label>
              <input
                type="text"
                className="form-input"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="请输入学号"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <User className="icon-xs" />
                姓名
              </label>
              <input
                type="text"
                className="form-input"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="请输入姓名"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <GraduationCap className="icon-xs" />
                班级（选填）
              </label>
              <input
                type="text"
                className="form-input"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="请输入班级"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">选择试卷</h3>
          {publishedExams.length === 0 ? (
            <div className="empty-state">
              <Award className="empty-icon" />
              <p>暂无可参加的考试</p>
            </div>
          ) : (
            <div className="exam-select-list">
              {publishedExams.map((exam) => (
                <div key={exam.id} className="exam-select-item card-sm">
                  <div className="exam-select-info">
                    <h4 className="exam-select-title">{exam.title}</h4>
                    <p className="exam-select-desc">{exam.description}</p>
                    <div className="exam-select-meta">
                      <span>{exam.questions.length} 道题</span>
                      <span>
                        <Clock className="icon-xs" />
                        {exam.duration} 分钟
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleStartExam(exam)}
                    disabled={!studentId.trim() || !studentName.trim()}
                  >
                    <Play className="icon-sm" />
                    开始答题
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (examState.isSubmitted && examState.result) {
    const result = examState.result;
    const totalPossible = currentExam?.questions.reduce((sum, q) => sum + q.score, 0) || 0;

    return (
      <div className="exam-engine">
        <div className="result-container">
          <div className="result-card card">
            <div className="result-header">
              <Award className="result-icon" />
              <h2>考试完成！</h2>
            </div>

            <div className="result-stats">
              <div className="result-stat">
                <span className="stat-label">总分</span>
                <span className="stat-value">{result.totalScore}</span>
                <span className="stat-total">/ {totalPossible}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">正确率</span>
                <span className="stat-value">{result.correctRate}%</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">用时</span>
                <span className="stat-value">{Math.floor(result.duration / 60)}分{result.duration % 60}秒</span>
              </div>
            </div>

            <div className="result-by-type">
              <h4>各题型得分</h4>
              <div className="type-scores">
                <div className="type-score-item">
                  <span className="type-name">单选题</span>
                  <span className="type-score">{result.scoreByType.single} 分</span>
                </div>
                <div className="type-score-item">
                  <span className="type-name">多选题</span>
                  <span className="type-score">{result.scoreByType.multiple} 分</span>
                </div>
                <div className="type-score-item">
                  <span className="type-name">判断题</span>
                  <span className="type-score">{result.scoreByType.truefalse} 分</span>
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-block" onClick={handleBackToList}>
              <ArrowLeft className="icon-sm" />
              返回考试列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-engine exam-taking">
      <div className="exam-header">
        <div className="exam-header-left">
          <h2 className="exam-title">{currentExam?.title}</h2>
          <span className="exam-progress">
            第 {examState.currentQuestionIndex + 1} / {currentExam?.questions.length || 0} 题
          </span>
        </div>
        <div className={`countdown ${isBlinking ? 'blinking' : ''} ${timeLeft <= 60 ? 'warning' : ''}`}>
          <Clock className="icon-sm" />
          <span className="countdown-text">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="exam-content">
        <div className="question-area">
          {currentQuestion && (
            <div className="question-card card">
              <div className="question-meta">
                <span className="question-type-badge">{getTypeLabel(currentQuestion.type)}</span>
                <span className="question-score-badge">{currentQuestion.score} 分</span>
              </div>
              <h3 className="question-title">
                {examState.currentQuestionIndex + 1}. {currentQuestion.question}
              </h3>
              <div className="options-container">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    className={`option-button ${isOptionSelected(option) ? 'selected' : ''}`}
                    onClick={() => handleAnswerSelect(option)}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="option-text">{option}</span>
                    <span className="option-check">
                      {isOptionSelected(option) ? <CheckCircle className="icon-sm" /> : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="question-nav-buttons">
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentQuestionIndex(examState.currentQuestionIndex - 1)}
              disabled={examState.currentQuestionIndex === 0}
            >
              <ChevronLeft className="icon-sm" />
              上一题
            </button>
            {examState.currentQuestionIndex ===
              (currentExam?.questions.length || 0) - 1 ? (
              <button
                className="btn btn-primary"
                onClick={() => setShowConfirm(true)}
              >
                <Send className="icon-sm" />
                提交试卷
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setCurrentQuestionIndex(examState.currentQuestionIndex + 1)}
              >
                下一题
                <ChevronRight className="icon-sm" />
              </button>
            )}
          </div>
        </div>

        <div className="nav-panel card">
          <h4 className="nav-panel-title">答题卡</h4>
          <div className="nav-panel-info">
            <span>已答: {answeredCount}</span>
            <span>未答: {(currentExam?.questions.length || 0) - answeredCount}</span>
          </div>
          <div className="nav-dots">
            {currentExam?.questions.map((q: Question, index: number) => {
              const isAnswered =
                examState.answers[q.id] !== undefined && examState.answers[q.id] !== '';
              const isCurrent = index === examState.currentQuestionIndex;
              return (
                <button
                  key={q.id}
                  className={`nav-dot ${isAnswered ? 'answered' : 'unanswered'} ${isCurrent ? 'current' : ''}`}
                  onClick={() => setCurrentQuestionIndex(index)}
                  title={`第 ${index + 1} 题 - ${isAnswered ? '已答' : '未答'}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <button
            className="btn btn-primary btn-block submit-btn"
            onClick={() => setShowConfirm(true)}
          >
            <Send className="icon-sm" />
            提交试卷
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">确认提交</h3>
            </div>
            <div className="modal-body">
              <p>
                您已完成 <strong>{answeredCount}</strong> 道题，还剩{' '}
                <strong>{(currentExam?.questions.length || 0) - answeredCount}</strong> 道题未答。
              </p>
              <p>确定要提交试卷吗？提交后无法修改。</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                继续答题
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamEngine;
