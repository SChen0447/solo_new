import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, Survey } from '../store/useStore';

const pageStyle: React.CSSProperties = {
  maxWidth: '960px',
  margin: '0 auto',
  padding: '32px 24px',
};

const headerStyle: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 700,
  color: '#4a3f35',
  marginBottom: '8px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#8b5e3c',
  marginBottom: '28px',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '20px',
};

function ProgressBar({ current, goal, animated }: { current: number; goal: number; animated: boolean }) {
  const pct = Math.min((current / goal) * 100, 100);
  const reached = current >= goal;
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fillRef.current) {
      fillRef.current.style.width = '0%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (fillRef.current) {
            fillRef.current.style.width = pct + '%';
          }
        });
      });
    }
  }, [pct, animated]);

  return (
    <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: '#e0d5c7', overflow: 'hidden' }}>
      <div
        ref={fillRef}
        style={{
          height: '100%',
          borderRadius: '4px',
          background: reached ? '#7cb342' : '#d4a574',
          transition: 'width 0.6s ease-out, background 0.3s',
          width: '0%',
        }}
      />
    </div>
  );
}

function SurveyCard({ survey }: { survey: Survey }) {
  const navigate = useNavigate();
  const [hover, setHover] = React.useState(false);
  const [flash, setFlash] = React.useState(false);
  const prevVotes = React.useRef(survey.current_votes);
  const reached = survey.current_votes >= survey.vote_goal;

  useEffect(() => {
    if (prevVotes.current < survey.vote_goal && reached) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1500);
      return () => clearTimeout(timer);
    }
    prevVotes.current = survey.current_votes;
  }, [reached, survey.current_votes, survey.vote_goal]);

  const cardStyle: React.CSSProperties = {
    width: '280px',
    height: '200px',
    borderRadius: '12px',
    backgroundColor: '#fff8f0',
    boxShadow: hover ? '0 8px 24px #00000020' : '0 2px 8px #00000010',
    padding: '20px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'transform 0.25s ease-out, box-shadow 0.25s ease-out',
    transform: hover ? 'translateY(-6px)' : 'translateY(0)',
    border: flash ? '2px solid #d4a574' : '2px solid transparent',
    animation: flash ? 'goldFlash 0.5s ease 3' : 'none',
    position: 'relative',
    overflow: 'hidden',
  };

  const deadlineDate = new Date(survey.deadline);
  const deadlineStr = `${deadlineDate.getMonth() + 1}月${deadlineDate.getDate()}日`;

  return (
    <>
      <style>{`
        @keyframes goldFlash {
          0%, 100% { border-color: #d4a574; box-shadow: 0 0 0 rgba(212,165,116,0); }
          50% { border-color: #ffd700; box-shadow: 0 0 16px rgba(255,215,0,0.5); }
        }
        .survey-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        @media (max-width: 768px) {
          .survey-card-grid { grid-template-columns: 1fr; }
          .survey-card-grid > div { width: 100%; }
        }
      `}</style>
      <div
        style={cardStyle}
        onClick={() => navigate(`/survey/${survey.id}`)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#4a3f35', marginBottom: '6px', lineHeight: 1.3 }}>
            {survey.title}
          </div>
          <div style={{ fontSize: '13px', color: '#8b5e3c', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {survey.description}
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8b5e3c', marginBottom: '6px' }}>
            <span>票数 {survey.current_votes}/{survey.vote_goal}</span>
            <span>截止 {deadlineStr}</span>
          </div>
          <ProgressBar current={survey.current_votes} goal={survey.vote_goal} animated={true} />
          {reached && (
            <div style={{ fontSize: '12px', color: '#7cb342', fontWeight: 600, marginTop: '6px', textAlign: 'right' }}>
              ✓ 众筹已开启
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SurveyList() {
  const surveys = useStore((s) => s.surveys);
  const loading = useStore((s) => s.loading);

  if (loading) {
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '80px 24px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>☕</div>
        <div style={{ color: '#8b5e3c' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>☕ 口味调查</div>
      <div style={subtitleStyle}>为你喜爱的新品口味投票，让好喝的咖啡上架</div>
      <div className="survey-card-grid">
        {surveys.map((s) => (
          <SurveyCard key={s.id} survey={s} />
        ))}
      </div>
    </div>
  );
}
