import { ScrollArea } from '@/components/arena/ScrollArea';
import { Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface BattleLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'danger';
}

interface BattleLogProps {
  entries: BattleLogEntry[];
}

const iconMap = {
  info: <Info className="w-3 h-3 text-arena-accent flex-shrink-0" />,
  success: <CheckCircle className="w-3 h-3 text-arena-success flex-shrink-0" />,
  danger: <AlertTriangle className="w-3 h-3 text-arena-danger flex-shrink-0" />,
};

const colorMap = {
  info: 'text-arena-accent',
  success: 'text-arena-success',
  danger: 'text-arena-danger',
};

export default function BattleLog({ entries }: BattleLogProps) {
  return (
    <div className="glass p-4">
      <h4 className="text-xs font-display text-arena-muted mb-2 uppercase tracking-wider">
        对战日志
      </h4>
      <ScrollArea className="h-32">
        {entries.length === 0 ? (
          <p className="text-arena-muted text-xs">等待对战开始...</p>
        ) : (
          <div className="space-y-1.5">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-1.5 text-xs">
                {iconMap[entry.type]}
                <span className={colorMap[entry.type]}>{entry.message}</span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
