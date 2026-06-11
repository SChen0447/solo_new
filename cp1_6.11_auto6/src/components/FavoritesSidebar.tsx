import { useState, useCallback, useRef } from 'react'
import type { Project } from '../types'
import styles from '../styles/FavoritesSidebar.module.css'

interface FavoritesSidebarProps {
  projects: Project[]
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (projectId: string) => void
  onProjectClick: (project: Project) => void
  maxFavorites: number
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

function FavoritesSidebar({
  projects,
  onReorder,
  onRemove,
  onProjectClick,
  maxFavorites,
}: FavoritesSidebarProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragOverTimerRef = useRef<number | null>(null)

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }, [draggedIndex])

  const handleDragLeave = useCallback(() => {
    if (dragOverTimerRef.current) {
      clearTimeout(dragOverTimerRef.current)
    }
    dragOverTimerRef.current = window.setTimeout(() => {
      setDragOverIndex(null)
    }, 50)
  }, [])

  const handleDrop = useCallback((index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorder(draggedIndex, index)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, onReorder])

  const handleRemove = useCallback((e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    onRemove(projectId)
  }, [onRemove])

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span>⭐</span>
          <span>收藏夹</span>
          <span className={styles.count}>
            {projects.length}/{maxFavorites}
          </span>
        </h2>
        <p className={styles.hint}>拖拽调整顺序，点击查看详情</p>
      </div>

      {projects.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p className={styles.emptyText}>
            还没有收藏项目<br />
            点击项目卡片上的星标添加
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {projects.map((project, index) => (
            <div
              key={project.id}
              className={`${styles.item} ${
                draggedIndex === index ? styles.itemDragging : ''
              } ${dragOverIndex === index ? styles.itemDragOver : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
            >
              <span className={styles.dragHandle}>⋮⋮</span>
              <div
                className={styles.itemContent}
                onClick={() => onProjectClick(project)}
              >
                <p className={styles.itemName}>{project.name}</p>
                <div className={styles.itemMeta}>
                  <span>⭐ {formatNumber(project.stars)}</span>
                  <span>{project.language}</span>
                </div>
              </div>
              <button
                className={styles.removeBtn}
                onClick={(e) => handleRemove(e, project.id)}
                aria-label="移除收藏"
                title="移除收藏"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}

export default FavoritesSidebar
