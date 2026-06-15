import { useEffect, useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useBattleStore } from '@/store/useBattleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { matchmakingService } from '@/client/MatchmakingService';
import { CountdownOverlay } from '@/components/arena/CountdownOverlay';
import ProblemPanel from '@/components/arena/ProblemPanel';
import OpponentPanel from '@/components/arena/OpponentPanel';
import ScoreBoard from '@/components/arena/ScoreBoard';
import BattleLog from '@/components/arena/BattleLog';
import ResultOverlay from '@/components/arena/ResultOverlay';
import { Swords, X, Send } from 'lucide-react';

type BattleStateType = 'idle' | 'matching' | 'countdown' | 'playing' | 'result';

export default function ArenaPage() {
  const {
    battleState,
    problem,
    opponent,
    timeRemaining,
    myPassedCases,
    opponentPassedCases,
    opponentEditRange,
    battleResult,
    battleLog,
    countdown,
    setBattleState,
    setProblem,
    setOpponent,
    setTimeRemaining,
    setMyPassedCases,
    setOpponentPassedCases,
    setOpponentEditRange,
    setBattleResult,
    setCountdown,
    addBattleLog,
    resetBattle,
  } = useBattleStore();

  const { user, token } = useAuthStore();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [opponentEditing, setOpponentEditing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const codeSyncTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdownStep, setCountdownStep] = useState<3 | 2 | 1>(3);

  const onCountdownComplete = useCallback(() => {
    if (countdownStep > 1) {
      setCountdownStep((s) => (s - 1) as 3 | 2 | 1);
    } else {
      setBattleState('playing');
    }
  }, [countdownStep, setBattleState]);

  useEffect(() => {
    if (token) {
      matchmakingService.connect(token);
    }

    const onMatchFound = (data: unknown) => {
      const d = data as { opponent: typeof opponent; problem: typeof problem };
      setOpponent(d.opponent!);
      setProblem(d.problem!);
      setBattleState('countdown');
      setCountdownStep(3);
      addBattleLog({ message: `匹配成功！对手: ${d.opponent?.nickname}`, type: 'info' });
    };

    const onCountdown = (data: unknown) => {
      const d = data as { count: number };
      setCountdown(d.count as 3 | 2 | 1);
    };

    const onMatchStart = () => {
      setBattleState('playing');
      addBattleLog({ message: '对战开始！', type: 'success' });
    };

    const onOpponentEditing = (data: unknown) => {
      const d = data as { range: { startLine: number; endLine: number } };
      setOpponentEditRange(d.range);
      setOpponentEditing(true);
      setTimeout(() => setOpponentEditing(false), 2000);
    };

    const onBattleResult = (data: unknown) => {
      const d = data as {
        myPassedCases: number;
        opponentPassedCases: number;
        winner: 'me' | 'opponent' | 'draw';
        eloChange: number;
      };
      setMyPassedCases(d.myPassedCases);
      setOpponentPassedCases(d.opponentPassedCases);
      setBattleResult({
        winner: d.winner,
        myPassedCases: d.myPassedCases,
        opponentPassedCases: d.opponentPassedCases,
        myTotalTime: 0,
        opponentTotalTime: 0,
        eloChange: d.eloChange,
      });
      setBattleState('result');
    };

    const onBattleTime = (data: unknown) => {
      const d = data as { timeRemaining: number };
      setTimeRemaining(d.timeRemaining);
    };

    const onBattleEnd = () => {
      setBattleState('result');
    };

    matchmakingService.on('match:found', onMatchFound);
    matchmakingService.on('match:countdown', onCountdown);
    matchmakingService.on('match:start', onMatchStart);
    matchmakingService.on('opponent:editing', onOpponentEditing);
    matchmakingService.on('battle:result', onBattleResult);
    matchmakingService.on('battle:time', onBattleTime);
    matchmakingService.on('battle:end', onBattleEnd);

    return () => {
      matchmakingService.off('match:found', onMatchFound);
      matchmakingService.off('match:countdown', onCountdown);
      matchmakingService.off('match:start', onMatchStart);
      matchmakingService.off('opponent:editing', onOpponentEditing);
      matchmakingService.off('battle:result', onBattleResult);
      matchmakingService.off('battle:time', onBattleTime);
      matchmakingService.off('battle:end', onBattleEnd);
    };
  }, [
    token,
    setOpponent,
    setProblem,
    setBattleState,
    setCountdown,
    addBattleLog,
    setOpponentEditRange,
    setMyPassedCases,
    setOpponentPassedCases,
    setBattleResult,
    setTimeRemaining,
  ]);

  useEffect(() => {
    if (battleState === 'playing') {
      codeSyncTimer.current = setInterval(() => {
        const model = (window as unknown as { monacoEditor?: { getEditor?: () => { getSelection?: () => { selectionStartLineNumber: number; endLineNumber: number } } } }).monacoEditor?.getEditor?.();
        if (model) {
          const sel = model.getSelection?.();
          if (sel) {
            matchmakingService.syncEditRange({
              startLine: sel.selectionStartLineNumber,
              endLine: sel.endLineNumber,
            });
          }
        }
      }, 2000);
    }
    return () => {
      if (codeSyncTimer.current) clearInterval(codeSyncTimer.current);
    };
  }, [battleState]);

  const handleJoinMatch = () => {
    matchmakingService.joinMatch();
    setBattleState('matching');
    addBattleLog({ message: '正在寻找对手...', type: 'info' });
  };

  const handleCancelMatch = () => {
    matchmakingService.cancelMatch();
    setBattleState('idle');
    addBattleLog({ message: '已取消匹配', type: 'info' });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    matchmakingService.submitCode(code);
    addBattleLog({ message: '代码已提交，等待评判...', type: 'info' });
    setTimeout(() => setSubmitting(false), 2000);
  };

  const handleEditorMount = (editor: unknown) => {
    (window as unknown as Record<string, unknown>).monacoEditor = {
      getEditor: () => editor as { getSelection: () => { selectionStartLineNumber: number; endLineNumber: number } },
    };
  };

  const handleResultClose = () => {
    resetBattle();
    setCode('');
  };

  const progressPercent = (timeRemaining / 600) * 100;
  const progressColor =
    timeRemaining > 300
      ? '#00ff88'
      : timeRemaining > 120
      ? '#ffaa00'
      : '#ff6b6b';

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="h-screen flex flex-col bg-arena-bg">
      {battleState === 'countdown' && (
        <CountdownOverlay seconds={countdownStep} onComplete={onCountdownComplete} />
      )}

      {battleState === 'result' && battleResult && opponent && (
        <ResultOverlay
          result={battleResult}
          opponentNickname={opponent.nickname}
          opponentRank={opponent.rank}
          onClose={handleResultClose}
        />
      )}

      {(battleState === 'idle' || battleState === 'matching') && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {battleState === 'idle' ? (
              <button
                onClick={handleJoinMatch}
                className="px-12 py-4 rounded-xl font-display text-xl font-bold text-arena-bg bg-gradient-to-r from-arena-accent to-cyan-400 hover:brightness-110 transition-all animate-glow"
              >
                <Swords className="w-6 h-6 inline mr-2" />
                开始匹配
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-arena-accent border-t-transparent animate-spin" />
                <p className="text-arena-muted font-display">寻找对手中...</p>
                <button
                  onClick={handleCancelMatch}
                  className="px-6 py-2 rounded-lg border border-arena-danger/30 text-arena-danger hover:bg-arena-danger/10 transition-colors"
                >
                  <X className="w-4 h-4 inline mr-1" />
                  取消匹配
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {battleState === 'playing' && (
        <div className="flex-1 flex flex-col md:flex-row gap-0 overflow-hidden">
          <div className="w-full md:w-[65%] flex flex-col p-3 gap-3 overflow-hidden">
            {problem && <ProblemPanel title={problem.title} description={problem.description} />}

            <div className="relative h-2 rounded-full bg-arena-border overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%`, backgroundColor: progressColor }}
              />
            </div>
            <div className="text-xs text-arena-muted text-right font-display">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>

            <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-arena-border/30">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={problem?.templateCode || code}
                onChange={(v) => setCode(v || '')}
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg font-semibold text-arena-bg bg-gradient-to-r from-arena-accent to-cyan-400 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4 inline mr-1" />
                {submitting ? '提交中...' : '提交代码'}
              </button>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden px-3 py-2.5 rounded-lg border border-arena-border text-arena-muted"
              >
                <Swords className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className={`w-full md:w-[35%] flex flex-col p-3 gap-3 border-l border-arena-border/30 overflow-y-auto transition-transform ${
              showSidebar ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
            } fixed md:static inset-y-0 right-0 z-40 bg-arena-bg md:bg-transparent`}
          >
            <button
              onClick={() => setShowSidebar(false)}
              className="md:hidden self-end text-arena-muted"
            >
              <X className="w-5 h-5" />
            </button>

            {opponent && (
              <OpponentPanel
                nickname={opponent.nickname}
                rank={opponent.rank}
                elo={opponent.elo}
                isEditing={opponentEditing}
                editRange={opponentEditRange}
              />
            )}

            {problem && (
              <ScoreBoard
                myPassed={myPassedCases}
                opponentPassed={opponentPassedCases}
                totalCases={problem.testCases}
                myNickname={user?.nickname || '你'}
                opponentNickname={opponent?.nickname || '对手'}
              />
            )}

            <BattleLog entries={battleLog} />
          </div>
        </div>
      )}
    </div>
  );
}
