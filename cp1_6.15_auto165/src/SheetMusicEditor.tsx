import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StaffRenderer, yToPitch, xToBeatIndex, getPitchY, getBeatX } from './staffRenderer';
import { audioEngine } from './audioEngine';
import { useSheetMusicStore } from './store';
import { NoteType, NOTE_TYPE_LABELS, PITCH_LIST, NOTE_DURATIONS } from './types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 300;

const NotePalette: React.FC<{ onDragStart: (type: NoteType) => void }> = ({ onDragStart }) => {
  const noteTypes: NoteType[] = ['whole', 'half', 'quarter', 'eighth'];

  return (
    <div className="note-palette">
      <h3 className="palette-title">音符</h3>
      <div className="note-buttons">
        {noteTypes.map(type => (
          <div
            key={type}
            className={`note-button note-${type}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('noteType', type);
              onDragStart(type);
            }}
            title={NOTE_TYPE_LABELS[type]}
          >
            <div className="note-icon">
              <div className="note-head"></div>
              {type !== 'whole' && <div className="note-stem"></div>}
              {type === 'eighth' && <div className="note-flag"></div>}
            </div>
            <span className="note-label">{NOTE_TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PropertiesPanel: React.FC = () => {
  const { notes, selectedNoteId, updateNote, removeNote } = useSheetMusicStore();
  const selectedNote = notes.find(n => n.id === selectedNoteId);

  if (!selectedNote) {
    return (
      <div className="properties-panel">
        <h3 className="panel-title">属性</h3>
        <p className="empty-hint">选择一个音符以编辑属性</p>
      </div>
    );
  }

  const pitchIndex = PITCH_LIST.indexOf(selectedNote.pitch);

  const handlePitchChange = (delta: number) => {
    const newIndex = Math.max(0, Math.min(PITCH_LIST.length - 1, pitchIndex + delta));
    updateNote(selectedNote.id, { pitch: PITCH_LIST[newIndex] });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateNote(selectedNote.id, { type: e.target.value as NoteType });
  };

  const handleDottedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNote(selectedNote.id, { dotted: e.target.checked });
  };

  const handleDelete = () => {
    removeNote(selectedNote.id);
  };

  return (
    <div className="properties-panel">
      <h3 className="panel-title">音符属性</h3>
      
      <div className="property-group">
        <label className="property-label">音高</label>
        <div className="pitch-control">
          <button 
            className="pitch-btn" 
            onClick={() => handlePitchChange(1)}
            disabled={pitchIndex >= PITCH_LIST.length - 1}
          >
            ↑
          </button>
          <span className="pitch-value">{selectedNote.pitch}</span>
          <button 
            className="pitch-btn" 
            onClick={() => handlePitchChange(-1)}
            disabled={pitchIndex <= 0}
          >
            ↓
          </button>
        </div>
      </div>

      <div className="property-group">
        <label className="property-label">时长</label>
        <select 
          className="type-select" 
          value={selectedNote.type}
          onChange={handleTypeChange}
        >
          <option value="whole">全音符</option>
          <option value="half">二分音符</option>
          <option value="quarter">四分音符</option>
          <option value="eighth">八分音符</option>
        </select>
      </div>

      <div className="property-group">
        <label className="property-label checkbox-label">
          <input 
            type="checkbox" 
            checked={selectedNote.dotted}
            onChange={handleDottedChange}
          />
          延音点
        </label>
      </div>

      <button className="delete-btn" onClick={handleDelete}>
        删除音符
      </button>
    </div>
  );
};

const PlaybackPanel: React.FC = () => {
  const { 
    notes, 
    bpm, 
    isPlaying, 
    isPaused, 
    currentPlayIndex,
    setPlaying, 
    setPaused, 
    setBpm,
    setCurrentPlayIndex,
    currentTime,
    setCurrentTime,
  } = useSheetMusicStore();

  const progressRef = useRef<number | null>(null);

  const totalDuration = notes.length > 0 
    ? (Math.max(...notes.map(n => n.beatIndex + NOTE_DURATIONS[n.type]))) * (60 / bpm)
    : 0;

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  useEffect(() => {
    if (isPlaying && !isPaused) {
      const updateProgress = () => {
        const time = audioEngine.getCurrentTime();
        setCurrentTime(time);
        progressRef.current = requestAnimationFrame(updateProgress);
      };
      progressRef.current = requestAnimationFrame(updateProgress);
    } else {
      if (progressRef.current) {
        cancelAnimationFrame(progressRef.current);
      }
    }
    return () => {
      if (progressRef.current) {
        cancelAnimationFrame(progressRef.current);
      }
    };
  }, [isPlaying, isPaused, setCurrentTime]);

  const handlePlay = () => {
    if (notes.length === 0) return;

    if (isPaused) {
      audioEngine.resume();
      setPaused(false);
    } else {
      audioEngine.setOnNoteChange((index) => {
        setCurrentPlayIndex(index);
        if (index === -1) {
          setPlaying(false);
        }
      });
      audioEngine.playSequence(notes, bpm);
      setPlaying(true);
      setCurrentPlayIndex(0);
      setCurrentTime(0);
    }
  };

  const handlePause = () => {
    audioEngine.pause();
    setPaused(true);
  };

  const handleStop = () => {
    audioEngine.stop();
    setPlaying(false);
    setPaused(false);
    setCurrentPlayIndex(-1);
    setCurrentTime(0);
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpm(parseInt(e.target.value));
  };

  return (
    <div className="playback-panel">
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="playback-controls">
        <div className="transport-buttons">
          {(!isPlaying || isPaused) ? (
            <button 
              className="play-btn"
              onClick={handlePlay}
              disabled={notes.length === 0}
            >
              ▶ 播放
            </button>
          ) : (
            <button 
              className="pause-btn"
              onClick={handlePause}
            >
              ⏸ 暂停
            </button>
          )}
          <button 
            className="stop-btn"
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
          >
            ⏹ 停止
          </button>
        </div>

        <div className="tempo-control">
          <label className="tempo-label">速度: {bpm} BPM</label>
          <input 
            type="range" 
            min="60" 
            max="200" 
            step="5"
            value={bpm}
            onChange={handleBpmChange}
            className="tempo-slider"
          />
        </div>
      </div>
    </div>
  );
};

const Notification: React.FC = () => {
  const { notification } = useSheetMusicStore();

  if (!notification) return null;

  return (
    <div className={`notification notification-${notification.type}`}>
      {notification.message}
    </div>
  );
};

const FileControls: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notes, bpm, setNotes, setBpm, showNotification, clearNotes } = useSheetMusicStore();

  const handleSave = () => {
    const data = {
      version: '1.0',
      bpm,
      notes,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sheet.melody';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('乐谱已保存', 'success');
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.notes && Array.isArray(data.notes)) {
          setNotes(data.notes);
          if (data.bpm) {
            setBpm(data.bpm);
          }
          showNotification('乐谱加载成功', 'success');
        } else {
          showNotification('文件格式无效', 'error');
        }
      } catch (err) {
        showNotification('文件解析失败', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClear = () => {
    clearNotes();
    showNotification('乐谱已清空', 'info');
  };

  return (
    <div className="file-controls">
      <button className="save-btn" onClick={handleSave}>
        💾 保存
      </button>
      <button className="load-btn" onClick={() => fileInputRef.current?.click()}>
        📂 加载
      </button>
      <button className="clear-btn" onClick={handleClear}>
        🗑 清空
      </button>
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".melody,.json"
        onChange={handleLoad}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export const SheetMusicEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StaffRenderer | null>(null);
  const { 
    notes, 
    selectedNoteId, 
    currentPlayIndex, 
    selectNote,
    addNote,
  } = useSheetMusicStore();
  
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    noteType: NoteType | null;
    x: number;
    y: number;
  }>({
    isDragging: false,
    noteType: null,
    x: 0,
    y: 0,
  });

  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      rendererRef.current = new StaffRenderer(canvasRef.current);
      renderFrame();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const renderFrame = useCallback(() => {
    if (rendererRef.current) {
      const sortedNotes = [...notes].sort((a, b) => a.beatIndex - b.beatIndex);
      const playNoteIndex = currentPlayIndex >= 0 && currentPlayIndex < sortedNotes.length
        ? currentPlayIndex
        : -1;
      
      rendererRef.current.render(
        sortedNotes,
        selectedNoteId,
        playNoteIndex
      );

      if (dragState.isDragging && dragState.noteType) {
        const pitch = yToPitch(dragState.y);
        const beatIndex = xToBeatIndex(dragState.x);
        const snapY = getPitchY(pitch);
        const snapX = getBeatX(beatIndex);
        rendererRef.current.drawDragPreview(snapX, snapY, dragState.noteType);
      }
    }
    animationRef.current = requestAnimationFrame(renderFrame);
  }, [notes, selectedNoteId, currentPlayIndex, dragState]);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [renderFrame]);

  const getCanvasCoords = (e: React.DragEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleDragStart = (type: NoteType) => {
    setDragState(prev => ({ ...prev, noteType: type }));
  };

  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    setDragState({
      isDragging: true,
      noteType: (e.dataTransfer.types.includes('noteType')) ? dragState.noteType : null,
      x,
      y,
    });
  };

  const handleDragLeave = () => {
    setDragState(prev => ({ ...prev, isDragging: false }));
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const noteType = e.dataTransfer.getData('noteType') as NoteType;
    if (!noteType) {
      setDragState({ isDragging: false, noteType: null, x: 0, y: 0 });
      return;
    }

    const { x, y } = getCanvasCoords(e);
    const pitch = yToPitch(y);
    const beatIndex = xToBeatIndex(x);

    if (beatIndex >= 0 && beatIndex < 50) {
      addNote(noteType, beatIndex, pitch);
    }

    setDragState({ isDragging: false, noteType: null, x: 0, y: 0 });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const clickedNote = rendererRef.current?.getNoteAtPosition(x, y, notes);
    
    if (clickedNote) {
      selectNote(clickedNote.id);
    } else {
      selectNote(null);
    }
  };

  return (
    <div className="sheet-music-editor">
      <Notification />
      
      <div className="editor-header">
        <h1 className="app-title">🎵 交互式乐谱编辑器</h1>
        <FileControls />
      </div>

      <div className="editor-main">
        <NotePalette onDragStart={handleDragStart} />

        <div className="staff-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="staff-canvas"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleCanvasClick}
          />
          <p className="canvas-hint">从左侧拖拽音符到五线谱上</p>
        </div>

        <PropertiesPanel />
      </div>

      <PlaybackPanel />
    </div>
  );
};

export default SheetMusicEditor;
