import type { Question, AnswerFeedback } from '../types';

interface QuestionPanelProps {
  question: Question | null;
  questionIndex: number;
  totalQuestions: number;
  selectedOptions: number[];
  submitted: boolean;
  feedback: AnswerFeedback | null;
  onToggleOption: (optionIndex: number) => void;
  onSubmit: () => void;
}

function QuestionPanel({
  question,
  questionIndex,
  totalQuestions,
  selectedOptions,
  submitted,
  feedback,
  onToggleOption,
  onSubmit,
}: QuestionPanelProps) {
  if (!question) {
    return (
      <div className="question-panel card">
        <div className="no-question">
          <p>暂无题目，请等待讲师发布。</p>
        </div>
      </div>
    );
  }

  const typeLabel = {
    single: '单选题',
    multiple: '多选题',
    boolean: '判断题',
  }[question.type];

  const correctAnswerArr = Array.isArray(question.correctAnswer)
    ? question.correctAnswer
    : [question.correctAnswer];

  const getOptionClass = (index: number) => {
    const base = 'option-btn';
    if (!submitted) {
      return selectedOptions.includes(index) ? `${base} selected` : base;
    }
    const isCorrectOption = correctAnswerArr.includes(index);
    const isSelected = selectedOptions.includes(index);
    if (isCorrectOption) return `${base} correct`;
    if (isSelected && !isCorrectOption) return `${base} wrong`;
    return `${base} disabled`;
  };

  return (
    <div className="question-panel card">
      <div className="question-header">
        <span className="question-type-badge">{typeLabel}</span>
        <span className="question-number">
          第 {questionIndex + 1} 题 / 共 {totalQuestions} 题
        </span>
      </div>

      <h2 className="question-title">{question.title}</h2>

      <div className="options-list">
        {question.options.map((option, index) => (
          <button
            key={index}
            className={getOptionClass(index)}
            onClick={() => onToggleOption(index)}
            disabled={submitted}
          >
            <span className="option-letter">{String.fromCharCode(65 + index)}</span>
            <span className="option-text">{option}</span>
            {submitted && correctAnswerArr.includes(index) && (
              <span className="option-icon correct-icon">✓</span>
            )}
            {submitted && selectedOptions.includes(index) && !correctAnswerArr.includes(index) && (
              <span className="option-icon wrong-icon">✗</span>
            )}
          </button>
        ))}
      </div>

      {!submitted && (
        <button
          className="submit-btn"
          onClick={onSubmit}
          disabled={selectedOptions.length === 0}
        >
          提交答案
        </button>
      )}

      {submitted && feedback && (
        <div className={`feedback ${feedback.isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>
          <div className="feedback-result">
            {feedback.isCorrect ? '🎉 回答正确！' : '❌ 回答错误'}
          </div>
          {feedback.explanation && (
            <div className="feedback-explanation">
              <strong>解析：</strong>{feedback.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuestionPanel;
