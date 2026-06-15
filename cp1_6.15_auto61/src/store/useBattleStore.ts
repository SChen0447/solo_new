import { create } from 'zustand';

type BattleStateType = 'idle' | 'matching' | 'countdown' | 'playing' | 'result';

interface Problem {
  id: string;
  title: string;
  description: string;
  templateCode: string;
  testCases: number;
}

interface Opponent {
  id: string;
  nickname: string;
  elo: number;
  rank: 'bronze' | 'silver' | 'gold' | 'diamond';
}

interface EditRange {
  startLine: number;
  endLine: number;
}

interface BattleResult {
  winner: 'me' | 'opponent' | 'draw';
  myPassedCases: number;
  opponentPassedCases: number;
  myTotalTime: number;
  opponentTotalTime: number;
  eloChange: number;
}

interface BattleLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'danger';
}

interface BattleState {
  battleState: BattleStateType;
  problem: Problem | null;
  opponent: Opponent | null;
  timeRemaining: number;
  myPassedCases: number;
  opponentPassedCases: number;
  myTotalTime: number;
  opponentTotalTime: number;
  opponentEditRange: EditRange | null;
  battleResult: BattleResult | null;
  battleLog: BattleLogEntry[];
  countdown: number;

  setBattleState: (state: BattleStateType) => void;
  setProblem: (problem: Problem) => void;
  setOpponent: (opponent: Opponent) => void;
  setTimeRemaining: (time: number) => void;
  setMyPassedCases: (cases: number) => void;
  setOpponentPassedCases: (cases: number) => void;
  setMyTotalTime: (time: number) => void;
  setOpponentTotalTime: (time: number) => void;
  setOpponentEditRange: (range: EditRange | null) => void;
  setBattleResult: (result: BattleResult) => void;
  setCountdown: (count: number) => void;
  addBattleLog: (entry: Omit<BattleLogEntry, 'id' | 'timestamp'>) => void;
  resetBattle: () => void;
}

export const useBattleStore = create<BattleState>((set) => ({
  battleState: 'idle',
  problem: null,
  opponent: null,
  timeRemaining: 600,
  myPassedCases: 0,
  opponentPassedCases: 0,
  myTotalTime: 0,
  opponentTotalTime: 0,
  opponentEditRange: null,
  battleResult: null,
  battleLog: [],
  countdown: 3,

  setBattleState: (state) => set({ battleState: state }),
  setProblem: (problem) => set({ problem }),
  setOpponent: (opponent) => set({ opponent }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setMyPassedCases: (cases) => set({ myPassedCases: cases }),
  setOpponentPassedCases: (cases) => set({ opponentPassedCases: cases }),
  setMyTotalTime: (time) => set({ myTotalTime: time }),
  setOpponentTotalTime: (time) => set({ opponentTotalTime: time }),
  setOpponentEditRange: (range) => set({ opponentEditRange: range }),
  setBattleResult: (result) => set({ battleResult: result }),
  setCountdown: (count) => set({ countdown: count }),

  addBattleLog: (entry) =>
    set((state) => ({
      battleLog: [
        ...state.battleLog,
        {
          ...entry,
          id: Math.random().toString(36).slice(2),
          timestamp: Date.now(),
        },
      ].slice(-50),
    })),

  resetBattle: () =>
    set({
      battleState: 'idle',
      problem: null,
      opponent: null,
      timeRemaining: 600,
      myPassedCases: 0,
      opponentPassedCases: 0,
      myTotalTime: 0,
      opponentTotalTime: 0,
      opponentEditRange: null,
      battleResult: null,
      battleLog: [],
      countdown: 3,
    }),
}));
