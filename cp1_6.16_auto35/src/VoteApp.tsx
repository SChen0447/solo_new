import React, { useReducer, useState, useCallback, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import type { AppState, Action, Vote, Participant } from './types';
import * as engine from './voteEngine';

const initialState: AppState = {
  currentUser: null,
  session: null,
  isLoading: false,
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'JOIN_SESSION_START':
      return { ...state, isLoading: true, error: null };
    case 'JOIN_SESSION_SUCCESS':
      return {
        ...state,
        isLoading: false,
        session: action.payload.session,
        currentUser: action.payload.user,
      };
    case 'JOIN_SESSION_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'CREATE_VOTE':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          votes: [action.payload, ...state.session.votes],
          currentVoteId: action.payload.id,
        },
      };
    case 'UPDATE_VOTE':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          votes: state.session.votes.map((v) =>
            v.id === action.payload.id ? action.payload : v
          ),
        },
      };
    case 'END_VOTE':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          votes: state.session.votes.map((v) =>
            v.id === action.payload ? engine.endVote(v) : v
          ),
        },
      };
    case 'REACTIVATE_VOTE':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          votes: state.session.votes.map((v) =>
            v.id === action.payload ? engine.reactivateVote(v) : v
          ),
          currentVoteId: action.payload,
        },
      };
    case 'CAST_VOTE':
      if (!state.session) return state;
      const updatedSession = engine.castVote(
        state.session,
        action.payload.voteId,
        action.payload.participantId,
        action.payload.optionIds
      );
      return { ...state, session: updatedSession };
    case 'ADD_PARTICIPANT':
      if (!state.session) return state;
      return {
        ...state,
        session: engine.addParticipant(state.session, action.payload),
      };
    case 'SET_CURRENT_VOTE':
      if (!state.session) return state;
      return {
        ...state,
        session: { ...state.session, currentVoteId: action.payload },
      };
    default:
      return state;
  }
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#1e1b4b',
    color: '#f8fafc',
    fontFamily:
      "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  entryPage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
  },
  entryCard: {
    background: '#312e81',
    borderRadius: '24px',
    padding: '48px',
    maxWidth: '440px',
    width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  logo: {
    fontSize: '48px',
    textAlign: 'center' as const,
    marginBottom: '8px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    textAlign: 'center' as const,
    marginBottom: '8px',
    background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '8px',
    color: '#e2e8f0',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '2px solid transparent',
    background: 'rgba(255,255,255,0.08)',
    color: '#f8fafc',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'all 0.2s ease',
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: '#4f46e5',
    color: 'white',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '8px',
  },
  secondaryButton: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: '2px solid #4f46e5',
    background: 'transparent',
    color: '#818cf8',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '12px',
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr 260px',
    gap: '24px',
    padding: '24px',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    background: 'rgba(49, 46, 129, 0.8)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  leftPanel: {
    background: '#312e81',
    borderRadius: '20px',
    padding: '24px',
    height: 'fit-content',
  },
  centerPanel: {
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
  },
  rightPanel: {
    background: '#312e81',
    borderRadius: '20px',
    padding: '24px',
    height: 'fit-content',
  },
  card: {
    background: '#312e81',
    borderRadius: '20px',
    padding: '28px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '20px',
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  optionButton: {
    width: '100%',
    padding: '18px 20px',
    borderRadius: '12px',
    border: '2px solid transparent',
    background: '#4338ca',
    color: 'white',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: '12px',
    textAlign: 'left' as const,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedOption: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    borderColor: '#818cf8',
    transform: 'scale(1.02)',
  },
  voteCount: {
    background: 'rgba(255,255,255,0.2)',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600,
  },
  chartContainer: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '24px',
    marginTop: '24px',
  },
  participantAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '16px',
    color: 'white',
    position: 'relative' as const,
    flexShrink: 0,
  },
  participantItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '12px',
    marginBottom: '8px',
    background: 'rgba(255,255,255,0.05)',
    transition: 'all 0.2s ease',
  },
  participantName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  crownIcon: {
    position: 'absolute' as const,
    top: '-6px',
    left: '-6px',
    fontSize: '14px',
  },
  codeBadge: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    padding: '8px 16px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '18px',
    letterSpacing: '2px',
  },
  historyItem: {
    padding: '14px 18px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
    marginBottom: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '2px solid transparent',
  },
  historyItemActive: {
    borderColor: '#4f46e5',
    background: 'rgba(79, 70, 229, 0.2)',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusActive: {
    background: 'rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
  },
  statusEnded: {
    background: 'rgba(148, 163, 184, 0.2)',
    color: '#94a3b8',
  },
  mobileToolbar: {
    display: 'none',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    padding: '12px 16px',
    background: 'rgba(49, 46, 129, 0.95)',
    backdropFilter: 'blur(12px)',
    zIndex: 100,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileDrawer: {
    display: 'none',
    position: 'fixed' as const,
    top: 0,
    right: 0,
    width: '280px',
    height: '100vh',
    background: '#312e81',
    zIndex: 200,
    padding: '24px',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease',
    overflowY: 'auto' as const,
  },
  mobileDrawerOpen: {
    transform: 'translateX(0)',
  },
  overlay: {
    display: 'none',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 150,
    opacity: 0,
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none' as const,
  },
  overlayVisible: {
    opacity: 1,
    pointerEvents: 'auto' as const,
  },
  iconButton: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '10px',
    padding: '10px',
    cursor: 'pointer',
    color: '#f8fafc',
    transition: 'all 0.2s ease',
  },
  smallButton: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    background: '#4f46e5',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  dangerButton: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    background: '#dc2626',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  ghostButton: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '2px solid #4f46e5',
    background: 'transparent',
    color: '#818cf8',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  optionInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '2px solid transparent',
    background: 'rgba(255,255,255,0.08)',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: '10px',
    transition: 'all 0.2s ease',
  },
  switchContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  switchLabel: {
    fontSize: '14px',
    color: '#e2e8f0',
  },
  switchTrack: {
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.2)',
    position: 'relative' as const,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  switchThumb: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'white',
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    transition: 'transform 0.2s ease',
  },
  switchThumbOn: {
    transform: 'translateX(20px)',
  },
  switchTrackOn: {
    background: '#4f46e5',
  },
  flexRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  flexBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  voteTitle: {
    fontSize: '22px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#f8fafc',
  },
  voteSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '20px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#64748b',
  },
  emptyEmoji: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginTop: '24px',
  },
  pulseAnimation: {
    animation: 'pulse 0.3s ease',
  },
};

