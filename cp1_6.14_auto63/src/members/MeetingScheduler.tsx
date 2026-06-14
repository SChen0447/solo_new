import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAppStore } from '../store';
import type { Meeting } from '../types';

export default function MeetingScheduler() {
  const { meetings, fetchMeetings, members, fetchMembers, books, fetchBooks } = useAppStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [now, setNow] = useState(new Date());
  const [form, setForm] = useState({
    topic: '',
    dateTime: '',
    bookId: '',
    location: '',
    participants: [] as string[],
  });

  useEffect(() => {
    fetchMeetings();
    fetchMembers();
    fetchBooks();
  }, [fetchMeetings, fetchMembers, fetchBooks]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = useCallback((dateTime: string) => {
    const target = new Date(dateTime).getTime();
    const diff = target - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    if (days > 0) return `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
    if (hours > 0) return `${hours}时 ${minutes}分 ${seconds}秒`;
    return `${minutes}分 ${seconds}秒`;
  }, [now]);

  const isUpcoming = (dateTime: string) => {
    const target = new Date(dateTime).getTime();
    const diff = target - now.getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  const isPast = (dateTime: string) => new Date(dateTime).getTime() < now.getTime();

  const handleCreate = async () => {
    if (!form.topic.trim() || !form.dateTime) return;
    await axios.post('/api/meetings', {
      ...form,
      bookId: form.bookId || null,
    });
    setShowCreateForm(false);
    setForm({ topic: '', dateTime: '', bookId: '', location: '', participants: [] });
    fetchMeetings();
  };

  const handleDelete = async (id: string) => {
    await axios.delete(`/api/meetings/${id}`);
    fetchMeetings();
  };

  const toggleParticipant = (memberId: string) => {
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.includes(memberId)
        ? prev.participants.filter((id) => id !== memberId)
        : [...prev.participants, memberId],
    }));
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700 }}>讨论会日程管理</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>+ 创建讨论会</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {meetings.map((meeting) => {
          const upcoming = isUpcoming(meeting.dateTime);
          const past = isPast(meeting.dateTime);
          const countdown = getCountdown(meeting.dateTime);
          const book = books.find((b) => b.id === meeting.bookId);
          const participantNames = meeting.participants
            .map((pid) => members.find((m) => m.id === pid)?.name)
            .filter(Boolean);

          return (
            <div
              key={meeting.id}
              className={`card ${upcoming ? 'meeting-card-upcoming' : ''} ${past ? 'meeting-card-past' : ''}`}
              style={{ padding: '20px', position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 600 }}>{meeting.topic}</h3>
                    {upcoming && <span style={{ background: '#f1c40f', color: '#2C3E50', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>即将开始</span>}
                    {past && <span style={{ background: '#bdc3c7', color: '#2C3E50', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>已结束</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#666', flexWrap: 'wrap' }}>
                    <span>📅 {new Date(meeting.dateTime).toLocaleString('zh-CN')}</span>
                    {book && <span>📖 {book.title}</span>}
                    <span>📍 {meeting.location}</span>
                  </div>
                  {participantNames.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {participantNames.map((name) => (
                        <span key={name} style={{ background: 'rgba(45,106,79,0.1)', color: 'var(--primary-color)', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', minWidth: '160px' }}>
                  {countdown && (
                    <div style={{ background: 'rgba(45,106,79,0.1)', color: 'var(--primary-color)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      ⏱ {countdown}
                    </div>
                  )}
                  {!past && (
                    <button className="btn btn-danger" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => handleDelete(meeting.id)}>
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {meetings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
          <p>暂无讨论会</p>
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>创建讨论会</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="讨论主题 *" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
              <input type="datetime-local" value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} />
              <select value={form.bookId} onChange={(e) => setForm({ ...form, bookId: e.target.value })}>
                <option value="">不关联书籍</option>
                {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              <input type="text" placeholder="地点或线上会议链接" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>参与成员</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {members.map((m) => (
                    <label key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer',
                      background: form.participants.includes(m.id) ? 'rgba(45,106,79,0.15)' : '#f5f5f5',
                      border: form.participants.includes(m.id) ? '1px solid var(--primary-color)' : '1px solid #ddd',
                      fontSize: '13px', transition: 'all 0.2s',
                    }}>
                      <input
                        type="checkbox"
                        checked={form.participants.includes(m.id)}
                        onChange={() => toggleParticipant(m.id)}
                        style={{ display: 'none' }}
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>取消</button>
                <button className="btn btn-primary" onClick={handleCreate}>创建</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
