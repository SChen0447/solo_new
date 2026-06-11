import { useState } from 'react'
import { RatingDimensions, AVAILABLE_TAGS } from '../types'
import './ReviewForm.css'

interface ReviewFormProps {
  onSubmit: (data: {
    courseName: string
    ratings: RatingDimensions
    tags: string[]
    content: string
    nickname: string
  }) => void
}

const DIMENSIONS: { key: keyof RatingDimensions; label: string }[] = [
  { key: 'knowledgeDepth', label: '知识深度' },
  { key: 'interactivity', label: '互动性' },
  { key: 'practicality', label: '实用性' },
]

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  const [hoverValue, setHoverValue] = useState(0)

  return (
    <div className="star-rating-group">
      <span className="rating-label">{label}</span>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= (hoverValue || value) ? 'filled' : ''}`}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            onClick={() => onChange(star)}
          >
            ★
          </span>
        ))}
        <span className="rating-value">{value.toFixed(1)}</span>
      </div>
    </div>
  )
}

export default function ReviewForm({ onSubmit }: ReviewFormProps) {
  const [courseName, setCourseName] = useState('')
  const [ratings, setRatings] = useState<RatingDimensions>({
    knowledgeDepth: 0,
    interactivity: 0,
    practicality: 0,
  })
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  const handleTagToggle = (tagValue: string) => {
    if (selectedTags.includes(tagValue)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagValue))
    } else if (selectedTags.length < 3) {
      setSelectedTags([...selectedTags, tagValue])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!courseName.trim()) {
      setError('请输入课程名称')
      return
    }
    if (Object.values(ratings).some((v) => v === 0)) {
      setError('请完成所有维度的评分')
      return
    }
    if (selectedTags.length < 1) {
      setError('请至少选择1个标签')
      return
    }
    if (!content.trim()) {
      setError('请输入评价内容')
      return
    }
    if (content.length > 500) {
      setError('评价内容不能超过500字')
      return
    }
    if (!nickname.trim()) {
      setError('请输入您的昵称')
      return
    }

    onSubmit({
      courseName: courseName.trim(),
      ratings,
      tags: selectedTags,
      content: content.trim(),
      nickname: nickname.trim(),
    })

    setCourseName('')
    setRatings({ knowledgeDepth: 0, interactivity: 0, practicality: 0 })
    setSelectedTags([])
    setContent('')
    setNickname('')
  }

  const averageRating =
    (ratings.knowledgeDepth + ratings.interactivity + ratings.practicality) / 3

  return (
    <div className="review-form-card glass">
      <h2 className="form-title">撰写课程评价</h2>
      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="courseName">课程名称</label>
          <input
            type="text"
            id="courseName"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="请输入课程名称"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>多维度评分</label>
          <div className="ratings-section">
            {DIMENSIONS.map((dim) => (
              <StarRating
                key={dim.key}
                label={dim.label}
                value={ratings[dim.key]}
                onChange={(v) => setRatings({ ...ratings, [dim.key]: v })}
              />
            ))}
          </div>
          <div className="average-rating">
            综合评分：<span className="average-score">{averageRating.toFixed(1)}</span> / 5.0
          </div>
        </div>

        <div className="form-group">
          <label>标签选择（可选1-3个）</label>
          <div className="tags-selection">
            {AVAILABLE_TAGS.map((tag) => (
              <span
                key={tag.value}
                className={`tag-pill ${selectedTags.includes(tag.value) ? 'selected' : ''}`}
                style={{
                  backgroundColor: selectedTags.includes(tag.value) ? tag.color : 'transparent',
                  borderColor: tag.color,
                  color: selectedTags.includes(tag.value) ? 'white' : tag.color,
                }}
                onClick={() => handleTagToggle(tag.value)}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="content">详细评价</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="分享您的学习体验和收获..."
            className="form-textarea"
            rows={5}
            maxLength={500}
          />
          <div className="char-count">{content.length}/500</div>
        </div>

        <div className="form-group">
          <label htmlFor="nickname">您的昵称</label>
          <input
            type="text"
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入昵称"
            className="form-input"
          />
        </div>

        <button type="submit" className="submit-btn">
          提交评价
        </button>
        <p className="form-tip">提交后将进入审核，审核通过后会在评价列表中展示</p>
      </form>
    </div>
  )
}
