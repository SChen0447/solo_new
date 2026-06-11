import { useEffect, useRef, useState, useCallback } from 'react'
import * as Y from 'yjs'
import { QuillBinding } from 'y-quill'
import Quill from 'quill'
import QuillCursors from 'quill-cursors'
import { IndexeddbPersistence } from 'y-indexeddb'
import { useApp } from './App'
import 'quill/dist/quill.snow.css'

Quill.register('modules/cursors', QuillCursors)

interface EditorProps {
  isJoined: boolean
  toolbarOpen: boolean
}

interface CRDTStats {
  localUpdates: number
  remoteUpdates: number
  conflicts: number
  lastSyncTime: number
}

function Editor({ isJoined, toolbarOpen }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const ytextRef = useRef<Y.Text | null>(null)
  const bindingRef = useRef<QuillBinding | null>(null)
  const cursorsRef = useRef<QuillCursors | null>(null)
  const autoSaveTimerRef = useRef<number | null>(null)
  const cursorDebounceRef = useRef<number | null>(null)
  const lastSentRangeRef = useRef<any>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [crdtStats, setCrdtStats] = useState<CRDTStats>({
    localUpdates: 0,
    remoteUpdates: 0,
    conflicts: 0,
    lastSyncTime: 0,
  })
  const { socket, userId, userName, users, roomId, showToast } = useApp()
  const userColorMap = useRef<Map<string, string>>(new Map())
  const remoteUpdateInProgress = useRef(false)

  useEffect(() => {
    users.forEach(user => {
      userColorMap.current.set(user.id, user.color)
    })
  }, [users])

  const applyCRDTUpdate = useCallback((update: Uint8Array, origin: any) => {
    if (!ydocRef.current) return

    try {
      const beforeState = Y.encodeStateAsUpdate(ydocRef.current)

      remoteUpdateInProgress.current = true
      Y.applyUpdate(ydocRef.current, update, origin)

      const afterState = Y.encodeStateAsUpdate(ydocRef.current)

      if (beforeState.length !== afterState.length) {
        setCrdtStats(prev => ({
          ...prev,
          remoteUpdates: prev.remoteUpdates + 1,
          lastSyncTime: Date.now(),
        }))
      }

      remoteUpdateInProgress.current = false
    } catch (error) {
      console.error('CRDT update conflict, attempting to resolve:', error)
      setCrdtStats(prev => ({
        ...prev,
        conflicts: prev.conflicts + 1,
      }))

      if (ydocRef.current) {
        try {
          const docState = Y.encodeStateAsUpdate(ydocRef.current)
          Y.applyUpdate(ydocRef.current, docState, 'force-resolve')
        } catch (e2) {
          console.error('Failed to resolve CRDT conflict:', e2)
        }
      }
      remoteUpdateInProgress.current = false
    }
  }, [])

  const handleContentChange = useCallback((delta: any, oldDelta: any, source: any) => {
    if (!quillRef.current || !ytextRef.current || !socket) return

    if (source === 'yjs' || source === 'rollback' || remoteUpdateInProgress.current) {
      return
    }

    setCrdtStats(prev => ({
      ...prev,
      localUpdates: prev.localUpdates + 1,
    }))

    const content = quillRef.current.getContents()
    if (content && content.ops) {
      const text = quillRef.current.getText()
      const hasSignificantChange = text.length > 0 || delta?.ops?.some((op: any) => op.insert || op.delete)
      if (hasSignificantChange) {
        setLastSaved(null)
      }
    }
  }, [socket])

  const syncCursor = useCallback((range: any) => {
    if (!socket || !userId) return

    if (cursorDebounceRef.current) {
      clearTimeout(cursorDebounceRef.current)
    }

    cursorDebounceRef.current = window.setTimeout(() => {
      const rangeStr = JSON.stringify(range)
      if (rangeStr !== JSON.stringify(lastSentRangeRef.current)) {
        lastSentRangeRef.current = range
        socket.emit('cursor-update', {
          range,
          name: userName,
        })
      }
    }, 50)
  }, [socket, userId, userName])

  useEffect(() => {
    if (!editorRef.current || !isJoined || quillRef.current) return

    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    const ytext = ydoc.getText('quill')
    ytextRef.current = ytext

    const persistence = new IndexeddbPersistence(`yjs-${roomId}`, ydoc)

    const toolbarOptions = [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean'],
    ]

    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      modules: {
        toolbar: toolbarOptions,
        cursors: {
          hideDelayMs: 3000,
          hideSpeedMs: 200,
          transformOnTextChange: true,
        },
        keyboard: {
          bindings: {
            customBold: {
              key: 'B',
              shortKey: true,
              handler: function(range: any, context: any) {
                if (context.format.bold) {
                  quill.format('bold', false)
                } else {
                  quill.format('bold', true)
                }
                return false
              }
            },
            customItalic: {
              key: 'I',
              shortKey: true,
              handler: function(range: any, context: any) {
                if (context.format.italic) {
                  quill.format('italic', false)
                } else {
                  quill.format('italic', true)
                }
                return false
              }
            },
            customUnderline: {
              key: 'U',
              shortKey: true,
              handler: function(range: any, context: any) {
                if (context.format.underline) {
                  quill.format('underline', false)
                } else {
                  quill.format('underline', true)
                }
                return false
              }
            },
            customH1: {
              key: '1',
              shortKey: true,
              handler: function(range: any, context: any) {
                if (context.format.header === 1) {
                  quill.format('header', false)
                } else {
                  quill.format('header', 1)
                }
                return false
              }
            },
            customH2: {
              key: '2',
              shortKey: true,
              handler: function(range: any, context: any) {
                if (context.format.header === 2) {
                  quill.format('header', false)
                } else {
                  quill.format('header', 2)
                }
                return false
              }
            },
          }
        },
      },
      placeholder: '开始输入内容，与他人实时协作...\n\n快捷键：\nCtrl+B 加粗 | Ctrl+I 斜体 | Ctrl+U 下划线\nCtrl+1/2/3 设置标题 H1/H2/H3',
    })

    quillRef.current = quill

    const binding = new QuillBinding(ytext, quill)
    bindingRef.current = binding

    const cursors = quill.getModule('cursors') as QuillCursors
    cursorsRef.current = cursors

    if (socket) {
      socket.on('yjs-update', (update: Uint8Array) => {
        applyCRDTUpdate(update, 'remote')
      })

      ydoc.on('update', (update: Uint8Array, origin: any) => {
        if (origin !== socket && origin !== 'remote' && origin !== 'rollback') {
          socket.emit('yjs-update', update)
        }
      })

      socket.on('cursor-update', ({ userId: cursorUserId, range, name }: any) => {
        if (cursorUserId === userId) return
        if (!cursorsRef.current) return

        const color = userColorMap.current.get(cursorUserId) || '#FF6F00'

        try {
          cursorsRef.current.createCursor(cursorUserId, name || '协作者', color)
          if (range) {
            cursorsRef.current.moveCursor(cursorUserId, range)
          }
        } catch (e) {
          console.warn('Cursor update conflict, skipping:', e)
        }
      })

      socket.on('rollback-content', ({ content, delta }: any) => {
        if (!quillRef.current || !ytextRef.current || !ydocRef.current) return

        remoteUpdateInProgress.current = true

        try {
          ydocRef.current.transact(() => {
            if (ytextRef.current) {
              ytextRef.current.delete(0, ytextRef.current.length)
              if (content) {
                ytextRef.current.insert(0, content)
              }
            }
          }, 'rollback')

          showToast('文档已回滚到指定版本', 'success')
          setLastSaved(new Date())
        } catch (error) {
          console.error('Rollback failed:', error)
          showToast('文档回滚失败', 'error')
        }

        remoteUpdateInProgress.current = false
      })

      socket.on('permission-updated', ({ mode }: any) => {
        if (quillRef.current) {
          const isReadOnly = mode === 'private'
          quillRef.current.enable(!isReadOnly)
          if (isReadOnly) {
            showToast('文档已设为私有，当前为只读模式', 'info')
          }
        }
      })
    }

    quill.on('text-change', handleContentChange)

    quill.on('selection-change', (range) => {
      if (range) {
        syncCursor(range)
      }
    })

    quill.on('editor-change', (eventName: string, ...args: any[]) => {
      if (eventName === 'selection-change') {
        const range = args[0]
        if (range) {
          syncCursor(range)
        }
      }
    })

    const yObserver = (event: any, transaction: any) => {
      if (transaction.origin !== 'local' && transaction.origin !== ydoc.clientID) {
        setCrdtStats(prev => ({
          ...prev,
          remoteUpdates: prev.remoteUpdates + 1,
          lastSyncTime: Date.now(),
        }))
      }
    }

    ytext.observe(yObserver)

    return () => {
      ytext.unobserve(yObserver)
      persistence.destroy()
      if (bindingRef.current) {
        bindingRef.current.destroy()
      }
      quillRef.current = null
      if (cursorDebounceRef.current) {
        clearTimeout(cursorDebounceRef.current)
      }
    }
  }, [isJoined, roomId, socket, userId, userName, applyCRDTUpdate, handleContentChange, syncCursor, showToast])

  useEffect(() => {
    if (!socket || !isJoined || !quillRef.current) return

    const autoSave = () => {
      if (quillRef.current) {
        const content = quillRef.current.getText()
        const delta = quillRef.current.getContents()
        socket.emit('save-version', {
          content,
          delta,
          label: `自动保存 - ${new Date().toLocaleTimeString('zh-CN')}`,
        })
      }
    }

    autoSaveTimerRef.current = window.setInterval(autoSave, 30000)

    setTimeout(autoSave, 5000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [socket, isJoined])

  useEffect(() => {
    if (!socket) return

    const handleVersionSaved = () => {
      setLastSaved(new Date())
    }

    const handleToast = ({ message, type }: any) => {
      showToast(message, type || 'info')
    }

    socket.on('version-saved', handleVersionSaved)
    socket.on('toast', handleToast)

    return () => {
      socket.off('version-saved', handleVersionSaved)
      socket.off('toast', handleToast)
    }
  }, [socket, showToast])

  const handleSaveNow = () => {
    if (quillRef.current && socket) {
      const content = quillRef.current.getText()
      const delta = quillRef.current.getContents()
      socket.emit('save-version', {
        content,
        delta,
        label: `手动保存 - ${new Date().toLocaleTimeString('zh-CN')}`,
      })
      showToast('正在保存...', 'info')
    }
  }

  return (
    <div className={`editor-container ${toolbarOpen ? '' : 'toolbar-hidden'}`}>
      <div className="editor-status-bar">
        <div className="status-left">
          <span className="status-indicator"></span>
          <span className="status-text">实时协作中</span>
          <span className="crdt-stats" title={`本地更新: ${crdtStats.localUpdates}, 远程同步: ${crdtStats.remoteUpdates}, 冲突解决: ${crdtStats.conflicts}`}>
            🔄 CRDT
          </span>
        </div>
        <div className="status-right">
          <span className="last-saved">
            {lastSaved ? `上次保存: ${lastSaved.toLocaleTimeString('zh-CN')}` : '等待保存...'}
          </span>
          <button className="save-btn" onClick={handleSaveNow}>
            💾 立即保存
          </button>
        </div>
      </div>
      <div ref={editorRef} className="quill-editor-wrapper"></div>
    </div>
  )
}

export default Editor