const keyframes = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeInOption {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .fade-in {
    animation: fadeIn 0.3s ease forwards;
  }
  .fade-in-option {
    animation: fadeInOption 0.2s ease forwards;
  }
  .scale-in {
    animation: scaleIn 0.3s ease forwards;
  }
  .spin {
    animation: spin 0.5s linear infinite;
  }
  .slide-in-right {
    animation: slideInRight 0.3s ease forwards;
  }
  @media (max-width: 768px) {
    .mobile-toolbar { display: flex !important; }
    .mobile-drawer { display: block !important; }
    .overlay { display: block !important; }
    .left-panel { display: none; }
    .right-panel { display: none; }
    .main-layout {
      grid-template-columns: 1fr !important;
      padding-top: 80px !important;
    }
    .charts-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;

function AppEntry({
  onJoinSession,
  onCreateSession,
  isLoading,
}: {
  onJoinSession: (name: string, code: string) => void;
  onCreateSession: (name: string) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const handleJoin = () => {
    if (!name.trim()) {
      toast.error('请输入昵称');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      toast.error('请输入6位数字会议码');
      return;
    }
    onJoinSession(name.trim(), code);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('请输入昵称');
      return;
    }
    onCreateSession(name.trim());
  };

  return (
    <div style={styles.entryPage} className="fade-in">
      <div style={styles.entryCard}>
        <div style={styles.logo}>🗳️</div>
        <h1 style={styles.title}>VoteNow</h1>
        <p style={styles.subtitle}>在线会议投票与即时决策</p>

        <div style={styles.inputGroup}>
          <label style={styles.label}>昵称</label>
          <input
            style={styles.input}
            placeholder="请输入您的昵称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>会议码（6位数字）</label>
          <input
            style={styles.input}
            placeholder="请输入会议码"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>

        <button
          style={styles.button}
          onClick={handleJoin}
          disabled={isLoading}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.background = '#6366f1';
          }}
          onMouseLeave={(e) => {
            if (!isLoading) e.currentTarget.style.background = '#4f46e5';
          }}
          onMouseDown={(e) => {
            if (!isLoading) e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            if (!isLoading) e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isLoading ? (
            <span className="spin" style={{ display: 'inline-block' }}>
              ⏳
            </span>
          ) : (
            '加入会议'
          )}
        </button>

        <button
          style={styles.secondaryButton}
          onClick={handleCreate}
          disabled={isLoading}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.background = 'rgba(79, 70, 229, 0.2)';
          }}
          onMouseLeave={(e) => {
            if (!isLoading) e.currentTarget.style.background = 'transparent';
          }}
        >
          创建新会议
        </button>
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div style={styles.switchContainer}>
      <span style={styles.switchLabel}>{label}</span>
      <div
        style={{
          ...styles.switchTrack,
          ...(checked ? styles.switchTrackOn : {}),
        }}
        onClick={() => onChange(!checked)}
      >
        <div
          style={{
            ...styles.switchThumb,
            ...(checked ? styles.switchThumbOn : {}),
          }}
        />
      </div>
    </div>
  );
}

function VoteCreator({
  isHost,
  onCreateVote,
}: {
  isHost: boolean;
  onCreateVote: (
    title: string,
    options: string[],
    isAnonymous: boolean,
    voteType: 'single' | 'multiple',
    maxSelections: number
  ) => void;
}) {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [voteType, setVoteType] = useState<'single' | 'multiple'>('single');
  const [maxSelections, setMaxSelections] = useState(3);
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);

  const handleAddOption = () => {
    if (options.length >= 8) {
      toast.error('最多只能添加8个选项');
      return;
    }
    setOptions([...options, '']);
    setAnimatingIndex(options.length);
    setTimeout(() => setAnimatingIndex(null), 200);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      toast.error('至少需要2个选项');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    const titleValidation = engine.validateVoteTitle(title);
    if (!titleValidation.valid) {
      toast.error(titleValidation.message!);
      return;
    }

    const optionsValidation = engine.validateOptions(options);
    if (!optionsValidation.valid) {
      toast.error(optionsValidation.message!);
      return;
    }

    onCreateVote(
      title,
      options.filter((o) => o.trim()),
      isAnonymous,
      voteType,
      maxSelections
    );

    setTitle('');
    setOptions(['', '']);
    setIsAnonymous(false);
    setVoteType('single');
    setMaxSelections(3);
    toast.success('投票创建成功！');
  };

  if (!isHost) {
    return null;
  }

  return (
    <div style={styles.leftPanel} className="left-panel fade-in">
      <h3 style={styles.sectionTitle}>
        <span>📝</span> 创建投票
      </h3>

      <div style={styles.inputGroup}>
        <label style={styles.label}>投票标题</label>
        <input
          style={styles.optionInput}
          placeholder="请输入投票标题（最多50字）"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 50))}
        />
        <div
          style={{ fontSize: '12px', color: '#64748b', textAlign: 'right' }}
        >
          {title.length}/50
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={styles.label}>选项</label>
        {options.map((opt, index) => (
          <div
            key={index}
            className={animatingIndex === index ? 'fade-in-option' : ''}
            style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}
          >
            <input
              style={{ ...styles.optionInput, flex: 1 }}
              placeholder={`选项 ${index + 1}`}
              value={opt}
              onChange={(e) =>
                handleOptionChange(index, e.target.value.slice(0, 30))
              }
            />
            {options.length > 2 && (
              <button
                style={{
                  ...styles.iconButton,
                  padding: '12px',
                  height: '44px',
                }}
                onClick={() => handleRemoveOption(index)}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {options.length < 8 && (
          <button
            style={{ ...styles.ghostButton, width: '100%', marginTop: '8px' }}
            onClick={handleAddOption}
          >
            + 添加选项
          </button>
        )}
      </div>

      <Switch
        label="匿名投票"
        checked={isAnonymous}
        onChange={setIsAnonymous}
      />

      <Switch
        label={voteType === 'single' ? '单选模式' : '多选模式'}
        checked={voteType === 'multiple'}
        onChange={(v) => setVoteType(v ? 'multiple' : 'single')}
      />

      {voteType === 'multiple' && (
        <div style={styles.switchContainer}>
          <span style={styles.switchLabel}>最多可选</span>
          <select
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
            value={maxSelections}
            onChange={(e) => setMaxSelections(Number(e.target.value))}
          >
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n} style={{ background: '#312e81' }}>
                {n} 项
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        style={{ ...styles.button, marginTop: '24px' }}
        onClick={handleSubmit}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#6366f1')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#4f46e5')}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        创建投票
      </button>
    </div>
  );
}

function VoteDisplay({
  vote,
  currentUser,
  onVote,
  onEndVote,
  onExport,
  isHost,
}: {
  vote: Vote;
  currentUser: Participant;
  onVote: (optionIds: string[]) => void;
  onEndVote: () => void;
  onExport: () => void;
  isHost: boolean;
}) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const selections = engine.getParticipantSelections(
      vote,
      currentUser.id
    );
    setSelectedOptions(selections);
  }, [vote.id, currentUser.id]);

  const totalVotes = engine.getTotalVotes(vote);
  const uniqueVoters = engine.getUniqueVotersCount(vote);
  const isActive = vote.status === 'active';

  const handleOptionClick = (optionId: string) => {
    if (!isActive) return;

    let newSelected: string[];
    if (vote.voteType === 'single') {
      newSelected =
        selectedOptions[0] === optionId ? [] : [optionId];
    } else {
      if (selectedOptions.includes(optionId)) {
        newSelected = selectedOptions.filter((id) => id !== optionId);
      } else {
        if (selectedOptions.length >= vote.maxSelections) {
          toast.error(`最多只能选择${vote.maxSelections}项`);
          return;
        }
        newSelected = [...selectedOptions, optionId];
      }
    }

    setSelectedOptions(newSelected);
    onVote(newSelected);

    setPulsingIds((prev) => new Set(prev).add(optionId));
    setTimeout(() => {
      setPulsingIds((prev) => {
        const next = new Set(prev);
        next.delete(optionId);
        return next;
      });
    }, 300);
  };

  const sortedOptions = engine.getSortedOptionsByVotes(vote);
  const maxVoteCount = Math.max(...vote.options.map((o) => o.voteCount), 1);

  const barData = sortedOptions.map((opt) => ({
    name: opt.text.length > 12 ? opt.text.slice(0, 12) + '...' : opt.text,
    fullName: opt.text,
    votes: opt.voteCount,
    percentage: totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0,
    isMax: opt.voteCount === maxVoteCount && opt.voteCount > 0,
  }));

  const pieData = vote.options.map((opt) => ({
    name: opt.text,
    value: opt.voteCount,
    percentage: totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0,
  }));

  const barColors = barData.map((d) => (d.isMax ? '#4f46e5' : '#94a3b8'));
  const pieColors = ['#4f46e5', '#7c3aed', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

  const barTooltipFormatter = (value: number, name: string, props: any) => {
    const pct = props.payload.percentage.toFixed(1);
    return [value + ' 票 (' + pct + '%)', props.payload.fullName];
  };

  const pieTooltipFormatter = (value: number, name: string, props: any) => {
    const pct = props.payload.percentage.toFixed(1);
    return [value + ' 票 (' + pct + '%)', name];
  };

  return (
    <div style={styles.card} className="fade-in">
      <div style={styles.flexBetween}>
        <div>
          <h2 style={styles.voteTitle}>{vote.title}</h2>
          <p style={styles.voteSubtitle}>
            {vote.voteType === 'single' ? '单选' : '多选（最多' + vote.maxSelections + '项）'}
            {vote.isAnonymous ? ' · 匿名投票' : ''} · 
            <span
              style={{
                ...styles.statusBadge,
                marginLeft: '8px',
                ...(isActive ? styles.statusActive : styles.statusEnded),
              }}
            >
              {isActive ? '进行中' : '已结束'}
            </span>
          </p>
        </div>
        {isHost && (
          <div style={styles.flexRow}>
            {isActive && (
              <button
                style={styles.dangerButton}
                onClick={onEndVote}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
              >
                结束投票
              </button>
            )}
            <button
              style={styles.ghostButton}
              onClick={onExport}
            >
              导出结果
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        {vote.options.map((opt) => {
          const isSelected = selectedOptions.includes(opt.id);
          const isPulsing = pulsingIds.has(opt.id);
          return (
            <button
              key={opt.id}
              style={{
                ...styles.optionButton,
                ...(isSelected ? styles.selectedOption : {}),
                animation: isPulsing ? 'pulse 0.3s ease' : undefined,
              }}
              onClick={() => handleOptionClick(opt.id)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = '#6366f1';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = '#4338ca';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = isSelected
                  ? 'scale(1.02)'
                  : 'translateY(-2px)';
              }}
              disabled={!isActive}
            >
              <span>
                {isSelected && '✓ '}
                {opt.text}
              </span>
              <span style={styles.voteCount}>{opt.voteCount} 票</span>
            </button>
          );
        })}
      </div>

      <div style={styles.chartContainer}>
        <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
          共 {uniqueVoters} 人参与，{totalVotes} 票
        </div>

        <div style={styles.chartsGrid}>
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#cbd5e1',
              }}
            >
              票数排行
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ left: 10, right: 30 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#312e81',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '13px',
                  }}
                  formatter={barTooltipFormatter}
                />
                <Bar
                  dataKey="votes"
                  radius={[0, 8, 8, 0]}
                  animationDuration={300}
                  animationEasing="ease-out"
                >
                  {barData.map((_, index) => (
                    <Cell key={'cell-' + index} fill={barColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#cbd5e1',
              }}
            >
              占比分布
            </div>
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={300}
                    animationEasing="ease-out"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={'cell-' + index}
                        fill={pieColors[index % pieColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#312e81',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '13px',
                    }}
                    formatter={pieTooltipFormatter}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span style={{ color: '#cbd5e1', fontSize: '11px' }}>
                        {value.length > 8 ? value.slice(0, 8) + '...' : value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -70%)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#f8fafc',
                  }}
                >
                  {uniqueVoters}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  投票人数
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoteHistory({
  votes,
  currentVoteId,
  onSelectVote,
  onReactivate,
  isHost,
}: {
  votes: Vote[];
  currentVoteId?: string;
  onSelectVote: (id: string) => void;
  onReactivate: (id: string) => void;
  isHost: boolean;
}) {
  if (votes.length === 0) return null;

  return (
    <div style={styles.card} className="fade-in">
      <h3 style={styles.sectionTitle}>
        <span>📋</span> 投票历史
      </h3>

      {votes.map((vote) => {
        const totalVotes = engine.getTotalVotes(vote);
        const isActive = vote.status === 'active';
        const isCurrent = vote.id === currentVoteId;

        return (
          <div
            key={vote.id}
            style={{
              ...styles.historyItem,
              ...(isCurrent ? styles.historyItemActive : {}),
            }}
            onClick={() => onSelectVote(vote.id)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = isCurrent
                ? 'rgba(79, 70, 229, 0.2)'
                : 'rgba(255,255,255,0.05)')
            }
          >
            <div style={styles.flexBetween}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 500,
                    marginBottom: '4px',
                    color: '#f8fafc',
                  }}
                >
                  {vote.title}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {totalVotes} 票
                </div>
              </div>
              <div style={styles.flexRow}>
                <span
                  style={{
                    ...styles.statusBadge,
                    ...(isActive ? styles.statusActive : styles.statusEnded),
                  }}
                >
                  {isActive ? '进行中' : '已结束'}
                </span>
                {isHost && !isActive && (
                  <button
                    style={styles.smallButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReactivate(vote.id);
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = '#6366f1')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = '#4f46e5')
                    }
                  >
                    重新激活
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ParticipantsList({
  participants,
  currentVoteId,
}: {
  participants: Participant[];
  currentVoteId?: string;
}) {
  const displayedParticipants = participants.slice(0, 16);
  const hasMore = participants.length > 16;

  return (
    <div style={styles.rightPanel} className="right-panel slide-in-right">
      <h3 style={styles.sectionTitle}>
        <span>👥</span> 在线参与者
        <span
          style={{
            fontSize: '13px',
            color: '#64748b',
            fontWeight: 400,
          }}
        >
          ({participants.length})
        </span>
      </h3>

      {displayedParticipants.map((participant) => {
        const hasVoted = currentVoteId
          ? engine.hasParticipantVoted(participant, currentVoteId)
          : false;

        return (
          <div
            key={participant.id}
            style={styles.participantItem}
            className="scale-in"
          >
            <div
              style={{
                ...styles.participantAvatar,
                background: participant.avatarColor,
                border: `3px solid ${hasVoted ? '#22c55e' : '#64748b'}`,
              }}
            >
              {participant.isHost && (
                <span style={styles.crownIcon}>👑</span>
              )}
              {participant.name.charAt(0).toUpperCase()}
            </div>
            <span style={styles.participantName}>{participant.name}</span>
          </div>
        );
      })}

      {hasMore && (
        <div
          style={{
            textAlign: 'center',
            color: '#64748b',
            fontSize: '13px',
            padding: '12px',
          }}
        >
          还有 {participants.length - 16} 位参与者...
        </div>
      )}
    </div>
  );
}

function MobileHeader({
  sessionCode,
  isHost,
  onToggleDrawer,
}: {
  sessionCode: string;
  isHost: boolean;
  onToggleDrawer: () => void;
}) {
  return (
    <div style={styles.mobileToolbar} className="mobile-toolbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>🗳️</span>
        <span style={{ fontWeight: 700, fontSize: '18px' }}>VoteNow</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={styles.codeBadge}>{sessionCode}</span>
        <button style={styles.iconButton} onClick={onToggleDrawer}>
          👥
        </button>
      </div>
    </div>
  );
}

function MobileDrawer({
  isOpen,
  onClose,
  isHost,
  participants,
  currentVoteId,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  participants: Participant[];
  currentVoteId?: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div
        style={{
          ...styles.overlay,
          ...(isOpen ? styles.overlayVisible : {}),
        }}
        className="overlay"
        onClick={onClose}
      />
      <div
        style={{
          ...styles.mobileDrawer,
          ...(isOpen ? styles.mobileDrawerOpen : {}),
        }}
        className="mobile-drawer"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>菜单</h3>
          <button style={styles.iconButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {isHost && (
          <div style={{ marginBottom: '24px' }}>{children}</div>
        )}

        <ParticipantsList
          participants={participants}
          currentVoteId={currentVoteId}
        />
      </div>
    </>
  );
}

export default function VoteApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [transitions, setTransitions] = useState<Set<string>>(new Set());

  const { currentUser, session, isLoading } = state;
  const isHost = currentUser?.isHost ?? false;

  const handleCreateSession = useCallback((name: string) => {
    dispatch({ type: 'JOIN_SESSION_START' });

    setTimeout(() => {
      const host = engine.createParticipant(name, true);
      const newSession = engine.createSession(host);

      dispatch({
        type: 'JOIN_SESSION_SUCCESS',
        payload: { session: newSession, user: host },
      });

      toast.success('会议创建成功！');
    }, 500);
  }, []);

  const handleJoinSession = useCallback(
    (name: string, code: string) => {
      dispatch({ type: 'JOIN_SESSION_START' });

      setTimeout(() => {
        const participant = engine.createParticipant(name, false);

        const existingSessions = new Map<string, { session: any; host: any }>();

        const existing = existingSessions.get(code);
        if (existing) {
          const updatedSession = engine.addParticipant(
            existing.session,
            participant
          );

          dispatch({
            type: 'JOIN_SESSION_SUCCESS',
            payload: { session: updatedSession, user: participant },
          });

          toast.success('已加入会议！');
        } else {
          const host = engine.createParticipant('主持人', true);
          const newSession = engine.createSession(host);
          newSession.code = code;

          const sessionWithParticipant = engine.addParticipant(
            newSession,
            participant
          );

          dispatch({
            type: 'JOIN_SESSION_SUCCESS',
            payload: { session: sessionWithParticipant, user: participant },
          });

          toast.success('已加入会议！');
        }
      }, 500);
    },
    []
  );

  const handleCreateVote = useCallback(
    (
      title: string,
      options: string[],
      isAnonymous: boolean,
      voteType: 'single' | 'multiple',
      maxSelections: number
    ) => {
      const newVote = engine.createVote({
        title,
        options,
        isAnonymous,
        voteType,
        maxSelections,
      });
      dispatch({ type: 'CREATE_VOTE', payload: newVote });
      setTransitions((prev) => new Set(prev).add(newVote.id));
      setTimeout(() => {
        setTransitions((prev) => {
          const next = new Set(prev);
          next.delete(newVote.id);
          return next;
        });
      }, 300);
    },
    []
  );

  const handleVote = useCallback(
    (voteId: string, optionIds: string[]) => {
      if (!currentUser) return;

      const startTime = performance.now();
      dispatch({
        type: 'CAST_VOTE',
        payload: {
          voteId,
          optionIds,
          participantId: currentUser.id,
        },
      });
      const endTime = performance.now();

      if (endTime - startTime > 100) {
        console.warn(
          `投票更新耗时 ${(endTime - startTime).toFixed(0)}ms，目标 < 100ms`
        );
      }
    },
    [currentUser]
  );

  const handleEndVote = useCallback((voteId: string) => {
    dispatch({ type: 'END_VOTE', payload: voteId });
    toast.success('投票已结束');
  }, []);

  const handleReactivateVote = useCallback((voteId: string) => {
    dispatch({ type: 'REACTIVATE_VOTE', payload: voteId });
    toast.success('投票已重新激活，票数已清零');
  }, []);

  const handleSelectVote = useCallback((voteId: string) => {
    dispatch({ type: 'SET_CURRENT_VOTE', payload: voteId });
  }, []);

  const handleExport = useCallback((vote: Vote) => {
    const exportData = engine.exportVoteResult(vote);

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vote.title}_${new Date(exportData.timestamp).toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('结果已导出！');
  }, []);

  const currentVote = useMemo(() => {
    if (!session) return null;
    if (session.currentVoteId) {
      return session.votes.find((v) => v.id === session.currentVoteId);
    }
    return session.votes[0] || null;
  }, [session]);

  useEffect(() => {
    if (currentVote) {
      const startTime = performance.now();
      requestAnimationFrame(() => {
        const endTime = performance.now();
        if (endTime - startTime > 200) {
          console.warn(
            `图表渲染耗时 ${(endTime - startTime).toFixed(0)}ms，目标 < 200ms`
          );
        }
      });
    }
  }, [currentVote?.options.map((o) => o.voteCount).join(',')]);

  if (!session || !currentUser) {
    return (
      <div style={styles.app}>
        <style>{keyframes}</style>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#312e81',
              color: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
        />
        <AppEntry
          onJoinSession={handleJoinSession}
          onCreateSession={handleCreateSession}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{keyframes}</style>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#312e81',
            color: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />

      <MobileHeader
        sessionCode={session.code}
        isHost={isHost}
        onToggleDrawer={() => setDrawerOpen(true)}
      />

      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isHost={isHost}
        participants={session.participants}
        currentVoteId={session.currentVoteId}
      >
        <VoteCreator isHost={isHost} onCreateVote={handleCreateVote} />
      </MobileDrawer>

      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '32px' }}>🗳️</span>
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                margin: 0,
                background:
                  'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              VoteNow
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              在线会议投票与即时决策
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>会议码</div>
            <div style={styles.codeBadge}>{session.code}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {isHost ? '主持人 👑' : '参会者'}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.mainLayout} className="main-layout">
        <VoteCreator isHost={isHost} onCreateVote={handleCreateVote} />

        <div style={styles.centerPanel}>
          {currentVote ? (
            <VoteDisplay
              key={currentVote.id}
              vote={currentVote}
              currentUser={currentUser}
              onVote={(optionIds) => handleVote(currentVote.id, optionIds)}
              onEndVote={() => handleEndVote(currentVote.id)}
              onExport={() => handleExport(currentVote)}
              isHost={isHost}
            />
          ) : (
            <div style={styles.card}>
              <div style={styles.emptyState}>
                <div style={styles.emptyEmoji}>📊</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#e2e8f0' }}>
                  {isHost ? '还没有投票' : '等待主持人创建投票'}
                </h3>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {isHost
                    ? '在左侧面板创建第一个投票开始吧！'
                    : '请稍等，主持人即将发起投票...'}
                </p>
              </div>
            </div>
          )}

          <VoteHistory
            votes={session.votes}
            currentVoteId={session.currentVoteId}
            onSelectVote={handleSelectVote}
            onReactivate={handleReactivateVote}
            isHost={isHost}
          />
        </div>

        <ParticipantsList
          participants={session.participants}
          currentVoteId={session.currentVoteId}
        />
      </div>
    </div>
  );
}
