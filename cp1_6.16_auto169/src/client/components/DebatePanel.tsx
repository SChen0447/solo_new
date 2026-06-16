import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Room, Member, Speech } from '../types';

interface DebatePanelProps {
  room: Room;
  memberId: string;
  onSpeechAdded: () => void;
}

const DebatePanel = ({ room, memberId, onSpeechAdded }: DebatePanelProps) => {
  const [content, setContent] = useState('');
  const [countdown, setCountdown] = useState(room.timeLimit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const speechesEndRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const currentSpeaker = room.currentSpeaker;
  const isMyTurn = currentSpeaker && currentSpeaker.id === memberId;
  const isDebating = room.status === 'debating';

  useEffect(() => {
    setCountdown(room.timeLimit);
  }, [currentSpeaker?.id, room.timeLimit]);

  useEffect(() => {
    if (!isDebating || !isMyTurn) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    setCountdown(room.timeLimit);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [isDebating, isMyTurn, room.timeLimit]);

  useEffect(() => {
    speechesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.speeches]);

  const handleSubmit = async () => {
    if (!content.trim() || !isMyTurn || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await axios.post(`/api/rooms/${room.roomCode}/speak`, {
        memberId,
        content: content.trim(),
      });
      setContent('');
      onSpeechAdded();
    } catch (err: unknown) {
      console.error('Failed to submit speech:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCountdownColor = () => {
    if (countdown > 10) return '#4CAF50';
    if (countdown > 5) return '#FF9800';
    return '#F44336';
  };

  const getCountdownClass = () => {
    return countdown < 5 ? 'blink' : '';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const proMembers = room.members.filter((m) => m.side === 'pro').sort((a, b) => a.order - b.order);
  const conMembers = room.members.filter((m) => m.side === 'con').sort((a, b) => a.order - b.order);

  const getMemberLabel = (member: Member, members: Member[]) => {
    const orderNames = ['一辩', '二辩', '三辩', '四辩', '五辩'];
    const index = members.findIndex((m) => m.id === member.id);
    return orderNames[index] || `${index + 1}辩`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#1976D2', marginBottom: '12px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#1976D2', borderRadius: '50%' }}></span>
            {room.sides.pro}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {proMembers.map((member) => (
              <div
                key={member.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: currentSpeaker?.id === member.id ? '#E3F2FD' : '#F5F5F5',
                  border: currentSpeaker?.id === member.id ? '1px solid #1976D2' : '1px solid transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: member.id === memberId ? 700 : 400 }}>
                  {member.nickname} {member.id === memberId && '(我)'}
                </span>
                <span style={{ fontSize: '12px', color: '#666' }}>{getMemberLabel(member, proMembers)}</span>
              </div>
            ))}
            {proMembers.length < 5 && (
              <div style={{ padding: '10px 12px', color: '#9E9E9E', fontSize: '14px' }}>
                等待更多辩手加入
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#D32F2F', marginBottom: '12px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#D32F2F', borderRadius: '50%' }}></span>
            {room.sides.con}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {conMembers.map((member) => (
              <div
                key={member.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: currentSpeaker?.id === member.id ? '#FFEBEE' : '#F5F5F5',
                  border: currentSpeaker?.id === member.id ? '1px solid #D32F2F' : '1px solid transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: member.id === memberId ? 700 : 400 }}>
                  {member.nickname} {member.id === memberId && '(我)'}
                </span>
                <span style={{ fontSize: '12px', color: '#666' }}>{getMemberLabel(member, conMembers)}</span>
              </div>
            ))}
            {conMembers.length < 5 && (
              <div style={{ padding: '10px 12px', color: '#9E9E9E', fontSize: '14px' }}>
                等待更多辩手加入
              </div>
            )}
          </div>
        </div>
      </div>

      {isDebating && currentSpeaker && (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
            当前发言: <span style={{ color: currentSpeaker.side === 'pro' ? '#1976D2' : '#D32F2F', fontWeight: 500 }}>
              {currentSpeaker.nickname}
            </span>
            {isMyTurn && <span style={{ color: '#4CAF50', marginLeft: '8px' }}>(轮到你了！)</span>}
          </div>
          <div
            className={getCountdownClass()}
            style={{
              fontFamily: 'monospace',
              fontSize: '24px',
              fontWeight: 700,
              color: getCountdownColor(),
            }}
          >
            {countdown}s
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '16px',
        }}
      >
        {room.speeches.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
            辩论记录将在这里显示
          </div>
        ) : (
          room.speeches.map((speech: Speech, index: number) => (
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
          ))
        )}
        <div ref={speechesEndRef}></div>
      </div>

      {isDebating && (
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isMyTurn ? '请输入您的发言...' : '等待轮到您发言...'}
            disabled={!isMyTurn}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: isMyTurn ? '2px solid #4CAF50' : '2px solid #BDBDBD',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '100px',
              backgroundColor: isMyTurn ? '#fff' : '#F5F5F5',
              transition: 'border-color 0.2s',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ fontSize: '13px', color: '#999' }}>
              {content.length} 字
            </span>
            <button
              onClick={handleSubmit}
              disabled={!isMyTurn || !content.trim() || isSubmitting || countdown === 0}
              style={{
                padding: '10px 24px',
                backgroundColor: isMyTurn && content.trim() && countdown > 0 ? '#4CAF50' : '#BDBDBD',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isMyTurn && content.trim() && countdown > 0 ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s',
              }}
            >
              {isSubmitting ? '提交中...' : '提交发言'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebatePanel;
