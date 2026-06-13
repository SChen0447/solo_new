import React, { useState } from 'react';
import { useAchievementStore, Platform } from '../store/achievementStore';

const platforms: Platform[] = ['Steam', 'Xbox', 'PlayStation', 'Nintendo'];
const platformEmoji: Record<Platform, string> = {
  Steam: '🎲',
  Xbox: '🟢',
  PlayStation: '🔵',
  Nintendo: '🔴',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#0f3460',
  border: '1px solid #1a3a6a',
  borderRadius: 8,
  color: '#e0e0e0',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#8899aa',
  marginBottom: 6,
};

export default function AddAchievement({ onBack }: { onBack: () => void }) {
  const addAchievement = useAchievementStore((s) => s.addAchievement);

  const [gameName, setGameName] = useState('');
  const [achievementName, setAchievementName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<Platform>('Steam');
  const [unlockDate, setUnlockDate] = useState(new Date().toISOString().slice(0, 10));
  const [difficulty, setDifficulty] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !achievementName.trim()) return;

    setSubmitting(true);
    try {
      await addAchievement({
        gameName: gameName.trim(),
        achievementName: achievementName.trim(),
        description: description.trim(),
        platform,
        unlockDate,
        difficulty,
        unlocked: true,
      });
      onBack();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            background: '#0f3460',
            border: 'none',
            color: '#e0e0e0',
            padding: '8px 14px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ← 返回
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e4a117', margin: 0 }}>
          添加新成就
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#16213e',
          borderRadius: 12,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div>
          <label style={labelStyle}>🎮 游戏名称 *</label>
          <input
            style={inputStyle}
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="例: Elden Ring"
            required
          />
        </div>

        <div>
          <label style={labelStyle}>🏆 成就名称 *</label>
          <input
            style={inputStyle}
            value={achievementName}
            onChange={(e) => setAchievementName(e.target.value)}
            placeholder="例: Elden Lord"
            required
          />
        </div>

        <div>
          <label style={labelStyle}>📝 描述</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述你如何解锁这个成就..."
          />
        </div>

        <div>
          <label style={labelStyle}>🕹️ 所属平台</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {platforms.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: platform === p ? '2px solid #e4a117' : '2px solid transparent',
                  background: '#0f3460',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                {platformEmoji[p]} {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>📅 解锁日期</label>
          <input
            type="date"
            style={inputStyle}
            value={unlockDate}
            onChange={(e) => setUnlockDate(e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>⭐ 难度评级: {difficulty}/5</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setDifficulty(star)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 28,
                  cursor: 'pointer',
                  color: star <= difficulty ? '#e4a117' : '#334455',
                  transition: 'color 0.15s ease',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !gameName.trim() || !achievementName.trim()}
          style={{
            padding: '12px 24px',
            background: submitting ? '#666' : '#e4a117',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: 8,
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: 15,
            fontWeight: 700,
            transition: 'background 0.2s ease',
            marginTop: 4,
          }}
        >
          {submitting ? '提交中...' : '✅ 提交成就'}
        </button>
      </form>
    </div>
  );
}
