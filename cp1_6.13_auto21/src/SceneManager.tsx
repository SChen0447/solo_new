import React, { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { eventBus } from './eventBus'
import { perfMonitor } from './performance'
import type { Scene, ProjectData, SceneSwitchEvent } from './types'
import './SceneManager.css'

interface SceneManagerProps {
  scenes: Scene[]
  currentSceneIndex: number
  onScenesChange: (scenes: Scene[]) => void
  onCurrentSceneChange: (index: number) => void
  switchDirection: 'left' | 'right' | null
  onSwitchDirectionChange: (dir: 'left' | 'right' | null) => void
}

const createDefaultScene = (index: number): Scene => ({
  id: uuidv4(),
  name: `场景 ${index + 1}`,
  index,
  items: [],
  background: '#FFFDE7'
})

const deepCloneScene = (scene: Scene): Scene => {
  return JSON.parse(JSON.stringify(scene))
}

export const SceneManager: React.FC<SceneManagerProps> = ({
  scenes,
  currentSceneIndex,
  onScenesChange,
  onCurrentSceneChange,
  switchDirection,
  onSwitchDirectionChange
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleAddScene = useCallback(() => {
    const newScene = createDefaultScene(scenes.length)
    const newScenes = [...scenes, newScene]
    onScenesChange(newScenes)
    perfMonitor.measureSceneSwitch(() => {
      switchToScene(scenes.length, 'right')
    })
  }, [scenes, onScenesChange])

  const handleDeleteScene = useCallback((index: number) => {
    if (scenes.length <= 1) return

    const newScenes = scenes.filter((_, i) => i !== index)
      .map((scene, i) => ({ ...scene, index: i, name: `场景 ${i + 1}` }))
    onScenesChange(newScenes)

    if (index === currentSceneIndex) {
      const newIndex = Math.min(index, newScenes.length - 1)
      onCurrentSceneChange(newIndex)
    } else if (index < currentSceneIndex) {
      onCurrentSceneChange(currentSceneIndex - 1)
    }

    eventBus.emit('scene:delete', index)
  }, [scenes, currentSceneIndex, onScenesChange, onCurrentSceneChange])

  const switchToScene = useCallback((targetIndex: number, direction: 'left' | 'right') => {
    if (targetIndex === currentSceneIndex || isAnimating) return
    if (targetIndex < 0 || targetIndex >= scenes.length) return

    const currentScene = scenes[currentSceneIndex]
    const savedScene = deepCloneScene(currentScene)
    eventBus.emit('scene:updated', savedScene)

    const event: SceneSwitchEvent = {
      fromIndex: currentSceneIndex,
      toIndex: targetIndex,
      direction
    }
    eventBus.emit('scene:switch', event)

    onSwitchDirectionChange(direction)
    setIsAnimating(true)

    perfMonitor.measureSceneSwitch(() => {
      setTimeout(() => {
        onCurrentSceneChange(targetIndex)
        setTimeout(() => {
          onSwitchDirectionChange(null)
          setIsAnimating(false)
        }, 400)
      }, 50)
    })
  }, [currentSceneIndex, scenes, isAnimating, onCurrentSceneChange, onSwitchDirectionChange])

  const handleSceneClick = useCallback((index: number) => {
    const direction = index > currentSceneIndex ? 'right' : 'left'
    switchToScene(index, direction)
  }, [currentSceneIndex, switchToScene])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)

    if (isNaN(fromIndex) || fromIndex === targetIndex) {
      setDragOverIndex(null)
      return
    }

    const newScenes = [...scenes]
    const [removed] = newScenes.splice(fromIndex, 1)
    newScenes.splice(targetIndex, 0, removed)
    const reorderedScenes = newScenes.map((scene, i) => ({
      ...scene,
      index: i,
      name: `场景 ${i + 1}`
    }))
    onScenesChange(reorderedScenes)

    if (fromIndex === currentSceneIndex) {
      onCurrentSceneChange(targetIndex)
    } else if (fromIndex < currentSceneIndex && targetIndex >= currentSceneIndex) {
      onCurrentSceneChange(currentSceneIndex - 1)
    } else if (fromIndex > currentSceneIndex && targetIndex <= currentSceneIndex) {
      onCurrentSceneChange(currentSceneIndex + 1)
    }

    eventBus.emit('scene:reorder', { fromIndex, toIndex: targetIndex })
    setDragOverIndex(null)
  }, [scenes, currentSceneIndex, onScenesChange, onCurrentSceneChange])

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  useEffect(() => {
    const unsub1 = eventBus.on('scene:add', handleAddScene)
    const unsub2 = eventBus.on('scene:delete', handleDeleteScene)

    return () => {
      unsub1()
      unsub2()
    }
  }, [handleAddScene, handleDeleteScene])

  return (
    <div className="scene-manager">
      <div className="scene-manager-header">
        <h3>📑 场景列表</h3>
        <button
          className="add-scene-btn"
          onClick={handleAddScene}
          title="新增场景"
        >
          + 新增
        </button>
      </div>

      <div className="scene-tabs">
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            className={`scene-tab ${index === currentSceneIndex ? 'active' : ''} ${
              dragOverIndex === index ? 'drag-over' : ''
            }`}
            draggable
            onClick={() => handleSceneClick(index)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <span className="scene-tab-number">{index + 1}</span>
            <span className="scene-tab-name">{scene.name}</span>
            {scenes.length > 1 && (
              <button
                className="scene-tab-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteScene(index)
                }}
                title="删除场景"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="scene-nav">
        <button
          className="nav-btn prev"
          onClick={() => switchToScene(currentSceneIndex - 1, 'left')}
          disabled={currentSceneIndex === 0 || isAnimating}
        >
          ◀ 上一场
        </button>
        <span className="scene-indicator">
          {currentSceneIndex + 1} / {scenes.length}
        </span>
        <button
          className="nav-btn next"
          onClick={() => switchToScene(currentSceneIndex + 1, 'right')}
          disabled={currentSceneIndex === scenes.length - 1 || isAnimating}
        >
          下一场 ▶
        </button>
      </div>
    </div>
  )
}

export default SceneManager
