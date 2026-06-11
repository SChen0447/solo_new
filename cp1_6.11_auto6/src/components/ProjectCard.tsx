import { useCallback } from 'react'
import type { Project } from '../types'
import styles from '../styles/ProjectCard.module.css'

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3776ab',
  Go: '#00add8',
  Rust: '#dea584',
  Java: '#b07219',
}

interface ProjectCardProps {
  project: Project
  isFavorite: boolean
  onToggleFavorite: () => void
  onClick: () => void
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  if (days < 365) return `${Math.floor(days / 30)} 月前`
  return `${Math.floor(days / 365)} 年前`
}

function ProjectCard({ project, isFavorite, onToggleFavorite, onClick }: ProjectCardProps) {
  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite()
  }, [onToggleFavorite])

  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.header}>
        <h3 className={styles.title}>{project.name}</h3>
        <button
          className={`${styles.favoriteBtn} ${isFavorite ? styles.favoriteBtnActive : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? '取消收藏' : '收藏'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>
      <p className={styles.description}>{project.description}</p>
      <div className={styles.footer}>
        <span className={styles.tag}>
          <span
            className={styles.languageDot}
            style={{ backgroundColor: LANGUAGE_COLORS[project.language] || '#6c7086' }}
          />
          {project.language}
        </span>
        <span className={styles.stat}>
          <span className={styles.statIcon}>⭐</span>
          {formatNumber(project.stars)}
        </span>
        <span className={styles.stat}>
          <span className={styles.statIcon}>🍴</span>
          {formatNumber(project.forks)}
        </span>
        <span className={styles.updated}>{formatDate(project.updatedAt)}</span>
      </div>
    </div>
  )
}

export default ProjectCard
