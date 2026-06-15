import React, { useEffect, useRef, useCallback } from 'react';
import { BellPanel } from './components/BellPanel';
import { AudioEngine } from './components/AudioEngine';
import { WaveRenderer } from './components/WaveRenderer';
import { Recorder } from './components/Recorder';
import { useAppStore } from './store';
import { PlaybackSpeed } from './types';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const waveRendererRef = useRef<WaveRenderer | null>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const bellRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  
  const {
    bells,
    activeBellIds,
    isRecording,
    isPlaying,
    savedRecording,
    playbackSpeed,
    setActiveBell,
    setRecording,
    setPlaying,
    setSavedRecording,
    setPlaybackSpeed,
  } = useAppStore();

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    recorderRef.current = new Recorder();
    
    return () => {
      audioEngineRef.current?.destroy();
      waveRendererRef.current?.destroy();
      recorderRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current && !waveRendererRef.current) {
      waveRendererRef.current = new WaveRenderer(canvasRef.current);
    }
    
    const handleResize = () => {
      waveRendererRef.current?.resize();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const triggerBell = useCallback((bellId: string, velocity: number = 1) => {
    const bell = bells.find((b) => b.id === bellId);
    if (!bell) return;
    
    audioEngineRef.current?.resume();
    audioEngineRef.current?.playBell(bell.frequency, velocity);
    
    setActiveBell(bellId, true);
    setTimeout(() => setActiveBell(bellId, false), 500);
    
    if (waveRendererRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const panelWidth = 600;
        const panelHeight = 400;
        
        const colCount = 3;
        const rowCount = 4;
        const cellWidth = panelWidth / colCount;
        const cellHeight = panelHeight / rowCount;
        
        const x = (bell.col + 0.5) * cellWidth;
        const y = (bell.row + 0.5) * cellHeight;
        
        waveRendererRef.current.addRipple(x, y, bell.frequency, velocity);
      }
    }
    
    if (recorderRef.current?.getIsRecording()) {
      recorderRef.current?.recordEvent(bellId, velocity);
    }
  }, [bells, setActiveBell]);

  const handleRecordClick = useCallback(() => {
    if (isPlaying) return;
    
    audioEngineRef.current?.resume();
    recorderRef.current?.startRecording();
    setRecording(true);
  }, [isPlaying, setRecording]);

  const handleStopClick = useCallback(() => {
    if (isRecording) {
      const recording = recorderRef.current?.stopRecording();
      setRecording(false);
      if (recording) {
        setSavedRecording({
          events: recording.events,
          duration: recording.duration,
        });
      }
    }
    
    if (isPlaying) {
      recorderRef.current?.stopPlayback();
      setPlaying(false);
    }
  }, [isRecording, isPlaying, setRecording, setPlaying, setSavedRecording]);

  const handlePlayClick = useCallback(() => {
    if (!savedRecording || isRecording) return;
    
    setPlaying(true);
    
    recorderRef.current?.startPlayback(
      (bellId, velocity) => {
        triggerBell(bellId, velocity);
      },
      () => {
        setPlaying(false);
      }
    );
  }, [savedRecording, isRecording, triggerBell, setPlaying]);

  const handleSpeedChange = useCallback((speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
    recorderRef.current?.setPlaybackSpeed(speed);
  }, [setPlaybackSpeed]);

  const speeds: PlaybackSpeed[] = [0.5, 1, 2];

  return (
    <div className="app-container">
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
        编钟模拟器
      </h1>
      <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '16px' }}>
        点击编钟或按键盘 A-L 演奏
      </p>
      
      <BellPanel
        bells={bells}
        activeBellIds={activeBellIds}
        onBellHit={triggerBell}
        bellRefs={bellRefs}
      />
      
      <div className="canvas-container">
        <canvas ref={canvasRef} />
      </div>
      
      <div className="control-bar">
        <button
          className={`control-btn record-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleRecordClick}
          disabled={isRecording || isPlaying}
          title="录制"
        />
        
        <button
          className="control-btn stop-btn"
          onClick={handleStopClick}
          disabled={!isRecording && !isPlaying}
          title="停止"
        />
        
        <button
          className="control-btn play-btn"
          onClick={handlePlayClick}
          disabled={!savedRecording || isPlaying || isRecording}
          title="播放"
        />
        
        <div className="speed-controls">
          {speeds.map((speed) => (
            <button
              key={speed}
              className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
              onClick={() => handleSpeedChange(speed)}
              title={`${speed}x 速度`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
