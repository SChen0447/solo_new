import { useGameStore } from '../store/gameStore';
import { REWIND_DURATION_MS } from '../engine/TimeEngine';

const TIMELINE_WIDTH = 1920;
const TIMELINE_HEIGHT = 8;

interface HUDProps {
  onRewind: () => void;
}

export default function HUD({ onRewind }: HUDProps) {
  const {
    timeState,
    rewindProgress,
    fps,
    droppedFrames,
    totalRewindFrames,
    elapsedGameTime,
    snapshots,
    buttonFlash,
  } = useGameStore();

  const isRewinding = timeState === 'rewinding';
  const remainingSec = Math.max(
    0,
    (REWIND_DURATION_MS / 1000) * (1 - rewindProgress)
  );

  const fpsColor =
    fps > 58 ? '#2ecc71' : fps >= 30 ? '#f39c12' : '#e74c3c';

  const dropRate =
    totalRewindFrames > 0
      ? ((droppedFrames / totalRewindFrames) * 100).toFixed(1)
      : '0.0';

  const timelineProgress = isRewinding
    ? 1 - rewindProgress
    : Math.min(1, (elapsedGameTime % REWIND_DURATION_MS) / REWIND_DURATION_MS);

  const currentLabelTime = isRewinding
    ? `${remainingSec.toFixed(1)}s`
    : `${(elapsedGameTime / 1000).toFixed(1)}s`;

  const rewindStartLabelTime = snapshots.length > 0
    ? `${(snapshots[0].timestamp / 1000).toFixed(1)}s`
    : '0.0s';

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 20,
        }}
        className="hud-performance"
      >
        <div
          style={{
            background: 'rgba(45, 45, 68, 0.85)',
            borderRadius: 8,
            padding: '8px 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(4px)',
            fontFamily: "'Segoe UI', sans-serif",
            minWidth: 120,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: '#9ca3af',
              marginBottom: 2,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            FPS
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: fpsColor,
              lineHeight: 1,
            }}
          >
            {fps}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(45, 45, 68, 0.85)',
            borderRadius: 8,
            padding: '8px 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(4px)',
            fontFamily: "'Segoe UI', sans-serif",
            minWidth: 120,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: '#9ca3af',
              marginBottom: 2,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            帧丢弃率
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#c0392b',
              lineHeight: 1,
            }}
          >
            {dropRate}%
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(45, 45, 68, 0.85)',
          borderRadius: 8,
          padding: '10px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
          fontFamily: "'Segoe UI', sans-serif",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          zIndex: 20,
        }}
        className="hud-top-center"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: isRewinding ? 'rgba(231,76,60,0.2)' : 'rgba(241,196,15,0.15)',
              border: `1px solid ${isRewinding ? '#e74c3c' : '#f1c40f'}`,
              fontSize: 12,
              fontWeight: 700,
              color: isRewinding ? '#e74c3c' : '#f1c40f',
              letterSpacing: 1,
            }}
          >
            {isRewinding ? '⏪ 时间回溯中' : '⏵ 时间正常'}
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#e5e7eb',
              fontWeight: 500,
            }}
          >
            {isRewinding
              ? `剩余 ${remainingSec.toFixed(1)}s`
              : `游戏 ${(elapsedGameTime / 1000).toFixed(1)}s`}
          </div>
        </div>

        <button
          onClick={onRewind}
          disabled={isRewinding}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: isRewinding ? '#27ae60' : '#2ecc71',
            border: 'none',
            cursor: isRewinding ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: 18,
            boxShadow: buttonFlash
              ? '0 0 0 4px rgba(46,204,113,0.5), 0 2px 8px rgba(0,0,0,0.3)'
              : '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: buttonFlash ? 'scale(1.1)' : 'scale(1)',
            fontFamily: "'Segoe UI', sans-serif",
            opacity: isRewinding ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isRewinding) {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = buttonFlash
              ? 'scale(1.1)'
              : 'scale(1)';
          }}
          onMouseDown={(e) => {
            if (!isRewinding) {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }
          }}
          onMouseUp={(e) => {
            if (!isRewinding) {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }
          }}
          title="时间回溯 (回到3秒前)"
        >
          ⏪
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `100%`,
          maxWidth: TIMELINE_WIDTH,
          padding: '0 16px',
          zIndex: 20,
        }}
      >
        <div
          style={{
            position: 'relative',
            height: TIMELINE_HEIGHT + 28,
            background: 'rgba(45, 45, 68, 0.85)',
            borderRadius: 8,
            padding: '10px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: TIMELINE_HEIGHT,
              background: '#1a1a2e',
              borderRadius: 4,
              overflow: 'visible',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${timelineProgress * 100}%`,
                background: isRewinding ? '#e74c3c' : '#f1c40f',
                borderRadius: 4,
                transition: isRewinding ? 'none' : 'width 0.1s linear',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -14,
                left: `${timelineProgress * 100}%`,
                transform: 'translateX(-50%)',
                background: isRewinding ? '#e74c3c' : '#f1c40f',
                color: '#1a1a2e',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                fontFamily: "'Segoe UI', sans-serif",
                pointerEvents: 'none',
              }}
            >
              {currentLabelTime}
            </div>

            <div
              style={{
                position: 'absolute',
                top: -4,
                left: 0,
                width: 2,
                height: TIMELINE_HEIGHT + 8,
                background: '#9ca3af',
                opacity: 0.5,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -14,
                left: 0,
                transform: 'translateX(-50%)',
                color: '#9ca3af',
                fontSize: 9,
                fontWeight: 600,
                fontFamily: "'Segoe UI', sans-serif",
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {isRewinding ? `起点 ${rewindStartLabelTime}` : '0s'}
            </div>

            <div
              style={{
                position: 'absolute',
                top: -4,
                right: 0,
                width: 2,
                height: TIMELINE_HEIGHT + 8,
                background: '#9ca3af',
                opacity: 0.5,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -14,
                right: 0,
                transform: 'translateX(50%)',
                color: '#9ca3af',
                fontSize: 9,
                fontWeight: 600,
                fontFamily: "'Segoe UI', sans-serif",
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {isRewinding ? `当前` : `${(REWIND_DURATION_MS / 1000).toFixed(0)}s`}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 96,
          right: 16,
          background: 'rgba(45, 45, 68, 0.85)',
          borderRadius: 8,
          padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
          fontFamily: "'Segoe UI', sans-serif",
          fontSize: 12,
          color: '#9ca3af',
          zIndex: 20,
          lineHeight: 1.6,
        }}
        className="hud-hint"
      >
        <div style={{ fontWeight: 700, color: '#e5e7eb', marginBottom: 4 }}>
          操作说明
        </div>
        <div>• 空格: 跳跃</div>
        <div>• 点击 ⏪ 按钮: 时间回溯</div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hud-performance {
            top: auto !important;
            left: 50% !important;
            transform: translateX(-50%);
            bottom: 120px !important;
            flex-direction: row !important;
          }
          .hud-performance > div {
            padding: 6px 10px !important;
            min-width: 90px !important;
          }
          .hud-performance > div > div:last-child {
            font-size: 18px !important;
          }
          .hud-top-center {
            top: 12px !important;
            padding: 8px 14px !important;
          }
          .hud-top-center button {
            width: 38px !important;
            height: 38px !important;
            font-size: 14px !important;
          }
          .hud-top-center > div:first-child {
            gap: 8px !important;
          }
          .hud-hint {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
