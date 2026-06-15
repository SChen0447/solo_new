import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, Supporter } from '../store/useStore';

const pageStyle: React.CSSProperties = {
  maxWidth: '720px',
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
  marginBottom: '24px',
};

const cardStyle: React.CSSProperties = {
  background: '#fff8f0',
  borderRadius: '16px',
  padding: '28px',
  boxShadow: '0 2px 12px #00000010',
  marginBottom: '24px',
};

function RingProgress({ current, goal }: { current: number; goal: number }) {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  const [animatedPct, setAnimatedPct] = useState(0);
  const prevPct = useRef(0);

  useEffect(() => {
    prevPct.current = animatedPct;
  }, [animatedPct]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPct(pct);
    }, 50);
    return () => clearTimeout(timer);
  }, [pct]);

  const offset = circumference * (1 - animatedPct);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e0d5c7"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ff9800"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        width: size,
        height: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#4a3f35' }}>
          {Math.round(animatedPct * 100)}%
        </div>
        <div style={{ fontSize: '13px', color: '#8b5e3c' }}>
          ¥{current} / ¥{goal}
        </div>
      </div>
    </div>
  );
}

const ITEM_HEIGHT = 64;
const VISIBLE_COUNT = 10;

function VirtualList({ items }: { items: Supporter[] }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalHeight = items.length * ITEM_HEIGHT;
  const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, items.length);
  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: Math.min(totalHeight, VISIBLE_COUNT * ITEM_HEIGHT),
        overflowY: 'auto',
        position: 'relative',
        borderRadius: '8px',
        background: '#fff8f0',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((s, i) => {
          const idx = startIndex + i;
          return (
            <div
              key={s.id}
              style={{
                position: 'absolute',
                top: idx * ITEM_HEIGHT,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 16px',
                borderBottom: '1px solid #e8d5c0',
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#d4a574',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {s.username.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#4a3f35' }}>{s.username}</div>
                <div style={{ fontSize: '12px', color: '#b0a090' }}>{new Date(s.created_at).toLocaleString('zh-CN')}</div>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#ff9800' }}>¥{s.amount}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: '#00000060',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};

const modalContent: React.CSSProperties = {
  background: '#fff8f0',
  borderRadius: '16px',
  padding: '24px',
  width: '90%',
  maxWidth: '400px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};

const modalTitle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#4a3f35',
  marginBottom: '20px',
  textAlign: 'center',
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '16px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  color: '#4a3f35',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  borderRadius: '8px',
  border: '1px solid #d4a574',
  padding: '0 12px',
  fontSize: '14px',
  color: '#4a3f35',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const radioGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
};

const radioLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '14px',
  color: '#4a3f35',
  cursor: 'pointer',
};

const confirmBtnStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  background: '#ff9800',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s, transform 0.15s',
  marginTop: '8px',
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

const pledgeBtnStyle: React.CSSProperties = {
  width: '100%',
  height: '48px',
  background: '#ff9800',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  fontSize: '16px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background 0.2s, transform 0.15s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  boxShadow: '0 4px 12px rgba(255,152,0,0.3)',
};

const goalRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-around',
  marginBottom: '20px',
  textAlign: 'center',
};

const goalItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const goalLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#8b5e3c',
};

const goalValueStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#4a3f35',
};

export default function CrowdfundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const surveys = useStore((s) => s.surveys);
  const addSupport = useStore((s) => s.addSupport);

  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState('wechat');
  const [supportName, setSupportName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const survey = surveys.find((s) => s.id === id);

  if (!survey) {
    return (
      <div style={{ ...pageStyle, textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ color: '#8b5e3c' }}>加载中...</div>
      </div>
    );
  }

  const handlePledge = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !supportName.trim()) return;
    setSubmitting(true);
    await addSupport(survey.id, supportName.trim(), amt, payMethod);
    setSubmitting(false);
    setShowModal(false);
    setAmount('');
    setSupportName('');
  };

  return (
    <div style={pageStyle}>
      <div style={backStyle} onClick={() => navigate(`/survey/${survey.id}`)}>← 返回调查详情</div>
      <div style={titleStyle}>💰 众筹 · {survey.title}</div>

      <div style={cardStyle}>
        <div style={goalRowStyle}>
          <div style={goalItemStyle}>
            <span style={goalLabelStyle}>目标金额</span>
            <span style={goalValueStyle}>¥{survey.crowdfund_goal}</span>
          </div>
          <div style={goalItemStyle}>
            <span style={goalLabelStyle}>已筹金额</span>
            <span style={{ ...goalValueStyle, color: '#ff9800' }}>¥{survey.crowdfund_current}</span>
          </div>
          <div style={goalItemStyle}>
            <span style={goalLabelStyle}>支持人数</span>
            <span style={goalValueStyle}>{survey.supporters.length}</span>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <RingProgress current={survey.crowdfund_current} goal={survey.crowdfund_goal} />
        </div>
      </div>

      <button
        style={pledgeBtnStyle}
        onClick={() => setShowModal(true)}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        🤝 预付定金支持
      </button>

      {survey.supporters.length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <div style={sectionTitle}>🏆 支持者列表 ({survey.supporters.length})</div>
          <VirtualList items={survey.supporters} />
        </div>
      )}

      {showModal && (
        <div style={modalOverlay} onClick={() => setShowModal(false)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={modalTitle}>预付定金</div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>昵称</label>
              <input
                style={inputStyle}
                placeholder="请输入你的昵称"
                value={supportName}
                onChange={(e) => setSupportName(e.target.value)}
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>支持金额（元）</label>
              <input
                style={inputStyle}
                type="number"
                placeholder="请输入金额"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>支付方式</label>
              <div style={radioGroupStyle}>
                <label style={radioLabelStyle}>
                  <input
                    type="radio"
                    name="payMethod"
                    value="wechat"
                    checked={payMethod === 'wechat'}
                    onChange={() => setPayMethod('wechat')}
                  />
                  微信支付
                </label>
                <label style={radioLabelStyle}>
                  <input
                    type="radio"
                    name="payMethod"
                    value="alipay"
                    checked={payMethod === 'alipay'}
                    onChange={() => setPayMethod('alipay')}
                  />
                  支付宝
                </label>
              </div>
            </div>
            <button
              style={{
                ...confirmBtnStyle,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
              onClick={handlePledge}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '确认支付'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
