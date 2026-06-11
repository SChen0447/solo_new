import { useState, useEffect, useCallback } from 'react'
import type { Project } from '../types'
import styles from '../styles/DetailsModal.module.css'

interface DetailsModalProps {
  project: Project
  onClose: () => void
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

function truncateReadme(summary: string, maxLength: number = 200): string {
  if (summary.length <= maxLength) return summary
  return summary.slice(0, maxLength) + '...'
}

function DetailsModal({ project, onClose }: DetailsModalProps) {
  const [exiting, setExiting] = useState(false)

  const handleClose = useCallback(() => {
    setExiting(true)
    setTimeout(onClose, 200)
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleClose])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }, [handleClose])

  return (
    <div
      className={`${styles.overlay} ${exiting ? styles.overlayExit : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={`${styles.modal} ${exiting ? styles.modalExit : ''}`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{project.name}</h2>
            <div className={styles.meta}>
              <span className={styles.metaItem}>⭐ {formatNumber(project.stars)}</span>
              <span className={styles.metaItem}>🍴 {formatNumber(project.forks)}</span>
              <span className={styles.metaItem}>💻 {project.language}</span>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>项目描述</h3>
            <p className={styles.description}>{project.description}</p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>README 摘要</h3>
            <p className={styles.readme}>{truncateReadme(project.readmeSummary)}</p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>仓库地址</h3>
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.url}
            >
              {project.url}
            </a>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>最近 Issues</h3>
            <ul className={styles.issueList}>
              {project.issues.map((issue, index) => (
                <li key={index} className={styles.issueItem}>
                  <p className={styles.issueTitle}>{issue.title}</p>
                  <div className={styles.issueLabels}>
                    {issue.labels.map((label, labelIndex) => (
                      <span key={labelIndex} className={styles.issueLabel}>
                        {label}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailsModal
