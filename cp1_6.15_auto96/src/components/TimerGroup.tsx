import React, { useEffect, useState } from 'react';
import { useRecipeStore, Timer, RecipeStep } from '../store/recipeStore';
import { Socket } from 'socket.io-client';

interface TimerGroupProps {
  socket: Socket | null;
  steps: RecipeStep[];
}

const TimerGroup: React.FC<TimerGroupProps> = ({ socket, steps }) => {
  const { timers, isDarkMode, updateTimer, setTimers, startTimer, pauseTimer, resetTimer, setTimerDuration } = useRecipeStore();
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState('');
  const [editSeconds, setEditSeconds] = useState('');

  useEffect(() => {
    if (!socket) return;

    const handleTimersUpdate = (timersData: Timer[]) => {
      setTimers(timersData);
    };

    const handleTimerStarted = ({ timerId, remaining }: { timerId: string; remaining: number }) => {
      updateTimer(timerId, { isRunning: true, remaining });
    };

    const handleTimerPaused = ({ timerId, remaining }: { timerId: string; remaining: number }) => {
      updateTimer(timerId, { isRunning: false, remaining });
    };

    const handleTimerReset = ({ timerId, duration }: { timerId: string; duration: number }) => {
      updateTimer(timerId, { isRunning: false, remaining: duration, duration });
    };

    const handleTimerSet = ({ timerId, duration, remaining }: { timerId: string; duration: number; remaining: number }) => {
      updateTimer(timerId, { duration, remaining });
    };

    const handleTimerFinished = ({ timerId }: { timerId: string; stepId: string }) => {
      updateTimer(timerId, { isRunning: false, remaining: 0 });
    };

    socket.on('timers:update', handleTimersUpdate);
    socket.on('timer:started', handleTimerStarted);
    socket.on('timer:paused', handleTimerPaused);
    socket.on('timer:reset', handleTimerReset);
    socket.on('timer:set', handleTimerSet);
    socket.on('timer:finished', handleTimerFinished);

    return () => {
      socket.off('timers:update', handleTimersUpdate);
      socket.off('timer:started', handleTimerStarted);
      socket.off('timer:paused', handleTimerPaused);
      socket.off('timer:reset', handleTimerReset);
      socket.off('timer:set', handleTimerSet);
      socket.off('timer:finished', handleTimerFinished);
    };
  }, [socket, setTimers, updateTimer]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (remaining: number, isRunning: boolean): string => {
    if (!isRunning && remaining > 0) return isDarkMode ? '#e0e0e0' : '#5d4037';
    if (remaining <= 10) return '#f44336';
    if (remaining <= 30) return '#ff9800';
    return isDarkMode ? '#e0e0e0' : '#5d4037';
  };

  const shouldBlink = (remaining: number, isRunning: boolean): boolean => {
    return remaining <= 10 && remaining > 0 && isRunning;
  };

  const handleStart = (timerId: string) => {
    socket?.emit('timer:start', { timerId });
    startTimer(timerId);
  };

  const handlePause = (timerId: string) => {
    socket?.emit('timer:pause', { timerId });
    pauseTimer(timerId);
  };

  const handleReset = (timerId: string) => {
    socket?.emit('timer:reset', { timerId });
    resetTimer(timerId);
  };

  const handleStartEdit = (timer: Timer) => {
    setEditingTimerId(timer.id);
    setEditMinutes(Math.floor(timer.duration / 60).toString());
    setEditSeconds((timer.duration % 60).toString());
  };

  const handleSaveEdit = (timerId: string) => {
    const minutes = parseInt(editMinutes) || 0;
    const seconds = parseInt(editSeconds) || 0;
    const duration = minutes * 60 + seconds;
    if (duration > 0) {
      socket?.emit('timer:set', { timerId, duration });
      setTimerDuration(timerId, duration);
    }
    setEditingTimerId(null);
  };

  const getTimerForStep = (stepId: string): Timer | undefined => {
    return timers.find(t => t.stepId === stepId);
  };

  return (
    <div className="timer-group">
      <h3 className="timer-group-title">烹饪步骤</h3>
      <div className="steps-container">
        {steps.map((step, index) => {
          const timer = getTimerForStep(step.id);
          return (
            <div key={step.id} className={`step-card ${isDarkMode ? 'dark' : ''}`}>
              <div className="step-number">{index + 1}</div>
              <div className="step-content">
                <p className="step-text">{step.content}</p>
                {timer && (
                  <div className="step-timer">
                    {editingTimerId === timer.id ? (
                      <div className="timer-edit">
                        <input
                          type="number"
                          value={editMinutes}
                          onChange={(e) => setEditMinutes(e.target.value)}
                          min="0"
                          max="999"
                          className="time-input"
                        />
                        <span className="time-separator">:</span>
                        <input
                          type="number"
                          value={editSeconds}
                          onChange={(e) => setEditSeconds(e.target.value)}
                          min="0"
                          max="59"
                          className="time-input"
                        />
                        <button
                          className="save-btn"
                          onClick={() => handleSaveEdit(timer.id)}
                        >
                          确定
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`timer-display ${shouldBlink(timer.remaining, timer.isRunning) ? 'blink' : ''}`}
                        style={{ color: getTimeColor(timer.remaining, timer.isRunning) }}
                        onDoubleClick={() => handleStartEdit(timer)}
                      >
                        <span className="timer-time">{formatTime(timer.remaining)}</span>
                        <span className="timer-hint">（双击修改）</span>
                      </div>
                    )}

                    <div className="timer-controls">
                      {timer.isRunning ? (
                        <button
                          className="timer-btn pause-btn"
                          onClick={() => handlePause(timer.id)}
                        >
                          暂停
                        </button>
                      ) : (
                        <button
                          className="timer-btn start-btn"
                          onClick={() => handleStart(timer.id)}
                          disabled={timer.remaining === 0}
                        >
                          启动
                        </button>
                      )}
                      <button
                        className="timer-btn reset-btn"
                        onClick={() => handleReset(timer.id)}
                      >
                        重置
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .timer-group {
          padding: 16px;
          overflow-y: auto;
        }

        .timer-group-title {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: #5d4037;
        }

        .dark .timer-group-title {
          color: #e0e0e0;
        }

        .steps-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .step-card {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: linear-gradient(to right, #fff8e1, #ffe0b2);
          border: 2px solid #d7ccc8;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .step-card:hover {
          border-color: #a1887f;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .dark .step-card {
          background: linear-gradient(to right, #3d3d3d, #2d2d2d);
          border-color: #555;
        }

        .dark .step-card:hover {
          border-color: #888;
        }

        .step-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          min-width: 36px;
          background-color: #795548;
          color: white;
          border-radius: 50%;
          font-weight: bold;
          font-size: 14px;
        }

        .dark .step-number {
          background-color: #5d4037;
        }

        .step-content {
          flex: 1;
        }

        .step-text {
          margin: 0 0 12px 0;
          color: #4e342e;
          font-size: 14px;
          line-height: 1.5;
        }

        .dark .step-text {
          color: #e0e0e0;
        }

        .step-timer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }

        .timer-display {
          font-size: 24px;
          font-weight: bold;
          font-family: 'Fira Code', monospace;
          cursor: pointer;
          user-select: none;
        }

        .timer-time {
          display: inline-block;
        }

        .timer-hint {
          font-size: 11px;
          font-weight: normal;
          opacity: 0.6;
          margin-left: 8px;
        }

        .blink {
          animation: blinkAnimation 0.5s ease-in-out infinite;
        }

        @keyframes blinkAnimation {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        .timer-edit {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .time-input {
          width: 50px;
          padding: 4px 6px;
          border: 1px solid #d7ccc8;
          border-radius: 4px;
          font-size: 16px;
          font-family: 'Fira Code', monospace;
          text-align: center;
        }

        .dark .time-input {
          background-color: #424242;
          color: #e0e0e0;
          border-color: #555;
        }

        .time-separator {
          font-size: 20px;
          font-weight: bold;
        }

        .save-btn {
          margin-left: 8px;
          padding: 4px 10px;
          border: none;
          border-radius: 4px;
          background-color: #795548;
          color: white;
          font-size: 12px;
          cursor: pointer;
        }

        .timer-controls {
          display: flex;
          gap: 8px;
        }

        .timer-btn {
          padding: 6px 16px;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .start-btn {
          background-color: #4caf50;
          color: white;
        }

        .start-btn:hover:not(:disabled) {
          background-color: #43a047;
        }

        .start-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pause-btn {
          background-color: #ffeb3b;
          color: #5d4037;
        }

        .pause-btn:hover {
          background-color: #fdd835;
        }

        .reset-btn {
          background-color: #9e9e9e;
          color: white;
        }

        .reset-btn:hover {
          background-color: #757575;
        }

        @media (max-width: 768px) {
          .step-timer {
            flex-direction: column;
            align-items: flex-start;
          }

          .timer-controls {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default TimerGroup;
