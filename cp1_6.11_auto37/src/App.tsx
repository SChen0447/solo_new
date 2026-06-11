import { useState, useEffect, useCallback } from 'react'
import Canvas from './Canvas'
import Toolbar from './Toolbar'
import type { ToolType, User, Shape } from './types'
import { v4 as uuidv4 } from 'uuid'

const COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
  '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe',
  '#00b894', '#e17055', '#74b9ff', '#55efc4',
]

function generateRandomName(): string {
  const adjectives = ['快乐的', '聪明的', '勇敢的', '可爱的', '神奇的', '闪亮的', '温柔的', '活泼的']
  const nouns = ['小猫', '小狗', '兔子', '熊猫', '企鹅', '海豚', '松鼠', '猫头鹰']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}${noun}${num}`
}

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

export default function App() {
  const [userId] = useState(() => uuidv4())
  const [userName, setUserName] = useState(() => generateRandomName())
  const [userColor] = useState(() => randomColor())
  const [roomId, setRoomId] = useState('')
  const [roomInput, setRoomInput] = useState('')
  const [inRoom, setInRoom] = useState(false)
  const [tool, setTool] = useState<ToolType>('pen')
  const [color, setColor] = useState('#ff6b6b')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [users, setUsers] = useState<Record<string, User>>({})
  const [shapes, setShapes] = useState<Shape[]>([])

  const createRoom = useCallback(async () => {
    try {
      const res = await fetch('/api/room/create')
      const data = await res.json()
      setRoomId(data.roomId)
      setInRoom(true)
    } catch (e) {
      console.error('Failed to create room:', e)
    }
  }, [])

  const joinRoom = useCallback(() => {
    if (roomInput.trim().length >= 4) {
      setRoomId(roomInput.trim().toUpperCase())
      setInRoom(true)
    }
  }, [roomInput])

  const leaveRoom = useCallback(() => {
    setInRoom(false)
    setRoomId('')
    setShapes([])
    setUsers({})
  }, [])

  useEffect(() => {
    setUsers((prev) => {
      if (inRoom && roomId) {
        const next = { ...prev }
        next[userId] = { id: userId, name: userName, color: userColor, joinedAt: Date.now() }
        return next
      }
      return prev
    })
  }, [inRoom, roomId, userId, userName, userColor])

  return (
    <div style={styles.app}>
      {!inRoom ? (
        <div style={styles.welcomeOverlay}>
          <div style={styles.welcomeCard}>
            <h1 style={styles.welcomeTitle}>协作白板</h1>
            <p style={styles.welcomeSubtitle}>多人实时在线协作绘图</p>
            <div style={styles.welcomeActions}>
              <button style={styles.primaryBtn} onClick={createRoom}>
                创建房间
              </button>
              <div style={styles.joinRow}>
                <input
                  style={styles.roomInput}
                  placeholder="输入房间号"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') joinRoom()
                  }}
                />
                <button style={styles.secondaryBtn} onClick={joinRoom}>
                  加入
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={styles.topBar}>
            <div style={styles.leftTop}>
              <div style={{ ...styles.userDot, backgroundColor: userColor }} />
              <input
                style={styles.nameInput}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                maxLength={20}
              />
              <div style={styles.roomBadge}>
                房间号: <span style={styles.roomIdText}>{roomId}</span>
                <button style={styles.copyBtn} onClick={() => navigator.clipboard.writeText(roomId)}>
                  复制
                </button>
              </div>
            </div>
            <Toolbar
              tool={tool}
              setTool={setTool}
              color={color}
              setColor={setColor}
              strokeWidth={strokeWidth}
              setStrokeWidth={setStrokeWidth}
            />
            <div style={styles.rightTop}>
              <button style={styles.exportBtn} id="export-btn">
                导出PNG
              </button>
              <button style={styles.leaveBtn} onClick={leaveRoom}>
                离开
              </button>
            </div>
          </div>

          <div style={styles.mainArea}>
            <Canvas
              roomId={roomId}
              userId={userId}
              userName={userName}
              userColor={userColor}
              tool={tool}
              color={color}
              strokeWidth={strokeWidth}
              onUsersChange={setUsers}
              onShapesChange={setShapes}
            />

            <div style={styles.sidebar}>
              <h3 style={styles.sidebarTitle}>
                在线用户 ({Object.keys(users).length})
              </h3>
              <div style={styles.userList}>
                {Object.values(users).map((user) => (
                  <div key={user.id} style={styles.userItem} className="user-item">
                    <span style={{ ...styles.userListDot, backgroundColor: user.color }} />
                    <span style={styles.userListName}>{user.name}</span>
                    {user.id === userId && (
                      <span style={styles.selfTag}> (我)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        .user-item {
          animation: fadeInSlide 0.3s ease-out;
        }
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeOutSlide {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-10px);
          }
        }
        .loading-spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  welcomeOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  welcomeCard: {
    backgroundColor: '#16213e',
    padding: '48px 56px',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    textAlign: 'center',
    minWidth: '380px',
  },
  welcomeTitle: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#e2e8f0',
  },
  welcomeSubtitle: {
    fontSize: '14px',
    color: '#8892b0',
    marginBottom: '32px',
  },
  welcomeActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  primaryBtn: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#00b4d8',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#e2e8f0',
    backgroundColor: '#0f3460',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  joinRow: {
    display: 'flex',
    gap: '8px',
  },
  roomInput: {
    flex: 1,
    padding: '10px 14px',
    fontSize: '14px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a4e',
    borderRadius: '8px',
    color: '#e2e8f0',
    outline: 'none',
    letterSpacing: '2px',
    textTransform: 'uppercase',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid #2a2a4e',
    gap: '16px',
    flexShrink: 0,
  },
  leftTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: '300px',
  },
  userDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 0 8px currentColor',
  },
  nameInput: {
    padding: '6px 10px',
    fontSize: '13px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a4e',
    borderRadius: '6px',
    color: '#e2e8f0',
    outline: 'none',
    width: '120px',
  },
  roomBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#8892b0',
  },
  roomIdText: {
    color: '#00b4d8',
    fontWeight: 600,
    letterSpacing: '1px',
  },
  copyBtn: {
    padding: '4px 8px',
    fontSize: '11px',
    backgroundColor: '#0f3460',
    border: 'none',
    borderRadius: '4px',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  rightTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '200px',
    justifyContent: 'flex-end',
  },
  exportBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#00b4d8',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  leaveBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    backgroundColor: 'transparent',
    border: '1px solid #2a2a4e',
    borderRadius: '8px',
    color: '#8892b0',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    position: 'relative',
    overflow: 'hidden',
  },
  sidebar: {
    width: '220px',
    backgroundColor: '#16213e',
    borderLeft: '1px solid #2a2a4e',
    padding: '16px 12px',
    flexShrink: 0,
    overflowY: 'auto',
  },
  sidebarTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#8892b0',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: '#1a1a2e',
    transition: 'background-color 0.2s',
  },
  userListDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  userListName: {
    fontSize: '13px',
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  selfTag: {
    fontSize: '11px',
    color: '#00b4d8',
  },
}
