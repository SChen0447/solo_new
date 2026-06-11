import { useState, useEffect, useRef, useCallback } from 'react';
import { Idea, User, WsMessage } from '../../shared/types';
import * as api from '../utils/api';
import VoteChart from './VoteChart';
import '../styles/RoomView.css';

interface Props {
  roomCode: string;
  user: User;
  onBack: () => void;
}

export default function RoomView({ roomCode, user, onBack }: Props) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const showToast = useCallback((msg: string, duration = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(''), duration);
  }, []);

  const triggerAnim = useCallback((id: string) => {
    setAnimatingIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setAnimatingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, []);

  const mergeAndSort = useCallback((list: Idea[]): Idea[] => {
    return [...list].sort((a, b) => {
      const na = a.upvotes - a.downvotes;
      const nb = b.upvotes - b.downvotes;
      if (nb !== na) return nb - na;
      return b.createdAt - a.createdAt;
    });
  }, []);

  useEffect(() => {
    api.joinRoom(roomCode, user).then(room => {
      setIdeas(room.ideas);
    }).catch(err => showToast(err.message));

    const { close } = api.connectWs(roomCode, user.id, (msg: WsMessage) => {
      if (msg.type === 'idea_added') {
        setIdeas(prev => {
          if (prev.find(i => i.id === msg.data.id)) return mergeAndSort(prev);
          triggerAnim(msg.data.id);
          return mergeAndSort([...prev, msg.data]);
        });
      } else if (msg.type === 'vote_updated') {
        setIdeas(prev => {
          const next = prev.map(i => i.id === msg.data.id ? msg.data : i);
          triggerAnim(msg.data.id);
          return mergeAndSort(next);
        });
      }
    });
    return close;
  }, [roomCode, user, mergeAndSort, triggerAnim, showToast]);

  const handleSubmit = async () => {
    if (!input.trim() || submitting) return;
    if (input.length > 200) { showToast('最多200字'); return; }
    setSubmitting(true);
    try {
      const { ideas: next } = await api.submitIdea(roomCode, input.trim(), user.id, user);
      setIdeas(mergeAndSort(next));
      setInput('');
      setTimeout(() => setSubmitting(false), 1000);
    } catch (err: any) {
      showToast(err.message);
      setSubmitting(false);
    }
  };

  const handleVote = async (ideaId: string, voteType: 'up' | 'down') => {
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;
    if (idea.voters[user.id] === voteType) {
      showToast('你已经投过这一票了');
      return;
    }
    try {
      const { ideas: next } = await api.vote(roomCode, ideaId, user.id, voteType);
      setIdeas(mergeAndSort(next));
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleCopy = async () => {
    const link = `${window.location.origin}/#/room/${roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('复制失败');
    }
  };

  const handleExport = async () => {
    try {
      const report = await api.exportReport(roomCode);
      api.downloadReport(report, `brainstorm-${roomCode}-${Date.now()}.json`);
      showToast('报告已导出');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const myIdeaCount = ideas.filter(i => i.authorId === user.id).length;

  return (
    <div className="room-wrapper">
      <header className="room-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <div className="room-info">
          <span className="room-label">房间码</span>
          <span className="room-code">{roomCode}</span>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? '✓ 已复制' : '复制链接'}
          </button>
        </div>
        <div className="header-actions">
          <div className="user-chip">
            <span className="user-avatar">{user.avatar}</span>
            <span className="user-name">{user.nickname}</span>
          </div>
          <button className="export-btn" onClick={handleExport}>导出报告</button>
        </div>
      </header>

      <main className="room-main">
        <section className="ideas-column">
          <div className="ideas-header">
            <h2>想法列表</h2>
            <span className="ideas-count">{ideas.length} 条 · 我已提交 {myIdeaCount}/3</span>
          </div>
          <div className="ideas-list">
            {ideas.length === 0 && (
              <div className="empty-tip">暂无想法，快在下方输入第一个吧！</div>
            )}
            {ideas.map((idea, rank) => {
              const myVote = idea.voters[user.id];
              const net = idea.upvotes - idea.downvotes;
              return (
                <div
                  key={idea.id}
                  className={`idea-card ${animatingIds.has(idea.id) ? 'pulse' : ''}`}
                  style={{ animationDelay: `${Math.min(rank * 20, 120)}ms` }}
                >
                  <div className="idea-rank">#{rank + 1}</div>
                  <div className="idea-body">
                    <div className="idea-author">
                      <span className="author-avatar">{idea.authorAvatar}</span>
                      <span className="author-name">{idea.authorNickname}</span>
                      {idea.authorId === user.id && <span className="mine-tag">我</span>}
                    </div>
                    <p className="idea-content">{idea.content}</p>
                    <div className="idea-meta">
                      <span className={`net-score ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}`}>
                        净得票 {net > 0 ? '+' : ''}{net}
                      </span>
                    </div>
                  </div>
                  <div className="vote-buttons">
                    <button
                      className={`vote-btn up ${myVote === 'up' ? 'active' : ''}`}
                      onClick={() => handleVote(idea.id, 'up')}
                      title="赞同"
                    >
                      ▲ <span>{idea.upvotes}</span>
                    </button>
                    <button
                      className={`vote-btn down ${myVote === 'down' ? 'active' : ''}`}
                      onClick={() => handleVote(idea.id, 'down')}
                      title="反对"
                    >
                      ▼ <span>{idea.downvotes}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="composer">
            <textarea
              ref={inputRef}
              className={`composer-input ${input.length > 0 ? 'active' : ''}`}
              placeholder={`分享你的想法（最多200字） · 已提交 ${myIdeaCount}/3`}
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 200))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              maxLength={200}
              disabled={myIdeaCount >= 3 || submitting}
            />
            <div className="composer-footer">
              <span className={`char-count ${input.length >= 180 ? 'warn' : ''}`}>{input.length}/200</span>
              <button
                className={`submit-btn ${submitting ? 'disabled' : ''}`}
                onClick={handleSubmit}
                disabled={!input.trim() || myIdeaCount >= 3 || submitting}
              >
                {submitting ? '✓ 已提交' : '提交想法'}
              </button>
            </div>
          </div>
        </section>

        <aside className="chart-column">
          <div className="chart-header">
            <h2>投票统计</h2>
            <div className="chart-legend">
              <span className="legend-item up">绿色 赞同</span>
              <span className="legend-item down">红色 反对</span>
            </div>
          </div>
          <div className="chart-box">
            <VoteChart ideas={ideas} />
          </div>
        </aside>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
