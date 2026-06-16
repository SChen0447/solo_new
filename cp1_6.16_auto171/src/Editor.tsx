import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDrop } from 'react-dnd';
import { Character, Action, ActionType, ACTION_COLORS, ACTION_NAMES, CANVAS_WIDTH, CANVAS_HEIGHT, TIMELINE_DURATION } from './types';
import { CHARACTER_TEMPLATES, getTemplate } from './data/characterLibrary';
import { CharacterSprite } from './components/CharacterSprite';

interface EditorProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  actions: Action[];
  setActions: React.Dispatch<React.SetStateAction<Action[]>>;
  playhead: number;
  setPlayhead: React.Dispatch<React.SetStateAction<number>>;
}

interface DragState {
  characterId: string;
  startX: number;
  startY: number;
  charStartX: number;
  charStartY: number;
}

interface TimelineDragState {
  actionId: string;
  mode: 'move' | 'resize-left' | 'resize-right';
  startTime: number;
  startX: number;
}

const PIXELS_PER_SECOND = 15;

const Editor: React.FC<EditorProps> = ({
  characters,
  setCharacters,
  actions,
  setActions,
  playhead,
  setPlayhead
}) => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const setCanvasRef = useCallback((node: HTMLDivElement | null) => {
    canvasRef.current = node;
    drop(node);
  }, [drop]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [timelineDrag, setTimelineDrag] = useState<TimelineDragState | null>(null);
  const [templateColorIndex, setTemplateColorIndex] = useState<Record<string, number>>({});
  const [libraryNames, setLibraryNames] = useState<Record<string, string>>({});

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId) || null;

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'CHARACTER_TEMPLATE',
    drop: (item: { type: string; color: string; name: string }, monitor) => {
      const offset = monitor.getClientOffset();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (offset && canvasRect) {
        const x = Math.max(0, Math.min(CANVAS_WIDTH - 60, offset.x - canvasRect.left - 30));
        const y = Math.max(0, Math.min(CANVAS_HEIGHT - 60, offset.y - canvasRect.top - 30));
        const newChar: Character = {
          id: uuidv4(),
          type: item.type as Character['type'],
          name: item.name,
          color: item.color,
          x,
          y,
          scale: 1,
          rotation: 0,
          dialog: ''
        };
        setCharacters(prev => [...prev, newChar]);
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver()
    })
  }), [characters]);

  const handleCanvasMouseDown = (e: React.MouseEvent, char: Character) => {
    e.stopPropagation();
    setSelectedCharacterId(char.id);
    setDragState({
      characterId: char.id,
      startX: e.clientX,
      startY: e.clientY,
      charStartX: char.x,
      charStartY: char.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragState) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      setCharacters(prev => prev.map(c =>
        c.id === dragState.characterId
          ? {
              ...c,
              x: Math.max(0, Math.min(CANVAS_WIDTH - 60, dragState.charStartX + dx)),
              y: Math.max(0, Math.min(CANVAS_HEIGHT - 60, dragState.charStartY + dy))
            }
          : c
      ));
    }
    if (timelineDrag) {
      const dx = e.clientX - timelineDrag.startX;
      const deltaTime = dx / PIXELS_PER_SECOND;
      setActions(prev => prev.map(a => {
        if (a.id !== timelineDrag.actionId) return a;
        if (timelineDrag.mode === 'move') {
          let newStart = Math.round((timelineDrag.startTime + deltaTime) * 2) / 2;
          newStart = Math.max(0, Math.min(TIMELINE_DURATION - a.duration, newStart));
          return { ...a, startTime: newStart };
        } else if (timelineDrag.mode === 'resize-left') {
          let newStart = Math.round((timelineDrag.startTime + deltaTime) * 2) / 2;
          const originalEnd = timelineDrag.startTime + (actions.find(ac => ac.id === a.id)?.duration || 1);
          newStart = Math.max(0, Math.min(originalEnd - 0.5, newStart));
          const newDuration = Math.max(0.5, Math.min(5, originalEnd - newStart));
          return { ...a, startTime: newStart, duration: newDuration };
        } else {
          const originalStart = actions.find(ac => ac.id === a.id)?.startTime || 0;
          let newDuration = Math.round(((timelineDrag.startTime + deltaTime) + (actions.find(ac => ac.id === a.id)?.duration || 1) - originalStart) * 2) / 2;
          newDuration = Math.max(0.5, Math.min(5, newDuration));
          newDuration = Math.min(newDuration, TIMELINE_DURATION - originalStart);
          return { ...a, duration: newDuration };
        }
      }));
    }
  }, [dragState, timelineDrag, actions, setCharacters, setActions]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setTimelineDrag(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleCharacterClick = (e: React.MouseEvent, char: Character) => {
    e.stopPropagation();
    setSelectedCharacterId(char.id);
  };

  const handleCanvasClick = () => {
    setSelectedCharacterId(null);
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    setActions(prev => prev.filter(a => a.characterId !== id));
    if (selectedCharacterId === id) {
      setSelectedCharacterId(null);
    }
  };

  const addAction = (characterId: string) => {
    const charActions = actions.filter(a => a.characterId === characterId);
    const maxEnd = charActions.length > 0
      ? Math.max(...charActions.map(a => a.startTime + a.duration))
      : 0;
    const newAction: Action = {
      id: uuidv4(),
      characterId,
      type: 'walk',
      startTime: Math.round(maxEnd * 2) / 2,
      duration: 1,
      targetX: 200,
      targetY: 0,
      targetRotation: 360,
      targetScale: 1.5,
      direction: 'right'
    };
    setActions(prev => [...prev, newAction]);
  };

  const deleteAction = (actionId: string) => {
    setActions(prev => prev.filter(a => a.id !== actionId));
  };

  const updateAction = (actionId: string, updates: Partial<Action>) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, ...updates } : a));
  };

  const handleTimelineMouseDown = (e: React.MouseEvent, actionId: string, mode: 'move' | 'resize-left' | 'resize-right') => {
    e.stopPropagation();
    const action = actions.find(a => a.id === actionId);
    if (action) {
      setTimelineDrag({
        actionId,
        mode,
        startTime: action.startTime,
        startX: e.clientX
      });
    }
  };

  const handleTimelineBackgroundMouseDown = (e: React.MouseEvent) => {
    const timelineEl = e.currentTarget as HTMLDivElement;
    const rect = timelineEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = Math.round((clickX / PIXELS_PER_SECOND) * 2) / 2;
    setPlayhead(Math.max(0, Math.min(TIMELINE_DURATION, time)));
  };

  const snapToHalf = (val: number): number => Math.round(val * 2) / 2;

  return (
    <div className="editor-container">
      <div className="editor-main">
        <div className="character-library">
          <h3>🎨 角色库</h3>
          {CHARACTER_TEMPLATES.map(template => {
            const colorIdx = templateColorIndex[template.type] ?? 0;
            const currentColor = template.colors[colorIdx];
            const currentName = libraryNames[template.type] || template.defaultName;

            const handleNameDoubleClick = () => {
              setEditingNameId(template.type);
              setEditingName(currentName);
            };

            const handleNameKeyDown = (e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                setLibraryNames(prev => ({ ...prev, [template.type]: editingName }));
                setEditingNameId(null);
              }
            };

            return (
              <div
                key={template.type}
                className="library-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: template.type,
                    color: currentColor.value,
                    name: currentName
                  }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
              >
                <div className="library-sprite">
                  <CharacterSprite type={template.type} color={currentColor.value} size={50} />
                </div>
                {editingNameId === template.type ? (
                  <input
                    className="name-input"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    onBlur={() => {
                      setLibraryNames(prev => ({ ...prev, [template.type]: editingName }));
                      setEditingNameId(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <div className="library-name" onDoubleClick={handleNameDoubleClick}>
                    {currentName}
                  </div>
                )}
                <div className="color-picker">
                  {template.colors.map((c, idx) => (
                    <div
                      key={c.name}
                      className={`color-swatch ${idx === colorIdx ? 'active' : ''}`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setTemplateColorIndex(prev => ({ ...prev, [template.type]: idx }))}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="canvas-area">
          <div
            ref={setCanvasRef}
            className={`canvas ${isOver ? 'canvas-over' : ''}`}
            onClick={handleCanvasClick}
          >
            {characters.map(char => (
              <div
                key={char.id}
                className={`canvas-character ${selectedCharacterId === char.id ? 'selected' : ''} ${dragState?.characterId === char.id ? 'dragging' : ''}`}
                style={{
                  left: char.x,
                  top: char.y,
                  transform: `scale(${char.scale}) rotate(${char.rotation}deg)`,
                  transformOrigin: 'center center'
                }}
                onMouseDown={(e) => handleCanvasMouseDown(e, char)}
                onClick={(e) => handleCharacterClick(e, char)}
              >
                <CharacterSprite type={char.type} color={char.color} size={60} />
                <div className="char-label">{char.name}</div>
              </div>
            ))}
          </div>

          {selectedCharacter && (
            <div className="settings-panel">
              <div className="settings-header">
                <h4>⚙️ {selectedCharacter.name} 设置</h4>
                <button className="close-btn" onClick={() => setSelectedCharacterId(null)}>✕</button>
              </div>
              <div className="settings-body">
                <label>
                  X 坐标:
                  <input
                    type="number"
                    value={Math.round(selectedCharacter.x)}
                    onChange={e => updateCharacter(selectedCharacter.id, { x: Number(e.target.value) })}
                    min={0}
                    max={CANVAS_WIDTH}
                  />
                </label>
                <label>
                  Y 坐标:
                  <input
                    type="number"
                    value={Math.round(selectedCharacter.y)}
                    onChange={e => updateCharacter(selectedCharacter.id, { y: Number(e.target.value) })}
                    min={0}
                    max={CANVAS_HEIGHT}
                  />
                </label>
                <label>
                  大小: {selectedCharacter.scale.toFixed(1)}x
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={selectedCharacter.scale}
                    onChange={e => updateCharacter(selectedCharacter.id, { scale: Number(e.target.value) })}
                  />
                </label>
                <label>
                  旋转: {selectedCharacter.rotation}°
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={selectedCharacter.rotation}
                    onChange={e => updateCharacter(selectedCharacter.id, { rotation: Number(e.target.value) })}
                  />
                </label>
                <label>
                  颜色:
                  <div className="inline-colors">
                    {(getTemplate(selectedCharacter.type)?.colors || []).map(c => (
                      <div
                        key={c.value}
                        className={`color-swatch ${c.value === selectedCharacter.color ? 'active' : ''}`}
                        style={{ backgroundColor: c.value }}
                        onClick={() => updateCharacter(selectedCharacter.id, { color: c.value })}
                      />
                    ))}
                  </div>
                </label>
                <label>
                  台词 (最多20字):
                  <input
                    type="text"
                    value={selectedCharacter.dialog}
                    maxLength={20}
                    onChange={e => updateCharacter(selectedCharacter.id, { dialog: e.target.value })}
                  />
                </label>
                <button className="btn-primary add-action-btn" onClick={() => addAction(selectedCharacter.id)}>
                  ➕ 添加动作
                </button>
                <button className="btn-danger" onClick={() => deleteCharacter(selectedCharacter.id)}>
                  🗑️ 删除角色
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-header">
          <span className="timeline-title">⏱️ 时间轴</span>
          <span className="timeline-time">当前: {playhead.toFixed(1)}s</span>
        </div>
        <div className="timeline-ruler" onMouseDown={handleTimelineBackgroundMouseDown}>
          {Array.from({ length: TIMELINE_DURATION + 1 }, (_, i) => (
            <div key={i} className="timeline-tick" style={{ left: i * PIXELS_PER_SECOND }}>
              <div className="tick-line" />
              {i % 5 === 0 && <span className="tick-label">{i}s</span>}
            </div>
          ))}
          <div
            className="playhead-line"
            style={{ left: playhead * PIXELS_PER_SECOND }}
          />
        </div>
        <div className="timeline-tracks">
          {characters.map(char => {
            const charActions = actions.filter(a => a.characterId === char.id);
            return (
              <div key={char.id} className="timeline-track">
                <div className="track-label">
                  <CharacterSprite type={char.type} color={char.color} size={24} />
                  <span>{char.name}</span>
                </div>
                <div className="track-content" onMouseDown={handleTimelineBackgroundMouseDown}>
                  {Array.from({ length: TIMELINE_DURATION + 1 }, (_, i) => (
                    <div key={i} className="track-grid" style={{ left: i * PIXELS_PER_SECOND }} />
                  ))}
                  <div
                    className="playhead-line"
                    style={{ left: playhead * PIXELS_PER_SECOND, pointerEvents: 'none' }}
                  />
                  {charActions.map(action => (
                    <div
                      key={action.id}
                      className="action-block"
                      style={{
                        left: action.startTime * PIXELS_PER_SECOND,
                        width: action.duration * PIXELS_PER_SECOND,
                        backgroundColor: ACTION_COLORS[action.type]
                      }}
                      onMouseDown={(e) => handleTimelineMouseDown(e, action.id, 'move')}
                    >
                      <div
                        className="action-resize-left"
                        onMouseDown={(e) => handleTimelineMouseDown(e, action.id, 'resize-left')}
                      />
                      <div className="action-content">
                        <span>{ACTION_NAMES[action.type]}</span>
                        <span className="action-duration">{action.duration.toFixed(1)}s</span>
                      </div>
                      <div
                        className="action-resize-right"
                        onMouseDown={(e) => handleTimelineMouseDown(e, action.id, 'resize-right')}
                      />
                      <button
                        className="action-delete"
                        onClick={(e) => { e.stopPropagation(); deleteAction(action.id); }}
                      >×</button>
                      <select
                        className="action-select"
                        value={action.type}
                        onChange={(e) => updateAction(action.id, { type: e.target.value as ActionType })}
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                      >
                        <option value="walk">行走</option>
                        <option value="jump">跳跃</option>
                        <option value="rotate">旋转</option>
                        <option value="scale">缩放</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {characters.length === 0 && (
            <div className="timeline-empty">从左侧拖拽角色到画布开始创作 ✨</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;
