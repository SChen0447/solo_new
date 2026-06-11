import { useState } from 'react'
import { useApp, PermissionMode } from './App'

interface Invitation {
  id: string
  email?: string
  expiresAt: number
  canEdit: boolean
  inviteUrl?: string
}

interface PermissionManagerProps {
  onClose: () => void
}

const EXPIRY_OPTIONS = [
  { label: '1 小时', value: 3600000 },
  { label: '1 天', value: 86400000 },
  { label: '7 天', value: 604800000 },
  { label: '30 天', value: 2592000000 },
  { label: '永不过期', value: 315360000000 },
]

function PermissionManager({ onClose }: PermissionManagerProps) {
  const { socket, permissionMode, isOwner, invitations, showToast } = useApp()
  const [selectedMode, setSelectedMode] = useState<PermissionMode>(permissionMode)
  const [expiryMs, setExpiryMs] = useState(86400000)
  const [canInviteEdit, setCanInviteEdit] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [generatedInvite, setGeneratedInvite] = useState<Invitation | null>(null)
  const [copied, setCopied] = useState(false)

  const handleModeChange = (mode: PermissionMode) => {
    if (!isOwner) return
    setSelectedMode(mode)
  }

  const applyPermissionChange = () => {
    if (!socket || !isOwner) return
    socket.emit('set-permission', { mode: selectedMode })
    showToast(`权限已更新为：${selectedMode === 'public' ? '公开' : selectedMode === 'invited' ? '仅受邀' : '私有'}`, 'success')
  }

  const generateInvite = () => {
    if (!socket || !isOwner) return

    socket.emit('create-invitation', {
      email: inviteEmail || undefined,
      expiresInMs: expiryMs,
      canEdit: canInviteEdit,
    })

    socket.once('invitation-created', (invitation: Invitation) => {
      setGeneratedInvite(invitation)
      setInviteEmail('')
      showToast('邀请链接已生成', 'success')
    })
  }

  const copyInviteLink = () => {
    if (!generatedInvite?.inviteUrl) return
    navigator.clipboard.writeText(generatedInvite.inviteUrl)
    setCopied(true)
    showToast('邀请链接已复制到剪贴板', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const formatExpiryDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  const formatExpiryRemaining = (timestamp: number) => {
    const remaining = timestamp - Date.now()
    if (remaining <= 0) return '已过期'
    const days = Math.floor(remaining / 86400000)
    const hours = Math.floor((remaining % 86400000) / 3600000)
    if (days > 0) return `${days} 天 ${hours} 小时后过期`
    const minutes = Math.floor((remaining % 3600000) / 60000)
    if (hours > 0) return `${hours} 小时 ${minutes} 分钟后过期`
    return `${minutes} 分钟后过期`
  }

  return (
    <div className="permission-manager">
      <div className="permission-header">
        <h2>🔐 权限管理</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="permission-section">
        <h3>文档访问权限</h3>
        <p className="section-desc">控制谁可以访问和编辑此文档</p>

        <div className="permission-options">
          <label
            className={`permission-option ${selectedMode === 'public' ? 'selected' : ''}`}
            onClick={() => handleModeChange('public')}
          >
            <div className="option-icon">🌐</div>
            <div className="option-content">
              <div className="option-title">公开</div>
              <div className="option-desc">所有登录用户可查看和编辑</div>
            </div>
            <div className="option-radio">
              <div className={`radio-inner ${selectedMode === 'public' ? 'checked' : ''}`}></div>
            </div>
          </label>

          <label
            className={`permission-option ${selectedMode === 'invited' ? 'selected' : ''}`}
            onClick={() => handleModeChange('invited')}
          >
            <div className="option-icon">🔗</div>
            <div className="option-content">
              <div className="option-title">仅受邀者</div>
              <div className="option-desc">只有通过邀请链接的用户可以访问</div>
            </div>
            <div className="option-radio">
              <div className={`radio-inner ${selectedMode === 'invited' ? 'checked' : ''}`}></div>
            </div>
          </label>

          <label
            className={`permission-option ${selectedMode === 'private' ? 'selected' : ''}`}
            onClick={() => handleModeChange('private')}
          >
            <div className="option-icon">🔒</div>
            <div className="option-content">
              <div className="option-title">所有者私有</div>
              <div className="option-desc">仅你自己可以查看和编辑</div>
            </div>
            <div className="option-radio">
              <div className={`radio-inner ${selectedMode === 'private' ? 'checked' : ''}`}></div>
            </div>
          </label>
        </div>

        <button
          className="apply-permission-btn"
          onClick={applyPermissionChange}
          disabled={selectedMode === permissionMode}
        >
          {selectedMode === permissionMode ? '✓ 已应用' : '应用权限变更'}
        </button>
      </div>

      <div className="permission-section">
        <h3>生成邀请链接</h3>
        <p className="section-desc">创建邀请链接分享给协作者</p>

        <div className="invite-form">
          <div className="form-row">
            <label>邮箱（可选）</label>
            <input
              type="email"
              placeholder="输入协作者邮箱..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label>过期时间</label>
            <select
              value={expiryMs}
              onChange={(e) => setExpiryMs(Number(e.target.value))}
            >
              {EXPIRY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-row checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={canInviteEdit}
                onChange={(e) => setCanInviteEdit(e.target.checked)}
              />
              允许编辑（取消勾选则仅可查看）
            </label>
          </div>

          <button className="generate-invite-btn" onClick={generateInvite}>
            🎫 生成邀请链接
          </button>
        </div>

        {generatedInvite && (
          <div className="generated-invite" style={{ animation: 'slideInLeft 0.3s ease' }}>
            <div className="invite-success-header">
              <span className="success-icon">✓</span>
              <span>邀请链接已生成</span>
            </div>
            <div className="invite-url-box">
              <input
                type="text"
                value={generatedInvite.inviteUrl || ''}
                readOnly
              />
              <button
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={copyInviteLink}
              >
                {copied ? '✓ 已复制' : '📋 复制链接'}
              </button>
            </div>
            <div className="invite-meta">
              <span>权限：{generatedInvite.canEdit ? '✏️ 可编辑' : '👁️ 仅查看'}</span>
              <span>过期：{formatExpiryDate(generatedInvite.expiresAt)}</span>
            </div>
          </div>
        )}
      </div>

      {invitations.length > 0 && (
        <div className="permission-section">
          <h3>有效的邀请链接 ({invitations.length})</h3>
          <div className="invitations-list">
            {invitations.map((invite) => (
              <div key={invite.id} className="invitation-item">
                <div className="invitation-info">
                  <div className="invitation-id">
                    {invite.email || `邀请 #${invite.id.slice(0, 8)}`}
                  </div>
                  <div className="invitation-status">
                    <span className={`expiry ${invite.expiresAt < Date.now() ? 'expired' : ''}`}>
                      {formatExpiryRemaining(invite.expiresAt)}
                    </span>
                    <span className="permission-tag">
                      {invite.canEdit ? '✏️ 可编辑' : '👁️ 仅查看'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PermissionManager
