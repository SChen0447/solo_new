import { useState, useEffect, useCallback } from 'react'
import { useApp } from './App'

interface VersionSnapshot {
  id: string
  timestamp: number
  content: string
  delta?: any
  label?: string
}

interface DiffPart {
  value: string
  added?: boolean
  removed?: boolean
  count?: number
}

interface VersionHistoryProps {
  onClose: () => void
}

function VersionHistory({ onClose }: VersionHistoryProps) {
  const { socket, showToast } = useApp()
  const [versions, setVersions] = useState<VersionSnapshot[]>([])
  const [selectedVersion1, setSelectedVersion1] = useState<string | null>(null)
  const [selectedVersion2, setSelectedVersion2] = useState<string | null>(null)
  const [diffResult, setDiffResult] = useState<DiffPart[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'diff'>('list')
  const [rollbackVersion, setRollbackVersion] = useState<VersionSnapshot | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)

  useEffect(() => {
    if (!socket) return

    socket.emit('get-versions')

    const handleVersionsUpdated = (versionList: VersionSnapshot[]) => {
      setVersions(versionList)
    }

    socket.on('versions-updated', handleVersionsUpdated)

    return () => {
      socket.off('versions-updated', handleVersionsUpdated)
    }
  }, [socket])

  useEffect(() => {
    if (!socket) return

    const handleDiffResult = (data: { version1: VersionSnapshot; version2: VersionSnapshot; diff: DiffPart[] }) => {
      setDiffResult(data.diff)
      setLoading(false)
      setViewMode('diff')
    }

    socket.on('diff-result', handleDiffResult)

    return () => {
      socket.off('diff-result', handleDiffResult)
    }
  }, [socket])

  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN')
  }, [])

  const formatRelativeTime = useCallback((timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }, [])

  const handleCompare = () => {
    if (!selectedVersion1 || !selectedVersion2 || !socket) return

    setLoading(true)
    setDiffResult(null)
    socket.emit('compare-versions', {
      versionId1: selectedVersion1,
      versionId2: selectedVersion2,
    })
  }

  const confirmRollback = () => {
    if (!rollbackVersion || !socket) return

    socket.emit('rollback-version', {
      versionId: rollbackVersion.id,
    })

    showToast(`正在回滚到：${rollbackVersion.label || formatDate(rollbackVersion.timestamp)}`, 'info')
    setRollbackVersion(null)
    setTimeout(() => {
      onClose()
    }, 1000)
  }

  const toggleVersionSelection = (versionId: string) => {
    if (selectedVersion1 === versionId) {
      setSelectedVersion1(null)
    } else if (selectedVersion2 === versionId) {
      setSelectedVersion2(null)
    } else if (!selectedVersion1) {
      setSelectedVersion1(versionId)
    } else if (!selectedVersion2) {
      setSelectedVersion2(versionId)
    } else {
      setSelectedVersion1(versionId)
      setSelectedVersion2(null)
      setDiffResult(null)
      setViewMode('list')
    }
  }

  const clearSelection = () => {
    setSelectedVersion1(null)
    setSelectedVersion2(null)
    setDiffResult(null)
    setViewMode('list')
  }

  const getVersionLabel = (version: VersionSnapshot, index: number) => {
    if (version.label) return version.label
    if (index === 0) return '当前版本'
    return `历史版本 ${versions.length - index}`
  }

  const renderDiffStats = () => {
    if (!diffResult) return null
    let added = 0
    let removed = 0
    diffResult.forEach(part => {
      if (part.added) added += part.value.split(' ').length || 1
      if (part.removed) removed += part.value.split(' ').length || 1
    })
    return (
      <div className="diff-stats">
        <span className="diff-added">+{added} 新增</span>
        <span className="diff-removed">-{removed} 删除</span>
      </div>
    )
  }

  return (
    <div className="version-history">
      <div className="version-header">
        <div className="version-header-left">
          <h2>📜 版本历史</h2>
          <span className="version-count">{versions.length} 个版本</span>
        </div>
        <div className="version-header-actions">
          <label className="auto-save-toggle">
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
            />
            <span>30秒自动保存</span>
          </label>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="version-compare-bar">
        {viewMode === 'diff' ? (
          <div className="diff-mode-header">
            <span className="diff-indicator">
              📊 对比视图
            </span>
            {renderDiffStats()}
            <button className="back-btn" onClick={() => setViewMode('list')}>
              ← 返回版本列表
            </button>
          </div>
        ) : (
          <>
            <div className="compare-info">
              {selectedVersion1 && selectedVersion2 ? (
                <span className="compare-selected">
                  已选择 2 个版本进行对比
                </span>
              ) : (
                <span className="compare-hint">
                  点击下方版本选择 2 个进行对比
                  {selectedVersion1 && ` (已选 1 个)`}
                </span>
              )}
            </div>
            <div className="compare-actions">
              <button
                className="clear-btn"
                onClick={clearSelection}
                disabled={!selectedVersion1 && !selectedVersion2}
              >
                清除选择
              </button>
              <button
                className="compare-btn"
                onClick={handleCompare}
                disabled={!selectedVersion1 || !selectedVersion2 || loading}
              >
                {loading ? '对比中...' : '📊 对比版本'}
              </button>
            </div>
          </>
        )}
      </div>

      {viewMode === 'diff' && diffResult ? (
        <div className="diff-result-panel">
          <div className="diff-versions-info">
            <div className="diff-version-info">
              <span className="diff-version-label">版本 A</span>
              <span className="diff-version-time">
                {formatDate(versions.find(v => v.id === selectedVersion1)?.timestamp || 0)}
              </span>
            </div>
            <span className="diff-arrow">→</span>
            <div className="diff-version-info">
              <span className="diff-version-label">版本 B</span>
              <span className="diff-version-time">
                {formatDate(versions.find(v => v.id === selectedVersion2)?.timestamp || 0)}
              </span>
            </div>
          </div>
          <div className="diff-content-wrapper">
            <div className="diff-content">
              {diffResult.map((part, index) => (
                <span
                  key={index}
                  className={`diff-part ${
                    part.added ? 'added' : part.removed ? 'removed' : ''
                  }`}
                >
                  {part.value}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="versions-list">
          {versions.length === 0 ? (
            <div className="empty-versions">
              <div className="empty-icon">⏳</div>
              <p>暂无历史版本</p>
              <p className="empty-hint">文档将每 30 秒自动保存一次，您也可以点击"立即保存"手动保存</p>
            </div>
          ) : (
            <div className="version-timeline">
              {versions.map((version, index) => {
                const isSelected = selectedVersion1 === version.id || selectedVersion2 === version.id
                const selectionIndex = selectedVersion1 === version.id ? 'A' : selectedVersion2 === version.id ? 'B' : null

                return (
                  <div
                    key={version.id}
                    className={`version-item ${isSelected ? 'selected' : ''} ${index === 0 ? 'current' : ''}`}
                    onClick={() => toggleVersionSelection(version.id)}
                  >
                    <div className="version-timeline-dot">
                      {selectionIndex && (
                        <span className="selection-badge">{selectionIndex}</span>
                      )}
                    </div>
                    <div className="version-info">
                      <div className="version-title-row">
                        <div className="version-title">
                          {index === 0 && <span className="current-badge">当前</span>}
                          {getVersionLabel(version, index)}
                        </div>
                        <div className="version-meta">
                          <span className="version-size">
                            {version.content ? `${Math.round(version.content.length / 1024 * 100) / 100} KB` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="version-time">
                        <span className="relative-time">{formatRelativeTime(version.timestamp)}</span>
                        <span className="absolute-time">· {formatDate(version.timestamp)}</span>
                      </div>
                      <div className="version-preview">
                        {version.content ? version.content.slice(0, 120) : '(空文档)'}
                        {version.content && version.content.length > 120 ? '...' : ''}
                      </div>
                      <div className="version-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="rollback-btn"
                          onClick={() => setRollbackVersion(version)}
                          disabled={index === 0}
                        >
                          ↩ 回滚到此版本
                        </button>
                        <button
                          className={`select-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => toggleVersionSelection(version.id)}
                        >
                          {isSelected ? '✓ 已选择' : '选择对比'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {rollbackVersion && (
        <div className="modal-overlay" onClick={() => setRollbackVersion(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>确认回滚版本</h3>
            <p>确定要回滚到以下版本吗？</p>
            <div className="rollback-version-info">
              <strong>{rollbackVersion.label || '历史版本'}</strong>
              <span>{formatDate(rollbackVersion.timestamp)}</span>
            </div>
            <p className="warning-text">
              ⚠️ 当前内容将被替换，操作会同步给所有协作者
            </p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setRollbackVersion(null)}>
                取消
              </button>
              <button className="confirm-btn danger" onClick={confirmRollback}>
                确认回滚
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VersionHistory
