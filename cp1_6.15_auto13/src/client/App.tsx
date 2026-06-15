import { useEffect, useState } from 'react';
import { useVoteStore } from './store/useVoteStore';
import VoteList from './components/VoteList';
import VoteForm from './components/VoteForm';
import ResultBoard from './components/ResultBoard';
import type { Vote } from './store/useVoteStore';

export default function App() {
  const {
    currentPage,
    selectedVote,
    setCurrentPage,
    fetchVotes,
    initSocket,
    error,
    setError,
  } = useVoteStore();

  const [showForm, setShowForm] = useState(false);
  const [showVoteConfirm, setShowVoteConfirm] = useState<string | null>(null);
  const [votingOption, setVotingOption] = useState<string | null>(null);

  useEffect(() => {
    initSocket();
    fetchVotes();
  }, [initSocket, fetchVotes]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  const handleSelectVote = (vote: Vote) => {
    useVoteStore.getState().selectVote(vote);
  };

  const handleVoteOptionClick = (optionId: string) => {
    if (!selectedVote) return;
    setVotingOption(optionId);
    setShowVoteConfirm(selectedVote.title);
  };

  const handleConfirmVote = async () => {
    if (!selectedVote || !votingOption) return;
    const success = await useVoteStore.getState().submitVote(selectedVote.id, votingOption);
    if (success) {
      setCurrentPage('result');
    }
    setShowVoteConfirm(null);
    setVotingOption(null);
  };

  return (
    <div style={styles.container}>
      {error && (
        <div style={styles.errorToast} className="error-toast">
          {error}
        </div>
      )}

      <header style={styles.header}>
        <h1 style={styles.title}>
          <span style={{ color: '#4A90D9' }}>投票</span>
          <span style={{ color: '#7B68EE' }}>看板</span>
        </h1>
        <p style={styles.subtitle}>在线活动投票与实时结果统计</p>
      </header>

      <main style={styles.main}>
        {currentPage === 'list' && (
          <div style={styles.listContainer}>
            <VoteList
              onCreateClick={() => setShowForm(true)}
              onSelectVote={handleSelectVote}
            />
          </div>
        )}

        {currentPage === 'vote' && selectedVote && (
          <div style={styles.votePage}>
            <button style={styles.backBtn} onClick={() => setCurrentPage('list')}>
              ← 返回列表
            </button>
            <div style={styles.voteCard}>
              <h2 style={styles.voteTitle}>{selectedVote.title}</h2>
              <div style={styles.optionsList}>
                {selectedVote.options.map((opt, idx) => (
                  <button
                    key={opt.id}
                    style={{
                      ...styles.optionBtn,
                      animation: `slideInUp 0.3s ease-out ${idx * 0.05}s both`,
                    }}
                    onClick={() => handleVoteOptionClick(opt.id)}
                    className="option-btn"
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
              <button
                style={{ ...styles.backBtn, marginLeft: 'auto' }}
                onClick={() => {
                  useVoteStore.getState().selectVote(selectedVote);
                  setCurrentPage('result');
                }}
              >
                查看结果 →
              </button>
            </div>
          </div>
        )}

        {currentPage === 'result' && selectedVote && (
          <div style={styles.resultPage}>
            <button style={styles.backBtn} onClick={() => setCurrentPage('list')}>
              ← 返回列表
            </button>
            <ResultBoard vote={selectedVote} />
          </div>
        )}
      </main>

      {showForm && (
        <VoteForm onClose={() => setShowForm(false)} onSuccess={() => setShowForm(false)} />
      )}

      {showVoteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowVoteConfirm(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>确认投票</h3>
            <p style={{ margin: '0 0 20px 0', color: '#666' }}>
              确定要为「{showVoteConfirm}」投票吗？同一IP只能投一次。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={{ ...styles.btn, ...styles.btnCancel }}
                onClick={() => {
                  setShowVoteConfirm(null);
                  setVotingOption(null);
                }}
              >
                取消
              </button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleConfirmVote}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f7fa;
          color: #333;
          -webkit-font-smoothing: antialiased;
        }
        button {
          font-family: inherit;
          cursor: pointer;
          border: none;
          outline: none;
          position: relative;
          overflow: hidden;
        }
        button:active .ripple {
          animation: ripple 0.4s ease-out;
        }
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounceScale {
          0% { transform: scale(1); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        .option-btn:active {
          animation: bounceScale 0.2s ease;
          background: #4A90D9 !important;
          color: white;
        }
        .vote-card-item {
          animation: slideInUp 0.3s ease-out;
        }
        .error-toast {
          animation: fadeIn 0.3s ease;
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f7fa',
  },
  header: {
    padding: '32px 24px 16px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '14px',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  votePage: {
    maxWidth: '600px',
    margin: '0 auto',
    animation: 'fadeIn 0.2s ease',
  },
  resultPage: {
    animation: 'fadeIn 0.2s ease',
  },
  voteCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginTop: '16px',
  },
  voteTitle: {
    fontSize: '22px',
    fontWeight: 600,
    marginBottom: '24px',
    textAlign: 'center',
    color: '#1f2937',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  optionBtn: {
    width: '100%',
    height: '44px',
    borderRadius: '8px',
    background: '#f0f0f0',
    color: '#333',
    fontSize: '15px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    border: 'none',
  },
  backBtn: {
    background: 'transparent',
    color: '#4A90D9',
    fontSize: '14px',
    fontWeight: 500,
    padding: '8px 0',
  },
  errorToast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fef2f2',
    color: '#dc2626',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 9999,
    fontSize: '14px',
    fontWeight: 500,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  btn: {
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #4A90D9 0%, #7B68EE 100%)',
    color: '#fff',
  },
  btnCancel: {
    background: '#f3f4f6',
    color: '#6b7280',
  },
};
