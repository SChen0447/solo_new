import RankBadge from '@/components/RankBadge';
import { Circle } from 'lucide-react';

interface OpponentPanelProps {
  nickname: string;
  rank: 'bronze' | 'silver' | 'gold' | 'diamond';
  elo: number;
  isEditing: boolean;
  editRange: { startLine: number; endLine: number } | null;
}

export default function OpponentPanel({
  nickname,
  rank,
  elo,
  isEditing,
  editRange,
}: OpponentPanelProps) {
  const initial = nickname.charAt(0).toUpperCase();

  return (
    <div className="glass p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-arena-accent/20 border border-arena-accent/40 flex items-center justify-center font-display font-bold text-arena-accent">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold truncate">{nickname}</span>
            {isEditing && (
              <Circle className="w-2.5 h-2.5 fill-arena-success text-arena-success animate-pulse-dot" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <RankBadge rank={rank} size="sm" />
            <span className="text-arena-muted text-xs">{elo} ELO</span>
          </div>
        </div>
      </div>
      {editRange && (
        <div className="mt-3 text-xs text-arena-muted">
          正在编辑: 第 {editRange.startLine} - {editRange.endLine} 行
        </div>
      )}
    </div>
  );
}
