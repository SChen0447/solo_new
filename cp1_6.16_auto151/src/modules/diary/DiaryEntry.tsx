import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { EmotionType, StrategyType, DiaryEntry as DiaryEntryType } from '../../types';
import { EMOTIONS, EMOTION_TYPES, STRATEGIES, MAX_EVENT_LENGTH } from '../../constants';
import { saveDiary } from '../../utils/storage';

interface DiaryEntryProps {
  onSave: () => void;
}

const DiaryEntry: React.FC<DiaryEntryProps> = ({ onSave }) => {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [event, setEvent] = useState('');
  const [strategy, setStrategy] = useState<StrategyType>(null);
  const [showToast, setShowToast] = useState(false);

  const handleEmotionSelect = (emotion: EmotionType) => {
    setSelectedEmotion(emotion);
  };

  const handleEventChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_EVENT_LENGTH) {
      setEvent(value);
    }
  };

  const handleStrategyChange = (value: StrategyType) => {
    setStrategy(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmotion || !event.trim()) return;

    const entry: DiaryEntryType = {
      id: uuidv4(),
      date: new Date().toISOString(),
      emotion: selectedEmotion,
      intensity: EMOTIONS[selectedEmotion].intensity,
      event: event.trim(),
      strategy,
    };

    saveDiary(entry);
    setSelectedEmotion(null);
    setEvent('');
    setStrategy(null);
    setShowToast(true);
    onSave();

    setTimeout(() => setShowToast(false), 2000);
  };

  const isFormValid = selectedEmotion !== null && event.trim().length > 0;
  const today = format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN });

  return (
    <div className="card">
      <h2 className="section-title">记录今天的心情 · {today}</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">你现在的心情是？</label>
          <div className="emotion-grid">
            {EMOTION_TYPES.map((emotionType) => {
              const emotion = EMOTIONS[emotionType];
              const isSelected = selectedEmotion === emotionType;
              return (
                <div
                  key={emotionType}
                  className={`emotion-card ${isSelected ? 'selected' : ''}`}
                  style={{
                    backgroundColor: isSelected ? emotion.color : '#FAFAFA',
                    color: isSelected ? '#FFFFFF' : '#212121',
                  }}
                  onClick={() => handleEmotionSelect(emotionType)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEmotionSelect(emotionType);
                    }
                  }}
                >
                  <div className="emoji">{emotion.emoji}</div>
                  <div className="emotion-name">{emotion.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">发生了什么事？</label>
          <textarea
            className="textarea"
            value={event}
            onChange={handleEventChange}
            placeholder="请描述触发你这种情绪的事件..."
          />
          <div className="char-count">
            {event.length} / {MAX_EVENT_LENGTH}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">你是如何应对的？（可选）</label>
          <div className="strategy-group">
            {STRATEGIES.map(({ value, label }) => (
              <label
                key={value}
                className={`strategy-option ${strategy === value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="strategy"
                  value={value || ''}
                  checked={strategy === value}
                  onChange={() => handleStrategyChange(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={!isFormValid}
        >
          保存日记
        </button>
      </form>

      {showToast && (
        <div className="success-toast">日记保存成功！</div>
      )}
    </div>
  );
};

export default DiaryEntry;
