import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { oneDark } from '@codemirror/theme-one-dark'
import { getPiece, addComment, likePiece, favoritePiece } from '../api'
import { CodePiece, Comment } from '../types'
import '../styles/DetailPage.css'

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

function getLanguageExtension(language: string) {
  switch (language) {
    case 'JavaScript':
    case 'TypeScript':
      return javascript({ typescript: language === 'TypeScript' })
    case 'Python':
      return python()
    case 'HTML/CSS':
      return [html(), css()]
    default:
      return javascript()
  }
}

function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [piece, setPiece] = useState<(CodePiece & { comments: Comment[] }) | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [likeAnimating, setLikeAnimating] = useState(false)
  const [favAnimating, setFavAnimating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newCommentIds, setNewCommentIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (id) {
      loadPiece()
    }
  }, [id])

  const loadPiece = async () => {
    try {
      const data = await getPiece(id!)
      setPiece(data)
    } catch (error) {
      console.error('Failed to load piece:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!piece) return
    setLikeAnimating(true)
    setTimeout(() => setLikeAnimating(false), 400)
    
    if (!isLiked) {
      try {
        const newLikes = await likePiece(piece.id)
        setPiece({ ...piece, likes: newLikes })
        setIsLiked(true)
      } catch (error) {
        console.error('Failed to like:', error)
      }
    }
  }

  const handleFavorite = async () => {
    if (!piece) return
    setFavAnimating(true)
    setTimeout(() => setFavAnimating(false), 400)
    
    if (!isFavorited) {
      try {
        const newFavs = await favoritePiece(piece.id)
        setPiece({ ...piece, favorites: newFavs })
        setIsFavorited(true)
      } catch (error) {
        console.error('Failed to favorite:', error)
      }
    }
  }

  const handleSubmitComment = async () => {
    if (!piece || !commentText.trim() || !commentAuthor.trim()) return

    try {
      const newComment = await addComment(piece.id, commentAuthor, commentText)
      setNewCommentIds((prev) => new Set(prev).add(newComment.id))
      setPiece({
        ...piece,
        comments: [newComment, ...piece.comments],
      })
      setCommentText('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  if (loading) {
    return (
      <div className="detail-page">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  if (!piece) {
    return (
      <div className="detail-page">
        <div className="empty-state">
          <p>未找到该代码片段</p>
          <button onClick={handleBack}>返回首页</button>
        </div>
      </div>
    )
  }

  const langColor = LANGUAGE_COLORS[piece.language] || '#999'

  return (
    <div className="detail-page">
      <button className="back-button" onClick={handleBack}>
        ← 返回列表
      </button>

      <div className="detail-layout">
        <div className="code-section">
          <div className="detail-header">
            <h1 className="detail-title">{piece.title}</h1>
            <div className="detail-meta">
              <span className="detail-lang" style={{ color: langColor }}>
                <span className="lang-dot" style={{ backgroundColor: langColor }}></span>
                {piece.language}
              </span>
              <div className="detail-tags">
                {piece.tags.map((tag) => (
                  <span key={tag} className="tag-pill">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="detail-author-row">
            <div className="author-info">
              <Avatar name={piece.author} />
              <div>
                <span className="author-name">{piece.author}</span>
                <span className="detail-time">{relativeTime(piece.created_at)}</span>
              </div>
            </div>
            <div className="action-buttons">
              <button
                className={`action-btn like-btn ${isLiked ? 'active' : ''} ${likeAnimating ? 'heartbeat' : ''}`}
                onClick={handleLike}
              >
                <span className="btn-icon">{isLiked ? '❤️' : '🤍'}</span>
                <span className="btn-count">{piece.likes}</span>
              </button>
              <button
                className={`action-btn fav-btn ${isFavorited ? 'active' : ''} ${favAnimating ? 'heartbeat' : ''}`}
                onClick={handleFavorite}
              >
                <span className="btn-icon">{isFavorited ? '⭐' : '☆'}</span>
                <span className="btn-count">{piece.favorites}</span>
              </button>
            </div>
          </div>

          <div className="code-editor-wrapper detail-code">
            <CodeMirror
              value={piece.code}
              height="auto"
              extensions={[getLanguageExtension(piece.language)]}
              theme={oneDark}
              editable={false}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightActiveLine: true,
              }}
            />
          </div>
        </div>

        <div className="comments-section">
          <h2 className="comments-title">评论 ({piece.comments.length})</h2>

          <div className="comment-input-area">
            <input
              type="text"
              placeholder="你的昵称"
              value={commentAuthor}
              onChange={(e) => setCommentAuthor(e.target.value)}
              className="comment-author-input"
            />
            <textarea
              placeholder="写下你的评论..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="comment-input"
            />
            <button
              className="comment-submit-btn"
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || !commentAuthor.trim()}
            >
              发送评论
            </button>
          </div>

          <div className="comments-list">
            {piece.comments.length > 0 ? (
              piece.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`comment-item ${newCommentIds.has(comment.id) ? 'slide-in' : ''}`}
                >
                  <Avatar name={comment.author} />
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">{comment.author}</span>
                      <span className="comment-time">{relativeTime(comment.created_at)}</span>
                    </div>
                    <p className="comment-text">{comment.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-comments">
                <p>暂无评论，来抢沙发吧~</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailPage
