import { useState, useEffect, useRef, useCallback } from 'react';
import { parsePoem, PoemData } from './poemParser';
import { synthesizeImage } from './imageSynthesis';
import { generateMelody, MusicController, EmotionWeights } from './musicSynthesis';
import './styles.css';

const SAMPLE_POEMS: Record<string, string> = {
  '静夜思 - 李白': '床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。',
  '春晓 - 孟浩然': '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。',
  '登鹳雀楼 - 王之涣': '白日依山尽，\n黄河入海流。\n欲穷千里目，\n更上一层楼。',
  '相思 - 王维': '红豆生南国，\n春来发几枝。\n愿君多采撷，\n此物最相思。',
  '江雪 - 柳宗元': '千山鸟飞绝，\n万径人踪灭。\n孤舟蓑笠翁，\n独钓寒江雪。',
  '枫桥夜泊 - 张继': '月落乌啼霜满天，\n江枫渔火对愁眠。\n姑苏城外寒山寺，\n夜半钟声到客船。',
};

function App() {
  const [selectedPoem, setSelectedPoem] = useState<string>('');
  const [customPoem, setCustomPoem] = useState<string>('');
  const [poemData, setPoemData] = useState<PoemData | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);
  const musicControllerRef = useRef<MusicController | null>(null);
  const [showEmotion, setShowEmotion] = useState<boolean>(false);

  const handlePoemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const poemKey = e.target.value;
    setSelectedPoem(poemKey);
    if (poemKey && SAMPLE_POEMS[poemKey]) {
      setCustomPoem(SAMPLE_POEMS[poemKey]);
    }
  };

  const handleGenerate = useCallback(() => {
    const poemText = customPoem.trim();
    if (poemText) {
      const data = parsePoem(poemText);
      setPoemData(data);
      setShowEmotion(true);

      if (musicControllerRef.current) {
        musicControllerRef.current.stop();
      }
      musicControllerRef.current = null;
      setIsPlaying(false);
    }
  }, [customPoem]);

  useEffect(() => {
    if (poemData) {
      poemData.verses.forEach((verse, index) => {
        const canvasId = `canvas-${index}`;
        setTimeout(() => {
          const startTime = performance.now();
          synthesizeImage(verse.keywords, canvasId, 300, 200);
          const endTime = performance.now();
          console.log(`Canvas ${index} 生成耗时: ${(endTime - startTime).toFixed(2)}ms`);
        }, 800 + index * 400);
      });
    }
  }, [poemData]);

  const handlePlayMusic = useCallback(() => {
    if (!poemData) return;

    const startTime = performance.now();

    if (musicControllerRef.current) {
      if (musicControllerRef.current.isPlaying()) {
        musicControllerRef.current.stop();
        setIsPlaying(false);
      } else {
        musicControllerRef.current.play();
        setIsPlaying(true);
      }
    } else {
      const emotion: EmotionWeights = {
        joy: poemData.emotion.joy,
        sorrow: poemData.emotion.sorrow,
      };

      musicControllerRef.current = generateMelody(emotion);
      musicControllerRef.current.setVolume(volume);
      musicControllerRef.current.play();
      setIsPlaying(true);

      const endTime = performance.now();
      console.log(`音乐合成延迟: ${(endTime - startTime).toFixed(2)}ms`);
    }
  }, [poemData, volume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (musicControllerRef.current) {
      musicControllerRef.current.setVolume(newVolume);
    }
  };

  useEffect(() => {
    const initialPoem = '静夜思 - 李白';
    setSelectedPoem(initialPoem);
    setCustomPoem(SAMPLE_POEMS[initialPoem]);

    setTimeout(() => {
      const data = parsePoem(SAMPLE_POEMS[initialPoem]);
      setPoemData(data);
      setShowEmotion(true);
    }, 500);
  }, []);

  return (
    <div className="app-container">
      <header className="header">
      <h1>古诗词意境展</h1>
      <p className="subtitle">诗中有画 · 画中有诗 · 乐随情生</p>
      </header>

      <div className="input-section">
      <select value={selectedPoem} onChange={handlePoemSelect}>
        <option value="">选择一首古诗</option>
        {Object.keys(SAMPLE_POEMS).map((title) => (
          <option key={title} value={title}>
            {title}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="或输入一首古诗词..."
        value={customPoem}
        onChange={(e) => setCustomPoem(e.target.value)}
      />

      <button onClick={handleGenerate}>生成意境</button>
      </div>

      <div className="music-controls">
      <button
        className={`music-button ${isPlaying ? 'playing' : ''}`}
        onClick={handlePlayMusic}
        title={isPlaying ? '暂停' : '奏乐'}
        disabled={!poemData}
      >
        {isPlaying ? '⏸' : '♪'}
      </button>
      
      <div className="volume-control">
        <span className="volume-icon">🔊</span>
        <input
          type="range"
          className="volume-slider"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
        />
      </div>
      </div>

      <div className="scroll-container">
      {poemData ? (
        <>
          <div className="verse-section">
          {poemData.verses.map((verse, index) => (
            <div key={index} className="verse-item">
              <div className="verse-card">
              <p className="verse-text">{verse.verse}</p>
              </div>
              <div className="verse-canvas">
              <canvas id={`canvas-${index}`} />
              </div>
            </div>
          ))}
          </div>

          {showEmotion && (
          <div className="emotion-info">
            <p>情感分析</p>
            <div className="emotion-bar">
            <span>喜: {poemData.emotion.joy}</span>
            <span>悲: {poemData.emotion.sorrow}</span>
            </div>
          </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <p>请选择或输入一首古诗词</p>
          <p style={{ marginTop: '16px', fontSize: '14px' }}>
          系统将自动为每句诗生成水墨意境画
          </p>
        </div>
      )}
      </div>
    </div>
  );
}

export default App;
