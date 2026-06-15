import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, Comment } from '../store/useStore';

const pageStyle: React.CSSProperties = {
  maxWidth: '680px',
  margin: '0 auto',
  padding: '32px 24px',
};

const backStyle: React.CSSProperties = {
  color: '#8b5e3c',
  textDecoration: 'none',
  fontSize: '14px',
  cursor: 'pointer',
  marginBottom: '16px',
  display: 'inline-block',
  transition: 'color 0.2s',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#4a3f35',
  marginBottom: '8px',
};

const descStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#8b5e3c',
  lineHeight: 1.6,
  marginBottom: '20px',
};

const progressSection: React.CSSProperties = {
  marginBottom: '24px',
};

const progressLabel: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '14px',
  color: '#4a3f35',
  marginBottom: '8px',
  fontWeight: 600,
};

const progressTrack: React.CSSProperties = {
  width: '100%',
  height: '8px',
  borderRadius: '4px',
  background: '#e0d5c7',
  overflow: 'hidden',
};

function VoteProgressBar({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min((current / goal) * 100, 100);
  const reached = current >= goal;
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fillRef.current) {
      const prev = fillRef.current.style.width;
      if (prev === '0%' || !prev) {
        fillRef.current.style.width = '0%';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (fillRef.current) fillRef.current.style.width = pct + '%';
          });
        });
      } else {
        fillRef.current.style.width = pct + '%';
      }
    }
  }, [pct]);

  return (
    <div style={progressTrack}>
      <div
        ref={fillRef}
        style={{
          height: '100%',
          borderRadius: '4px',
          background: reached ? '#7cb342' : '#d4a574',
          transition: 'width 0.6s ease-out, background 0.3s',
          width: '0%',
          animation: reached ? 'bounceFill 0.5s ease' : 'none',
        }}
      />
    </div>
  );
}

const voteBtnBase: React.CSSProperties = {
  width: '160px',
  height: '44px',
  background: '#8b5e3c',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s, transform 0.15s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
};

const crowdfundBtnStyle: React.CSSProperties = {
  ...voteBtnBase,
  background: '#ff9800',
  width: 'auto',
  padding: '0 24px',
  marginLeft: '12px',
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '32px',
  flexWrap: 'wrap',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#4a3f35',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const commentItemStyle = (isNew: boolean): React.CSSProperties => ({
  display: 'flex',
  gap: '12px',
  padding: '14px 0',
  borderBottom: '1px solid #e8d5c0',
  opacity: isNew ? 1 : 1,
  animation: isNew ? 'fadeIn 0.3s ease' : 'none',
});

const avatarStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  background: '#d4a574',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: '18px',
  fontWeight: 700,
  flexShrink: 0,
};

const commentTextStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const usernameStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#4a3f35',
  marginBottom: '4px',
};

const commentBodyStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b5e52',
  lineHeight: 1.5,
};

const timeStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#b0a090',
  marginTop: '4px',
};

const commentFormStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  marginBottom: '24px',
};

const commentInputStyle: React.CSSProperties = {
  width: '100%',
  height: '80px',
  borderRadius: '8px',
  border: '1px solid #d4a574',
  padding: '12px',
  fontSize: '14px',
  color: '#4a3f35',
  background: '#fff8f0',
  resize: 'none',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
};

const commentRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
};

const nameInputStyle: React.CSSProperties = {
  flex: 1,
  height: '36px',
  borderRadius: '6px',
  border: '1px solid #d4a574',
  padding: '0 10px',
  fontSize: '14px',
  color: '#4a3f35',
  background: '#fff8f0',
  outline: 'none',
  fontFamily: 'inherit',
};

const submitBtnStyle: React.CSSProperties = {
  height: '36px',
  padding: '0 20px',
  background: '#8b5e3c',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s',
};

