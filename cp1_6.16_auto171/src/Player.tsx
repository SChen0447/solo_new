import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Character, Action, CANVAS_WIDTH, CANVAS_HEIGHT, TIMELINE_DURATION } from './types';
import { CharacterSprite } from './components/CharacterSprite';

interface PlayerProps {
  characters: Character[];
  actions: Action[];
  playhead: number;
  setPlayhead: React.Dispatch<React.SetStateAction<number>>;
}

interface RenderState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

const easeInOut = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

const MOVE_SPEED = 200;
const JUMP_HEIGHT = 100;
const JUMP_DURATION = 0.3;
const ROTATE_SPEED = 360;

const Player: React.FC<PlayerProps> = ({
  characters,
  actions,
  playhead,
  setPlayhead
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const currentPlayheadRef = useRef<number>(playhead);

  useEffect(() => {
    currentPlayheadRef.current = playhead;
  }, [playhead]);

  const getMaxDuration = (): number => {
    if (actions.length === 0) return 10;
    return Math.min(TIMELINE_DURATION, Math.max(...actions.map(a => a.startTime + a.duration)) + 2);
  };

  const getCharacterRenderState = useCallback((char: Character, time: number): RenderState => {
    let state: RenderState = {
      x: char.x,
      y: char.y,
      scale: char.scale,
      rotation: char.rotation
    };

    const charActions = actions
      .filter(a => a.characterId === char.id && a.startTime <= time)
      .sort((a, b) => a.startTime - b.startTime);

    for (const action of charActions) {
      const elapsed = time - action.startTime;

      if (elapsed <= 0) continue;

      const duration = action.duration;
      const t = Math.min(1, elapsed / duration);
      const easedT = easeInOut(t);

      switch (action.type) {
        case 'walk': {
          const distance = MOVE_SPEED * duration * easedT;
          const direction = action.direction === 'left' ? -1 : 1;
          if (elapsed < duration) {
            state.x = char.x + distance * direction;
          } else {
            state.x = char.x + MOVE_SPEED * duration * direction;
          }
          char = { ...char, x: state.x };
          break;
        }
        case 'jump': {
          if (elapsed < JUMP_DURATION) {
            const jumpT = elapsed / JUMP_DURATION;
            const jumpProgress = easeInOut(jumpT);
            const height = 4 * JUMP_HEIGHT * jumpProgress * (1 - jumpProgress);
            state.y = char.y - height;
          } else {
            state.y = char.y;
          }
          break;
        }
        case 'rotate': {
          const targetRotation = action.targetRotation ?? 360;
          state.rotation = char.rotation + targetRotation * easedT;
          if (elapsed >= duration) {
            char = { ...char, rotation: state.rotation };
          }
          break;
        }
        case 'scale': {
          const targetScale = action.targetScale ?? 1.5;
          const startScale = char.scale;
          state.scale = startScale + (targetScale - startScale) * easedT;
          if (elapsed >= duration) {
            char = { ...char, scale: state.scale };
          }
          break;
        }
      }
    }

    return state;
  }, [actions]);

  const animate = useCallback((timestamp: number) => {
    if (lastTimeRef.current === null) {
      lastTimeRef.current = timestamp;
    }

    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    const maxDur = getMaxDuration();
    let newPlayhead = currentPlayheadRef.current + delta;

    if (newPlayhead >= maxDur) {
      newPlayhead = 0;
      setIsPlaying(false);
    }

    currentPlayheadRef.current = newPlayhead;
    setPlayhead(newPlayhead);

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, setPlayhead]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(animate);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, animate]);

  const handlePlay = () => {
    if (playhead >= getMaxDuration()) {
      setPlayhead(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setPlayhead(0);
  };

  const maxDuration = getMaxDuration();

  const getActiveDialog = (char: Character, time: number): string => {
    const activeActions = actions.filter(
      a => a.characterId === char.id && a.startTime <= time && a.startTime + a.duration >= time
    );
    if (activeActions.length > 0 && char.dialog) {
      return char.dialog;
    }
    return '';
  };

  return (
    <div className="player-container">
      <div className="player-header">
        <div className="player-controls">
          {!isPlaying ? (
            <button className="btn-primary" onClick={handlePlay}>
              ▶️ 播放
            </button>
          ) : (
            <button className="btn-secondary" onClick={handlePause}>
              ⏸️ 暂停
            </button>
          )}
          <button className="btn-secondary" onClick={handleReset}>
            🔄 重置
          </button>
        </div>
        <div className="player-time">
          <span>{playhead.toFixed(2)}s / {maxDuration.toFixed(2)}s</span>
        </div>
      </div>

      <div className="player-canvas-area">
        <div className="player-canvas">
          {characters.map(char => {
            const renderState = getCharacterRenderState(char, playhead);
            const dialog = getActiveDialog(char, playhead);
            return (
              <div
                key={char.id}
                className="player-character"
                style={{
                  left: renderState.x,
                  top: renderState.y,
                  transform: `scale(${renderState.scale}) rotate(${renderState.rotation}deg)`,
                  transformOrigin: 'center center'
                }}
              >
                <CharacterSprite type={char.type} color={char.color} size={60} />
                {dialog && (
                  <div className="dialog-bubble">
                    {dialog.length > 20 ? dialog.slice(0, 20) + '...' : dialog}
                  </div>
                )}
              </div>
            );
          })}
          {characters.length === 0 && (
            <div className="player-empty">
              还没有角色哦～ 请到编辑器添加角色 ✨
            </div>
          )}
        </div>
      </div>

      <div className="player-progress">
        <div
          className="progress-bar"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            setPlayhead(Math.max(0, Math.min(maxDuration, ratio * maxDuration)));
          }}
        >
          <div
            className="progress-fill"
            style={{ width: `${(playhead / maxDuration) * 100}%` }}
          />
          <div
            className="progress-playhead"
            style={{ left: `${(playhead / maxDuration) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Player;
