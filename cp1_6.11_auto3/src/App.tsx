import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { io, Socket } from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid'
import Editor from './Editor'
import CommentPanel from './CommentPanel'
import VersionHistory from './VersionHistory'
import './styles/app.css'

interface User {
  id: string
  name: string
  color: string
  socketId: string
}

interface AppContextType {
  socket: Socket | null
  userId: string
  userName: string
  users: User[]
  roomId: string
  roomName: string
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

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [userId] = useState(() => localStorage.getItem('collab_user_id') || uuidv4())
  const [userName, setUserName] = useState(() => localStorage.getItem('collab_user_name') || '')
  const [users, setUsers] = useState<User[]>([])
  const [roomId] = useState('default-doc')
  const [roomName, setRoomName] = useState('协作文档')
  const [isJoined, setIsJoined] = useState(false)
  const [showNameModal, setShowNameModal] = useState(!localStorage.getItem('collab_user_name'))
  const [tempName, setTempName] = useState('')
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [activePanel, setActivePanel] = useState<'comments' | 'collaborators'>('comments')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toolbarOpen, setToolbarOpen] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = uuidv4()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
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
    })

    newSocket.on('connect', () => {
      newSocket.emit('join-room', {
        roomId,
        userId,
        userName,
      })
    })

    newSocket.on('room-joined', (data) => {
      setRoomName(data.roomName)
      setUsers(data.users)
      setIsJoined(true)
      showToast(`已加入文档：${data.roomName}`, 'success')
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

    newSocket.on('error', ({ message }: { message: string }) => {
      showToast(message, 'error')
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [roomId, userId, userName, showToast])

  const handleJoin = () => {
    if (!tempName.trim()) return
    setUserName(tempName.trim())
    setShowNameModal(false)
  }

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev)
    if (!sidebarOpen) {
      setShowVersionHistory(false)
    }
  }

  const toggleToolbar = () => {
    setToolbarOpen(prev => !prev)
  }

  const contextValue: AppContextType = {
    socket,
    userId,
    userName,
    users,
    roomId,
    roomName,
    showToast,
  }

  if (showNameModal) {
    return (
      <div className="name-modal-overlay">
        <div className="name-modal">
          <h2>欢迎使用协作文档</h2>
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
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-container">
        <header className="app-header">
          <div className="header-left">
            <button className="mobile-toolbar-btn" onClick={toggleToolbar}>
              ☰
            </button>
            <h1 className="app-title">📄 {roomName}</h1>
          </div>
          <div className="header-center">
            <div className="collaborators-avatars">
              {users.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  className="user-avatar"
                  style={{ backgroundColor: user.color, borderColor: user.color }}
                  title={user.name}
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
              className={`version-btn ${showVersionHistory ? 'active' : ''}`}
              onClick={() => {
                setShowVersionHistory(prev => !prev)
                if (sidebarOpen === false) setSidebarOpen(true)
              }}
            >
              📜 历史版本
            </button>
            <button className="mobile-sidebar-btn" onClick={toggleSidebar}>
              💬
            </button>
          </div>
        </header>

        <div className="main-content">
          <Editor isJoined={isJoined} toolbarOpen={toolbarOpen} />

          <aside className={`right-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
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

            {activePanel === 'comments' && <CommentPanel />}
            {activePanel === 'collaborators' && (
              <div className="collaborators-list">
                <h3>在线协作者</h3>
                {users.map((user) => (
                  <div key={user.id} className="collaborator-item">
                    <div
                      className="collaborator-avatar"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="collaborator-info">
                      <span className="collaborator-name">{user.name}</span>
                      <span className="collaborator-status">
                        {user.id === userId ? '（你）' : '正在编辑'}
                      </span>
                    </div>
                    <div className="status-indicator online"></div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {showVersionHistory && sidebarOpen && (
            <div className="version-history-panel">
              <VersionHistory onClose={() => setShowVersionHistory(false)} />
            </div>
          )}
        </div>

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
