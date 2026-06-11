import { Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useSocket } from '../hooks/useSocket';

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

export function TimeSlider() {
  const drawActions = useStore((s) => s.drawActions);
  const isReplaying = useStore((s) => s.isReplaying);
  const setIsReplaying = useStore((s) => s.setIsReplaying);
  const setDrawActions = useStore((s) => s.setDrawActions);
  const socket = useStore((s) => s.socket);
  const { requestSnapshot } = useSocket();

  const maxTimestamp =
    drawActions.length > 0
      ? Math.max(...drawActions.map((a) => a.timestamp))
      : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);

    if (value >= maxTimestamp) {
      setIsReplaying(false);
      if (socket) {
        const allActions = useStore.getState().drawActions;
        setDrawActions(allActions);
      }
      return;
    }

    setIsReplaying(true);
    requestSnapshot(value);
    const filtered = useStore
      .getState()
      .drawActions.filter((a) => a.timestamp <= value);
    setDrawActions(filtered);
  };

  const currentValue = maxTimestamp;

  return (
    <div className="glass-dark absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-xl">
      <Clock size={18} className="text-white/70 flex-shrink-0" />

      <input
        type="range"
        min={0}
        max={maxTimestamp || 1}
        defaultValue={maxTimestamp}
        onChange={handleChange}
        className="range-slider w-64"
      />

      <span className="text-white/70 text-sm whitespace-nowrap">
        {formatTime(maxTimestamp > 0 ? maxTimestamp : Date.now())}
      </span>

      {isReplaying ? (
        <span className="flex items-center gap-1.5 text-amber-400 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          回溯中
        </span>
      ) : (
        <span className="text-green-400 text-sm font-medium">当前</span>
      )}
    </div>
  );
}
