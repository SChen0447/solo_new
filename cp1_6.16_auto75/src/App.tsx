import { useReducer, useRef, useCallback, useMemo } from 'react';
import { FPSCanvas, type FPSCanvasHandle } from '@/components/FPSCanvas';
import { PerformanceRecorder } from '@/components/PerformanceRecorder';
import { HeatmapOverlay } from '@/components/HeatmapOverlay';
import { TimelinePanel } from '@/components/TimelinePanel';
import { StyleSnapshotPanel } from '@/components/StyleSnapshotPanel';
import { JankListPanel } from '@/components/JankListPanel';
import { initialState, appReducer } from '@/types';
import type { FrameData, JankData, ReflowStats } from '@/types';

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const fpsCanvasRef = useRef<FPSCanvasHandle>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const reflowStatsRef = useRef<Map<string, ReflowStats>>(new Map());

  const handleStartRecording = useCallback(() => {
    recordingStartTimeRef.current = performance.now();
    reflowStatsRef.current.clear();
    dispatch({ type: 'START_RECORDING' });
  }, []);

  const handleStopRecording = useCallback(() => {
    dispatch({ type: 'STOP_RECORDING' });
    dispatch({
      type: 'UPDATE_REFLOW_STATS',
      payload: new Map(reflowStatsRef.current),
    });
  }, []);

  const handleFrame = useCallback((frame: FrameData) => {
    dispatch({ type: 'ADD_FRAME', payload: frame });
  }, []);

  const handleJank = useCallback((jank: JankData) => {
    dispatch({ type: 'ADD_JANK', payload: jank });
  }, []);

  const handleReflow = useCallback((elementPath: string, duration: number) => {
    const existing = reflowStatsRef.current.get(elementPath);
    if (existing) {
      reflowStatsRef.current.set(elementPath, {
        ...existing,
        count: existing.count + 1,
        totalDuration: existing.totalDuration + duration,
      });
    } else {
      const selector = elementPath.split(' > ').pop();
      const element = selector
        ? (document.querySelector<HTMLElement>(selector) || null)
        : null;
      reflowStatsRef.current.set(elementPath, {
        elementPath,
        count: 1,
        totalDuration: duration,
        element: element as HTMLElement,
      });
    }
  }, []);

  const handleFpsUpdate = useCallback((fps: number) => {
    dispatch({ type: 'SET_CURRENT_FPS', payload: fps });
    if (fpsCanvasRef.current) {
      fpsCanvasRef.current.setFps(fps);
    }
  }, []);

  const handleSelectFrame = useCallback((index: number) => {
    dispatch({ type: 'SELECT_FRAME', payload: index });
  }, []);

  const handleToggleHeatmap = useCallback(() => {
    dispatch({ type: 'TOGGLE_HEATMAP' });
  }, []);

  const handleTogglePanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_PANEL' });
  }, []);

  const handleExport = useCallback(() => {
    const data = {
      frames: state.frames,
      jankList: state.jankList,
      startTime: recordingStartTimeRef.current,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-recording-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.frames, state.jankList]);

  const handleClear = useCallback(() => {
    dispatch({ type: 'CLEAR_DATA' });
    reflowStatsRef.current.clear();
  }, []);

  const selectedFrame = useMemo(
    () => (state.selectedFrameIndex >= 0 ? state.frames[state.selectedFrameIndex] : null),
    [state.frames, state.selectedFrameIndex]
  );

  const previewAreaRef = useRef<HTMLDivElement>(null);

  return (
    <div className="app-container">
      <div className="top-bar">
        <div className="app-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64B5F6" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <h1>动画性能追踪工具</h1>
        </div>
        <div className="top-controls">
          <PerformanceRecorder
            isRecording={state.isRecording}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            onFrame={handleFrame}
            onJank={handleJank}
            onReflow={handleReflow}
            onFpsUpdate={handleFpsUpdate}
          />
          <button
            className={`control-btn heatmap-btn ${state.heatmapEnabled ? 'active' : ''}`}
            onClick={handleToggleHeatmap}
            title={state.heatmapEnabled ? '关闭热力图' : '开启热力图'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M4.93 4.93l2.83 2.83" />
              <path d="M16.24 16.24l2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="M4.93 19.07l2.83-2.83" />
              <path d="M16.24 7.76l2.83-2.83" />
            </svg>
          </button>
          <button
            className="control-btn export-btn"
            onClick={handleExport}
            title="导出数据"
            disabled={state.frames.length === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            className="control-btn clear-btn"
            onClick={handleClear}
            title="清除数据"
            disabled={state.isRecording || state.frames.length === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        <div className="fps-container">
          <FPSCanvas ref={fpsCanvasRef} size={80} />
        </div>
      </div>

      <div className="main-content">
        <aside className="left-panel">
          <JankListPanel
            jankList={state.jankList}
            startTime={recordingStartTimeRef.current}
            collapsed={state.panelCollapsed}
            onToggle={handleTogglePanel}
          />
        </aside>

        <main className="center-panel">
          <div className="preview-area" ref={previewAreaRef}>
            <div className="preview-content">
              <h2>预览区域</h2>
              <p>在此区域的动画将被录制和追踪</p>
              <div className="demo-animations">
                <div className="demo-box demo-box-1"></div>
                <div className="demo-box demo-box-2"></div>
                <div className="demo-box demo-box-3"></div>
              </div>
              <div className="demo-container" id="container">
                <span className="demo-text">示例动画元素</span>
              </div>
            </div>
          </div>

          <TimelinePanel
            frames={state.frames}
            selectedIndex={state.selectedFrameIndex}
            onSelectFrame={handleSelectFrame}
            startTime={recordingStartTimeRef.current}
          />
        </main>

        <aside className="right-panel">
          <StyleSnapshotPanel
            frame={selectedFrame}
            startTime={recordingStartTimeRef.current}
          />
        </aside>
      </div>

      <HeatmapOverlay
        enabled={state.heatmapEnabled}
        reflowStats={state.reflowStats}
      />
    </div>
  );
}

export default App;
