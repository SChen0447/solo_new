import { useState } from 'react';
import { useChallengeStore, Challenge } from '../store/challengeStore';
import './ChallengeCard.css';

interface ChallengeCardProps {
  challenge: Challenge;
}

export default function ChallengeCard({ challenge }: ChallengeCardProps) {
  const { joinChallenge, joinedChallenges, likeChallenge, currentUser } = useChallengeStore();
  const [liked, setLiked] = useState(false);
  const [animating, setAnimating] = useState(false);

  const isJoined = joinedChallenges[challenge.id];
  const daysLeft = Math.max(0, Math.ceil((challenge.deadline - Date.now()) / (1000 * 60 * 60 * 24)));
  const isUrgent = daysLeft <= 1;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked) return;
    setLiked(true);
    setAnimating(true);
    likeChallenge(challenge.id);
    setTimeout(() => setAnimating(false), 200);
  };

  const handleJoin = () => {
    if (isJoined) return;
    joinChallenge(challenge.id, currentUser.id);
  };

  return (
    <div className="challenge-card">
      <div className="card-thumbnail">
        <span className="thumbnail-emoji">{challenge.thumbnail}</span>
      </div>
      <div className="card-content">
        <h3 className="card-title">{challenge.title}</h3>
        <p className="card-desc">{challenge.description}</p>
        <div className={`card-deadline ${isUrgent ? 'urgent' : ''}`}>
          剩余 {daysLeft} 天
        </div>
        <div className="card-footer">
          <button
            className={`like-btn ${liked ? 'liked' : ''} ${animating ? 'bounce' : ''}`}
            onClick={handleLike}
          >
            <span className="heart">❤</span>
            <span className="like-count">{challenge.likes + (liked ? 1 : 0)}</span>
          </button>
          <span className="participants">👥 {challenge.participants + (isJoined ? 1 : 0)} 人参与</span>
        </div>
        <button
          className={`join-btn ${isJoined ? 'joined' : ''}`}
          onClick={handleJoin}
          disabled={isJoined}
        >
          {isJoined ? '✓ 已参与' : '参与挑战'}
        </button>
      </div>
    </div>
  );
}
