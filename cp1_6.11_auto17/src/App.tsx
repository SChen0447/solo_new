import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import Editor from './editor/Editor'
import Toolbar from './editor/Toolbar'
import './styles.css'

interface Document {
  id: string
  title: string
  content: string
  creator: string
  createdAt: number
  updatedAt: number
  version: number
}

interface User {
  id: string
  name: string
  color: string
  documentId: string
  cursorPosition?: number
}

interface Version {
  id: string
  documentId: string
  content: string
  version: number
  savedBy: string
  savedAt: number
}

type View = 'list' | 'editor'

function App() {
  const [view, setView] = useState<View>('list')
  const [documents, setDocuments] = useState<Document[]>([])
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [userName] = useState<string>(() => '用户' + Math.floor(Math.random() * 1000))
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [previewVersion, setPreviewVersion] = useState<Version | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const [highlights, setHighlights] = useState<{ id: string; userId: string; timestamp: number }[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('userId')
    if (stored) {
      setUserId(stored)
    } else {
      const newId = 'user_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('userId', newId)
      setUserId(newId)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      setDocuments(data)
    } catch (e) {
      console.error('Failed to fetch documents:', e)
    }
  }

  const createDocument = async () => {
    if (!newDocTitle.trim()) return
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newDocTitle, creator: userName }),
      })
      const doc = await res.json()
      setDocuments([doc, ...documents])
      setShowCreateModal(false)
      setNewDocTitle('')
      openDocument(doc.id)
    } catch (e) {
      console.error('Failed to create document:', e)
    }
  }

  const openDocument = useCallback(async (docId: string) => {
    const newSocket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      newSocket.emit('join-document', {
        documentId: docId,
        userId,
        userName,
      })
    })

    newSocket.on('document-loaded', ({ document, userId: uid }: { document: Document; userId: string }) => {
      setCurrentDoc(document)
      if (uid) {
        setUserId(uid)
        localStorage.setItem('userId', uid)
      }
      setView('editor')
      setUndoStack([])
      setRedoStack([])
    })

    newSocket.on('content-updated', ({ content, userId: uid }: { content: string; userId: string }) => {
      if (uid !== userId && currentDoc) {
        setCurrentDoc({ ...currentDoc, content })
        const highlightId = 'hl_' + Date.now()
        setHighlights((prev) => [...prev, { id: highlightId, userId: uid, timestamp: Date.now() }])
        setTimeout(() => {
          setHighlights((prev) => prev.filter((h) => h.id !== highlightId))
        }, 2000)
      }
    })

    newSocket.on('users-updated', (users: User[]) => {
      setOnlineUsers(users)
    })

    newSocket.on('version-saved', (version: Version) => {
      setVersions((prev) => [version, ...prev])
    })

    newSocket.on('error', (err: any) => {
      console.error('Socket error:', err)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [userId, userName, currentDoc])

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [socket])

  const handleContentChange = useCallback((content: string) => {
    if (socket && currentDoc) {
      setUndoStack((prev) => [...prev.slice(-9), currentDoc.content])
      setRedoStack([])
      setCurrentDoc({ ...currentDoc, content })
      socket.emit('content-change', {
        documentId: currentDoc.id,
        content,
        userId,
      })
    }
  }, [socket, currentDoc, userId])

  const handleUndo = () => {
    if (undoStack.length === 0 || !currentDoc) return
    const prevContent = undoStack[undoStack.length - 1]
    setRedoStack((prev) => [...prev, currentDoc.content])
    setUndoStack((prev) => prev.slice(0, -1))
    setCurrentDoc({ ...currentDoc, content: prevContent })
    if (socket) {
      socket.emit('content-change', {
        documentId: currentDoc.id,
        content: prevContent,
        userId,
      })
    }
  }

  const handleRedo = () => {
    if (redoStack.length === 0 || !currentDoc) return
    const nextContent = redoStack[redoStack.length - 1]
    setUndoStack((prev) => [...prev, currentDoc.content])
    setRedoStack((prev) => prev.slice(0, -1))
    setCurrentDoc({ ...currentDoc, content: nextContent })
    if (socket) {
      socket.emit('content-change', {
        documentId: currentDoc.id,
        content: nextContent,
        userId,
      })
    }
  }

  const handleSaveVersion = async () => {
    if (!currentDoc) return
    try {
      const res = await fetch(`/api/documents/${currentDoc.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedBy: userName }),
      })
      if (res.ok) {
        const version = await res.json()
        setVersions((prev) => [version, ...prev])
      }
    } catch (e) {
      console.error('Failed to save version:', e)
    }
  }

  const loadVersions = async () => {
    if (!currentDoc) return
    try {
      const res = await fetch(`/api/documents/${currentDoc.id}/versions`)
      const data = await res.json()
      setVersions(data)
    } catch (e) {
      console.error('Failed to load versions:', e)
    }
    setShowVersions(true)
  }

  const goBack = () => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
    }
    setView('list')
    setCurrentDoc(null)
    setOnlineUsers([])
    setShowVersions(false)
    fetchDocuments()
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
  }

  if (view === 'list') {
    return (
      <div className="app">
        <header className="app-header">
          <h1>📄 协作文档编辑器</h1>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <span className="btn-icon">+</span> 新建文档
          </button>
        </header>

        <main className="main-content">
          <div className="doc-list">
            {documents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h2>还没有文档</h2>
                <p>点击上方按钮创建你的第一个协作文档</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="doc-card"
                  onClick={() => openDocument(doc.id)}
                >
                  <h3 className="doc-title">{doc.title}</h3>
                  <div className="doc-meta">
                    <span>👤 {doc.creator}</span>
                    <span>🕐 {formatDate(doc.updatedAt)}</span>
                  </div>
                  <div className="doc-preview">
                    {doc.content.replace(/<[^>]*>/g, '').slice(0, 100)}...
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>创建新文档</h2>
              <input
                type="text"
                className="modal-input"
                placeholder="输入文档标题..."
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createDocument()}
                autoFocus
              />
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button className="btn btn-primary" onClick={createDocument}>
                  创建
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <Toolbar
        document={currentDoc}
        onlineUsers={onlineUsers}
        onBack={goBack}
        onSave={handleSaveVersion}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onShowVersions={loadVersions}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        showMobileMenu={showMobileMenu}
        onToggleMobileMenu={() => setShowMobileMenu(!showMobileMenu)}
        execCommand={execCommand}
      />

      <div className="editor-container">
        {currentDoc && (
          <Editor
            content={currentDoc.content}
            onChange={handleContentChange}
            onlineUsers={onlineUsers}
            currentUserId={userId}
            highlights={highlights}
            execCommand={execCommand}
          />
        )}

        {showVersions && (
          <div className="version-sidebar">
            <div className="sidebar-header">
              <h3>📚 版本历史</h3>
              <button className="close-btn" onClick={() => setShowVersions(false)}>✕</button>
            </div>
            <div className="version-list">
              {versions.length === 0 ? (
                <div className="empty-versions">暂无保存的版本</div>
              ) : (
                versions.map((v, index) => (
                  <div
                    key={v.id}
                    className="version-item"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => setPreviewVersion(v)}
                  >
                    <div className="version-number">版本 v{v.version}</div>
                    <div className="version-meta">
                      <span>👤 {v.savedBy}</span>
                      <span>🕐 {formatDate(v.savedAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {previewVersion && (
        <div className="modal-overlay" onClick={() => setPreviewVersion(null)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📖 版本 v{previewVersion.version} 预览</h2>
              <button className="close-btn" onClick={() => setPreviewVersion(null)}>✕</button>
            </div>
            <div
              className="version-preview-content"
              dangerouslySetInnerHTML={{ __html: previewVersion.content }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
