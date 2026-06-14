import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivityStore } from '../store/useActivityStore'
import ActivityCard from '../components/ActivityCard'
import './MainPage.css'

function MainPage() {
  const navigate = useNavigate()
  const { activities, fetchActivities, createActivity, loading } = useActivityStore()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    maxParticipants: '',
  })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setFormError('请输入活动名称')
      return false
    }
    if (!formData.date) {
      setFormError('请选择活动日期')
      return false
    }
    if (!formData.location.trim()) {
      setFormError('请输入活动地点')
      return false
    }
    if (!formData.maxParticipants || Number(formData.maxParticipants) <= 0) {
      setFormError('请输入有效的参会人数上限')
      return false
    }
    setFormError('')
    return true
  }

  const handleCreate = async () => {
    if (!validateForm()) return

    try {
      await createActivity({
        name: formData.name.trim(),
        date: formData.date,
        location: formData.location.trim(),
        maxParticipants: Number(formData.maxParticipants),
      })
      setShowModal(false)
      setFormData({ name: '', date: '', location: '', maxParticipants: '' })
    } catch {
    }
  }

  const goToSignIn = () => {
    const code = prompt('请输入活动码：')
    if (code && code.trim()) {
      navigate(`/signin/${code.trim().toUpperCase()}`)
    }
  }

  return (
    <div className="main-page">
      <header className="page-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">🎯</div>
            <div>
              <h1 className="page-title">活动签到管理</h1>
              <p className="page-subtitle">高效管理活动签到与现场反馈</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="secondary-btn" onClick={goToSignIn}>
              参会签到
            </button>
            <button className="primary-btn" onClick={() => setShowModal(true)}>
              + 创建活动
            </button>
          </div>
        </div>
      </header>

      <main className="page-main">
        <div className="section-header">
          <h2 className="section-title">我的活动</h2>
          <span className="activity-count">共 {activities.length} 个活动</span>
        </div>

        {loading && activities.length === 0 ? (
          <div className="loading-state">加载中...</div>
        ) : activities.length === 0 ? (
          <div className="empty-state glass-card">
            <div className="empty-icon">📋</div>
            <h3>暂无活动</h3>
            <p>创建您的第一个活动，开始高效管理签到</p>
            <button className="primary-btn" onClick={() => setShowModal(true)}>
              创建活动
            </button>
          </div>
        ) : (
          <div className="activity-grid">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>创建新活动</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <div className="form-group">
              <label>活动名称</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="请输入活动名称"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>活动日期</label>
              <input
                type="datetime-local"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>活动地点</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="请输入活动地点"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>参会人数上限</label>
              <input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleInputChange}
                placeholder="请输入人数上限"
                min="1"
              />
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button className="primary-btn" onClick={handleCreate} disabled={loading}>
                {loading ? '创建中...' : '创建活动'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MainPage
