import { useState, useEffect } from 'react'
import { useApp } from './App'

interface VersionSnapshot {
  id: string
  timestamp: number
  content: string
  label?: string
}

interface DiffPart {
  value: string
  added?: boolean
  removed?: boolean
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

    const handleDiffResult = (data: { diff: DiffPart[] }) => {
      setDiffResult(data.diff)
      setLoading(false)
    }

    socket.on('diff-result', handleDiffResult)

    return () => {
      socket.off('diff-result', handleDiffResult)
    }
  }, [socket])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
    return new Date(timestamp).toLocaleDateString()
  }

  const handleCompare = () => {
    if (!selectedVersion1 || !selectedVersion2 || !socket) return

    setLoading(true)
    setDiffResult(null)
    socket.emit('compare-versions', {
      versionId1: selectedVersion1,
      versionId2: selectedVersion2,
    })
  }

  const handleRollback = (version: VersionSnapshot) => {
    if (confirm('确定要回滚到此版本吗？当前内容将被替换。')) {
      showToast(`已回滚到版本：${version.label || formatDate(version.timestamp)}`, 'success')
      onClose()
    }
  }

  return (
    <div className="version-history">
      <div className="version-header">
        <h2>📜 版本历史</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="version-compare">
        <h3>版本对比</h3>
        <div className="compare-selectors">
          <div className="selector-group">
            <label>版本 A</label>
            <select
              value={selectedVersion1 || ''}
              onChange={(e) => setSelectedVersion1(e.target.value)}
            >
              <option value="">选择版本...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label || formatDate(v.timestamp)}
                </option>
              ))}
            </select>
          </div>
          <span className="compare-arrow">→</span>
          <div className="selector-group">
            <label>版本 B</label>
            <select
              value={selectedVersion2 || ''}
              onChange={(e) => setSelectedVersion2(e.target.value)}
            >
              <option value="">选择版本...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label || formatDate(v.timestamp)}
                </option>
              ))}
            </select>
          </div>
          <button
            className="compare-btn"
            onClick={handleCompare}
            disabled={!selectedVersion1 || !selectedVersion2 || loading}
          >
            {loading ? '对比中...' : '对比'}
          </button>
        </div>

        {diffResult && (
          <div className="diff-result">
            <h4>差异结果</h4>
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
        )}
      </div>

      <div className="versions-list">
        <h3>历史版本 ({versions.length})</h3>
        {versions.length === 0 ? (
          <div className="empty-versions">
            <p>暂无历史版本</p>
            <p className="empty-hint">文档每 30 秒自动保存一次版本</p>
          </div>
        ) : (
          <div className="version-timeline">
            {versions.map((version, index) => (
              <div key={version.id} className="version-item">
                <div className="version-timeline-dot"></div>
                <div className="version-info">
                  <div className="version-title">
                    {version.label || `版本 ${versions.length - index}`}
                  </div>
                  <div className="version-time">
                    {formatRelativeTime(version.timestamp)} · {formatDate(version.timestamp)}
                  </div>
                  <div className="version-preview">
                    {version.content.slice(0, 100)}
                    {version.content.length > 100 ? '...' : ''}
                  </div>
                  <div className="version-actions">
                    <button
                      className="rollback-btn"
                      onClick={() => handleRollback(version)}
                    >
                      ↩ 回滚到此版本
                    </button>
                    <button
                      className="select-version-btn"
                      onClick={() => {
                        if (!selectedVersion1) {
                          setSelectedVersion1(version.id)
                        } else if (!selectedVersion2) {
                          setSelectedVersion2(version.id)
                        } else {
                          setSelectedVersion1(version.id)
                          setSelectedVersion2(null)
                        }
                      }}
                    >
                      选择对比
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default VersionHistory
