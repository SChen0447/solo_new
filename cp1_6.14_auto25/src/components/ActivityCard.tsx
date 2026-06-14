import { useNavigate } from 'react-router-dom'
import type { Activity } from '../types'
import { formatDate } from '../utils/helpers'
import './ActivityCard.css'

interface ActivityCardProps {
  activity: Activity
}

function ActivityCard({ activity }: ActivityCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/activity/${activity.id}`)
  }

  const isCancelled = activity.status === 'cancelled'

  return (
    <div
      className={`activity-card glass-card ${isCancelled ? 'cancelled' : ''}`}
      onClick={handleClick}
    >
      <div className="card-header">
        <h3 className="card-title">{activity.name}</h3>
        <span className={`status-badge ${activity.status}`}>
          {isCancelled ? '已取消' : '进行中'}
        </span>
      </div>

      <div className="card-info">
        <div className="info-item">
          <span className="info-icon">📅</span>
          <span className="info-text">{formatDate(activity.date)}</span>
        </div>
        <div className="info-item">
          <span className="info-icon">📍</span>
          <span className="info-text">{activity.location}</span>
        </div>
        <div className="info-item">
          <span className="info-icon">👥</span>
          <span className="info-text">上限 {activity.maxParticipants} 人</span>
        </div>
      </div>

      <div className="card-footer">
        <div className="activity-code">
          <span className="code-label">活动码</span>
          <span className="code-value">{activity.code}</span>
        </div>
        <span className="view-detail">查看详情 →</span>
      </div>
    </div>
  )
}

export default ActivityCard
