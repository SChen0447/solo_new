import { useGameStore } from '../store/useGameStore';
import { GRADE_COLORS } from '../utils/constants';

export default function ResultScreen() {
  const { grade, score, maxCombo, perfectCount, goodCount, missCount, resetGame } = useGameStore();

  const totalNotes = perfectCount + goodCount + missCount;
  const perfectRate = totalNotes > 0 ? (perfectCount / totalNotes) * 100 : 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      />
      
      <div
        className="relative z-10 p-10 rounded-xl text-center"
        style={{
          backgroundColor: 'rgba(10, 10, 46, 0.95)',
          border: '2px solid #4a4a8a',
          minWidth: '400px',
        }}
      >
        <h2 className="text-xl text-white mb-6">演奏结束</h2>
        
        <div
          className="text-6xl font-bold mb-8"
          style={{
            color: grade ? GRADE_COLORS[grade] : '#888',
            textShadow: grade ? `0 0 30px ${GRADE_COLORS[grade]}60` : 'none',
          }}
        >
          {grade || '-'}
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">总得分</span>
            <span className="text-white font-bold">{score.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">最高连击</span>
            <span className="text-yellow-400 font-bold">{maxCombo}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Perfect 率</span>
            <span className="text-yellow-500 font-bold">{perfectRate.toFixed(1)}%</span>
          </div>
          
          <div className="pt-3 border-t border-gray-700">
            <div className="flex justify-around text-xs">
              <div className="text-center">
                <div className="text-yellow-500 font-bold text-lg">{perfectCount}</div>
                <div className="text-gray-500">Perfect</div>
              </div>
              <div className="text-center">
                <div className="text-green-500 font-bold text-lg">{goodCount}</div>
                <div className="text-gray-500">Good</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 font-bold text-lg">{missCount}</div>
                <div className="text-gray-500">Miss</div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={resetGame}
          className="w-full py-3 rounded-lg font-bold text-white transition-all duration-300"
          style={{
            backgroundColor: '#4a4a8a',
            border: '1px solid #6a6aaa',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ffd700';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#6a6aaa';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          再来一次
        </button>
      </div>
    </div>
  );
}
