import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { worksApi, Work } from '../services/api'
import SearchBar from '../components/SearchBar'
import './WorksPage.css'

export default function WorksPage() {
  const navigate = useNavigate()
  const { works, setWorks, searchQuery, setSearchQuery, filteredWorks } = useApp()
  const [isLoading, setIsLoading] = useState(true)

  const loadWorks = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await worksApi.getAll()
      setWorks(response.data.data)
    } catch (error) {
      console.error('加载作品失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [setWorks])

  useEffect(() => {
    loadWorks()
  }, [loadWorks])

  const handleWorkClick = (work: Work) => {
    navigate(`/work/${work.id}`)
  }

  return (
    <div className="works-page">
      <div className="works-header">
        <h1>音乐作品</h1>
        <p className="works-subtitle">发现独立音乐人的精彩创作</p>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {isLoading ? (
        <div className="loading">加载中...</div>
      ) : filteredWorks.length === 0 ? (
        <div className="no-results">未找到相关作品</div>
      ) : (
        <div className="works-grid">
          {filteredWorks.map(work => (
            <div
              key={work.id}
              className="work-card"
              onClick={() => handleWorkClick(work)}
            >
              <div className="work-cover">
                <img
                  src={work.cover_url}
                  alt={work.title}
                  loading="lazy"
                />
                <div className="work-play-overlay">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              <div className="work-info">
                <h3 className="work-title">{work.title}</h3>
                <p className="work-artist">{work.artist}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
