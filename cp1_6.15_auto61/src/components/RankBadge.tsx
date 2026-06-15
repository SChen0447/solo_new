import { cn } from '@/lib/utils';

interface RankBadgeProps {
  rank: 'bronze' | 'silver' | 'gold' | 'diamond';
  size?: 'sm' | 'md' | 'lg';
}

const rankConfig = {
  bronze: { color: '#cd7f32', label: 'Bronze' },
  silver: { color: '#c0c0c0', label: 'Silver' },
  gold: { color: '#ffd700', label: 'Gold' },
  diamond: { color: '#b9f2ff', label: 'Diamond' },
};

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const config = rankConfig[rank];

  return (
    <span
      className={cn(
        'inline-flex items-center font-display font-semibold rounded-full border transition-transform duration-200 hover:scale-105',
        sizeMap[size]
      )}
      style={{
        color: config.color,
        borderColor: config.color,
        backgroundColor: `${config.color}15`,
      }}
    >
      {config.label}
    </span>
  );
}
