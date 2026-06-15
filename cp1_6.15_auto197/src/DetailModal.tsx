import { useEffect, useRef, useState } from 'react';
import { useStore, getEmotionColor, getEmotionLabel, type Bubble, type EmotionType } from './store';

interface DetailModalProps {
  bubble: Bubble;
  onClose: () => void;
}

export default function DetailModal({ bubble, onClose }: DetailModalProps) {
  const { replies, submitReply, getEmotionStats } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bubbleReplies = replies.filter((r) => r.bubbleId === bubble.id);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stats = getEmotionStats();
    const emotions: EmotionType[] = ['happy', 'sad', 'angry', 'anxious', 'calm'];
    const total = stats.total || 1;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 30;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ffffff20';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      for (let j = 0; j <= 5; j++) {
        const angle = (Math.PI * 2 * j) / 5 - Math.PI / 2;
        const r = (radius * i) / 5;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.strokeStyle = '#ffffff30';
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
      ctx.stroke();
    }

    ctx.beginPath();
    emotions.forEach((emotion, i) => {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const value = stats[emotion] / total;
      const r = radius * value;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = '#a78bfa40';
    ctx.fill();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.stroke();

    emotions.forEach((emotion, i) => {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const value = stats[emotion] / total;
      const r = radius * value;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#a78bfa';
      ctx.fill();

      const labelX = centerX + (radius + 20) * Math.cos(angle);
      const labelY = centerY + (radius + 20) * Math.sin(angle);
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${getEmotionLabel(emotion)} ${Math.round(value * 100)}%`, labelX, labelY);
    });
  }, [replies]);

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || isSubmitting) return;
    if (replyContent.length > 100) return;

    setIsSubmitting(true);
    try {
      await submitReply(bubble.id, replyContent.trim());
      setReplyContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative"
        style={{
          width: '500px',
          backgroundColor: 'rgba(30, 30, 46, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          transition: 'all 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="mb-4">
          <div
            className="inline-block px-3 py-1 rounded-full text-white text-sm mb-3"
            style={{ backgroundColor: getEmotionColor(bubble.emotion) }}
          >
            {getEmotionLabel(bubble.emotion)}
          </div>
          <p className="text-gray-200 text-lg leading-relaxed">{bubble.content}</p>
          <p className="text-gray-500 text-sm mt-2">{formatTime(bubble.timestamp)}</p>
        </div>

        <div className="mb-4">
          <canvas
            ref={canvasRef}
            width={450}
            height={300}
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <h4 className="text-gray-300 text-sm mb-2">回复列表 ({bubbleReplies.length})</h4>
          <div
            className="space-y-2 overflow-y-auto"
            style={{ maxHeight: '200px' }}
          >
            {bubbleReplies.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">暂无回复，来留下第一条安慰吧</p>
            ) : (
              bubbleReplies.map((reply) => (
                <div
                  key={reply.id}
                  className="bg-gray-800/50 rounded-lg p-3"
                >
                  <p className="text-gray-300 text-sm">{reply.content}</p>
                  <p className="text-gray-500 text-xs mt-1">{formatTime(reply.timestamp)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="写下你的安慰或共鸣..."
            maxLength={100}
            className="flex-1 bg-gray-800/50 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
          <button
            onClick={handleSubmitReply}
            disabled={!replyContent.trim() || isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? '发送中...' : '发送'}
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-1 text-right">{replyContent.length}/100</p>
      </div>
    </div>
  );
}
