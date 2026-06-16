import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface CreateRoomFormProps {
  onSuccess: () => void;
}

const CreateRoomForm = ({ onSuccess }: CreateRoomFormProps) => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [proName, setProName] = useState('支持AI发展');
  const [conName, setConName] = useState('反对AI过度使用');
  const [timeLimit, setTimeLimit] = useState(60);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!topic.trim()) {
      setError('请输入辩题');
      return;
    }
    if (topic.length > 100) {
      setError('辩题不能超过100字');
      return;
    }
    if (!proName.trim() || !conName.trim()) {
      setError('请输入正反方名称');
      return;
    }
    if (!nickname.trim()) {
      setError('请输入您的昵称');
      return;
    }

    try {
      const response = await axios.post('/api/rooms', {
        topic: topic.trim(),
        proName: proName.trim(),
        conName: conName.trim(),
        timeLimit,
        ownerNickname: nickname.trim(),
      });

      const { roomCode, ownerId } = response.data;
      localStorage.setItem(`member_${roomCode}`, ownerId);
      localStorage.setItem(`nickname_${roomCode}`, nickname.trim());

      onSuccess();
      navigate(`/room/${roomCode}`);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || '创建房间失败');
      } else {
        setError('创建房间失败');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#333' }}>
          辩题 <span style={{ color: '#999', fontSize: '13px' }}>(最多100字)</span>
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="请输入辩题，例如：人工智能利大于弊还是弊大于利"
          maxLength={100}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '80px',
          }}
        />
        <div style={{ textAlign: 'right', fontSize: '12px', color: '#999', marginTop: '4px' }}>
          {topic.length}/100
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#1976D2' }}>
            正方名称
          </label>
          <input
            type="text"
            value={proName}
            onChange={(e) => setProName(e.target.value)}
            placeholder="支持AI发展"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#D32F2F' }}>
            反方名称
          </label>
          <input
            type="text"
            value={conName}
            onChange={(e) => setConName(e.target.value)}
            placeholder="反对AI过度使用"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#333' }}>
          发言时间限制
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[30, 60, 90].map((t) => (
            <label
              key={t}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                border: `2px solid ${timeLimit === t ? '#1E88E5' : '#ddd'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: timeLimit === t ? '#E3F2FD' : '#fff',
                transition: 'all 0.2s',
              }}
            >
              <input
                type="radio"
                name="timeLimit"
                value={t}
                checked={timeLimit === t}
                onChange={() => setTimeLimit(t)}
                style={{ display: 'none' }}
              />
              <span style={{ color: timeLimit === t ? '#1E88E5' : '#666', fontWeight: timeLimit === t ? 500 : 400 }}>
                {t}秒
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#333' }}>
          您的昵称
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="请输入您的昵称"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        />
      </div>

      {error && (
        <div style={{ color: '#D32F2F', fontSize: '14px', padding: '10px', backgroundColor: '#FFEBEE', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        style={{
          padding: '12px 24px',
          backgroundColor: '#1E88E5',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1976D2';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#1E88E5';
        }}
      >
        创建房间
      </button>
    </form>
  );
};

export default CreateRoomForm;
