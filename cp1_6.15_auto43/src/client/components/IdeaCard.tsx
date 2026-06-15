import { useState, useRef, useEffect } from 'react';
import type { Idea, Comment } from '../types';
import { useStore } from '../store';
import VoteBar from './VoteBar';

const ANIMAL_COLORS: Record<string, string> = {
  '猫头鹰': '#667eea', '狮子': '#f56565', '狐狸': '#ed8936', '海豚': '#38b2ac',
  '雄鹰': '#48bb78', '松鼠': '#d69e2e', '大象': '#805ad5', '猎豹': '#e53e3e',
  '兔子': '#fc8181', '老虎': '#f6ad55', '海豹': '#4fd1c5', '乌龟': '#68d391',
  '猴子': '#fbd38d', '熊猫': '#b794f4', '火烈鸟': '#f687b3', '蜻蜓': '#76e4f7',
  '鸽子': '#cbd5e0', '天鹅': '#feb2b2', '牧羊犬': '#9f7aea',
};

function getAnimalColor(name: string): string {
  for (const [key, color] of Object.entries(ANIMAL_COLORS)) {
    if (name.includes(key)) return color;
  }
  return '#667eea';
}

interface IdeaCardProps {
  idea: Idea;
  index: number;
}

export default function IdeaCard({ idea, index }: IdeaCardProps) {
  const { vote, addComment, voterId } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [voting, setVoting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const userVote = useStore((s) => {
    return null;
  });

  useEffect(() => {
    if (expanded && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [expanded, idea.comments.length]);

  const handleVote = async (type: 'for' | 'against') => {
    setVoting(true);
    try {
      await vote(idea.id, type);
    } finally {
      setVoting(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await addComment(idea.id, commentText);
    setCommentText('');
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  return (
    <div
      ref={cardRef}
      className="glass-card stagger-item"
      style={{
        padding: 20,
        animationDelay: `${index * 0.06}s`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#e2e8f0', marginBottom: 8 }}>
            {idea.content}
          </p>
          {idea.imageUrl && (
            <div style={{ marginBottom: 8 }}>
              <img
                src={idea.imageUrl}
                alt="attachment"
                style={{
                  maxWidth: '100%',
                  maxHeight: 200,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <span style={{ fontSize: 12, color: '#718096' }}>
            {timeAgo(idea.createdAt)}
          </span>
        </div>
      </div>

      <VoteBar votesFor={idea.votesFor} votesAgainst={idea.votesAgainst} />

      <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
        <button
          onClick={() => handleVote('for')}
          className={idea.votesFor > 0 ? '' : 'vote-pulse'}
          style={{
            padding: '7px 16px',
            borderRadius: 8,
            border: '1px solid rgba(72,187,120,0.3)',
            background: 'rgba(72,187,120,0.1)',
            color: '#48bb78',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s',
          }}
        >
          👍 赞成
        </button>
        <button
          onClick={() => handleVote('against')}
          className={idea.votesAgainst > 0 ? '' : 'vote-pulse'}
          style={{
            padding: '7px 16px',
            borderRadius: 8,
            border: '1px solid rgba(245,101,101,0.3)',
            background: 'rgba(245,101,101,0.1)',
            color: '#f56565',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s',
          }}
        >
          👎 反对
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: '#a0aec0',
            cursor: 'pointer',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s',
          }}
        >
          💬 {idea.comments.length}
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.3s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▼
          </span>
        </button>
      </div>

      {expanded && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {idea.comments.length === 0 ? (
            <p style={{ fontSize: 13, color: '#718096', textAlign: 'center', padding: '12px 0' }}>
              暂无评论，来说点什么吧
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {idea.comments.map((comment: Comment, ci: number) => {
                const barColor = getAnimalColor(comment.anonymousName);
                return (
                  <div
                    key={comment.id}
                    style={{
                      display: 'flex',
                      gap: 10,
                      animation: 'commentFadeIn 0.3s ease-out',
                      animationDelay: `${ci * 0.05}s`,
                      animationFillMode: 'both',
                    }}
                  >
                    <div
                      style={{
                        width: 3,
                        borderRadius: 2,
                        background: barColor,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: barColor }}>
                          {comment.anonymousName}
                        </span>
                        <span style={{ fontSize: 11, color: '#718096' }}>
                          {timeAgo(comment.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: '#cbd5e0', lineHeight: 1.5 }}>
                        {comment.content}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              placeholder="输入评论内容..."
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: '#e2e8f0',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#667eea')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim()}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: commentText.trim() ? '#667eea' : 'rgba(255,255,255,0.05)',
                color: commentText.trim() ? '#fff' : '#718096',
                cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
