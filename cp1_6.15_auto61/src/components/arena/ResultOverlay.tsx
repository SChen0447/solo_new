import { motion } from 'framer-motion';
import { Trophy, XCircle } from 'lucide-react';
import RankBadge from '@/components/RankBadge';

interface BattleResultData {
  winner: 'me' | 'opponent' | 'draw';
  myPassedCases: number;
  opponentPassedCases: number;
  myTotalTime: number;
  opponentTotalTime: number;
  eloChange: number;
}

interface ResultOverlayProps {
  result: BattleResultData;
  opponentNickname: string;
  opponentRank: 'bronze' | 'silver' | 'gold' | 'diamond';
  onClose: () => void;
}

export default function ResultOverlay({
  result,
  opponentNickname,
  opponentRank,
  onClose,
}: ResultOverlayProps) {
  const isWin = result.winner === 'me';
  const isDraw = result.winner === 'draw';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-arena-bg/90">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="glass-strong p-8 text-center max-w-sm w-full mx-4"
      >
        <div className="mb-4">
          {isWin ? (
            <Trophy className="w-16 h-16 text-arena-success mx-auto" />
          ) : isDraw ? (
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-arena-warning flex items-center justify-center font-display text-arena-warning text-2xl">
              =
            </div>
          ) : (
            <XCircle className="w-16 h-16 text-arena-danger mx-auto" />
          )}
        </div>

        <h2
          className={`font-display text-3xl font-bold mb-2 ${
            isWin
              ? 'text-arena-success'
              : isDraw
              ? 'text-arena-warning'
              : 'text-arena-danger'
          }`}
        >
          {isWin ? '胜利' : isDraw ? '平局' : '失败'}
        </h2>

        <div className="text-arena-muted text-sm mb-4">
          对手: {opponentNickname} <RankBadge rank={opponentRank} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-arena-muted">你的用例</p>
            <p className="text-arena-accent text-lg font-semibold">
              {result.myPassedCases}
            </p>
          </div>
          <div>
            <p className="text-arena-muted">对手用例</p>
            <p className="text-arena-danger text-lg font-semibold">
              {result.opponentPassedCases}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <span
            className={`font-display text-xl font-bold ${
              result.eloChange > 0
                ? 'text-arena-success'
                : result.eloChange < 0
                ? 'text-arena-danger'
                : 'text-arena-muted'
            }`}
          >
            {result.eloChange > 0 ? '+' : ''}
            {result.eloChange} ELO
          </span>
        </div>

        <button
          onClick={onClose}
          className="px-6 py-2 rounded-lg bg-arena-accent/20 text-arena-accent border border-arena-accent/30 hover:bg-arena-accent/30 transition-colors font-semibold"
        >
          返回竞技场
        </button>
      </motion.div>
    </div>
  );
}