export default function SurveyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const surveys = useStore((s) => s.surveys);
  const vote = useStore((s) => s.vote);
  const addComment = useStore((s) => s.addComment);
  const [commentText, setCommentText] = useState('');
  const [username, setUsername] = useState('');
  const [newCommentId, setNewCommentId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [btnScale, setBtnScale] = useState(1);

  const survey = surveys.find((s) => s.id === id);
  if (!survey) {
    return (
      <div style={{ ...pageStyle, textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ color: '#8b5e3c' }}>加载中...</div>
      </div>
    );
  }

  const reached = survey.current_votes >= survey.vote_goal;
  const deadlineDate = new Date(survey.deadline);
  const deadlineStr = `${deadlineDate.getFullYear()}-${String(deadlineDate.getMonth() + 1).padStart(2, '0')}-${String(deadlineDate.getDate()).padStart(2, '0')}`;

  const handleVote = async () => {
    if (voting) return;
    setVoting(true);
    setBtnScale(0.92);
    setTimeout(() => setBtnScale(1), 150);
    await vote(survey.id);
    setVoting(false);
  };

  const handleComment = async () => {
    if (!commentText.trim() || !username.trim()) return;
    const c = await addComment(survey.id, username.trim(), commentText.trim());
    if (c) {
      setNewCommentId(c.id);
      setCommentText('');
      setTimeout(() => setNewCommentId(null), 600);
    }
  };

  return (
    <>
      <style>{`
        @keyframes bounceFill {
          0% { transform: scaleX(1); }
          30% { transform: scaleX(1.05); }
          60% { transform: scaleX(0.98); }
          100% { transform: scaleX(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .comment-item { flex-direction: column; align-items: flex-start; }
          .comment-item .avatar-circle { margin-bottom: 4px; }
        }
      `}</style>
      <div style={pageStyle}>
        <div style={backStyle} onClick={() => navigate('/')}>← 返回列表</div>
        <div style={titleStyle}>{survey.title}</div>
        <div style={descStyle}>{survey.description}</div>

        <div style={progressSection}>
          <div style={progressLabel}>
            <span>当前票数：{survey.current_votes} / {survey.vote_goal}</span>
            <span>截止日期：{deadlineStr}</span>
          </div>
          <VoteProgressBar current={survey.current_votes} goal={survey.vote_goal} />
          {reached && (
            <div style={{ fontSize: '14px', color: '#7cb342', fontWeight: 600, marginTop: '8px' }}>
              🎉 投票目标已达成，众筹已开启！
            </div>
          )}
        </div>

        <div style={btnRowStyle}>
          <button
            style={{ ...voteBtnBase, transform: `scale(${btnScale})` }}
            onClick={handleVote}
            onMouseDown={() => setBtnScale(0.92)}
            onMouseUp={() => setBtnScale(1)}
            onMouseLeave={() => setBtnScale(1)}
          >
            👍 投票支持
          </button>
          {reached && (
            <button style={crowdfundBtnStyle} onClick={() => navigate(`/crowdfund/${survey.id}`)}>
              💰 支持众筹
            </button>
          )}
        </div>

        <div style={sectionTitle}>💬 评论区 ({survey.comments.length})</div>
        <div style={commentFormStyle}>
          <div style={commentRowStyle}>
            <input
              style={nameInputStyle}
              placeholder="你的昵称"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button style={submitBtnStyle} onClick={handleComment}>发表评论</button>
          </div>
          <textarea
            style={commentInputStyle}
            placeholder="分享你对这款口味的期待..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
        </div>

        <div>
          {survey.comments.map((c: Comment) => (
            <div key={c.id} style={commentItemStyle(c.id === newCommentId)} className="comment-item">
              <div style={avatarStyle} className="avatar-circle">
                {c.username.charAt(0)}
              </div>
              <div style={commentTextStyle}>
                <div style={usernameStyle}>{c.username}</div>
                <div style={commentBodyStyle}>{c.text}</div>
                <div style={timeStyle}>{new Date(c.created_at).toLocaleString('zh-CN')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
