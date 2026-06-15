import { useGameStore } from '../store/useGameStore';
import { COLORS } from '../utils/constants';

export default function HUD() {
  const { progress, score, combo, maxCombo, playerHp, maxPlayerHp, showPerfHint, fps } = useGameStore();

  const hpPercent = (playerHp / maxPlayerHp) * 100;

  return (
    <>
      <div 
        className="w-full h-10 flex items-center px-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <div 
          className="relative w-full h-6 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${COLORS.progressStart} 0%, ${COLORS.progressEnd} 100%)`,
            }}
          />
          <div 
            className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {Math.floor(progress * 100)}%
          </div>
        </div>
      </div>

      <div 
        className="w-full h-20 flex items-center justify-between px-6"
        style={{ backgroundColor: COLORS.statusBg }}
      >
        <div className="flex items-center gap-3">
          <div
            className="text-3xl font-bold"
            style={{
              color: combo > 0 ? COLORS.note : '#888',
              textShadow: combo > 0 ? `0 0 10px ${COLORS.note}40` : 'none',
              transition: 'transform 0.1s ease-out',
              transform: combo > 0 && combo % 5 === 0 ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {combo}
          </div>
          <div className="text-gray-400 text-sm">
            <div>连击</div>
            <div className="text-xs">最高: {maxCombo}</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-white">{score.toLocaleString()}</div>
          <div className="text-xs text-gray-400">得分</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-sm text-gray-400">
            <div>HP</div>
            <div className="text-xs">{playerHp}/{maxPlayerHp}</div>
          </div>
          <div 
            className="w-48 h-5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${hpPercent}%`,
                background: `linear-gradient(90deg, ${COLORS.playerHpStart} 0%, ${hpPercent > 50 ? COLORS.playerHpStart : COLORS.playerHpEnd} 100%)`,
              }}
            />
          </div>
        </div>
      </div>

      {showPerfHint && (
        <div
          className="fixed bottom-4 right-4 text-sm px-3 py-1.5 rounded"
          style={{
            color: '#aaa',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            animation: 'fadeInOut 1s ease-in-out',
          }}
        >
          性能优化已启用
        </div>
      )}

      <div
        className="fixed bottom-4 left-4 text-xs"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        FPS: {Math.round(fps)}
      </div>
    </>
  );
}
