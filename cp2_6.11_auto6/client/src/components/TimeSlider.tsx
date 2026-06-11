import { useState, useRef, useCallback, useEffect } from 'react';
import { Clock, Play, Pause, SkipForward } from 'lucide-react';
import useStore from '../store/useStore';
import { useSocket } from '../hooks/useSocket';
import { DrawAction, StickyNoteData } from '../../../shared/types';

function formatTime(ts: number) {
  if (!ts) return '--:--:--';
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

export default function TimeSlider() {
  const drawActions = useStore((s) => s.drawActions);
  const stickyNotes = useStore((s) => s.stickyNotes);
  const originalDrawActions = useStore((s) => s.originalDrawActions);
  const originalStickyNotes = useStore((s) => s.originalStickyNotes);
  const isReplaying = useStore((s) => s.isReplaying);
  const setIsReplaying = useStore((s) => s.setIsReplaying);
  const setDrawActions = useStore((s) => s.setDrawActions);
  const setStickyNotes = useStore((s) => s.setStickyNotes);
  const setOriginalDrawActions = useStore((s) => s.setOriginalDrawActions);
  const setOriginalStickyNotes = useStore((s) => s.setOriginalStickyNotes);

  const { requestSnapshot } = useSocket();

  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [snapshot, setSnapshot] = useState<{
    drawActions: DrawAction[];
    stickyNotes: StickyNoteData[];
  } | null>(null);

  const rafRef = useRef<number>(0);
  const playStartRef = useRef<number>(0);
  const targetTimeRef = useRef<number>(0);
  const playTimerRef = useRef<number>(0);

  const maxTimestamp =
    drawActions.length > 0
      ? Math.max(...drawActions.map((a) => a.timestamp))
      : Date.now();

  useEffect(() => {
    setSliderValue(maxTimestamp);
  }, [maxTimestamp, drawActions.length]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
  }, []);

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  const enterReplay = useCallback(() => {
    if (originalDrawActions.length === 0 && drawActions.length > 0) {
      setOriginalDrawActions([...drawActions]);
      setOriginalStickyNotes([...stickyNotes]);
    }
    setIsReplaying(true);
  }, [drawActions, stickyNotes, originalDrawActions.length, setIsReplaying, setOriginalDrawActions, setOriginalStickyNotes]);

  const exitReplay = useCallback(() => {
    stopPlayback();
    if (originalDrawActions.length > 0 || originalStickyNotes.length > 0) {
      setDrawActions(originalDrawActions);
      setStickyNotes(originalStickyNotes);
      setOriginalDrawActions([]);
      setOriginalStickyNotes([]);
    }
    setIsReplaying(false);
    setSnapshot(null);
    setSliderValue(maxTimestamp);
  }, [originalDrawActions, originalStickyNotes, maxTimestamp, stopPlayback, setDrawActions, setStickyNotes, setIsReplaying, setOriginalDrawActions, setOriginalStickyNotes]);

  const applyUpTo = useCallback(
    (targetTs: number) => {
      if (!snapshot) return;
      const actions = snapshot.drawActions.filter((a) => a.timestamp <= targetTs);
      const notes = snapshot.stickyNotes.filter((n) => n.timestamp <= targetTs);
      setDrawActions(actions);
      setStickyNotes(notes);
    },
    [snapshot, setDrawActions, setStickyNotes]
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopPlayback();
    const value = Number(e.target.value);
    setSliderValue(value);

    if (value >= maxTimestamp) {
      exitReplay();
      return;
    }

    enterReplay();

    const handleSnapshot = (data: { drawActions: DrawAction[]; stickyNotes: StickyNoteData[] }) => {
      setSnapshot(data);
      applySnapshotAt(value, data);
    };

    const applySnapshotAt = (ts: number, data: { drawActions: DrawAction[]; stickyNotes: StickyNoteData[] }) => {
      const actions = data.drawActions.filter((a) => a.timestamp <= ts);
      const notes = data.stickyNotes.filter((n) => n.timestamp <= ts);
      setDrawActions(actions);
      setStickyNotes(notes);
    };

    if (snapshot) {
      applySnapshotAt(value, snapshot);
    } else {
      const socket = useStore.getState().socket;
      if (socket) {
        const handler = (data: { drawActions: DrawAction[]; stickyNotes: StickyNoteData[] }) => {
          socket.off('snapshot-data', handler);
          handleSnapshot(data);
        };
        socket.once('snapshot-data', handler);
        requestSnapshot(value);
      }
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    enterReplay();

    const socket = useStore.getState().socket;
    const startPlayback = (data: { drawActions: DrawAction[]; stickyNotes: StickyNoteData[] }) => {
      setSnapshot(data);
      const startTime = data.drawActions.length > 0 ? data.drawActions[0].timestamp : Date.now();
      const endTime = data.drawActions.length > 0 ? Math.max(...data.drawActions.map((a) => a.timestamp)) : Date.now();
      setSliderValue(startTime);
      setIsPlaying(true);
      playStartRef.current = performance.now();
      targetTimeRef.current = startTime;
      const duration = Math.max(2000, (endTime - startTime));

      const step = () => {
        const elapsed = performance.now() - playStartRef.current;
        const progress = Math.min(1, elapsed / duration);
        const currentTs = startTime + (endTime - startTime) * progress;
        setSliderValue(currentTs);
        applyUpTo(currentTs);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setIsPlaying(false);
        }
      };
      rafRef.current = requestAnimationFrame(step);
    };

    if (snapshot) {
      startPlayback(snapshot);
    } else if (socket) {
      const handler = (data: { drawActions: DrawAction[]; stickyNotes: StickyNoteData[] }) => {
        socket.off('snapshot-data', handler);
        startPlayback(data);
      };
      socket.once('snapshot-data', handler);
      requestSnapshot(maxTimestamp);
    }
  };

  const handleSkipForward = () => {
    exitReplay();
  };

  const isCurrent = sliderValue >= maxTimestamp && !isPlaying;

  return (
    <div className="glass-dark absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-xl animate-fade-in">
      <Clock size={18} className="text-white/70 flex-shrink-0" />

      <input
        type="range"
        min={
          snapshot
            ? Math.min(
              ...snapshot.drawActions.map((a) => a.timestamp)
            )
            : maxTimestamp - 1000
        }
        max={maxTimestamp || 1}
        value={sliderValue}
        onChange={handleSliderChange}
        className="range-slider w-64 md:w-80"
        disabled={isPlaying}
      />

      <span className="text-white/70 text-sm whitespace-nowrap font-mono">
        {formatTime(sliderValue)}
      </span>

      {!isCurrent && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePlayPause}
            className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-all duration-150"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={handleSkipForward}
            className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-all duration-150"
            title="跳转到当前"
          >
            <SkipForward size={16} />
          </button>
        </div>
      )}

      {isReplaying ? (
        <span className="flex items-center gap-1.5 text-amber-400 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          回溯中
        </span>
      ) : (
        <span className="text-green-400 text-sm font-medium whitespace-nowrap">
          ● 当前
        </span>
      )}
    </div>
  );
}
