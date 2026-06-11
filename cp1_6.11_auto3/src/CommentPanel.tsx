import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useApp } from './App'

interface Reply {
  id: string
  author: string
  authorId: string
  content: string
  timestamp: number
}

interface Comment {
  id: string
  author: string
  authorId: string
  authorColor: string
  content: string
  selectedText: string
  timestamp: number
  replies: Reply[]
  resolved: boolean
  resolvedAt?: number
  resolvedBy?: string
}

const USER_COLORS = [
  '#FF6F00',
  '#1E88E5',
  '#43A047',
  '#8E24AA',
  '#E53935',
  '#00ACC1',
]

interface MentionState {
  active: boolean
  filter: string
  targetType: 'comment' | 'reply'
  position: number
}

function CommentPanel() {
  const { socket, userId, userName, users, showToast } = useApp()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [mention, setMention] = useState<MentionState>({
    active: false,
    filter: '',
    targetType: 'comment',
    position: 0,
  })
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null)
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!socket) return

    const handleRoomJoined = (data: any) => {
      if (data.comments && Array.isArray(data.comments)) {
        setComments(data.comments)
      }
    }

    const handleNewComment = (comment: Comment) => {
      setComments(prev => {
        if (prev.find(c => c.id === comment.id)) return prev
        return [...prev, comment]
      })
      if (comment.authorId !== userId) {
        showToast(`${comment.author} 发表了新评论`, 'info')
      }
    }

    const handleNewReply = (data: { commentId: string; reply: Reply }) => {
      setComments(prev => prev.map(c => {
        if (c.id === data.commentId) {
          if (c.replies.find(r => r.id === data.reply.id)) return c
          return { ...c, replies: [...c.replies, data.reply] }
        }
        return c
      }))
      if (data.reply.authorId !== userId) {
        showToast(`${data.reply.author} 回复了评论`, 'info')
      }
    }

    const handleCommentResolved = (data: { commentId: string; resolved: boolean; comment: Comment }) => {
      setComments(prev => prev.map(c => {
        if (c.id === data.commentId) {
          return data.comment
        }
        return c
      }))
    }

    socket.on('room-joined', handleRoomJoined)
    socket.on('new-comment', handleNewComment)
    socket.on('new-reply', handleNewReply)
    socket.on('comment-resolved', handleCommentResolved)

    return () => {
      socket.off('room-joined', handleRoomJoined)
      socket.off('new-comment', handleNewComment)
      socket.off('new-reply', handleNewReply)
      socket.off('comment-resolved', handleCommentResolved)
    }
  }, [socket, userId, showToast])

  const getUserColor = (authorName: string, authorId?: string) => {
    if (authorId) {
      const user = users.find(u => u.id === authorId)
      if (user) return user.color
    }
    const user = users.find(u => u.name === authorName)
    if (user) return user.color
    const index = Math.abs(authorName.charCodeAt(0)) % USER_COLORS.length
    return USER_COLORS[index]
  }

  const insertMention = (targetType: 'comment' | 'reply', mentionName: string) => {
    const textarea = targetType === 'comment' ? commentInputRef.current : replyInputRef.current
    if (!textarea) return

    const value = targetType === 'comment' ? newComment : replyContent
    const setValue = targetType === 'comment' ? setNewComment : setReplyContent
    const atIndex = value.lastIndexOf('@', mention.position)

    if (atIndex > -1) {
      const beforeMention = value.substring(0, atIndex)
      const afterMention = value.substring(textarea.selectionStart)
      const newValue = beforeMention + `@${mentionName} ` + afterMention
      setValue(newValue)
    }

    setMention({ active: false, filter: '', targetType: 'comment', position: 0 })

    setTimeout(() => {
      if (textarea) {
        textarea.focus()
      }
    }, 0)
  }

  const handleInputChange = (value: string, targetType: 'comment' | 'reply') => {
    const textarea = targetType === 'comment' ? commentInputRef.current : replyInputRef.current
    const cursorPos = textarea?.selectionStart ?? value.length

    const textBeforeCursor = value.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex > -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      if (!textAfterAt.includes(' ') && textAfterAt.length < 20) {
        setMention({
          active: true,
          filter: textAfterAt,
          targetType,
          position: lastAtIndex,
        })
      } else {
        setMention({ active: false, filter: '', targetType, position: 0 })
      }
    } else {
      setMention({ active: false, filter: '', targetType, position: 0 })
    }

    if (targetType === 'comment') {
      setNewComment(value)
    } else {
      setReplyContent(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, targetType: 'comment' | 'reply') => {
    if (e.key === '@') {
      setMention({
        active: true,
        filter: '',
        targetType,
        position: (e.target as HTMLTextAreaElement).selectionStart + 1,
      })
    } else if (e.key === 'Escape') {
      setMention({ active: false, filter: '', targetType: 'comment', position: 0 })
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(mention.filter.toLowerCase()) && u.id !== userId
  )

  const handleAddComment = () => {
    if (!newComment.trim() || !socket) return

    const comment: Comment = {
      id: uuidv4(),
      author: userName,
      authorId: userId,
      authorColor: getUserColor(userName, userId),
      content: newComment,
      selectedText: selectedText || '全文评论',
      timestamp: Date.now(),
      replies: [],
      resolved: false,
    }

    setComments(prev => [...prev, comment])
    setNewComment('')
    setSelectedText('')
    setMention({ active: false, filter: '', targetType: 'comment', position: 0 })

    socket.emit('add-comment', comment)
    showToast('评论已添加', 'success')
  }

  const handleReply = (commentId: string) => {
    if (!replyContent.trim() || !socket) return

    const reply: Reply = {
      id: uuidv4(),
      author: userName,
      authorId: userId,
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
    setMention({ active: false, filter: '', targetType: 'reply', position: 0 })

    socket.emit('add-reply', { commentId, reply })
    showToast('回复已发送', 'success')
  }

  const handleResolve = (commentId: string, currentResolved: boolean) => {
    if (!socket) return

    const newResolved = !currentResolved
    socket.emit('resolve-comment', { commentId, resolved: newResolved })

    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          resolved: newResolved,
          resolvedAt: newResolved ? Date.now() : undefined,
          resolvedBy: newResolved ? userId : undefined,
        }
      }
      return c
    }))

    showToast(newResolved ? '评论已标记为已解决' : '评论已重新打开', 'success')
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - timestamp

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN').slice(0, 5)
  }

  const highlightMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="mention-highlight">
            {part}
          </span>
        )
      }
      return part
    })
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
        <div className="comment-input-wrapper">
          <textarea
            ref={commentInputRef}
            placeholder="写下你的评论... (输入 @ 提及其他协作者)"
            value={newComment}
            onChange={(e) => handleInputChange(e.target.value, 'comment')}
            onKeyDown={(e) => handleKeyDown(e, 'comment')}
            rows={3}
          />
          {mention.active && mention.targetType === 'comment' && filteredUsers.length > 0 && (
            <div className="mentions-dropdown">
              <div className="mentions-header">选择要提及的协作者</div>
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="mention-item"
                  onClick={() => insertMention('comment', user.name)}
                >
                  <div
                    className="mention-avatar"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="mention-info">
                    <span className="mention-name">{user.name}</span>
                    <span className="mention-hint">点击提及</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="add-comment-btn" onClick={handleAddComment}>
          发表评论
        </button>
      </div>

      <div className="comments-list">
        <h3>评论列表 ({comments.filter(c => !c.resolved).length} 条未解决)</h3>
        {comments.length === 0 ? (
          <div className="empty-comments">
            <p>暂无评论</p>
            <p className="empty-hint">添加评论进行协作讨论，支持 @ 提及协作者</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`comment-item ${comment.resolved ? 'resolved' : ''}`}
              style={{ animation: 'slideInLeft 0.3s ease', borderLeftColor: comment.resolved ? '#10B981' : 'var(--primary-color)' }}
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
                  {comment.resolved && comment.resolvedAt && (
                    <span className="resolved-badge">
                      ✓ 已解决 ({formatTime(comment.resolvedAt)})
                    </span>
                  )}
                </div>
                <button
                  className={`resolve-btn ${comment.resolved ? 'resolved' : ''}`}
                  onClick={() => handleResolve(comment.id, comment.resolved)}
                >
                  {comment.resolved ? '↩ 重新打开' : '✓ 标记解决'}
                </button>
              </div>
              {comment.selectedText && (
                <div className="comment-selected-text">
                  <span className="quote-icon">"</span>
                  {comment.selectedText}
                  <span className="quote-icon">"</span>
                </div>
              )}
              <div className="comment-content">{highlightMentions(comment.content)}</div>

              {comment.replies.length > 0 && (
                <div className="comment-replies">
                  <div className="replies-count">{comment.replies.length} 条回复</div>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="reply-item">
                      <div
                        className="reply-avatar"
                        style={{ backgroundColor: getUserColor(reply.author, reply.authorId) }}
                      >
                        {reply.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="reply-content">
                        <span className="reply-author">{reply.author}</span>
                        <span className="reply-text">{highlightMentions(reply.content)}</span>
                        <span className="reply-time">{formatTime(reply.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {replyTo === comment.id ? (
                <div className="reply-input">
                  <textarea
                    ref={replyInputRef}
                    placeholder="回复评论... (输入 @ 提及他人)"
                    value={replyContent}
                    onChange={(e) => handleInputChange(e.target.value, 'reply')}
                    onKeyDown={(e) => handleKeyDown(e, 'reply')}
                    rows={2}
                  />
                  {mention.active && mention.targetType === 'reply' && filteredUsers.length > 0 && (
                    <div className="mentions-dropdown">
                      <div className="mentions-header">选择要提及的协作者</div>
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="mention-item"
                          onClick={() => insertMention('reply', user.name)}
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
                      发送回复
                    </button>
                  </div>
                </div>
              ) : (
                <button className="reply-link" onClick={() => setReplyTo(comment.id)}>
                  💬 回复 ({comment.replies.length})
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
