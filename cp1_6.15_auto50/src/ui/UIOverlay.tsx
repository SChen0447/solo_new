import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGameStore, MemoryFragment } from '../store/gameStore';
import { InteractionHandler } from '../interaction/InteractionHandler';

interface UIOverlayProps {
  interactionHandler: InteractionHandler | null;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ interactionHandler }) => {
  const backpack = useGameStore(s => s.backpack);
  const fragments = useGameStore(s => s.fragments);
  const timeline = useGameStore(s => s.timeline);
  const storyPopup = useGameStore(s => s.storyPopup);
  const errorMessage = useGameStore(s => s.errorMessage);
  const shakeBackpack = useGameStore(s => s.shakeBackpack);
  const snapHighlightSlot = useGameStore(s => s.snapHighlightSlot);
  const fps = useGameStore(s => s.fps);
  const unlockedStories = useGameStore(s => s.unlockedStories);
  const hideStory = useGameStore(s => s.hideStory);
  const showStory = useGameStore(s => s.showStory);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isSmall = windowWidth < 1024;

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', fontFamily: "'Cinzel', sans-serif" }}>
      <BackpackPanel
        backpack={backpack}
        fragments={fragments}
        interactionHandler={interactionHandler}
        shake={shakeBackpack}
        isSmall={isSmall}
        unlockedStories={unlockedStories}
        showStory={showStory}
      />
      <TimelinePanel
        timeline={timeline}
        fragments={fragments}
        interactionHandler={interactionHandler}
        snapHighlightSlot={snapHighlightSlot}
        isSmall={isSmall}
      />
      {storyPopup.visible && <StoryPopup text={storyPopup.text} onClose={hideStory} />}
      {errorMessage && <ErrorMessage message={errorMessage} />}
      <FPSMonitor fps={fps} />
    </div>
  );
};

interface BackpackPanelProps {
  backpack: string[];
  fragments: MemoryFragment[];
  interactionHandler: InteractionHandler | null;
  shake: boolean;
  isSmall: boolean;
  unlockedStories: number;
  showStory: (text: string) => void;
}

