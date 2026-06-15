import { useRef, useEffect, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Play, Pause, Camera } from 'lucide-react';
import ParticleCloud from './effects/ParticleCloud/ParticleCloud';
import Stars from './effects/Stars/Stars';
import TextPanel from './components/TextPanel/TextPanel';
import ControlPanel from './components/ControlPanel/ControlPanel';
import { useAppStore } from './stores/appStore';
import './App.css';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAutoPlaying = useAppStore(state => state.isAutoPlaying);
  const currentExampleIndex = useAppStore(state => state.currentExampleIndex);
  const examples = useAppStore(state => state.examples);
  const inputText = useAppStore(state => state.inputText);
  const analysisResult = useAppStore(state => state.analysisResult);
  const toggleAutoPlay = useAppStore(state => state.toggleAutoPlay);
  const nextExample = useAppStore(state => state.nextExample);
  const applyPresetStyle = useAppStore(state => state.applyPresetStyle);

  const [showFullText, setShowFullText] = useState(false);

  const takeScreenshot = useCallback(() => {
    if (canvasRef.current) {
      const dataURL = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `lyricviz-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        takeScreenshot();
      }
      if (e.key === ' ' && !e.repeat && e.target instanceof HTMLBodyElement) {
        e.preventDefault();
        toggleAutoPlay();
      }
      if (e.key >= '1' && e.key <= '4') {
        applyPresetStyle(parseInt(e.key) - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [takeScreenshot, toggleAutoPlay, applyPresetStyle]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isAutoPlaying) {
      interval = setInterval(() => {
        nextExample();
      }, 8000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAutoPlaying, nextExample]);

  const currentExample = examples[currentExampleIndex];
  const displayText = isAutoPlaying ? currentExample?.text : inputText;
  const displayLabel = isAutoPlaying ? currentExample?.label : analysisResult?.sentiment;

  const getSentimentColor = () => {
    if (!displayLabel) return '#a29bfe';
    if (displayLabel.includes('积极') || displayLabel === 'positive') return '#00b894';
    if (displayLabel.includes('消极') || displayLabel === 'negative') return '#ff6b6b';
    return '#a29bfe';
  };

  return (
    <div className="app-container" ref={containerRef}>
      <div className="canvas-wrapper">
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 0, 450], fov: 75 }}
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        >
          <color attach="background" args={['#0a0a23']} />
          <fog attach="fog" args={['#0a0a23', 300, 900]} />

          <ambientLight intensity={0.4} />
          <directionalLight position={[100, 100, 100]} intensity={0.8} />
          <directionalLight position={[-100, -100, -100]} intensity={0.4} color="#6c5ce7" />
          <pointLight position={[0, 0, 200]} intensity={0.6} color="#00e5ff" />

          <Stars />
          <ParticleCloud canvasRef={canvasRef} />

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={250}
            maxDistance={700}
            enablePan={false}
          />
        </Canvas>
      </div>

      <div className="ui-overlay">
        <div className="left-panel">
          <TextPanel />
        </div>

        <div className="right-panel">
          <ControlPanel />
        </div>
      </div>

      <div className="bottom-controls">
        <button
          className={`play-btn ${isAutoPlaying ? 'playing' : ''}`}
          onClick={toggleAutoPlay}
          title="播放/暂停自动轮播 (Space)"
        >
          {isAutoPlaying ? <Pause size={20} /> : <Play size={20} className="play-icon" />}
        </button>

        <button
          className="screenshot-btn"
          onClick={takeScreenshot}
          title="保存截图 (S)"
        >
          <Camera size={18} />
        </button>
      </div>

      {isAutoPlaying && displayText && (
        <div
          className={`current-text-tag ${showFullText ? 'expanded' : ''}`}
          onMouseEnter={() => setShowFullText(true)}
          onMouseLeave={() => setShowFullText(false)}
        >
          <span className="text-label" style={{ background: getSentimentColor() }}>
            {displayLabel}
          </span>
          <span className="text-content">
            {showFullText ? displayText : displayText.substring(0, 60) + '...'}
          </span>
        </div>
      )}

      <div className="gradient-overlay" />
    </div>
  );
}
