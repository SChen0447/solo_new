import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Environment, GrowthSnapshot, SeedVariety, SEED_VARIETIES } from '../types';
import { GrowthEngine } from '../engine/GrowthEngine';
import { Renderer } from '../engine/Renderer';
import { GrowthInstruction } from '../types';

interface AppContextValue {
  environment: Environment;
  setEnvironment: (env: Partial<Environment>) => void;
  selectedVarietyId: string;
  setSelectedVarietyId: (id: string) => void;
  snapshot: GrowthSnapshot | null;
  reset: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

import ControlPanel from './ControlPanel';
import Dashboard from './Dashboard';
import SeedLibrary from './SeedLibrary';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GrowthEngine | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [environment, setEnvironmentState] = useState<Environment>({ light: 60, water: 60, temperature: 25 });
  const [selectedVarietyId, setSelectedVarietyId] = useState<string>('sunflower');
  const [snapshot, setSnapshot] = useState<GrowthSnapshot | null>(null);
  const [instruction, setInstruction] = useState<GrowthInstruction | null>(null);

  const initEngine = useCallback((varietyId: string) => {
    const engine = new GrowthEngine(varietyId);
    engine.setEnvironment(environment);
    engineRef.current = engine;

    engine.subscribe((inst) => {
      setInstruction(inst);
      if (rendererRef.current) {
        rendererRef.current.render(inst);
      }
    });

    engine.subscribeSnapshot((snap) => {
      setSnapshot(snap);
    });

    setSnapshot(engine.getSnapshot());
  }, [environment]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new Renderer(canvasRef.current);
    rendererRef.current = renderer;
    initEngine(selectedVarietyId);

    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    let running = true;

    const loop = (timestamp: number) => {
      if (!running) return;

      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaMs = timestamp - lastTimeRef.current;
      const deltaTime = Math.min(deltaMs / 1000, 0.1);
      lastTimeRef.current = timestamp;

      if (engineRef.current) {
        engineRef.current.step(deltaTime);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [selectedVarietyId]);

  const setEnvironment = useCallback((env: Partial<Environment>) => {
    setEnvironmentState(prev => {
      const next = { ...prev, ...env };
      if (engineRef.current) {
        engineRef.current.setEnvironment(next);
      }
      return next;
    });
  }, []);

  const handleSetVariety = useCallback((id: string) => {
    setSelectedVarietyId(id);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastTimeRef.current = 0;
    initEngine(id);
  }, [initEngine]);

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastTimeRef.current = 0;
    initEngine(selectedVarietyId);
  }, [initEngine, selectedVarietyId]);

  const ctxValue: AppContextValue = {
    environment,
    setEnvironment,
    selectedVarietyId,
    setSelectedVarietyId: handleSetVariety,
    snapshot,
    reset
  };

  return (
    <AppContext.Provider value={ctxValue}>
      <div className="app-container">
        <div className="main-viewport">
          <canvas ref={canvasRef} className="plant-canvas" />
          <div className="viewport-label">
            <span className="label-dot" />
            <span>生长视区 · {SEED_VARIETIES.find(v => v.id === selectedVarietyId)?.name}</span>
          </div>
        </div>

        <div className="right-panel">
          <ControlPanel />
          <Dashboard instruction={instruction} />
        </div>

        <SeedLibrary onReset={reset} />
      </div>
    </AppContext.Provider>
  );
};

export default App;