const BackpackPanel: React.FC<BackpackPanelProps> = ({
  backpack, fragments, interactionHandler, shake, isSmall, unlockedStories, showStory,
}) => {
  const panelWidth = isSmall ? 240 : 320;
  const panelHeight = isSmall ? 150 : 200;
  const cellSize = isSmall ? 45 : 60;
  const gap = 8;
  const cols = 4;

  const [redFlash, setRedFlash] = useState(false);
  const prevShake = useRef(shake);

  useEffect(() => {
    if (shake && !prevShake.current) {
      setRedFlash(true);
      setTimeout(() => setRedFlash(false), 200);
    }
    prevShake.current = shake;
  }, [shake]);

  const handleDragStart = useCallback((e: React.MouseEvent, fragmentId: string) => {
    if (interactionHandler) {
      interactionHandler.startBackpackDrag(e, fragmentId);
    }
  }, [interactionHandler]);

  const handleCollectedClick = useCallback((frag: MemoryFragment) => {
    if (frag.collected && unlockedStories > 0) {
      showStory(frag.story);
    }
  }, [unlockedStories, showStory]);

  const backpackFrags = backpack.map(id => fragments.find(f => f.id === id)).filter(Boolean) as MemoryFragment[];
  const isCollected = (frag: MemoryFragment) => {
    return frag.collected && timelineHasFragment(frag.id);
  };

  const timelineState = useGameStore.getState().timeline;
  function timelineHasFragment(id: string): boolean {
    return timelineState.some(s => s.fragmentId === id);
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        bottom: isSmall ? 80 : 100,
        width: panelWidth,
        height: panelHeight,
        background: redFlash ? 'rgba(180, 30, 30, 0.7)' : 'rgba(0, 0, 0, 0.7)',
        borderRadius: 12,
        border: `1px solid ${shake ? '#ff4444' : 'rgba(255, 215, 0, 0.3)'}`,
        animation: shake ? 'shake 0.3s ease-in-out' : undefined,
        pointerEvents: 'auto',
        padding: 12,
        overflowX: isSmall ? 'auto' : 'hidden',
        overflowY: 'hidden',
        transition: 'background 0.1s, border-color 0.1s',
      }}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
      <div style={{ color: '#ffd700', fontSize: isSmall ? 11 : 13, marginBottom: 8, letterSpacing: 1 }}>
        背包 ({backpackFrags.length})
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, gap }}>
        {backpackFrags.map((frag) => {
          const inTimeline = timelineHasFragment(frag.id);
          const isStarred = frag.collected && unlockedStories > 0 && inTimeline;
          return (
            <div
              key={frag.id}
              onMouseDown={(e) => !inTimeline && handleDragStart(e, frag.id)}
              onClick={() => isStarred && handleCollectedClick(frag)}
              style={{
                width: cellSize,
                height: cellSize,
                background: 'rgba(30, 25, 50, 0.8)',
                border: `2px solid ${isStarred ? '#ffd700' : frag.color}`,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inTimeline ? 'default' : 'grab',
                fontSize: isSmall ? 16 : 20,
                position: 'relative',
                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                userSelect: 'none',
                opacity: inTimeline ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!inTimeline) {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 10px ${frag.color}60`;
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <span>{frag.icon}</span>
              <span style={{
                fontSize: isSmall ? 8 : 9,
                color: frag.color,
                fontWeight: 'bold',
              }}>
                {frag.order}
              </span>
              {isStarred && (
                <span style={{
                  position: 'absolute',
                  bottom: 1,
                  right: 3,
                  fontSize: isSmall ? 8 : 10,
                }}>
                  ⭐
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface TimelinePanelProps {
  timeline: { index: number; fragmentId: string | null }[];
  fragments: MemoryFragment[];
  interactionHandler: InteractionHandler | null;
  snapHighlightSlot: number | null;
  isSmall: boolean;
}

const TimelinePanel: React.FC<TimelinePanelProps> = ({
  timeline, fragments, interactionHandler, snapHighlightSlot, isSmall,
}) => {
  const height = isSmall ? 60 : 80;

  const handleSlotDragStart = useCallback((e: React.MouseEvent, fragmentId: string, slotIndex: number) => {
    if (interactionHandler) {
      interactionHandler.startTimelineDrag(e, fragmentId, slotIndex);
    }
  }, [interactionHandler]);

  return (
    <div
      id="timeline-panel"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '10%',
        width: '80%',
        height,
        background: 'rgba(0, 0, 0, 0.6)',
        borderTop: '1px solid rgba(255, 215, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 10px',
        pointerEvents: 'auto',
        gap: 6,
        animation: 'fadeIn 0.3s ease-in-out',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      {timeline.map((slot) => {
        const frag = slot.fragmentId ? fragments.find(f => f.id === slot.fragmentId) : null;
        const isHighlighted = snapHighlightSlot === slot.index;
        const slotSize = isSmall ? 30 : 40;

        return (
          <div
            key={slot.index}
            style={{
              width: slotSize,
              height: slotSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: frag
                ? `2px solid ${frag.color}`
                : isHighlighted
                  ? '2px solid #4ade80'
                  : '2px dashed rgba(150, 150, 150, 0.4)',
              background: frag ? 'rgba(30, 25, 50, 0.9)' : 'transparent',
              cursor: frag ? 'grab' : 'default',
              transition: 'border-color 0.2s, background 0.2s',
              animation: isHighlighted ? 'blink 0.5s ease-in-out infinite' : undefined,
              position: 'relative',
              flexShrink: 0,
            }}
            onMouseDown={frag ? (e) => handleSlotDragStart(e, frag.id, slot.index) : undefined}
          >
            {frag ? (
              <>
                <span style={{ fontSize: isSmall ? 12 : 16 }}>{frag.icon}</span>
                <span style={{
                  position: 'absolute',
                  bottom: -2,
                  fontSize: isSmall ? 7 : 8,
                  color: frag.color,
                  fontWeight: 'bold',
                }}>
                  {frag.order}
                </span>
              </>
            ) : (
              <span style={{ fontSize: isSmall ? 8 : 10, color: 'rgba(150,150,150,0.3)' }}>
                {slot.index + 1}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface StoryPopupProps {
  text: string;
  onClose: () => void;
}

const StoryPopup: React.FC<StoryPopupProps> = ({ text, onClose }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayedText('');
    setIsComplete(false);

    const interval = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= text.length) {
        setDisplayedText(text);
        setIsComplete(true);
        clearInterval(interval);
      } else {
        setDisplayedText(text.slice(0, indexRef.current));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        pointerEvents: 'auto',
        animation: 'fadeInOverlay 0.3s ease-in-out',
        zIndex: 1000,
      }}
      onClick={isComplete ? onClose : undefined}
    >
      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        style={{
          background: 'rgba(20, 20, 30, 0.9)',
          borderRadius: 16,
          padding: '32px 40px',
          maxWidth: 600,
          width: '90%',
          color: '#e0e0e0',
          fontSize: 16,
          lineHeight: 1.8,
          fontFamily: "'Cinzel', serif",
          border: '1px solid rgba(255, 215, 0, 0.3)',
          boxShadow: '0 0 40px rgba(168, 85, 247, 0.2), 0 0 80px rgba(15, 12, 41, 0.5)',
          animation: 'fadeInCard 0.3s ease-in-out',
          cursor: isComplete ? 'pointer' : 'default',
          position: 'relative',
        }}
      >
        <style>{`
          @keyframes fadeInCard {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
        <div style={{ marginBottom: 16, color: '#ffd700', fontSize: 18, letterSpacing: 2 }}>
          记忆碎片·重构
        </div>
        <div style={{ whiteSpace: 'pre-wrap', minHeight: 80 }}>
          {displayedText}
          {!isComplete && <span style={{ animation: 'cursorBlink 0.8s infinite', color: '#ffd700' }}>▎</span>}
        </div>
        {isComplete && (
          <div style={{
            marginTop: 20,
            textAlign: 'right',
            color: 'rgba(255, 215, 0, 0.5)',
            fontSize: 12,
          }}>
            点击任意处关闭
          </div>
        )}
      </div>
    </div>
  );
};

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#ff4444',
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: "'Cinzel', sans-serif",
        textShadow: '0 0 20px rgba(255, 68, 68, 0.5)',
        animation: 'errorFlash 1s ease-in-out',
        pointerEvents: 'none',
        zIndex: 999,
        letterSpacing: 3,
      }}
    >
      <style>{`
        @keyframes errorFlash {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          40% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          60% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
      {message}
    </div>
  );
};

const FPSMonitor: React.FC<{ fps: number }> = ({ fps }) => {
  const color = fps >= 50 ? '#4ade80' : fps >= 30 ? '#ffd700' : '#ff4444';
  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        color,
        fontSize: 11,
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.5)',
        padding: '4px 8px',
        borderRadius: 4,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      FPS: {fps}
    </div>
  );
};
