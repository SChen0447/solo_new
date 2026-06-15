import React, { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SceneCanvas } from './components/SceneCanvas';
import { ControlPanel } from './components/ControlPanel';
import { PropertyPanel } from './components/PropertyPanel';
import { MiniMap } from './components/MiniMap';
import { useStore, THEMES } from './stores/useStore';

const App: React.FC = () => {
  const addParticle = useStore((s) => s.addParticle);
  const selectParticle = useStore((s) => s.selectParticle);
  const currentTheme = useStore((s) => s.currentTheme);
  const particles = useStore((s) => s.particles);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevThemeRef = useRef(currentTheme);

  useEffect(() => {
    if (particles.length === 0) {
      addParticle(new THREE.Vector3(-2, 0, -1));
      addParticle(new THREE.Vector3(2, 0, -1));
      addParticle(new THREE.Vector3(0, 0, 2));
      addParticle(new THREE.Vector3(0, 0, -3));
    }
  }, []);

  const handleCanvasClick = useCallback(
    (point: THREE.Vector3) => {
      addParticle(point);
    },
    [addParticle]
  );

  useEffect(() => {
    if (prevThemeRef.current !== currentTheme) {
      const root = document.documentElement;
      const theme = THEMES[currentTheme];
      root.style.setProperty('--theme-bg', theme.background);
      prevThemeRef.current = currentTheme;
    }
  }, [currentTheme]);

  useEffect(() => {
    const theme = THEMES[currentTheme];
    document.documentElement.style.setProperty('--theme-bg', theme.background);
  }, []);

  return (
    <div className="app-container" ref={containerRef} onClick={() => selectParticle(null)}>
      <div className="scene-wrapper">
        <SceneCanvas onCanvasClick={handleCanvasClick} />
      </div>

      <ControlPanel />
      <PropertyPanel />
      <MiniMap />

      <div className="hint-overlay">
        <span>点击场景放置粒子 · 拖拽旋转视角 · 滚轮缩放</span>
      </div>
    </div>
  );
};

export default App;
