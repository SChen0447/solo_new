import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useApp } from './App'

interface Reply {
  id: string
  author: string
  content: string
  timestamp: number
}

interface Comment {
  id: string
  author: string
  authorColor: string
  content: string
  selectedText: string
  timestamp: number
  replies: Reply[]
  resolved: boolean
}

const USER_COLORS = [
  '#FF6F00',
  '#1E88E5',
  '#43A047',
  '#8E24AA',
  '#E53935',
  '#00ACC1',
]

function CommentPanel() {
  const { socket, userId, userName, users, showToast } = useApp()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [mentionFilter, setMentionFilter] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const mentionInputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const storedComments = localStorage.getItem(`comments-${userId}`)
    if (storedComments) {
      try {
        setComments(JSON.parse(storedComments))
      } catch (e) {
        console.error('Failed to parse comments')
      }
    }
  }, [userId])

  useEffect(() => {
    if (comments.length > 0) {
      localStorage.setItem(`comments-${userId}`, JSON.stringify(comments))
    }
  }, [comments, userId])

  useEffect(() => {
    if (!socket) return

    const handleNewComment = (comment: Comment) => {
      setComments(prev => {
        if (prev.find(c => c.id === comment.id)) return prev
        return [...prev, comment]
      })
      if (comment.author !== userName) {
        showToast(`${comment.author} 发表了新评论`, 'info')
      }
    }

    const handleNewReply = (data: { commentId: string; reply: Reply }) => {
      setComments(prev => prev.map(c => {
        if (c.id === data.commentId) {
          return { ...c, replies: [...c.replies, data.reply] }
        }
        return c
      }))
    }

    socket.on('new-comment', handleNewComment)
    socket.on('new-reply', handleNewReply)

    return () => {
      socket.off('new-comment', handleNewComment)
      socket.off('new-reply', handleNewReply)
    }
  }, [socket, userName, showToast])

  const getRandomColor = (author: string) => {
    const user = users.find(u => u.name === author)
    if (user) return user.color
    const index = Math.abs(author.charCodeAt(0)) % USER_COLORS.length
    return USER_COLORS[index]
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: uuidv4(),
      author: userName,
      authorColor: getRandomColor(userName),
      content: newComment,
      selectedText: selectedText || '全文评论',
      timestamp: Date.now(),
      replies: [],
      resolved: false,
    }

    setComments(prev => [...prev, comment])
    setNewComment('')
    setSelectedText('')

    if (socket) {
      socket.emit('add-comment', comment)
    }

    showToast('评论已添加', 'success')
  }

  const handleReply = (commentId: string) => {
    if (!replyContent.trim()) return

    const reply: Reply = {
      id: uuidv4(),
      author: userName,
      content: replyContent,
      timestamp: Date.now(),
    }

    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, replies: [...c.replies, reply] }
      }
      return c
    }))

    setReplyTo(null)
    setReplyContent('')

    if (socket) {
      socket.emit('add-reply', { commentId, reply })
    }

    showToast('回复已发送', 'success')
  }

  const handleResolve = (commentId: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, resolved: !c.resolved }
      }
      return c
    }))
    showToast('评论状态已更新', 'success')
  }

  const handleMention = (userName: string) => {
    if (mentionInputRef.current) {
      const textarea = mentionInputRef.current
      const value = textarea.value
      const atIndex = value.lastIndexOf('@')
      const beforeMention = value.substring(0, atIndex)
      const afterMention = value.substring(textarea.selectionStart)
      const newValue = beforeMention + `@${userName} ` + afterMention
      setReplyContent(newValue)
      setShowMentions(false)
      setMentionFilter('')
    }
  }

  const handleReplyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '@') {
      setShowMentions(true)
      setMentionFilter('')
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(mentionFilter.toLowerCase()) && u.name !== userName
  )

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - timestamp

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString().slice(0, 5)
  }

  return (
    <div className="comment-panel">
      <div className="comment-input-section">
        <h3>添加评论</h3>
        {selectedText && (
          <div className="selected-text-preview">
            <span className="selected-label">选中文本：</span>
            <span className="selected-content">"{selectedText}"</span>
          </div>
        )}
        <textarea
          placeholder="写下你的评论..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleReplyKeyDown}
          rows={3}
        />
        <button className="add-comment-btn" onClick={handleAddComment}>
          发表评论
        </button>
      </div>

      <div className="comments-list">
        <h3>评论列表 ({comments.filter(c => !c.resolved).length} 条未解决)</h3>
        {comments.length === 0 ? (
          <div className="empty-comments">
            <p>暂无评论</p>
            <p className="empty-hint">选中文本后添加评论进行协作讨论</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`comment-item ${comment.resolved ? 'resolved' : ''}`}
              style={{ animation: 'slideInLeft 0.3s ease' }}
            >
              <div className="comment-header">
                <div
                  className="comment-avatar"
                  style={{ backgroundColor: comment.authorColor }}
                >
                  {comment.author.charAt(0).toUpperCase()}
                </div>
                <div className="comment-meta">
                  <span className="comment-author">{comment.author}</span>
                  <span className="comment-time">{formatTime(comment.timestamp)}</span>
                </div>
                <button
                  className={`resolve-btn ${comment.resolved ? 'resolved' : ''}`}
                  onClick={() => handleResolve(comment.id)}
                >
                  {comment.resolved ? '↩ 重新打开' : '✓ 解决'}
                </button>
              </div>
              {comment.selectedText && (
                <div className="comment-selected-text">
                  <span className="quote-icon">"</span>
                  {comment.selectedText}
                  <span className="quote-icon">"</span>
                </div>
              )}
              <div className="comment-content">{comment.content}</div>

              {comment.replies.length > 0 && (
                <div className="comment-replies">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="reply-item">
                      <div
                        className="reply-avatar"
                        style={{ backgroundColor: getRandomColor(reply.author) }}
                      >
                        {reply.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="reply-content">
                        <span className="reply-author">{reply.author}</span>
                        <span className="reply-text">{reply.content}</span>
                        <span className="reply-time">{formatTime(reply.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {replyTo === comment.id ? (
                <div className="reply-input">
                  <textarea
                    ref={mentionInputRef}
                    placeholder="回复评论... (输入 @ 提及他人)"
                    value={replyContent}
                    onChange={(e) => {
                      setReplyContent(e.target.value)
                      const atIndex = e.target.value.lastIndexOf('@')
                      if (atIndex > -1) {
                        setShowMentions(true)
                        setMentionFilter(e.target.value.substring(atIndex + 1))
                      } else {
                        setShowMentions(false)
                      }
                    }}
                    rows={2}
                  />
                  {showMentions && filteredUsers.length > 0 && (
                    <div className="mentions-dropdown">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="mention-item"
                          onClick={() => handleMention(user.name)}
                        >
                          <div
                            className="mention-avatar"
                            style={{ backgroundColor: user.color }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{user.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="reply-actions">
                    <button className="cancel-btn" onClick={() => setReplyTo(null)}>
                      取消
                    </button>
                    <button className="send-btn" onClick={() => handleReply(comment.id)}>
                      发送
                    </button>
                  </div>
                </div>
              ) : (
                <button className="reply-link" onClick={() => setReplyTo(comment.id)}>
                  💬 回复
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CommentPanel
