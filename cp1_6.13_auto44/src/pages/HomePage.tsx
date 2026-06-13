import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPieces } from '../api'
import { CodePiece } from '../types'
import '../styles/HomePage.css'

const LANGUAGES = [
  { value: 'all', label: '全部语言' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'Python', label: 'Python' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'HTML/CSS', label: 'HTML/CSS' },
]

const LANGUAGE_COLORS: Record<string, string> = {
  'JavaScript': '#f7df1e',
  'Python': '#306998',
  'TypeScript': '#007acc',
  'HTML/CSS': '#e44d26',
}

function relativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 30) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN')
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

function Avatar({ name }: { name: string }) {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#a29bfe', '#fd79a8']
  const colorIndex = name.charCodeAt(0) % colors.length
  return (
    <div className="avatar" style={{ backgroundColor: colors[colorIndex] }}>
      {getInitials(name)}
    </div>
  )
}

function CodeCard({ piece, onClick }: { piece: CodePiece; onClick: () => void }) {
  const langColor = LANGUAGE_COLORS[piece.language] || '#999'

  return (
    <div className="code-card" onClick={onClick}>
      <div className="card-header">
        <div className="card-title">{piece.title}</div>
        <div className="card-lang" style={{ color: langColor }}>
          <span className="lang-dot" style={{ backgroundColor: langColor }}></span>
          {piece.language}
        </div>
      </div>
      <div className="card-code-preview">
        <pre>
          <code>{piece.code.slice(0, 120)}{piece.code.length > 120 ? '...' : ''}</code>
        </pre>
      </div>
      <div className="card-tags">
        {piece.tags.map((tag) => (
          <span key={tag} className="tag-pill">{tag}</span>
        ))}
      </div>
      <div className="card-footer">
        <div className="card-author">
          <Avatar name={piece.author} />
          <span className="author-name">{piece.author}</span>
        </div>
        <div className="card-stats">
          <span className="stat-item">❤ {piece.likes}</span>
          <span className="stat-item">⭐ {piece.favorites}</span>
        </div>
      </div>
      <div className="card-time">{relativeTime(piece.created_at)}</div>
    </div>
  )
}

function HomePage() {
  const navigate = useNavigate()
  const [pieces, setPieces] = useState<CodePiece[]>([])
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('all')
  const [isUpdating, setIsUpdating] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchPieces = useCallback(async () => {
    setIsUpdating(true)
    try {
      const data = await getPieces(search, language)
      setPieces(data)
    } catch (error) {
      console.error('Failed to fetch pieces:', error)
    } finally {
      setIsUpdating(false)
      setLoading(false)
    }
  }, [search, language])

  useEffect(() => {
    fetchPieces()
  }, [fetchPieces])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value)
  }

  const handleCreateClick = () => {
    navigate('/create')
  }

  const handleCardClick = (id: string) => {
    navigate(`/piece/${id}`)
  }

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="home-page">
      <div className="home-layout">
        <div className="main-content">
          <div className="toolbar">
            <div className="search-box">
              <input
                type="text"
                placeholder="搜索代码片段..."
                value={search}
                onChange={handleSearchChange}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="language-select"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className={`cards-grid ${isUpdating ? 'fade-out' : 'fade-in'}`}>
            {pieces.length > 0 ? (
              pieces.map((piece) => (
                <CodeCard
                  key={piece.id}
                  piece={piece}
                  onClick={() => handleCardClick(piece.id)}
                />
              ))
            ) : (
              <div className="empty-state">
                <p>暂无匹配的代码片段</p>
              </div>
            )}
          </div>
        </div>

        <div className="sidebar">
          <div className="sidebar-section">
            <h3>热门标签</h3>
            <div className="tag-cloud">
              {['算法', '工具', '前端', '后端', '教程'].map((tag) => (
                <span key={tag} className="sidebar-tag">{tag}</span>
              ))}
            </div>
          </div>
          <div className="sidebar-section">
            <h3>语言分布</h3>
            <div className="lang-stats">
              {Object.entries(LANGUAGE_COLORS).map(([lang, color]) => (
                <div key={lang} className="lang-stat-item">
                  <span className="lang-dot" style={{ backgroundColor: color }}></span>
                  <span className="lang-name">{lang}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button className="fab-button" onClick={handleCreateClick}>
        <span className="fab-icon">+</span>
      </button>
    </div>
  )
}

export default HomePage
