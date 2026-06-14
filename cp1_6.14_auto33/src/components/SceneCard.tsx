import React, { useRef, useCallback } from 'react';
import type { Scene } from '../types';
import { PRESET_COLORS } from '../types';
import { useStoryboardStore } from '../store';

interface SceneCardProps {
  scene: Scene;
  index: number;
}

export const SceneCard: React.FC<SceneCardProps> = React.memo(({ scene, index }) => {
  const { updateScene, deleteScene, setEditingScene, editingScene, reorderScenes } =
    useStoryboardStore();
  const isEditing = editingScene?.id === scene.id;
  const dragRef = useRef<HTMLDivElement>(null);
  const dragIndexRef = useRef<number>(index);
  const [dragOver, setDragOver] = React.useState(false);

  dragIndexRef.current = index;

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
      if (dragRef.current) {
        dragRef.current.style.transform = 'scale(1.05)';
        dragRef.current.style.boxShadow = '0 8px 32px rgba(233,69,96,0.3)';
        dragRef.current.style.zIndex = '100';
      }
    },
    [index]
  );

  const handleDragEnd = useCallback(() => {
    if (dragRef.current) {
      dragRef.current.style.transform = '';
      dragRef.current.style.boxShadow = '';
      dragRef.current.style.zIndex = '';
    }
    setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const fromIndex = Number(e.dataTransfer.getData('text/plain'));
      const toIndex = dragIndexRef.current;
      if (fromIndex !== toIndex) {
        reorderScenes(fromIndex, toIndex);
      }
    },
    [reorderScenes]
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val.length <= 20) updateScene(scene.id, { name: val });
    },
    [scene.id, updateScene]
  );

  const handleDescChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      if (val.length <= 200) updateScene(scene.id, { description: val });
    },
    [scene.id, updateScene]
  );

  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateScene(scene.id, { duration: Number(e.target.value) });
    },
    [scene.id, updateScene]
  );

  const handleColorSelect = useCallback(
    (color: string) => {
      updateScene(scene.id, { color });
    },
    [scene.id, updateScene]
  );

  return (
    <div
      ref={dragRef}
      className={`scene-card ${dragOver ? 'scene-card-dragover' : ''} ${isEditing ? 'scene-card-editing' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="scene-card-header">
        <span className="scene-color-dot" style={{ backgroundColor: scene.color }} />
        <span className="scene-order">#{index + 1}</span>
        <div className="scene-card-actions">
          <button
            className="btn-icon"
            onClick={() => setEditingScene(isEditing ? null : scene)}
            title={isEditing ? '收起' : '编辑'}
          >
            {isEditing ? '✕' : '✎'}
          </button>
          <button
            className="btn-icon btn-danger"
            onClick={() => deleteScene(scene.id)}
            title="删除"
          >
            ✖
          </button>
        </div>
      </div>

      <div className="scene-card-color-bar" style={{ backgroundColor: scene.color }} />

      <div className="scene-card-body">
        {isEditing ? (
          <>
            <input
              className="scene-input"
              value={scene.name}
              onChange={handleNameChange}
              placeholder="场景名称（最多20字）"
              maxLength={20}
            />
            <textarea
              className="scene-textarea"
              value={scene.description}
              onChange={handleDescChange}
              placeholder="场景描述（最多200字）"
              maxLength={200}
              rows={3}
            />
            <div className="scene-color-picker">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-swatch ${scene.color === c ? 'color-swatch-active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => handleColorSelect(c)}
                />
              ))}
            </div>
            <div className="scene-duration-row">
              <label>时长：</label>
              <input
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={scene.duration}
                onChange={handleDurationChange}
              />
              <span className="duration-value">{scene.duration}s</span>
            </div>
          </>
        ) : (
          <>
            <h4 className="scene-name">{scene.name || '未命名场景'}</h4>
            <p className="scene-desc">{scene.description || '暂无描述'}</p>
            <span className="scene-duration-tag">{scene.duration}s</span>
          </>
        )}
      </div>
    </div>
  );
});

SceneCard.displayName = 'SceneCard';
