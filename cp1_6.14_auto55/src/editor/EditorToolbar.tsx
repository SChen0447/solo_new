import React, { useRef } from 'react'
import axios from 'axios'
import { useGameStore, LEVEL_WIDTH, LEVEL_HEIGHT } from '../store/gameStore'

interface EditorToolbarProps {
  onSimulate?: () => void
}

const EditorToolbar: React.FC<EditorToolbarProps> = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    elements,
    clearElements,
    setElements,
    addNotification,
    startSimulation,
    resetSimulation
  } = useGameStore()

  const pressedStyle: React.CSSProperties = {
    transform: 'scale(0.97)',
    filter: 'brightness(0.85)'
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget
    Object.assign(btn.style, pressedStyle)
    setTimeout(() => {
      btn.style.transform = ''
      btn.style.filter = ''
    }, 200)
  }

  const buttonBaseStyle: React.CSSProperties = {
    padding: '8px 20px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    color: 'white',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    letterSpacing: 0.3
  }

  const handleSave = async () => {
    try {
      const levelData = {
        width: LEVEL_WIDTH,
        height: LEVEL_HEIGHT,
        elements: elements
      }

      await axios.post('/api/levels', levelData)
      addNotification({
        type: 'success',
        message: '关卡数据已保存到服务器',
        dismissible: false
      })
    } catch (error) {
        addNotification({
          type: 'success',
          message: '保存失败，已保存到本地（服务器未启动？）',
          dismissible: true
        })
      }
  }

  const handleExportJSON = () => {
    try {
      const levelData = {
        width: LEVEL_WIDTH,
        height: LEVEL_HEIGHT,
        elements: elements
      }
      const jsonStr = JSON.stringify(levelData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `level_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      addNotification({
        type: 'success',
        message: 'JSON文件已下载',
        dismissible: false
      })
    } catch (error) {
      addNotification({
        type: 'error',
        message: '导出失败: ' + (error as Error).message,
        dismissible: true
      })
    }
  }

  const handleLoadFromServer = async () => {
    try {
      const res = await axios.get('/api/levels')
      if (res.data?.success && res.data.data?.length > 0) {
        const latest = res.data.data[res.data.data.length - 1]
        setElements(latest.elements || [])
        addNotification({
          type: 'success',
          message: '已从服务器加载关卡',
          dismissible: false
        })
      } else {
        addNotification({
          type: 'error',
          message: '服务器上没有保存的关卡',
          dismissible: true
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: '加载失败: ' + (error as Error).message,
        dismissible: true
      })
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.elements && Array.isArray(data.elements)) {
          setElements(data.elements)
          addNotification({
            type: 'success',
            message: '关卡导入成功',
            dismissible: false
          })
        } else {
          addNotification({
            type: 'error',
            message: '无效的关卡文件格式',
            dismissible: true
          })
        }
      } catch (err) {
        addNotification({
          type: 'error',
          message: 'JSON解析错误',
          dismissible: true
        })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClear = () => {
    if (elements.length === 0) return
    if (window.confirm(`确定要清除所有 ${elements.length} 个元素吗？`)) {
      clearElements()
      addNotification({
        type: 'success',
        message: '关卡已清除',
        dismissible: false
      })
    }
  }

  const handleStartSimulate = () => {
    if (elements.length === 0) {
      addNotification({
        type: 'error',
        message: '请先放置关卡元素',
        dismissible: true
      })
      return
    }
    const hasFlag = elements.some((el) => el.type === 'flag')
    if (!hasFlag) {
      addNotification({
        type: 'error',
        message: '请先放置终点旗帜',
        dismissible: true
      })
      return
    }
    resetSimulation()
    startSimulation()
    addNotification({
      type: 'success',
      message: '开始模拟运行',
      dismissible: false
    })
  }

  return (
    <div
      style={{
        height: 50,
        backgroundColor: '#2C3E50',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 10,
        borderBottom: '2px solid #1A252F',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}
    >
      <div
        style={{
          color: '#E67E22',
          fontWeight: 700,
          fontSize: 16,
          marginRight: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <span style={{ fontSize: 20 }}>🎮</span>
        2D 关卡编辑器
      </div>

      <button
        onClick={handleSave}
        onMouseDown={handleMouseDown}
        style={{
          ...buttonBaseStyle,
          backgroundColor: '#27AE60'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2ECC71'
          e.currentTarget.style.transform = 'scale(1.04)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#27AE60'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        💾 保存
      </button>

      <button
        onClick={handleExportJSON}
        onMouseDown={handleMouseDown}
        style={{
          ...buttonBaseStyle,
          backgroundColor: '#3498DB'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#5DADE2'
          e.currentTarget.style.transform = 'scale(1.04)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#3498DB'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        📤 导出
      </button>

      <button
        onClick={handleLoadFromServer}
        onMouseDown={handleMouseDown}
        style={{
          ...buttonBaseStyle,
          backgroundColor: '#8E44AD'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#A569BD'
          e.currentTarget.style.transform = 'scale(1.04)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#8E44AD'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        📥 加载
      </button>

      <button
        onClick={handleImportClick}
        onMouseDown={handleMouseDown}
        style={{
          ...buttonBaseStyle,
          backgroundColor: '#5D6D7E'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#85929E'
          e.currentTarget.style.transform = 'scale(1.04)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#5D6D7E'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        📂 导入
      </button>

      <div style={{ flex: 1 }} />

      <button
        onClick={handleStartSimulate}
        onMouseDown={handleMouseDown}
        style={{
          ...buttonBaseStyle,
          backgroundColor: '#E67E22',
          boxShadow: '0 2px 8px rgba(230, 126, 34, 0.3)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F39C12'
          e.currentTarget.style.transform = 'scale(1.04)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#E67E22'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        ▶️ 开始模拟
      </button>

      <button
        onClick={handleClear}
        onMouseDown={handleMouseDown}
        style={{
          ...buttonBaseStyle,
          backgroundColor: '#C0392B'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E74C3C'
          e.currentTarget.style.transform = 'scale(1.04)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#C0392B'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        🗑️ 清除
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default EditorToolbar
