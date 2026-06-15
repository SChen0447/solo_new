import { useEffect } from 'react';
import { useChallengeStore } from '../store/challengeStore';
import './Leaderboard.css';

export default function Leaderboard() {
  const { leaderboard, fetchLeaderboard } = useChallengeStore();

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const getBorderColor = (index: number) => {
    if (index === 0) return '#ffd700';
    if (index === 1) return '#c0c0c0';
    if (index === 2) return '#cd7f32';
    return 'transparent';
  };

  const getRankBg = (index: number) => {
    if (index === 0) return '#fff8dc';
    if (index === 1) return '#f5f5f5';
    if (index === 2) return '#fdf5e6';
    return 'transparent';
  };

  return (
    <div className="leaderboard">
      <h3 className="leaderboard-title">🏆 积分排行榜</h3>
      {leaderboard.length === 0 ? (
        <div className="leaderboard-empty">暂无数据</div>
      ) : (
        <ul className="leaderboard-list">
          {leaderboard.map((user, index) => (
            <li
              key={user.id}
              className="leaderboard-item"
              style={{
                borderLeft: `3px solid ${getBorderColor(index)}`,
                backgroundColor: getRankBg(index),
              }}
            >
              <span className={`rank rank-${index + 1}`}>
                {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
              </span>
              <span
                className="user-avatar"
                style={{
                  border: index < 3 ? `2px solid ${getBorderColor(index)}` : 'none',
                }}
              >
                {user.avatar}
              </span>
              <span className="user-name">{user.username}</span>
              <span className="user-points">{user.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
