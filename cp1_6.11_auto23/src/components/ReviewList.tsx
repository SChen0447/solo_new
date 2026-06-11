import { useState, useMemo } from 'react'
import { Review, DIMENSION_LABELS, AVAILABLE_TAGS, RatingDimensions } from '../types'
import './ReviewList.css'

interface ReviewListProps {
  reviews: Review[]
  loading?: boolean
  onGenerateAchievement?: (review: Review) => void
}

type SortKey = 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc'
type FilterDim = keyof RatingDimensions | 'all'

function getAverageRating(review: Review): number {
  return (
    (review.ratings.knowledgeDepth +
      review.ratings.interactivity +
      review.ratings.practicality) /
    3
  )
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function anonymizeNickname(nickname: string): string {
  if (nickname.length <= 2) return nickname[0] + '*'
  return nickname[0] + '*'.repeat(Math.min(nickname.length - 2, 3)) + nickname[nickname.length - 1]
}

function getTagColor(tagValue: string): string {
  const tag = AVAILABLE_TAGS.find((t) => t.value === tagValue)
  return tag?.color || '#6366f1'
}

function StarDisplay({ value, size = 'small' }: { value: number; size?: 'small' | 'medium' }) {
  const fullStars = Math.floor(value)
  const hasHalf = value - fullStars >= 0.5
  const starSize = size === 'medium' ? '20px' : '16px'

  return (
    <div className="star-display" style={{ gap: size === 'medium' ? '3px' : '1px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`star-display-star ${
            i <= fullStars ? 'filled' : i === fullStars + 1 && hasHalf ? 'half' : 'empty'
          }`}
          style={{ fontSize: starSize }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function RatingBar({
  label,
  value,
}: {
  label: string
  value: number
}) {
  const percentage = (value / 5) * 100

  return (
    <div className="rating-bar-item">
      <div className="rating-bar-label">
        <span>{label}</span>
        <span className="rating-bar-value">{value.toFixed(1)}</span>
      </div>
      <div className="rating-bar-track">
        <div className="rating-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function ReviewCard({
  review,
  onGenerateAchievement,
}: {
  review: Review
  onGenerateAchievement?: (review: Review) => void
}) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)
  const avg = getAverageRating(review)

  const dims: (keyof RatingDimensions)[] = ['knowledgeDepth', 'interactivity', 'practicality']

  return (
    <div className="review-card glass">
      <div className="review-card-header">
        <div>
          <h3 className="review-course-name">{review.courseName}</h3>
          <div className="review-meta">
            <span className="review-nickname">{anonymizeNickname(review.nickname)}</span>
            <span className="review-date">{formatDate(review.createdAt)}</span>
          </div>
        </div>
        <div className="review-score-section">
          <div className="review-score">{avg.toFixed(1)}</div>
          <StarDisplay value={avg} />
        </div>
      </div>

      <div className="review-tags">
        {review.tags.map((tag) => (
          <span
            key={tag}
            className="review-tag"
            style={{ backgroundColor: getTagColor(tag) + '20', color: getTagColor(tag) }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="review-ratings-detail">
        {dims.map((dim) => (
          <div
            key={dim}
            className="rating-bar-wrapper"
            onMouseEnter={() => setHoveredBar(dim)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <RatingBar label={DIMENSION_LABELS[dim]} value={review.ratings[dim]} />
            {hoveredBar === dim && (
              <div className="rating-tooltip">{review.ratings[dim].toFixed(1)} 分</div>
            )}
          </div>
        ))}
      </div>

      <p className="review-content">{review.content}</p>

      {onGenerateAchievement && (
        <button
          className="generate-achievement-btn"
          onClick={() => onGenerateAchievement(review)}
        >
          🎖️ 生成成就卡
        </button>
      )}
    </div>
  )
}

export default function ReviewList({
  reviews,
  loading = false,
  onGenerateAchievement,
}: ReviewListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date_desc')
  const [minRating, setMinRating] = useState(0)
  const [filterDim, setFilterDim] = useState<FilterDim>('all')

  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviews]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((r) => r.courseName.toLowerCase().includes(query))
    }

    if (minRating > 0) {
      if (filterDim === 'all') {
        result = result.filter((r) => getAverageRating(r) >= minRating)
      } else {
        result = result.filter((r) => r.ratings[filterDim] >= minRating)
      }
    }

    result.sort((a, b) => {
      switch (sortKey) {
        case 'date_desc':
          return b.createdAt - a.createdAt
        case 'date_asc':
          return a.createdAt - b.createdAt
        case 'rating_desc':
          return getAverageRating(b) - getAverageRating(a)
        case 'rating_asc':
          return getAverageRating(a) - getAverageRating(b)
        default:
          return 0
      }
    })

    return result
  }, [reviews, searchQuery, sortKey, minRating, filterDim])

  if (loading) {
    return (
      <div className="review-list-container">
        <div className="loading-state">加载中...</div>
      </div>
    )
  }

  return (
    <div className="review-list-container">
      <h2 className="list-title">课程评价列表</h2>

      <div className="filter-section glass">
        <div className="filter-row">
          <div className="filter-item">
            <label>搜索课程</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入课程名称..."
              className="filter-input"
            />
          </div>
          <div className="filter-item">
            <label>排序方式</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="filter-select"
            >
              <option value="date_desc">最新发布</option>
              <option value="date_asc">最早发布</option>
              <option value="rating_desc">评分最高</option>
              <option value="rating_asc">评分最低</option>
            </select>
          </div>
        </div>
        <div className="filter-row">
          <div className="filter-item">
            <label>最低评分</label>
            <div className="rating-filter-stars">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`rating-filter-star ${n <= minRating ? 'filled' : ''}`}
                  onClick={() => setMinRating(n)}
                >
                  {n === 0 ? '全部' : '★'}
                </span>
              ))}
            </div>
          </div>
          <div className="filter-item">
            <label>评分类别</label>
            <select
              value={filterDim}
              onChange={(e) => setFilterDim(e.target.value as FilterDim)}
              className="filter-select"
            >
              <option value="all">综合评分</option>
              <option value="knowledgeDepth">知识深度</option>
              <option value="interactivity">互动性</option>
              <option value="practicality">实用性</option>
            </select>
          </div>
        </div>
      </div>

      <div className="review-count">
        共 {filteredAndSortedReviews.length} 条评价
      </div>

      <div className="review-cards-grid">
        {filteredAndSortedReviews.length === 0 ? (
          <div className="empty-state">暂无符合条件的评价</div>
        ) : (
          filteredAndSortedReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onGenerateAchievement={onGenerateAchievement}
            />
          ))
        )}
      </div>
    </div>
  )
}
