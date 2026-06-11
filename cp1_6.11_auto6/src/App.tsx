import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { Project, SortField, SortOrder } from './types'
import projectsData from './data/projects.json'
import ProjectCard from './components/ProjectCard'
import DetailsModal from './components/DetailsModal'
import FavoritesSidebar from './components/FavoritesSidebar'
import styles from './styles/App.module.css'

const LANGUAGES = ['All', 'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java']
const MAX_FAVORITES = 10

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All')
  const [sortField, setSortField] = useState<SortField>('stars')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastExiting, setToastExiting] = useState(false)
  const toastTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setProjects(projectsData as Project[])
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setToastExiting(false)
    setToast(message)
    toastTimerRef.current = window.setTimeout(() => {
      setToastExiting(true)
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null)
        setToastExiting(false)
      }, 300)
    }, 2000)
  }, [])

  const toggleFavorite = useCallback((projectId: string) => {
    setFavorites(prev => {
      const isFavorite = prev.includes(projectId)
      if (isFavorite) {
        return prev.filter(id => id !== projectId)
      } else {
        if (prev.length >= MAX_FAVORITES) {
          showToast(`收藏夹已满（最多 ${MAX_FAVORITES} 个）`)
          return prev
        }
        return [...prev, projectId]
      }
    })
  }, [showToast])

  const reorderFavorites = useCallback((fromIndex: number, toIndex: number) => {
    setFavorites(prev => {
      const newFavorites = [...prev]
      const [removed] = newFavorites.splice(fromIndex, 1)
      newFavorites.splice(toIndex, 0, removed)
      return newFavorites
    })
  }, [])

  const removeFavorite = useCallback((projectId: string) => {
    setFavorites(prev => prev.filter(id => id !== projectId))
  }, [])

  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects]
    if (selectedLanguage !== 'All') {
      result = result.filter(p => p.language === selectedLanguage)
    }
    result.sort((a, b) => {
      if (sortField === 'stars') {
        return sortOrder === 'desc' ? b.stars - a.stars : a.stars - b.stars
      } else {
        const dateA = new Date(a.updatedAt).getTime()
        const dateB = new Date(b.updatedAt).getTime()
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
      }
    })
    return result
  }, [projects, selectedLanguage, sortField, sortOrder])

  const favoriteProjects = useMemo(() => {
    return favorites
      .map(id => projects.find(p => p.id === id))
      .filter((p): p is Project => p !== undefined)
  }, [favorites, projects])

  const handleRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const ripple = document.createElement('span')
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    ripple.style.width = ripple.style.height = size + 'px'
    ripple.style.left = x + 'px'
    ripple.style.top = y + 'px'
    ripple.className = styles.ripple
    button.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
  }, [])

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>开源项目排行榜</h1>
          <p className={styles.subtitle}>探索热门开源项目，发现优质代码库</p>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>语言：</span>
            <select
              className={styles.select}
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang === 'All' ? '全部' : lang}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>排序：</span>
            <button
              className={`${styles.button} ${sortField === 'stars' ? styles.buttonActive : ''}`}
              onClick={(e) => {
                handleRipple(e)
                if (sortField === 'stars') {
                  setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
                } else {
                  setSortField('stars')
                  setSortOrder('desc')
                }
              }}
            >
              Stars {sortField === 'stars' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button
              className={`${styles.button} ${sortField === 'updatedAt' ? styles.buttonActive : ''}`}
              onClick={(e) => {
                handleRipple(e)
                if (sortField === 'updatedAt') {
                  setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
                } else {
                  setSortField('updatedAt')
                  setSortOrder('desc')
                }
              }}
            >
              更新时间 {sortField === 'updatedAt' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        ) : filteredAndSortedProjects.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔍</div>
            <p className={styles.emptyText}>没有找到匹配的项目</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredAndSortedProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                isFavorite={favorites.includes(project.id)}
                onToggleFavorite={() => toggleFavorite(project.id)}
                onClick={() => setSelectedProject(project)}
              />
            ))}
          </div>
        )}
      </main>

      <aside className={styles.sidebarWrapper}>
        <FavoritesSidebar
          projects={favoriteProjects}
          onReorder={reorderFavorites}
          onRemove={removeFavorite}
          onProjectClick={(project) => setSelectedProject(project)}
          maxFavorites={MAX_FAVORITES}
        />
      </aside>

      {selectedProject && (
        <DetailsModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {toast && (
        <div className={styles.toastContainer}>
          <div className={`${styles.toast} ${toastExiting ? styles.toastExit : ''}`}>
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
