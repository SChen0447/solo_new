import { useEffect, useRef } from 'react';
import { useStore, getEmotionColor, getEmotionLabel, type EmotionType } from './store';

export default function EmotionSidebar() {
  const { timeRange, setTimeRange, getEmotionStats } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stats = getEmotionStats();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const emotions: EmotionType[] = ['happy', 'sad', 'angry', 'anxious', 'calm'];
    const maxCount = Math.max(...emotions.map((e) => stats[e]), 1);
    const maxHeight = 180;
    const barWidth = 30;
    const gap = 20;
    const startX = 25;
    const bottomY = canvas.height - 30;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    emotions.forEach((emotion, i) => {
      const count = stats[emotion];
      const height = (count / maxCount) * maxHeight;
      const x = startX + i * (barWidth + gap);
      const y = bottomY - height;

      ctx.fillStyle = getEmotionColor(emotion);
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, height, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#a0a0b0';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(getEmotionLabel(emotion), x + barWidth / 2, bottomY + 18);

      ctx.fillStyle = '#e0e0e0';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(count.toString(), x + barWidth / 2, y - 8);
    });
  }, [stats]);

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: '280px',
        backgroundColor: '#16162a',
        borderLeft: '4px solid transparent',
        borderImage: 'linear-gradient(to bottom, #6366f1, #a78bfa) 1',
      }}
    >
      <div className="p-5 flex-1 overflow-y-auto">
        <h3 className="text-gray-200 text-lg font-medium mb-4">情绪统计</h3>

        <div className="mb-6">
          <canvas
            ref={canvasRef}
            width={240}
            height={250}
            className="w-full"
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-300 text-sm">时间范围</label>
            <span className="text-purple-400 text-sm font-medium">
              {timeRange === 24 ? '最近24小时' : `最近${timeRange}小时`}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="24"
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #a78bfa ${(timeRange / 24) * 100}%, #2d2d44 ${(timeRange / 24) * 100}%, #2d2d44 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1小时</span>
            <span>24小时</span>
          </div>
        </div>

        <div className="space-y-3">
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
          >
            <p className="text-gray-400 text-xs mb-1">总发布数</p>
            <p className="text-2xl font-bold text-purple-400">{stats.total}</p>
          </div>
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(167, 139, 250, 0.1)' }}
          >
            <p className="text-gray-400 text-xs mb-1">总回复数</p>
            <p className="text-2xl font-bold text-purple-300">{stats.totalReplies}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
