import { useState, useEffect } from 'react';
import BubbleWall from './BubbleWall';
import DetailModal from './DetailModal';
import EmotionSidebar from './EmotionSidebar';
import { useStore, getEmotionColor, getEmotionLabel, type Bubble, type EmotionType } from './store';

const EMOTIONS: EmotionType[] = ['happy', 'sad', 'angry', 'anxious', 'calm'];

export default function App() {
  const { selectedBubble, selectBubble, submitBubble, fetchBubbles, isModalOpen } = useStore();
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBubbles();
  }, []);

  const handleSubmit = async () => {
    if (!selectedEmotion || !content.trim() || isSubmitting) return;
    if (content.length > 200) return;

    setIsSubmitting(true);
    try {
      await submitBubble(selectedEmotion, content.trim());
      setContent('');
      setSelectedEmotion(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBubbleClick = (bubble: Bubble) => {
    selectBubble(bubble);
  };

  const handleCloseModal = () => {
    selectBubble(null);
  };

  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: '#0f0f1a' }}
    >
      <header
        className="flex items-center justify-center py-4 border-b"
        style={{
          borderColor: 'rgba(255, 255, 255, 0.05)',
        }}
      >
        <h1 style={{ fontSize: '20px', color: '#e0e0e0', fontWeight: 600, letterSpacing: '2px' }}>
          情绪回声墙
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ margin: '0 20px' }}>
        <div className="flex-1 flex flex-col">
          <div
            className="p-4 rounded-xl mb-4 mt-4"
            style={{ backgroundColor: 'rgba(30, 30, 46, 0.6)' }}
          >
            <p className="text-gray-400 text-sm mb-3">选择你现在的情绪</p>
            <div className="flex gap-3 mb-4">
              {EMOTIONS.map((emotion) => (
                <button
                  key={emotion}
                  onClick={() => setSelectedEmotion(emotion)}
                  className={`px-4 py-2 rounded-full text-white text-sm font-medium transition-all`}
                  style={{
                    backgroundColor: selectedEmotion === emotion
                      ? getEmotionColor(emotion)
                      : `${getEmotionColor(emotion)}40`,
                    transform: selectedEmotion === emotion ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: selectedEmotion === emotion ? `0 4px 15px ${getEmotionColor(emotion)}60` : 'none',
                  }}
                >
                  {getEmotionLabel(emotion)}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下你此刻的心情..."
                maxLength={200}
                className="flex-1 bg-gray-800/50 text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                style={{ minHeight: '60px' }}
              />
              <button
                onClick={handleSubmit}
                disabled={!selectedEmotion || !content.trim() || isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all self-end"
              >
                {isSubmitting ? '发布中...' : '发布'}
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-1 text-right">{content.length}/200</p>
          </div>

          <BubbleWall onBubbleClick={handleBubbleClick} />
        </div>

        <EmotionSidebar />
      </div>

      {isModalOpen && selectedBubble && (
        <DetailModal bubble={selectedBubble} onClose={handleCloseModal} />
      )}
    </div>
  );
}
