import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Room, Side, Speech } from '../types';

interface VotePanelProps {
  room?: Room;
  memberId?: string;
  nickname?: string;
}

const VotePanel = ({ room: propRoom, memberId: propMemberId, nickname: propNickname }: VotePanelProps) => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(propRoom || null);
  const [memberId, setMemberId] = useState(propMemberId || '');
  const [, setNickname] = useState(propNickname || '');
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentReplayIndex, setCurrentReplayIndex] = useState(0);
  const [showReplay, setShowReplay] = useState(false);

  useEffect(() => {
    if (propRoom && propMemberId) {
      setRoom(propRoom);
      setMemberId(propMemberId);
      setNickname(propNickname || '');
      return;
    }

    if (!roomCode) return;

    const storedMemberId = localStorage.getItem(`member_${roomCode}`);
    const storedNickname = localStorage.getItem(`nickname_${roomCode}`);
    if (storedMemberId) {
      setMemberId(storedMemberId);
    }
    if (storedNickname) {
      setNickname(storedNickname);
    }

    fetchRoom();
    const interval = setInterval(fetchRoom, 1000);
    return () => clearInterval(interval);
  }, [roomCode, propRoom, propMemberId, propNickname]);

  const fetchRoom = async () => {
    if (!roomCode) return;
    try {
      const response = await axios.get(`/api/rooms/${roomCode}`);
      setRoom(response.data);
    } catch (err) {
      console.error('Failed to fetch room:', err);
    }
  };

  const handleSubmitVote = async () => {
    if (!room || !roomCode || !memberId || !selectedSide || !selectedSpeaker || submitting || hasVoted) return;

    setSubmitting(true);
    setError('');

    try {
      await axios.post(`/api/rooms/${roomCode}/vote`, {
        voterId: memberId,
        sideVote: selectedSide,
        bestSpeakerId: selectedSpeaker,
      });
      setHasVoted(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || '投票失败');
      } else {
        setError('投票失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!room) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ color: '#999', fontSize: '16px' }}>加载中...</div>
      </div>
    );
  }

  const isVoting = room.status === 'voting';
  const isFinished = room.status === 'finished';

  const proVotes = room.votes.filter((v) => v.sideVote === 'pro').length;
  const conVotes = room.votes.filter((v) => v.sideVote === 'con').length;
  const totalVotes = room.votes.length || 1;
  const proPercentage = Math.round((proVotes / totalVotes) * 100);
  const conPercentage = Math.round((conVotes / totalVotes) * 100);
  const winner: Side | null = proVotes > conVotes ? 'pro' : conVotes > proVotes ? 'con' : null;

  const speakerVotes: Record<string, number> = {};
  room.votes.forEach((v) => {
    speakerVotes[v.bestSpeakerId] = (speakerVotes[v.bestSpeakerId] || 0) + 1;
  });

  let bestSpeakerId: string | null = null;
  let maxVotes = 0;
  Object.entries(speakerVotes).forEach(([id, votes]) => {
    if (votes > maxVotes) {
      maxVotes = votes;
      bestSpeakerId = id;
    }
  });

  const bestSpeaker = bestSpeakerId ? room.members.find((m) => m.id === bestSpeakerId) : null;

  const voted = room.votes.some((v) => v.voterId === memberId);

  const CircularProgress = ({ percentage, color, label }: { percentage: number; color: string; label: string }) => {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', width: '200px', height: '200px' }}>
          <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#E0E0E0"
              strokeWidth="12"
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color }}>{percentage}%</div>
          </div>
        </div>
        <div style={{ fontSize: '16px', fontWeight: 500, color }}>{label}</div>
      </div>
    );
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#1E88E5', fontSize: '28px', marginBottom: '8px' }}>
          {isVoting ? '投票阶段' : '辩论结果'}
        </h1>
        <p style={{ color: '#666' }}>{room.topic}</p>
      </div>

      {isVoting && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          {voted || hasVoted ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <div style={{ fontSize: '18px', color: '#4CAF50', fontWeight: 500 }}>
                您已完成投票，等待其他辩手投票...
              </div>
              <div style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
                已投票: {room.votes.length} / {room.members.length}
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#333', fontSize: '18px', marginBottom: '16px' }}>1. 您认为哪一方的辩论表现更好？</h3>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    onClick={() => setSelectedSide('pro')}
                    style={{
                      flex: 1,
                      padding: '20px',
                      backgroundColor: selectedSide === 'pro' ? '#E3F2FD' : '#F5F5F5',
                      border: `2px solid ${selectedSide === 'pro' ? '#1976D2' : '#E0E0E0'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#1976D2', borderRadius: '50%' }}></span>
                      <span style={{ fontSize: '16px', fontWeight: 500, color: '#1976D2' }}>正方</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{room.sides.pro}</div>
                  </button>
                  <button
                    onClick={() => setSelectedSide('con')}
                    style={{
                      flex: 1,
                      padding: '20px',
                      backgroundColor: selectedSide === 'con' ? '#FFEBEE' : '#F5F5F5',
                      border: `2px solid ${selectedSide === 'con' ? '#D32F2F' : '#E0E0E0'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#D32F2F', borderRadius: '50%' }}></span>
                      <span style={{ fontSize: '16px', fontWeight: 500, color: '#D32F2F' }}>反方</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{room.sides.con}</div>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#333', fontSize: '18px', marginBottom: '16px' }}>2. 您认为哪位辩手表现最佳？（不可投给自己）</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {room.members
                    .filter((m) => m.id !== memberId)
                    .map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedSpeaker(member.id)}
                        style={{
                          padding: '16px',
                          backgroundColor: selectedSpeaker === member.id
                            ? (member.side === 'pro' ? '#E3F2FD' : '#FFEBEE')
                            : '#F5F5F5',
                          border: `2px solid ${selectedSpeaker === member.id
                            ? (member.side === 'pro' ? '#1976D2' : '#D32F2F')
                            : '#E0E0E0'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: member.side === 'pro' ? '#1976D2' : '#D32F2F',
                            borderRadius: '50%',
                          }}></span>
                          <span style={{ fontWeight: 500 }}>{member.nickname}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {member.side === 'pro' ? room.sides.pro : room.sides.con}
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {error && (
                <div style={{ color: '#D32F2F', fontSize: '14px', padding: '10px', backgroundColor: '#FFEBEE', borderRadius: '8px', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmitVote}
                disabled={!selectedSide || !selectedSpeaker || submitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: selectedSide && selectedSpeaker ? '#1E88E5' : '#BDBDBD',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: selectedSide && selectedSpeaker ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s',
                }}
              >
                {submitting ? '提交中...' : '提交投票'}
              </button>
            </>
          )}
        </div>
      )}

      {isFinished && (
        <>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '40px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
            <h2 style={{ textAlign: 'center', color: '#333', fontSize: '24px', marginBottom: '30px' }}>投票结果</h2>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', marginBottom: '40px', flexWrap: 'wrap' }}>
              <CircularProgress percentage={proPercentage} color="#1976D2" label={room.sides.pro} />
              <CircularProgress percentage={conPercentage} color="#D32F2F" label={room.sides.con} />
            </div>

            {winner && (
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ fontSize: '18px', color: '#333', marginBottom: '8px' }}>
                  获胜方
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 32px',
                  backgroundColor: winner === 'pro' ? '#E3F2FD' : '#FFEBEE',
                  borderRadius: '12px',
                  border: `2px solid ${winner === 'pro' ? '#1976D2' : '#D32F2F'}`,
                }}>
                  <span style={{ fontSize: '32px' }}>🏆</span>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: winner === 'pro' ? '#1976D2' : '#D32F2F',
                  }}>
                    {winner === 'pro' ? '正方' : '反方'} {room.sides[winner]}
                  </span>
                  <span style={{ fontSize: '32px' }}>🏆</span>
                </div>
              </div>
            )}

            {!winner && (
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '16px 32px',
                  backgroundColor: '#FFF3E0',
                  borderRadius: '12px',
                  border: '2px solid #FF9800',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#E65100',
                }}>
                  🤝 平局！
                </div>
              </div>
            )}

            {bestSpeaker && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', color: '#333', marginBottom: '12px' }}>
                  最佳辩手
                </div>
                <div style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '24px 48px',
                  backgroundColor: '#FFFDE7',
                  borderRadius: '12px',
                  border: '2px solid #FFD700',
                }}>
                  <div style={{ fontSize: '40px' }}>
                    <span style={{ color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>👑</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      backgroundColor: bestSpeaker.side === 'pro' ? '#1976D2' : '#D32F2F',
                      borderRadius: '50%',
                    }}></span>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: '#333' }}>
                      {bestSpeaker.nickname}
                    </span>
                    <span style={{ color: '#FFD700', fontSize: '20px' }}>👑</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#999' }}>
                    {bestSpeaker.side === 'pro' ? room.sides.pro : room.sides.con} · {maxVotes}票
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#333', fontSize: '20px' }}>辩论记录回放</h3>
              <button
                onClick={() => setShowReplay(!showReplay)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: showReplay ? '#E0E0E0' : '#1E88E5',
                  color: showReplay ? '#333' : '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {showReplay ? '收起' : '逐条查看'}
              </button>
            </div>

            {showReplay && room.speeches.length > 0 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
                  <button
                    onClick={() => setCurrentReplayIndex(Math.max(0, currentReplayIndex - 1))}
                    disabled={currentReplayIndex === 0}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: currentReplayIndex === 0 ? '#E0E0E0' : '#1E88E5',
                      color: currentReplayIndex === 0 ? '#999' : '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: currentReplayIndex === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← 上一条
                  </button>
                  <span style={{ alignSelf: 'center', color: '#666', fontSize: '14px' }}>
                    第 {currentReplayIndex + 1} / {room.speeches.length} 条
                  </span>
                  <button
                    onClick={() => setCurrentReplayIndex(Math.min(room.speeches.length - 1, currentReplayIndex + 1))}
                    disabled={currentReplayIndex === room.speeches.length - 1}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: currentReplayIndex === room.speeches.length - 1 ? '#E0E0E0' : '#1E88E5',
                      color: currentReplayIndex === room.speeches.length - 1 ? '#999' : '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: currentReplayIndex === room.speeches.length - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    下一条 →
                  </button>
                </div>
                {(() => {
                  const speech = room.speeches[currentReplayIndex];
                  return (
                    <div
                      style={{
                        width: '90%',
                        margin: '0 auto',
                        padding: '24px',
                        backgroundColor: speech.side === 'pro' ? '#E3F2FD' : '#FFEBEE',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${speech.side === 'pro' ? '#1976D2' : '#D32F2F'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              backgroundColor: speech.side === 'pro' ? '#1976D2' : '#D32F2F',
                              borderRadius: '50%',
                            }}
                          ></span>
                          <span style={{ fontWeight: 700, fontSize: '16px' }}>
                            {speech.nickname}
                          </span>
                          <span style={{ fontSize: '14px', color: '#666' }}>
                            {speech.side === 'pro' ? room.sides.pro : room.sides.con}
                          </span>
                        </div>
                        <span style={{ fontSize: '13px', color: '#999' }}>
                          {formatTime(speech.timestamp)}
                        </span>
                      </div>
                      <div style={{ fontSize: '18px', lineHeight: 1.8, color: '#333' }}>
                        {speech.content}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {room.speeches.map((speech: Speech, index: number) => (
                  <div key={speech.id}>
                    <div
                      style={{
                        width: '90%',
                        margin: '0 auto 12px',
                        padding: '16px',
                        backgroundColor: speech.side === 'pro' ? '#E3F2FD' : '#FFEBEE',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${speech.side === 'pro' ? '#1976D2' : '#D32F2F'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: speech.side === 'pro' ? '#1976D2' : '#D32F2F',
                              borderRadius: '50%',
                            }}
                          ></span>
                          <span style={{ fontWeight: 700, fontSize: '14px' }}>
                            {speech.nickname}
                          </span>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {speech.side === 'pro' ? room.sides.pro : room.sides.con}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          {formatTime(speech.timestamp)}
                        </span>
                      </div>
                      <div style={{ fontSize: '16px', lineHeight: 1.6, color: '#333' }}>
                        {speech.content}
                      </div>
                    </div>
                    {index < room.speeches.length - 1 && (
                      <div style={{ width: '100%', borderTop: '2px dashed #E0E0E0', marginBottom: '12px' }}></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 32px',
                backgroundColor: '#1E88E5',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              返回首页
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VotePanel;
