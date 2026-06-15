import { useState, useCallback } from 'react';
import ColorWheel from './ColorWheel';
import StarCanvas from './StarCanvas';
import DataPanel from './DataPanel';
import { EmotionKey, generateEmotionDescription } from './utils';
import './styles.css';

export default function App() {
  const [selectedEmotions, setSelectedEmotions] = useState<EmotionKey[]>([]);
  const [intensity, setIntensity] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFps] = useState(60);
  const [particleCount, setParticleCount] = useState(0);
  const [rotationSpeed, setRotationSpeed] = useState(8);
  const [colorDistribution, setColorDistribution] = useState<
    Record<EmotionKey, number>
  >({ joy: 0, sadness: 0, anger: 0, calm: 0 });
  const [trailingEnabled, setTrailingEnabled] = useState(true);

  const handleGenerate = useCallback(() => {
    if (selectedEmotions.length === 0) return;
    setIsRunning(false);
    requestAnimationFrame(() => {
      setIsRunning(true);
    });
  }, [selectedEmotions]);

  const handleStateUpdate = useCallback(
    (state: {
      fps: number;
      particleCount: number;
      rotationSpeed: number;
      colorDistribution: Record<EmotionKey, number>;
      trailingEnabled: boolean;
    }) => {
      setFps(state.fps);
      setParticleCount(state.particleCount);
      setRotationSpeed(state.rotationSpeed);
      setColorDistribution(state.colorDistribution);
      setTrailingEnabled(state.trailingEnabled);
    },
    []
  );

  const description = generateEmotionDescription(selectedEmotions, intensity);

  return (
    <div className="app-root">
      <div className="stars-bg" />
      <header className="app-header">
        <h1 className="app-title">情绪色彩星盘</h1>
        <p className="app-subtitle">将你的情绪，编织成流动的星河</p>
      </header>

      <main className="app-main">
        <div className="layout-left">
          <ColorWheel
            selectedEmotions={selectedEmotions}
            intensity={intensity}
            onEmotionsChange={setSelectedEmotions}
            onIntensityChange={setIntensity}
            onGenerate={handleGenerate}
          />
        </div>

        <div className="layout-right">
          <StarCanvas
            emotions={selectedEmotions}
            intensity={intensity}
            isRunning={isRunning}
            onStateUpdate={handleStateUpdate}
          />
          <DataPanel
            description={description}
            intensity={intensity}
            particleCount={particleCount}
            rotationSpeed={rotationSpeed}
            colorDistribution={colorDistribution}
            trailingEnabled={trailingEnabled}
            fps={fps}
            emotions={selectedEmotions}
          />
        </div>
      </main>
    </div>
  );
}
