import { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import ThreeScene, { ThreeSceneHandle } from './components/ThreeScene';
import Sidebar from './components/Sidebar';
import { useStore } from './store';
import FractalWorker from './worker/fractal.worker.ts?worker';

const App = () => {
  const sceneRef = useRef<ThreeSceneHandle>(null);
  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<number | null>(null);

  const params = useStore((s) => s.params);
  const setHeightMap = useStore((s) => s.setHeightMap);
  const setDetailHeightMap = useStore((s) => s.setDetailHeightMap);
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const setIsMobile = useStore((s) => s.setIsMobile);
  const isMobile = useStore((s) => s.isMobile);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);

  useEffect(() => {
    const worker = new FractalWorker();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const data = e.data as any;
      if (data.type === 'result') {
        const requestId = data.requestId;
        const payload = data.payload;

        if (requestId === 'main') {
          setHeightMap(new Float32Array(payload.heightMap));
          setIsGenerating(false);
          useStore.getState().addToast('地形生成完成', 'success');
        } else if (requestId === 'detail') {
          setDetailHeightMap(new Float32Array(payload.heightMap));
        }
      } else if (data.type === 'error') {
        console.error('Worker error:', data.payload.message);
        setIsGenerating(false);
        useStore.getState().addToast('生成失败，请重试', 'info');
      }
    };

    return () => {
      worker.terminate();
    };
  }, [setHeightMap, setDetailHeightMap, setIsGenerating]);

  useEffect(() => {
    const generateHeightmaps = () => {
      if (!workerRef.current) return;

      setIsGenerating(true);

      workerRef.current.postMessage({
        type: 'generate',
        requestId: 'main',
        payload: {
          size: 256,
          iterations: params.iterations,
          scale: params.scale,
          heightDecay: params.heightDecay,
          seed: params.seed,
        },
      });

      workerRef.current.postMessage({
        type: 'generate',
        requestId: 'detail',
        payload: {
          size: 256,
          iterations: Math.min(10, params.iterations + 2),
          scale: 2.5,
          heightDecay: 0.65,
          seed: params.detailSeed,
        },
      });
    };

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(generateHeightmaps, 300);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [params.iterations, params.scale, params.heightDecay, params.seed, params.detailSeed, setIsGenerating]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  const handleSnapshot = () => {
    sceneRef.current?.takeSnapshot();
  };

  const canvasContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: isMobile ? 0 : 280,
    right: 0,
    bottom: 0,
    background: '#0f0f23',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  };

  if (isMobile) {
    canvasContainerStyle.top = sidebarCollapsed ? 60 : 'auto';
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0f0f23' }}>
      <Sidebar onSnapshot={handleSnapshot} />
      <div style={canvasContainerStyle}>
        <Canvas
          shadows
          camera={{
            position: [60, 45, 60],
            fov: 50,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            antialias: true,
            preserveDrawingBuffer: true,
            alpha: false,
          }}
          dpr={[1, 2]}
          frameloop="always"
        >
          <color attach="background" args={[0x0f0f23]} />
          <fog attach="fog" args={[0x0f0f23, 120, 200]} />
          <ThreeScene ref={sceneRef} />
        </Canvas>
      </div>
    </div>
  );
};

export default App;
