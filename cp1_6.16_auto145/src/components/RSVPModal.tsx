import React, { useState } from 'react';
import axios from 'axios';

interface RSVPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const RSVPModal: React.FC<RSVPModalProps> = ({ isOpen, onClose, onSubmitted }) => {
  const [name, setName] = useState('');
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guestsCount, setGuestsCount] = useState(0);
  const [mealPreference, setMealPreference] = useState<'vegetarian' | 'seafood' | 'beef'>('beef');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pressedButton, setPressedButton] = useState<'minus' | 'plus' | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('请输入您的姓名');
      return;
    }

    if (attending === null) {
      setError('请选择是否出席');
      return;
    }

    if (message.length > 150) {
      setError('祝福语不能超过150字');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post('/api/rsvp', {
        name: name.trim(),
        attending,
        guestsCount,
        mealPreference,
        message: message.trim()
      });

      if (response.data.success) {
        onSubmitted();
        onClose();
        setName('');
        setAttending(null);
        setGuestsCount(0);
        setMealPreference('beef');
        setMessage('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMinus = () => {
    setPressedButton('minus');
    setGuestsCount(prev => Math.max(0, prev - 1));
    setTimeout(() => setPressedButton(null), 100);
  };

  const handlePlus = () => {
    setPressedButton('plus');
    setGuestsCount(prev => Math.min(10, prev + 1));
    setTimeout(() => setPressedButton(null), 100);
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'modalIn 0.3s ease'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 700,
    fontFamily: "'Playfair Display', serif",
    color: '#333333',
    textAlign: 'center',
    marginBottom: '8px'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#999999',
    textAlign: 'center',
    marginBottom: '32px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333333',
    marginBottom: '12px',
    display: 'block'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: "'Noto Serif SC', serif",
    boxSizing: 'border-box' as const
  };

  const inputFocusStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: '#FFD93D',
    transform: 'scale(1.02)'
  };

  const radioButtonStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '3px solid #E0E0E0',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const radioButtonSelectedStyle: React.CSSProperties = {
    ...radioButtonStyle,
    borderColor: '#FFD93D',
    background: 'linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)'
  };

  const numberPickerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px'
  };

  const numberButtonStyle: React.CSSProperties = {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#FF6B6B',
    color: '#FFFFFF',
    border: 'none',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const numberButtonPressedStyle: React.CSSProperties = {
    ...numberButtonStyle,
    transform: 'scale(0.95)',
    filter: 'brightness(0.9)'
  };

  const numberDisplayStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333333',
    minWidth: '60px',
    textAlign: 'center'
  };

  const tagButtonStyle: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: '14px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: '#F5F5F5',
    color: '#999999',
    fontFamily: "'Noto Serif SC', serif"
  };

  const tagButtonSelectedStyle: React.CSSProperties = {
    ...tagButtonStyle,
    backgroundColor: '#FFD93D',
    color: '#333333'
  };

  const submitButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#FFFFFF',
    background: 'linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: "'Noto Serif SC', serif",
    marginTop: '16px'
  };

  const errorStyle: React.CSSProperties = {
    color: '#FF6B6B',
    fontSize: '13px',
    marginBottom: '16px',
    textAlign: 'center'
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#F5F5F5',
    color: '#999999',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #D4A574',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: "'Noto Serif SC', serif",
    resize: 'vertical' as const,
    minHeight: '80px',
    boxSizing: 'border-box' as const
  };

  const textareaFocusStyle: React.CSSProperties = {
    ...textareaStyle,
    borderColor: '#FFD93D',
    transform: 'scale(1.02)'
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .submit-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-2px);
        }
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .close-btn:hover {
          background-color: #E0E0E0;
          color: #333333;
        }
      `}</style>

      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <button
          className="close-btn"
          style={closeButtonStyle}
          onClick={onClose}
        >
          ×
        </button>

        <h2 style={titleStyle}>出席确认</h2>
        <p style={subtitleStyle}>请填写以下信息，帮助我们做好准备</p>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>您的姓名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入姓名"
              style={inputStyle}
              onFocus={e => {
                e.target.style.borderColor = '#FFD93D';
                e.target.style.transform = 'scale(1.02)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E0E0E0';
                e.target.style.transform = 'scale(1)';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>是否出席</label>
            <div style={{ display: 'flex', gap: '40px', justifyContent: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => setAttending(true)}
              >
                <div style={attending === true ? radioButtonSelectedStyle : radioButtonStyle}>
                  {attending === true && <span style={{ color: '#FFFFFF', fontSize: '12px' }}>✓</span>}
                </div>
                <span style={{ fontSize: '14px', color: attending === true ? '#333333' : '#999999' }}>
                  欣然参加
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => setAttending(false)}
              >
                <div style={attending === false ? radioButtonSelectedStyle : radioButtonStyle}>
                  {attending === false && <span style={{ color: '#FFFFFF', fontSize: '12px' }}>✓</span>}
                </div>
                <span style={{ fontSize: '14px', color: attending === false ? '#333333' : '#999999' }}>
                  遗憾缺席
                </span>
              </div>
            </div>
          </div>

          {attending === true && (
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>携带人数</label>
              <div style={numberPickerStyle}>
                <button
                  type="button"
                  style={pressedButton === 'minus' ? numberButtonPressedStyle : numberButtonStyle}
                  onClick={handleMinus}
                  disabled={guestsCount <= 0}
                >
                  -
                </button>
                <span style={numberDisplayStyle}>{guestsCount}</span>
                <button
                  type="button"
                  style={pressedButton === 'plus' ? numberButtonPressedStyle : numberButtonStyle}
                  onClick={handlePlus}
                  disabled={guestsCount >= 10}
                >
                  +
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#999999', textAlign: 'center', marginTop: '8px' }}>
                （不含您本人）
              </p>
            </div>
          )}

          {attending === true && (
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>餐食偏好</label>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={mealPreference === 'vegetarian' ? tagButtonSelectedStyle : tagButtonStyle}
                  onClick={() => setMealPreference('vegetarian')}
                >
                  全素
                </button>
                <button
                  type="button"
                  style={mealPreference === 'seafood' ? tagButtonSelectedStyle : tagButtonStyle}
                  onClick={() => setMealPreference('seafood')}
                >
                  海鲜
                </button>
                <button
                  type="button"
                  style={mealPreference === 'beef' ? tagButtonSelectedStyle : tagButtonStyle}
                  onClick={() => setMealPreference('beef')}
                >
                  牛肉
                </button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>
              祝福语 <span style={{ color: '#999999', fontWeight: 400 }}>（{message.length}/150）</span>
            </label>
            <textarea
              value={message}
              onChange={e => {
                if (e.target.value.length <= 150) {
                  setMessage(e.target.value);
                }
              }}
              placeholder="写下您对新人的祝福..."
              style={textareaStyle}
              onFocus={e => {
                e.target.style.borderColor = '#FFD93D';
                e.target.style.transform = 'scale(1.02)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#D4A574';
                e.target.style.transform = 'scale(1)';
              }}
            />
          </div>

          <button
            type="submit"
            className="submit-btn"
            style={submitButtonStyle}
            disabled={isSubmitting}
          >
            {isSubmitting ? '提交中...' : '提交回复'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RSVPModal;
