import { useEffect, useRef, useState } from 'react'
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

function Editor({ isJoined, toolbarOpen }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const bindingRef = useRef<QuillBinding | null>(null)
  const cursorsRef = useRef<QuillCursors | null>(null)
  const autoSaveTimerRef = useRef<number | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const { socket, userId, userName, users, roomId, showToast } = useApp()
  const userColorMap = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    users.forEach(user => {
      userColorMap.current.set(user.id, user.color)
    })
  }, [users])

  useEffect(() => {
    if (!editorRef.current || !isJoined || quillRef.current) return

    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    const ytext = ydoc.getText('quill')

    const persistence = new IndexeddbPersistence(`yjs-${roomId}`, ydoc)

    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          ['blockquote', 'code-block'],
          ['link'],
          ['clean'],
        ],
        cursors: {
          hideDelayMs: 3000,
          hideSpeedMs: 200,
          transformOnTextChange: true,
        },
      },
      placeholder: '开始输入内容，与他人实时协作...',
    })

    quillRef.current = quill

    const binding = new QuillBinding(ytext, quill)
    bindingRef.current = binding

    const cursors = quill.getModule('cursors') as QuillCursors
    cursorsRef.current = cursors

    if (socket) {
      socket.on('yjs-update', (update: Uint8Array) => {
        Y.applyUpdate(ydoc, update)
      })

      ydoc.on('update', (update: Uint8Array, origin: any) => {
        if (origin !== socket) {
          socket.emit('yjs-update', update)
        }
      })

      socket.on('cursor-update', ({ userId: cursorUserId, range, name }: any) => {
        if (cursorUserId === userId) return
        const color = userColorMap.current.get(cursorUserId) || '#FF6F00'
        cursors.createCursor(cursorUserId, name || '协作者', color)
        cursors.moveCursor(cursorUserId, range)
      })
    }

    quill.on('selection-change', (range) => {
      if (range && socket) {
        socket.emit('cursor-update', {
          range,
          name: userName,
        })
      }
    })

    return () => {
      persistence.destroy()
      binding.destroy()
      quillRef.current = null
    }
  }, [isJoined, roomId])

  useEffect(() => {
    if (!socket || !isJoined) return

    const autoSave = () => {
      if (quillRef.current) {
        const content = quillRef.current.getText()
        socket.emit('save-version', {
          content,
          label: `自动保存 - ${new Date().toLocaleTimeString()}`,
        })
        setLastSaved(new Date())
      }
    }

    autoSaveTimerRef.current = window.setInterval(autoSave, 30000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [socket, isJoined, showToast])

  useEffect(() => {
    if (!socket) return

    const handleVersionSaved = () => {
      setLastSaved(new Date())
      showToast('文档已自动保存', 'success')
    }

    socket.on('version-saved', handleVersionSaved)

    return () => {
      socket.off('version-saved', handleVersionSaved)
    }
  }, [socket, showToast])

  const handleSaveNow = () => {
    if (quillRef.current && socket) {
      const content = quillRef.current.getText()
      socket.emit('save-version', {
        content,
        label: `手动保存 - ${new Date().toLocaleTimeString()}`,
      })
    }
  }

  return (
    <div className={`editor-container ${toolbarOpen ? '' : 'toolbar-hidden'}`}>
      <div className="editor-status-bar">
        <div className="status-left">
          <span className="status-indicator"></span>
          <span className="status-text">实时协作中</span>
        </div>
        <div className="status-right">
          <span className="last-saved">
            {lastSaved ? `上次保存: ${lastSaved.toLocaleTimeString()}` : '尚未保存'}
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
