import React, { useRef, useEffect, useState } from 'react';
import { SceneManager } from './scene/SceneManager';
import { InteractionHandler } from './interaction/InteractionHandler';
import { TimelineManager } from './timeline/TimelineManager';
import { UIOverlay } from './ui/UIOverlay';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const interactionRef = useRef<InteractionHandler | null>(null);
  const timelineRef = useRef<TimelineManager | null>(null);
  const [interactionHandler, setInteractionHandler] = useState<InteractionHandler | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const w = window.innerWidth < 1024 ? window.innerWidth : 1200;
      const h = window.innerWidth < 1024 ? Math.floor(window.innerHeight * 0.75) : 800;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    updateSize();

    const sm = new SceneManager(canvas);
    sceneManagerRef.current = sm;

    const ih = new InteractionHandler(canvas, sm);
    interactionRef.current = ih;
    setInteractionHandler(ih);

    const tm = new TimelineManager();
    timelineRef.current = tm;

    sm.start();
    tm.start();

    const onResize = () => {
      updateSize();
      sm.resize(canvas.width, canvas.height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      sm.stop();
      tm.stop();
      ih.destroy();
    };
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0c29',
      overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          imageRendering: 'auto',
        }}
      />
      <UIOverlay interactionHandler={interactionHandler} />
    </div>
  );
};

export default App;
