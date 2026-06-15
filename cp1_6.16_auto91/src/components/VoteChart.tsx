import { motion } from 'framer-motion';
import type { RankingItem } from '../types';

interface VoteChartProps {
  rankings: RankingItem[];
}

const getBarColor = (index: number, total: number) => {
  const startColor = [255, 215, 0];
  const endColor = [255, 140, 0];
  const ratio = total > 1 ? index / (total - 1) : 0;
  
  const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * ratio);
  const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * ratio);
  const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
};

const getMedalEmoji = (index: number) => {
  switch (index) {
    case 0: return '🥇';
    case 1: return '🥈';
    case 2: return '🥉';
    default: return `${index + 1}`;
  }
};

export function VoteChart({ rankings }: VoteChartProps) {
  const maxVotes = Math.max(...rankings.map(r => r.votes), 1);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#E0E0E0] mb-4">最终排名</h3>
      {rankings.map((item, index) => (
        <motion.div
          key={item.copyId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl w-8">{getMedalEmoji(index)}</span>
              <span className="text-gray-300 truncate max-w-[180px]" title={item.content}>
                {item.content.slice(0, 20)}...
              </span>
            </div>
            <div className="text-right">
              <span className="font-bold text-[#FFD700]">{item.votes}票</span>
              <span className="text-gray-400 ml-2">{item.percentage}%</span>
            </div>
          </div>
          <div className="h-8 bg-[#2a2a2a] rounded-lg overflow-hidden relative">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: '100%' }}
              transition={{ duration: 0.5, delay: index * 0.1 + 0.2, ease: 'easeOut' }}
              className="absolute bottom-0 left-0 right-0 rounded-lg"
              style={{
                width: `${(item.votes / maxVotes) * 100}%`,
                backgroundColor: getBarColor(index, rankings.length)
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white drop-shadow-lg">
              {item.percentage}%
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
