import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid'
import Editor from './Editor'
import CommentPanel from './CommentPanel'
import VersionHistory from './VersionHistory'
import PermissionManager from './PermissionManager'
import './styles/app.css'

export type PermissionMode = 'public' | 'invited' | 'private'

interface User {
  id: string
  name: string
  color: string
  socketId: string
  canEdit: boolean
}

interface Invitation {
  id: string
  email?: string
  expiresAt: number
  canEdit: boolean
  inviteUrl?: string
}

interface AppContextType {
  socket: Socket | null
  userId: string
  userName: string
  users: User[]
  roomId: string
  roomName: string
  permissionMode: PermissionMode
  isOwner: boolean
  canEdit: boolean
  invitations: Invitation[]
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const AppContext = createContext<AppContextType | null>(null)

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

function getInvitationIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('invite')
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [userId] = useState(() => localStorage.getItem('collab_user_id') || uuidv4())
  const [userName, setUserName] = useState(() => localStorage.getItem('collab_user_name') || '')
  const [users, setUsers] = useState<User[]>([])
  const [roomId] = useState('default-doc')
  const [roomName, setRoomName] = useState('协作文档')
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('public')
  const [isOwner, setIsOwner] = useState(false)
  const [canEdit, setCanEdit] = useState(true)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isJoined, setIsJoined] = useState(false)
  const [showNameModal, setShowNameModal] = useState(!localStorage.getItem('collab_user_name'))
  const [tempName, setTempName] = useState('')
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showPermissionManager, setShowPermissionManager] = useState(false)
  const [activePanel, setActivePanel] = useState<'comments' | 'collaborators'>('comments')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toolbarOpen, setToolbarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const invitationIdRef = useRef<string | null>(getInvitationIdFromUrl())

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = uuidv4()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
        setToolbarOpen(false)
      } else {
        setSidebarOpen(true)
        setToolbarOpen(true)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (userName) {
      localStorage.setItem('collab_user_id', userId)
      localStorage.setItem('collab_user_name', userName)
    }
  }, [userId, userName])

  useEffect(() => {
    if (!userName) return

    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    newSocket.on('connect', () => {
      newSocket.emit('join-room', {
        roomId,
        userId,
        userName,
        invitationId: invitationIdRef.current,
      })
    })

    newSocket.on('room-joined', (data) => {
      setRoomName(data.roomName)
      setUsers(data.users)
      setPermissionMode(data.permissionMode)
      setIsOwner(data.isOwner)
      setCanEdit(data.canEdit)
      setIsJoined(true)

      if (invitationIdRef.current) {
        showToast('通过邀请链接成功加入文档', 'success')
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, document.title, cleanUrl)
      } else {
        showToast(`已加入文档：${data.roomName}`, 'success')
      }
    })

    newSocket.on('user-joined', (user: User) => {
      setUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev
        return [...prev, user]
      })
      showToast(`${user.name} 加入了协作`, 'info')
    })

    newSocket.on('user-left', ({ userId: leftUserId }: { userId: string }) => {
      setUsers(prev => {
        const user = prev.find(u => u.id === leftUserId)
        if (user) {
          showToast(`${user.name} 离开了`, 'info')
        }
        return prev.filter(u => u.id !== leftUserId)
      })
    })

    newSocket.on('permission-updated', ({ mode }: { mode: PermissionMode }) => {
      setPermissionMode(mode)
      if (mode === 'private' && !isOwner) {
        setCanEdit(false)
        showToast('文档已设为私有，当前为只读模式', 'info')
      } else if (mode === 'public') {
        setCanEdit(true)
      }
    })

    newSocket.on('permission-info', (data: any) => {
      setPermissionMode(data.mode)
      setIsOwner(data.isOwner)
      setCanEdit(data.canEdit)
      setInvitations(data.invitations || [])
    })

    newSocket.on('invitation-created', (invitation: Invitation) => {
      setInvitations(prev => [...prev, invitation])
      showToast('邀请链接已生成', 'success')
    })

    newSocket.on('error', ({ message }: { message: string }) => {
      showToast(message, 'error')
    })

    newSocket.on('connect_error', () => {
      showToast('连接服务器失败，正在重试...', 'error')
    })

    newSocket.on('disconnect', () => {
      showToast('与服务器断开连接', 'error')
    })

    newSocket.on('reconnect', () => {
      showToast('已重新连接到服务器', 'success')
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [roomId, userId, userName, showToast, isOwner])

  const handleJoin = () => {
    if (!tempName.trim()) return
    setUserName(tempName.trim())
    setShowNameModal(false)
  }

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev)
    if (sidebarOpen) {
      setShowVersionHistory(false)
      setShowPermissionManager(false)
    }
  }

  const toggleToolbar = () => {
    setToolbarOpen(prev => !prev)
  }

  const openVersionHistory = () => {
    setShowVersionHistory(true)
    setShowPermissionManager(false)
    if (isMobile) {
      setSidebarOpen(true)
    }
  }

  const openPermissionManager = () => {
    setShowPermissionManager(true)
    setShowVersionHistory(false)
    if (isMobile) {
      setSidebarOpen(true)
    }
    if (socket) {
      socket.emit('get-permission-info')
    }
  }

  const contextValue: AppContextType = {
    socket,
    userId,
    userName,
    users,
    roomId,
    roomName,
    permissionMode,
    isOwner,
    canEdit,
    invitations,
    showToast,
  }

  if (showNameModal) {
    return (
      <div className="name-modal-overlay">
        <div className="name-modal">
          <h2>📄 欢迎使用协作文档</h2>
          <p>请输入您的昵称开始协作</p>
          <input
            type="text"
            placeholder="输入昵称..."
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          <button onClick={handleJoin}>开始协作</button>
          <div className="name-modal-hint">
            <p>💡 您的昵称将显示给其他协作者</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className={`app-container ${isMobile ? 'mobile' : 'desktop'}`}>
        <header className="app-header">
          <div className="header-left">
            {isMobile && (
              <button className="mobile-toolbar-btn" onClick={toggleToolbar} title="工具栏">
                ☰
              </button>
            )}
            <h1 className="app-title">📄 {roomName}</h1>
            <span className={`permission-badge mode-${permissionMode}`}>
              {permissionMode === 'public' && '🌐 公开'}
              {permissionMode === 'invited' && '🔗 仅受邀'}
              {permissionMode === 'private' && '🔒 私有'}
            </span>
          </div>
          <div className="header-center">
            <div className="collaborators-avatars">
              {users.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  className="user-avatar"
                  style={{ backgroundColor: user.color, borderColor: user.color }}
                  title={`${user.name}${user.id === userId ? '（你）' : ''}`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {users.length > 5 && (
                <div className="user-avatar more">
                  +{users.length - 5}
                </div>
              )}
              <span className="collaborators-count">{users.length} 人在线</span>
            </div>
          </div>
          <div className="header-right">
            <button
              className={`header-btn ${showVersionHistory ? 'active' : ''}`}
              onClick={openVersionHistory}
              title="版本历史"
            >
              📜 历史版本
            </button>
            {isOwner && (
              <button
                className={`header-btn ${showPermissionManager ? 'active' : ''}`}
                onClick={openPermissionManager}
                title="权限管理"
              >
                � 权限
              </button>
            )}
            {isMobile && (
              <button className="mobile-sidebar-btn" onClick={toggleSidebar} title="侧边栏">
                💬
              </button>
            )}
          </div>
        </header>

        <div className="main-content">
          <Editor isJoined={isJoined} toolbarOpen={toolbarOpen || !isMobile} />

          <aside className={`right-sidebar ${sidebarOpen ? 'open' : 'closed'} ${isMobile ? 'mobile-sidebar' : ''}`}>
            <div className="sidebar-header">
              <span className="sidebar-title">协作面板</span>
              {isMobile && (
                <button className="close-sidebar-btn" onClick={toggleSidebar}>
                  ✕
                </button>
              )}
            </div>
            <div className="sidebar-tabs">
              <button
                className={`tab-btn ${activePanel === 'comments' ? 'active' : ''}`}
                onClick={() => setActivePanel('comments')}
              >
                💬 评论
              </button>
              <button
                className={`tab-btn ${activePanel === 'collaborators' ? 'active' : ''}`}
                onClick={() => setActivePanel('collaborators')}
              >
                👥 协作者
              </button>
            </div>

            <div className="sidebar-content">
              {activePanel === 'comments' && <CommentPanel />}
              {activePanel === 'collaborators' && (
                <div className="collaborators-list">
                  <h3>在线协作者 ({users.length})</h3>
                  {users.length === 0 ? (
                    <div className="empty-comments">
                      <p>暂无协作者</p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="collaborator-item">
                        <div
                          className="collaborator-avatar"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="collaborator-info">
                          <span className="collaborator-name">
                            {user.name}
                            {user.id === userId && <span className="you-tag">（你）</span>}
                          </span>
                          <span className="collaborator-status">
                            {user.canEdit ? '✏️ 可编辑' : '👁️ 仅查看'}
                          </span>
                        </div>
                        <div className="status-indicator online"></div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </aside>

          {showVersionHistory && sidebarOpen && (
            <div className={`version-history-panel ${isMobile ? 'mobile-panel' : ''}`}>
              <VersionHistory onClose={() => setShowVersionHistory(false)} />
            </div>
          )}

          {showPermissionManager && sidebarOpen && isOwner && (
            <div className={`version-history-panel ${isMobile ? 'mobile-panel' : ''}`}>
              <PermissionManager onClose={() => setShowPermissionManager(false)} />
            </div>
          )}
        </div>

        {isMobile && !sidebarOpen && (
          <div className="mobile-fab-container">
            <button
              className="mobile-fab primary"
              onClick={() => {
                setActivePanel('comments')
                toggleSidebar()
              }}
              title="评论"
            >
              💬
            </button>
            <button
              className="mobile-fab"
              onClick={openVersionHistory}
              title="版本历史"
            >
              📜
            </button>
            {isOwner && (
              <button
                className="mobile-fab"
                onClick={openPermissionManager}
                title="权限管理"
              >
                🔐
              </button>
            )}
          </div>
        )}

        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </AppContext.Provider>
  )
}

export default App
