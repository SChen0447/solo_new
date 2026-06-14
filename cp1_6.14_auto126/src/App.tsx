import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Lobby from './components/Lobby'
import RoomPage from './components/RoomPage'
import { useRoomStore } from './store/roomStore'

type View = 'lobby' | 'room'

function App() {
  const { currentRoom } = useRoomStore()
  const [view, setView] = useState<View>('lobby')

  return (
    <div style={styles.app}>
      <div style={styles.background}>
        <div style={styles.orb1} />
        <div style={styles.orb2} />
        <div style={styles.orb3} />
      </div>
      
      <div style={styles.content}>
        <AnimatePresence mode="wait">
          {currentRoom ? (
            <RoomPage key="room" />
          ) : (
            <Lobby key="lobby" />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
  },
  background: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  orb1: {
    position: 'absolute',
    top: '-20%',
    left: '-10%',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(108, 99, 255, 0.3), transparent 70%)',
    filter: 'blur(60px)',
    animation: 'float 8s ease-in-out infinite',
  },
  orb2: {
    position: 'absolute',
    top: '40%',
    right: '-5%',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0, 210, 211, 0.3), transparent 70%)',
    filter: 'blur(50px)',
    animation: 'float 10s ease-in-out infinite reverse',
  },
  orb3: {
    position: 'absolute',
    bottom: '-15%',
    left: '30%',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255, 107, 107, 0.2), transparent 70%)',
    filter: 'blur(55px)',
    animation: 'float 12s ease-in-out infinite',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
  },
}

export default App
