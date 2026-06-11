import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Heart, CheckCircle2, Send, GraduationCap, MessageSquare } from 'lucide-react';
import type { Question } from './App';

interface QuestionWallProps {
  questions: Question[];
  onSubmit: (content: string) => void;
  onAnswer: (questionId: string) => void;
  onLike: (questionId: string) => void;
  isTeacher: boolean;
  onToggleTeacher: () => void;
  studentId: string;
}

function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

function getAvatarLetter(seed: string): string {
  const code = seed.charCodeAt(0) || 65;
  return String.fromCharCode(65 + (code % 26));
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function QuestionCard({
  question,
  index,
  isTeacher,
  studentId,
  onAnswer,
  onLike,
  isNew,
}: {
  question: Question;
  index: number;
  isTeacher: boolean;
  studentId: string;
  onAnswer: (id: string) => void;
  onLike: (id: string) => void;
  isNew: boolean;
}) {
  const [likeAnim, setLikeAnim] = useState(false);
  const hasLiked = question.likedBy.includes(studentId);

  const handleLike = () => {
    if (hasLiked) return;
    setLikeAnim(true);
    onLike(question.id);
    setTimeout(() => setLikeAnim(false), 300);
  };

  const bgColor = getAvatarColor(question.avatarSeed);
  const letter = getAvatarLetter(question.avatarSeed);

  return (
    <div
      className={`question-card ${isNew ? 'question-card-enter' : ''}`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="card-header">
        <div className="avatar" style={{ backgroundColor: bgColor }}>
          {letter}
        </div>
        <div className="card-meta">
          <span className="card-time">{formatTime(question.timestamp)}</span>
          {question.answered ? (
            <span className="status-tag answered-tag">
              <span className="pulse-dot" />
              已回答
            </span>
          ) : (
            <span className="status-tag unanswered-tag">待回答</span>
          )}
        </div>
      </div>

      <p className="card-content">{question.content}</p>

      <div className="card-footer">
        <button
          className={`like-btn ${hasLiked ? 'liked' : ''} ${likeAnim ? 'like-anim' : ''}`}
          onClick={handleLike}
          disabled={hasLiked}
        >
          <Heart
            size={16}
            fill={hasLiked ? '#ef4444' : 'none'}
            stroke={hasLiked ? '#ef4444' : '#94a3b8'}
          />
          <span className="like-count">{question.likes}</span>
        </button>

        {isTeacher && !question.answered && (
          <button className="answer-btn" onClick={() => onAnswer(question.id)}>
            <CheckCircle2 size={14} />
            已回答
          </button>
        )}
      </div>
    </div>
  );
}

export default function QuestionWall({
  questions,
  onSubmit,
  onAnswer,
  onLike,
  isTeacher,
  onToggleTeacher,
  studentId,
}: QuestionWallProps) {
  const [searchText, setSearchText] = useState('');
  const [inputText, setInputText] = useState('');
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const [newQuestionIds, setNewQuestionIds] = useState<Set<string>>(new Set());
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const prevQuestionIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(questions.map((q) => q.id));
    const added = new Set<string>();
    for (const id of currentIds) {
      if (!prevQuestionIds.current.has(id)) {
        added.add(id);
      }
    }
    if (added.size > 0) {
      setNewQuestionIds(added);
      const timer = setTimeout(() => setNewQuestionIds(new Set()), 600);
      return () => clearTimeout(timer);
    }
    prevQuestionIds.current = currentIds;
  }, [questions]);

  const sortedAndFiltered = useMemo(() => {
    let filtered = questions;
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      filtered = questions.filter((q) =>
        q.content.toLowerCase().includes(lower)
      );
    }
    const unanswered = filtered
      .filter((q) => !q.answered)
      .sort((a, b) => b.timestamp - a.timestamp);
    const answered = filtered
      .filter((q) => q.answered)
      .sort((a, b) => b.timestamp - a.timestamp);
    return [...unanswered, ...answered];
  }, [questions, searchText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setInputText('');
  };

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = submitBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setRipple(null), 600);
  };

  const charCount = inputText.length;

  return (
    <div className="qwall-container">
      <header className="qwall-header">
        <div className="header-left">
          <MessageSquare size={24} className="header-icon" />
          <h1 className="header-title">LiveQ&A</h1>
          <span className="header-subtitle">直播课堂问答墙</span>
        </div>
        <button
          className={`teacher-toggle ${isTeacher ? 'teacher-active' : ''}`}
          onClick={onToggleTeacher}
        >
          <GraduationCap size={16} />
          {isTeacher ? '教师模式' : '学生模式'}
        </button>
      </header>

      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="搜索问题..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="questions-list">
        {sortedAndFiltered.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={48} strokeWidth={1} />
            <p>暂无问题，快来提问吧！</p>
          </div>
        ) : (
          sortedAndFiltered.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              isTeacher={isTeacher}
              studentId={studentId}
              onAnswer={onAnswer}
              onLike={onLike}
              isNew={newQuestionIds.has(q.id)}
            />
          ))
        )}
      </div>

      <form className="submit-bar" onSubmit={handleSubmit}>
        <div className="submit-input-wrap">
          <input
            type="text"
            placeholder="输入你的问题..."
            value={inputText}
            onChange={(e) => {
              if (e.target.value.length <= 100) {
                setInputText(e.target.value);
              }
            }}
            className="submit-input"
            maxLength={100}
          />
          <span className={`char-counter ${charCount >= 90 ? 'char-warn' : ''}`}>
            {charCount}/100
          </span>
        </div>
        <button
          ref={submitBtnRef}
          type="submit"
          className="submit-btn"
          disabled={!inputText.trim()}
          onClick={handleRipple}
        >
          {ripple && (
            <span
              className="ripple-effect"
              style={{ left: ripple.x, top: ripple.y }}
            />
          )}
          <Send size={16} />
          提交
        </button>
      </form>
    </div>
  );
}
