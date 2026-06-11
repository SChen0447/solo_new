import { useState, useEffect } from 'react';
import type { Question, AnswerFeedback } from '../types';

interface QuestionPanelProps {
  question: Question | null;
  questionIndex: number;
  totalQuestions: number;
  selectedOptions: number[];
  submitted: boolean;
  feedback: AnswerFeedback | null;
  questionEnded: boolean;
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
  questionEnded,
  onToggleOption,
  onSubmit,
}: QuestionPanelProps) {
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [localIsCorrect, setLocalIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    setLocalSubmitted(false);
    setLocalIsCorrect(null);
  }, [question?.id, questionIndex]);

  const handleLocalSubmit = () => {
    if (!question || selectedOptions.length === 0 || localSubmitted || questionEnded) return;

    const correctAnswerArr = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : [question.correctAnswer];
    const sortedCorrect = [...correctAnswerArr].sort();
    const sortedSelected = [...selectedOptions].sort();
    const isCorrect =
      sortedCorrect.length === sortedSelected.length &&
      sortedCorrect.every((v, i) => v === sortedSelected[i]);

    setLocalIsCorrect(isCorrect);
    setLocalSubmitted(true);

    onSubmit();
  };

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

  const showFeedbackStates = localSubmitted || questionEnded;

  const getOptionClass = (index: number) => {
    const base = 'option-btn';
    if (!showFeedbackStates) {
      return selectedOptions.includes(index) ? `${base} selected` : base;
    }
    const isCorrectOption = correctAnswerArr.includes(index);
    const isSelected = selectedOptions.includes(index);
    if (isCorrectOption) return `${base} correct`;
    if (isSelected && !isCorrectOption) return `${base} wrong`;
    return `${base} disabled`;
  };

  const showFeedback = localSubmitted || (questionEnded && (submitted || selectedOptions.length > 0));

  const effectiveIsCorrect = localIsCorrect ?? feedback?.isCorrect ?? null;
  const effectiveExplanation = feedback?.explanation || question.explanation;

  return (
    <div className="question-panel card">
      <div className="question-header">
        <span className="question-type-badge">{typeLabel}</span>
        <span className="question-number">
          第 {questionIndex + 1} 题 / 共 {totalQuestions} 题
        </span>
      </div>

      {questionEnded && (
        <div className="question-ended-banner">
          <span className="ended-icon">⏹</span>
          本题已结束，请等待讲师开启下一题
        </div>
      )}

      <h2 className="question-title">{question.title}</h2>

      <div className="options-list">
        {question.options.map((option, index) => (
          <button
            key={`${question.id}-${index}`}
            className={getOptionClass(index)}
            onClick={() => onToggleOption(index)}
            disabled={showFeedbackStates}
          >
            <span className="option-letter">{String.fromCharCode(65 + index)}</span>
            <span className="option-text">{option}</span>
            {showFeedbackStates && correctAnswerArr.includes(index) && (
              <span className="option-icon correct-icon">✓</span>
            )}
            {showFeedbackStates && selectedOptions.includes(index) && !correctAnswerArr.includes(index) && (
              <span className="option-icon wrong-icon">✗</span>
            )}
          </button>
        ))}
      </div>

      {!showFeedbackStates && (
        <button
          className="submit-btn"
          onClick={handleLocalSubmit}
          disabled={selectedOptions.length === 0}
        >
          提交答案
        </button>
      )}

      {showFeedback && effectiveIsCorrect !== null && (
        <div
          className={`feedback ${effectiveIsCorrect ? 'feedback-correct' : 'feedback-wrong'}`}
        >
          <div className="feedback-result">
            {effectiveIsCorrect ? '🎉 回答正确！' : '❌ 回答错误'}
          </div>
          {effectiveExplanation && (
            <div className="feedback-explanation">
              <strong>解析：</strong>
              {effectiveExplanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuestionPanel;
