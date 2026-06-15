import { useEffect, useRef, useState } from 'react';
import { useStore, type Bubble, type EmotionType } from './store';

interface BubbleWallProps {
  onBubbleClick: (bubble: Bubble) => void;
}

export default function BubbleWall({ onBubbleClick }: BubbleWallProps) {
  const { bubbles, timeRange, replies } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const hoveredIdRef = useRef<string | null>(null);
  const [, forceUpdate] = useState(0);

  const now = Date.now();
  const cutoff = now - timeRange * 60 * 60 * 1000;

  useEffect(() => {
    const animate = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        
        bubbles.forEach((bubble) => {
          if (bubble.id === hoveredIdRef.current) return;

          let newY = bubble.y + bubble.vy;
          let newVy = bubble.vy;

          if (newY - bubble.size / 2 < 60) {
            newY = 60 + bubble.size / 2;
            newVy = Math.abs(newVy);
          } else if (newY + bubble.size / 2 > height - 20) {
            newY = height - 20 - bubble.size / 2;
            newVy = -Math.abs(newVy);
          }

          const newRotation = bubble.rotation + bubble.vr;

          if (newY !== bubble.y || newRotation !== bubble.rotation || newVy !== bubble.vy) {
            useStore.setState((state) => ({
              bubbles: state.bubbles.map((b) =>
                b.id === bubble.id ? { ...b, y: newY, rotation: newRotation, vy: newVy } : b
              ),
            }));
          }
        });
      }

      forceUpdate((n) => n + 1);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bubbles]);

  const handleMouseEnter = (id: string) => {
    hoveredIdRef.current = id;
  };

  const handleMouseLeave = () => {
    hoveredIdRef.current = null;
  };

  const getBubbleReplies = (bubbleId: string) => {
    return replies.filter((r) => r.bubbleId === bubbleId);
  };

  const emotionColors: Record<EmotionType, string> = {
    happy: '#ffeb3b',
    sad: '#3f51b5',
    angry: '#f44336',
    anxious: '#ff9800',
    calm: '#4caf50',
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      }}
    >
      {bubbles.map((bubble) => {
        const isVisible = bubble.timestamp >= cutoff;
        const bubbleReplies = getBubbleReplies(bubble.id);
        const color = emotionColors[bubble.emotion];

        return (
          <div key={bubble.id}>
            <div
              className="absolute cursor-pointer flex items-center justify-center"
              style={{
                left: bubble.x - bubble.size / 2,
                top: bubble.y - bubble.size / 2,
                width: bubble.size,
                height: bubble.size,
                borderRadius: '50%',
                backgroundColor: color,
                opacity: isVisible ? 0.9 : 0.2,
                transition: 'transform 0.3s ease, opacity 0.25s ease',
                transform: `translateZ(0) rotate(${bubble.rotation}deg)`,
                boxShadow: `0 4px 20px ${color}40`,
              }}
              onMouseEnter={() => handleMouseEnter(bubble.id)}
              onMouseLeave={handleMouseLeave}
              onClick={() => onBubbleClick(bubble)}
            >
              <div
                className="w-full h-full flex items-center justify-center rounded-full"
                style={{
                  transform: hoveredIdRef.current === bubble.id ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                }}
              >
                <span
                  className="text-white text-center px-2 leading-tight"
                  style={{
                    fontSize: '14px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {bubble.content}
                </span>
              </div>
            </div>
            
            {bubbleReplies.length > 0 && isVisible && (
              <div
                className="absolute text-xs text-gray-400 text-center pointer-events-none"
                style={{
                  left: bubble.x - 40,
                  top: bubble.y + bubble.size / 2 + 4,
                  width: 80,
                  fontSize: '11px',
                  opacity: 0.8,
                }}
              >
                {bubbleReplies.length > 0 && `${bubbleReplies.length} 条回复`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
