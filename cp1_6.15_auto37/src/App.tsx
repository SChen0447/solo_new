import React, { Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import { PlantRenderer, Ground } from './components/PlantRenderer';
import { SceneEnvironment } from './components/SceneEnvironment';
import { WeatherControls } from './components/WeatherControls';
import { PlantInfoPanel } from './components/PlantInfoPanel';
import { useWeatherStore } from './store/weatherStore';
import './index.css';

const App: React.FC = () => {
  const selectPlant = useWeatherStore((s) => s.selectPlant);

  const handleSceneClick = useCallback((e: any) => {
    if (e.target === e.currentTarget || !e.instanceId) {
      selectPlant(null);
    }
  }, [selectPlant]);

  return (
    <div className="app-container" onClick={handleSceneClick}>
      <div className="scene-container">
        <Canvas
          shadows
          camera={{ position: [60, 50, 60], fov: 50, near: 0.1, far: 500 }}
          gl={{ antialias: true, pixelRatio: Math.min(window.devicePixelRatio, 2) }}
        >
          <Suspense fallback={null}>
            <SceneEnvironment />
            <PlantRenderer />
            <Ground />
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.08}
              minDistance={20}
              maxDistance={200}
              maxPolarAngle={Math.PI / 2 - 0.05}
              target={[0, 0, 0]}
            />
            <Stats showPanel={0} className="stats-panel" />
          </Suspense>
        </Canvas>
      </div>

      <WeatherControls />
      <PlantInfoPanel />
    </div>
  );
};

export default App;
