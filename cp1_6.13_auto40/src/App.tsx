import { useApp } from './context/AppContext';
import SearchBar from './components/SearchBar';
import WordCard from './components/WordCard';
import ParticleCanvas from './components/ParticleCanvas';

function App() {
  const { pageMode, currentWord, showFpsCounter, setShowFpsCounter } = useApp();

  const isFireworks = pageMode === 'fireworks';
  const showCard = pageMode === 'card' && currentWord;
  const showHome = pageMode === 'home';

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#1a1a2e',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(99, 102, 241, 0.12) 0%, transparent 45%),' +
            'radial-gradient(ellipse at 80% 100%, rgba(168, 85, 247, 0.12) 0%, transparent 45%),' +
            'radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.05) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            padding: window.innerWidth < 768 ? '20px 20px 0' : '32px 40px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (pageMode !== 'fireworks') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <div
              style={{
                width: window.innerWidth < 768 ? '34px' : '40px',
                height: window.innerWidth < 768 ? '34px' : '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
              }}
            >
              <svg
                width={window.innerWidth < 768 ? 18 : 22}
                height={window.innerWidth < 768 ? 18 : 22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="m4.93 4.93 2.83 2.83" />
                <path d="m16.24 16.24 2.83 2.83" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <path d="m4.93 19.07 2.83-2.83" />
                <path d="m16.24 7.76 2.83-2.83" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: window.innerWidth < 768 ? '17px' : '20px',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '0.01em',
                  lineHeight: 1.2,
                }}
              >
                单词花火
              </div>
              <div
                style={{
                  fontSize: window.innerWidth < 768 ? '10.5px' : '12px',
                  color: '#a5b4fc',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  marginTop: '2px',
                }}
              >
                WORD SPARK
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowFpsCounter(!showFpsCounter)}
            style={{
              padding: window.innerWidth < 768 ? '7px 12px' : '9px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: showFpsCounter
                ? 'rgba(16, 185, 129, 0.18)'
                : 'rgba(30, 41, 59, 0.5)',
              color: showFpsCounter ? '#6ee7b7' : '#94a3b8',
              fontSize: window.innerWidth < 768 ? '11px' : '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: showFpsCounter ? '#10b981' : 'currentColor',
              }}
            />
            {showFpsCounter ? 'FPS ON' : 'FPS'}
          </button>
        </header>

        <main
          style={{
            flex: 1,
            padding: window.innerWidth < 768
              ? `${showHome ? '50px' : '24px'} 16px 40px`
              : `${showHome ? '80px' : '40px'} 24px 60px`,
            display: 'flex',
            flexDirection: 'column',
            gap: showCard ? (window.innerWidth < 768 ? '20px' : '36px') : '0',
            transition: 'padding 0.4s ease',
          }}
        >
          {showHome && (
            <div style={{ textAlign: 'center', marginBottom: window.innerWidth < 768 ? '24px' : '40px' }}>
              <h1
                style={{
                  fontSize: window.innerWidth < 768 ? '28px' : '48px',
                  fontWeight: 800,
                  letterSpacing: '0.01em',
                  lineHeight: 1.2,
                  marginBottom: window.innerWidth < 768 ? '12px' : '18px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 40%, #a78bfa 70%, #e879f9 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                让背单词成为一场
                <span
                  style={{
                    display: 'inline-block',
                    marginLeft: window.innerWidth < 768 ? '6px' : '12px',
                  }}
                >
                  视觉花火
                </span>
              </h1>
              <p
                style={{
                  color: '#a5b4fc',
                  fontSize: window.innerWidth < 768 ? '13.5px' : '16px',
                  lineHeight: 1.7,
                  maxWidth: '560px',
                  margin: '0 auto',
                  fontWeight: 500,
                }}
              >
                输入任意英文单词，自动拆解词根词缀，点燃属于你的单词记忆花火
              </p>
            </div>
          )}

          <SearchBar />

          {showCard && (
            <div
              style={{
                animation: 'fadeInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
              }}
            >
              <WordCard />
            </div>
          )}
        </main>

        <footer
          style={{
            padding: window.innerWidth < 768 ? '16px 20px' : '24px 40px',
            textAlign: 'center',
            color: 'rgba(148, 163, 184, 0.5)',
            fontSize: window.innerWidth < 768 ? '11px' : '12px',
          }}
        >
          单词花火 © 2026 · 词根拆解基于词源学规则 · 让学习闪耀火花
        </footer>
      </div>

      {isFireworks && <ParticleCanvas />}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default App;
