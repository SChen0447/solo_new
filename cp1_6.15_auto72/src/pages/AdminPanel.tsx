import { useState, useEffect } from 'react'
import type { Room, Artwork } from '@/types'
import { exhibitionApi } from '@/api/exhibitionApi'
import './AdminPanel.css'

const AdminPanel = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'rooms' | 'artworks'>('rooms')
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [showArtworkForm, setShowArtworkForm] = useState(false)

  const [roomForm, setRoomForm] = useState({
    name: '',
    description: '',
    wallColor: '#2c2c3a',
    initialCameraX: 0,
    initialCameraY: 2,
    initialCameraZ: 10,
  })

  const [artworkForm, setArtworkForm] = useState({
    name: '',
    author: '',
    year: new Date().getFullYear(),
    description: '',
    positionX: 0,
    positionY: 1.5,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1,
  })

  const [modelFile, setModelFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    loadRooms()
  }, [])

  useEffect(() => {
    if (selectedRoomId) {
      loadArtworks(selectedRoomId)
    } else {
      setArtworks([])
    }
  }, [selectedRoomId])

  const loadRooms = async () => {
    try {
      const data = await exhibitionApi.getRooms()
      setRooms(data)
      if (data.length > 0 && !selectedRoomId) {
        setSelectedRoomId(data[0].id)
      }
    } catch (error) {
      setMessage('加载房间列表失败')
    }
  }

  const loadArtworks = async (roomId: string) => {
    try {
      const data = await exhibitionApi.getArtworks(roomId)
      setArtworks(data)
    } catch (error) {
      setMessage('加载作品列表失败')
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const newRoom = await exhibitionApi.createRoom({
        name: roomForm.name,
        description: roomForm.description,
        wallColor: roomForm.wallColor,
        initialCamera: {
          x: roomForm.initialCameraX,
          y: roomForm.initialCameraY,
          z: roomForm.initialCameraZ,
        },
      })
      setRooms([...rooms, newRoom])
      setSelectedRoomId(newRoom.id)
      setShowRoomForm(false)
      setRoomForm({
        name: '',
        description: '',
        wallColor: '#2c2c3a',
        initialCameraX: 0,
        initialCameraY: 2,
        initialCameraZ: 10,
      })
      setMessage('房间创建成功')
    } catch (error) {
      setMessage('创建房间失败')
    } finally {
      setIsLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleCreateArtwork = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoomId) {
      setMessage('请先选择一个房间')
      return
    }
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('roomId', selectedRoomId)
      formData.append('name', artworkForm.name)
      formData.append('author', artworkForm.author)
      formData.append('year', String(artworkForm.year))
      formData.append('description', artworkForm.description)
      formData.append('positionX', String(artworkForm.positionX))
      formData.append('positionY', String(artworkForm.positionY))
      formData.append('positionZ', String(artworkForm.positionZ))
      formData.append('rotationX', String(artworkForm.rotationX))
      formData.append('rotationY', String(artworkForm.rotationY))
      formData.append('rotationZ', String(artworkForm.rotationZ))
      formData.append('scale', String(artworkForm.scale))
      if (modelFile) {
        formData.append('model', modelFile)
      }

      const newArtwork = await exhibitionApi.createArtwork(formData)
      setArtworks([...artworks, newArtwork])
      setShowArtworkForm(false)
      setArtworkForm({
        name: '',
        author: '',
        year: new Date().getFullYear(),
        description: '',
        positionX: 0,
        positionY: 1.5,
        positionZ: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scale: 1,
      })
      setModelFile(null)
      setMessage('作品上传成功')
    } catch (error) {
      setMessage('上传作品失败')
    } finally {
      setIsLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('确定要删除这个房间吗？')) return
    try {
      await exhibitionApi.deleteRoom(id)
      setRooms(rooms.filter(r => r.id !== id))
      if (selectedRoomId === id) {
        setSelectedRoomId(rooms.length > 1 ? rooms[0].id : null)
      }
      setMessage('房间删除成功')
    } catch (error) {
      setMessage('删除房间失败')
    }
    setTimeout(() => setMessage(null), 3000)
  }

  const handleDeleteArtwork = async (id: string) => {
    if (!confirm('确定要删除这个作品吗？')) return
    try {
      await exhibitionApi.deleteArtwork(id)
      setArtworks(artworks.filter(a => a.id !== id))
      setMessage('作品删除成功')
    } catch (error) {
      setMessage('删除作品失败')
    }
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="admin-panel">
      <div className="admin-sidebar">
        <h1 className="admin-title">艺术画廊管理后台</h1>

        <nav className="admin-nav">
          <button
            className={`nav-btn ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('rooms')}
          >
            房间管理
          </button>
          <button
            className={`nav-btn ${activeTab === 'artworks' ? 'active' : ''}`}
            onClick={() => setActiveTab('artworks')}
          >
            作品管理
          </button>
        </nav>

        {activeTab === 'artworks' && (
          <div className="room-selector">
            <label className="selector-label">选择房间</label>
            <select
              className="room-select"
              value={selectedRoomId || ''}
              onChange={(e) => setSelectedRoomId(e.target.value || null)}
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="admin-actions">
          {activeTab === 'rooms' && (
            <button
              className="action-btn primary"
              onClick={() => setShowRoomForm(true)}
            >
              + 创建新房间
            </button>
          )}
          {activeTab === 'artworks' && (
            <button
              className="action-btn primary"
              onClick={() => setShowArtworkForm(true)}
              disabled={!selectedRoomId}
            >
              + 上传新作品
            </button>
          )}
        </div>
      </div>

      <div className="admin-content">
        {message && (
          <div className="admin-message">
            {message}
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="content-section">
            <h2 className="section-title">房间列表</h2>
            <div className="rooms-grid">
              {rooms.length === 0 ? (
                <div className="empty-state">暂无房间，点击上方按钮创建</div>
              ) : (
                rooms.map(room => (
                  <div key={room.id} className="room-card">
                    <div
                      className="room-color-preview"
                      style={{ backgroundColor: room.wallColor }}
                    />
                    <div className="room-info">
                      <h3 className="room-name">{room.name}</h3>
                      <p className="room-desc">{room.description}</p>
                      <div className="room-meta">
                        <span>墙色: {room.wallColor}</span>
                      </div>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteRoom(room.id)}
                    >
                      删除
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'artworks' && (
          <div className="content-section">
            <h2 className="section-title">作品列表</h2>
            <div className="artworks-list">
              {artworks.length === 0 ? (
                <div className="empty-state">暂无作品，点击上方按钮上传</div>
              ) : (
                artworks.map(artwork => (
                  <div key={artwork.id} className="artwork-card">
                  <div className="artwork-card-info">
                    <h3 className="artwork-name">{artwork.name}</h3>
                    <p className="artwork-author">{artwork.author}</p>
                    <div className="artwork-meta">
                      <span>{artwork.year}</span>
                      <span>位置: ({artwork.position.x}, {artwork.position.y}, {artwork.position.z})</span>
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteArtwork(artwork.id)}
                  >
                    删除
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>

      {showRoomForm && (
        <div className="form-modal-overlay" onClick={() => setShowRoomForm(false)}>
          <div className="form-modal" onClick={e => e.stopPropagation()}>
            <h3>创建新房间</h3>
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label>房间名称</label>
                <input
                  type="text"
                  value={roomForm.name}
                  onChange={e => setRoomForm({...roomForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>房间描述</label>
                <textarea
                  value={roomForm.description}
                  onChange={e => setRoomForm({...roomForm, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>墙壁颜色</label>
                <div className="color-input">
                  <input
                    type="color"
                    value={roomForm.wallColor}
                    onChange={e => setRoomForm({...roomForm, wallColor: e.target.value})}
                  />
                  <span>{roomForm.wallColor}</span>
                </div>
              </div>
              <div className="form-group">
                <label>初始视角坐标</label>
                <div className="coord-inputs">
                  <div>
                    <span>X</span>
                    <input
                      type="number"
                      step="0.1"
                      value={roomForm.initialCameraX}
                      onChange={e => setRoomForm({...roomForm, initialCameraX: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <span>Y</span>
                    <input
                      type="number"
                      step="0.1"
                      value={roomForm.initialCameraY}
                      onChange={e => setRoomForm({...roomForm, initialCameraY: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <span>Z</span>
                    <input
                      type="number"
                      step="0.1"
                      value={roomForm.initialCameraZ}
                      onChange={e => setRoomForm({...roomForm, initialCameraZ: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="form-btn secondary"
                  onClick={() => setShowRoomForm(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="form-btn primary"
                  disabled={isLoading}
                >
                  {isLoading ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showArtworkForm && (
        <div className="form-modal-overlay" onClick={() => setShowArtworkForm(false)}>
          <div className="form-modal" onClick={e => e.stopPropagation()}>
            <h3>上传新作品</h3>
            <form onSubmit={handleCreateArtwork}>
              <div className="form-group">
                <label>作品名称</label>
                <input
                  type="text"
                  value={artworkForm.name}
                  onChange={e => setArtworkForm({...artworkForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>作者</label>
                <input
                  type="text"
                  value={artworkForm.author}
                  onChange={e => setArtworkForm({...artworkForm, author: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>创作年份</label>
                <input
                  type="number"
                  value={artworkForm.year}
                  onChange={e => setArtworkForm({...artworkForm, year: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="form-group">
                <label>作品简介</label>
                <textarea
                  value={artworkForm.description}
                  onChange={e => setArtworkForm({...artworkForm, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>glTF 模型文件 (最大50MB)</label>
                <input
                  type="file"
                  accept=".gltf,.glb"
                  onChange={e => setModelFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="form-group">
                <label>位置坐标</label>
                <div className="coord-inputs">
                  <div>
                    <span>X</span>
                    <input
                      type="number"
                      step="0.1"
                      value={artworkForm.positionX}
                      onChange={e => setArtworkForm({...artworkForm, positionX: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <span>Y</span>
                    <input
                      type="number"
                      step="0.1"
                      value={artworkForm.positionY}
                      onChange={e => setArtworkForm({...artworkForm, positionY: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <span>Z</span>
                    <input
                      type="number"
                      step="0.1"
                      value={artworkForm.positionZ}
                      onChange={e => setArtworkForm({...artworkForm, positionZ: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>旋转角度 (弧度)</label>
                <div className="coord-inputs">
                  <div>
                    <span>X</span>
                    <input
                      type="number"
                      step="0.1"
                      value={artworkForm.rotationX}
                      onChange={e => setArtworkForm({...artworkForm, rotationX: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <span>Y</span>
                    <input
                      type="number"
                      step="0.1"
                      value={artworkForm.rotationY}
                      onChange={e => setArtworkForm({...artworkForm, rotationY: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <span>Z</span>
                    <input
                      type="number"
                      step="0.1"
                      value={artworkForm.rotationZ}
                      onChange={e => setArtworkForm({...artworkForm, rotationZ: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>缩放比例</label>
                <input
                  type="number"
                  step="0.1"
                  value={artworkForm.scale}
                  onChange={e => setArtworkForm({...artworkForm, scale: parseFloat(e.target.value) || 1})}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="form-btn secondary"
                  onClick={() => setShowArtworkForm(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="form-btn primary"
                  disabled={isLoading}
                >
                  {isLoading ? '上传中...' : '上传'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
