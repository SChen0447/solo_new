import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import SceneRenderer from './sceneModule/SceneRenderer';
import InteractionHandler from './sceneModule/InteractionHandler';
import TrailRenderer, { TrailDots } from './analysisModule/TrailRenderer';
import { CoordinatePanel, ControlPanel } from './analysisModule/InfoOverlay';

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkWindowSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkWindowSize();
    window.addEventListener('resize', checkWindowSize);
    return () => window.removeEventListener('resize', checkWindowSize);
  }, []);

  const canvasContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: isMobile ? 0 : '30%',
    bottom: isMobile ? '45vh' : 0,
    background: '#0d0d1a',
    overflow: 'hidden'
  };

  const fpsStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 20,
    right: isMobile ? 20 : 'calc(30% + 20px)',
    background: 'rgba(0, 0, 0, 0.6)',
    color: '#88ff88',
    fontSize: 11,
    fontFamily: 'monospace',
    padding: '6px 10px',
    borderRadius: 4,
    zIndex: 15,
    pointerEvents: 'none'
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0d0d1a' }}>
      <div style={canvasContainerStyle}>
        <Canvas
          shadows
          camera={{ fov: 50, near: 0.1, far: 1000 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#0d0d1a']} />
          <fog attach="fog" args={['#0d0d1a', 20, 60]} />
          <InteractionHandler />
          <SceneRenderer />
          <TrailRenderer />
          <TrailDots />
        </Canvas>
      </div>

      <CoordinatePanel />
      <ControlPanel isMobile={isMobile} />

      <div style={fpsStyle}>
        <FpsCounter />
      </div>
    </div>
  );
};

const FpsCounter: React.FC = () => {
  const [fps, setFps] = useState(60);
  const frameCountRef = React.useRef(0);
  const lastTimeRef = React.useRef(performance.now());

  React.useEffect(() => {
    let animationId: number;

    const update = () => {
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 500) {
        const currentFps = Math.round(
          (frameCountRef.current * 1000) / (now - lastTimeRef.current)
        );
        setFps(currentFps);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const color = fps >= 50 ? '#88ff88' : fps >= 30 ? '#ffff88' : '#ff8888';

  return (
    <span style={{ color }}>
      FPS: {fps}
    </span>
  );
};

export default App;
