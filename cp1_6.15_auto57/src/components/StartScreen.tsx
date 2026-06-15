import { useGameStore } from '../store/useGameStore';

export default function StartScreen() {
  const { startGame } = useGameStore();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 100%)',
        }}
      />

      <div className="relative z-10 text-center">
        <h1
          className="text-5xl font-bold mb-4"
          style={{
            background: 'linear-gradient(90deg, #00e5ff, #ff00e5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          音律共鸣
        </h1>
        <p className="text-gray-400 mb-12 text-lg">Rhythm Resonance</p>

        <div className="mb-12 text-gray-300 text-sm space-y-2">
          <p>按 <span className="text-cyan-400 font-bold">A</span> 键攻击左侧敌人</p>
          <p>按 <span className="text-fuchsia-400 font-bold">L</span> 键攻击右侧敌人</p>
          <p>跟随节拍，消灭所有敌人！</p>
        </div>

        <button
          onClick={startGame}
          className="px-12 py-4 rounded-lg font-bold text-white text-lg transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #4a4a8a 0%, #2a2a5a 100%)',
            border: '2px solid #6a6aaa',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ffd700';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#6a6aaa';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
          }}
        >
          开始游戏
        </button>

        <div className="mt-16 text-gray-500 text-xs">
          <p>BPM: 128 | 16小节 | 4/4拍</p>
        </div>
      </div>
    </div>
  );
}
