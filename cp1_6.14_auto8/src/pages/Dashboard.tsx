import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { saveAs } from 'file-saver';
import { useAchievementStore, Platform, Achievement } from '../store/achievementStore';

const platformEmoji: Record<Platform, string> = {
  Steam: '🎲',
  Xbox: '🟢',
  PlayStation: '🔵',
  Nintendo: '🔴',
};

const platformColors: Record<Platform, string> = {
  Steam: '#1b2838',
  Xbox: '#107c10',
  PlayStation: '#003087',
  Nintendo: '#e60012',
};

function useCountAnimation(target: number, duration: number = 350) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (prevTarget.current !== target) {
      const start = prevTarget.current;
      const diff = target - start;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(start + diff * eased));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
      prevTarget.current = target;
    } else {
      setValue(target);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

function StatCard({ label, target, suffix }: { label: string; target: number; suffix?: string }) {
  const animatedValue = useCountAnimation(target);
  return (
    <div
      style={{
        background: '#16213e',
        borderRadius: 12,
        padding: '20px 24px',
        border: '1px solid #0f3460',
        flex: '1 1 0',
        minWidth: 140,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 700, color: '#e4a117' }}>
        {animatedValue}
        {suffix || ''}
      </div>
      <div style={{ fontSize: 13, color: '#8899aa', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function AchievementCard({
  achievement,
  expanded,
  onToggle,
  onDelete,
  animIndex,
}: {
  achievement: Achievement;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  animIndex: number;
}) {
  const [hovered, setHovered] = useState(false);

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const text = [
        `🎮 Game: ${achievement.gameName}`,
        `🏆 Achievement: ${achievement.achievementName}`,
        `🕹️ Platform: ${achievement.platform}`,
        `📅 Date: ${achievement.unlockDate}`,
        `⭐ Difficulty: ${'★'.repeat(achievement.difficulty)}${'☆'.repeat(5 - achievement.difficulty)}`,
      ].join('\n');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${achievement.achievementName}-share.txt`);
    },
    [achievement]
  );

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onToggle}
      style={{
        background: '#16213e',
        borderRadius: 12,
        padding: 20,
        border: hovered ? '2px solid #e4a117' : '2px solid transparent',
        boxShadow: hovered ? '0 0 12px #e4a117' : 'none',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
        animation: `slideUp 0.4s ease-out ${animIndex * 0.2}s both`,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 32 }}>{platformEmoji[achievement.platform]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#e0e0e0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {achievement.achievementName}
          </div>
          <div style={{ fontSize: 12, color: '#8899aa' }}>{achievement.gameName}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            padding: '2px 10px',
            borderRadius: 99,
            background: platformColors[achievement.platform],
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {achievement.platform}
        </span>
        <span style={{ fontSize: 13, color: '#e4a117' }}>
          {'★'.repeat(achievement.difficulty)}
          {'☆'.repeat(5 - achievement.difficulty)}
        </span>
      </div>

      {expanded && (
        <div
          style={{
            borderTop: '1px solid #0f3460',
            paddingTop: 12,
            marginTop: 8,
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <p style={{ fontSize: 13, color: '#b0b8c8', lineHeight: 1.6, marginBottom: 8 }}>
            {achievement.description}
          </p>
          <div style={{ fontSize: 12, color: '#667788', marginBottom: 12 }}>
            📅 解锁日期: {achievement.unlockDate}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleShare}
              style={{
                padding: '6px 16px',
                background: '#e4a117',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              📤 分享
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                padding: '6px 16px',
                background: '#c0392b',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              🗑️ 删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const platforms: (Platform | 'All')[] = ['All', 'Steam', 'Xbox', 'PlayStation', 'Nintendo'];
const difficulties: (number | 'All')[] = ['All', 1, 2, 3, 4, 5];

export default function Dashboard({ onNavigateAdd }: { onNavigateAdd: () => void }) {
  const {
    filterPlatform,
    filterDifficulty,
    expandedId,
    setFilterPlatform,
    setFilterDifficulty,
    setExpandedId,
    deleteAchievement,
    filteredAchievements,
    totalCount,
    platformCount,
    averageCompletion,
    achievements,
  } = useAchievementStore();

  const [animKey, setAnimKey] = useState(0);

  const filtered = useMemo(() => filteredAchievements(), [achievements, filterPlatform, filterDifficulty]);

  const total = totalCount();
  const platCount = platformCount();
  const avgPct = averageCompletion();

  const handlePlatformChange = useCallback(
    (p: Platform | 'All') => {
      setFilterPlatform(p);
      setAnimKey((k) => k + 1);
    },
    [setFilterPlatform]
  );

  const handleDifficultyChange = useCallback(
    (d: number | 'All') => {
      setFilterDifficulty(d);
      setAnimKey((k) => k + 1);
    },
    [setFilterDifficulty]
  );

  const filterBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
    alignItems: 'center',
  };

  const filterLabelStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#8899aa',
    fontWeight: 600,
    marginRight: 4,
    minWidth: 50,
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px',
    borderRadius: 99,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    background: active ? '#e4a117' : '#0f3460',
    color: active ? '#1a1a2e' : '#e0e0e0',
    transition: 'all 0.2s ease',
  });

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="总成就数" target={total} />
        <StatCard
          label={filterPlatform === 'All' ? '全平台成就' : `${filterPlatform} 成就`}
          target={platCount}
        />
        <StatCard label="平均完成度" target={avgPct} suffix="%" />
      </div>

      <div style={filterBarStyle}>
        <span style={filterLabelStyle}>平台:</span>
        {platforms.map((p) => (
          <button key={p} style={chipStyle(filterPlatform === p)} onClick={() => handlePlatformChange(p)}>
            {p === 'All' ? '全部' : p}
          </button>
        ))}
      </div>
      <div style={{ ...filterBarStyle, marginBottom: 24 }}>
        <span style={filterLabelStyle}>难度:</span>
        {difficulties.map((d) => (
          <button
            key={d}
            style={chipStyle(filterDifficulty === d)}
            onClick={() => handleDifficultyChange(d)}
          >
            {d === 'All' ? '全部' : '★'.repeat(d as number)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#667788' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎮</div>
          <div style={{ fontSize: 16, marginBottom: 16 }}>还没有成就记录</div>
          <button
            onClick={onNavigateAdd}
            style={{
              padding: '10px 24px',
              background: '#e4a117',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            添加第一个成就
          </button>
        </div>
      ) : (
        <div
          key={animKey}
          className="achievement-grid"
        >
          {filtered.map((a, i) => (
            <AchievementCard
              key={a.id}
              achievement={a}
              expanded={expandedId === a.id}
              onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
              onDelete={() => deleteAchievement(a.id)}
              animIndex={i}
            />
          ))}
        </div>
      )}
    </>
  );
}
