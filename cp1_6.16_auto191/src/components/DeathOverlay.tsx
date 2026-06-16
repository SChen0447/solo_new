import React, { useEffect, useState } from 'react'

interface DeathOverlayProps {
  isVisible: boolean
  reason: string
  onRestart: () => void
}

const DeathOverlay: React.FC<DeathOverlayProps> = ({ isVisible, reason, onRestart }) => {
  const [show, setShow] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShow(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFadeIn(true)
        })
      })

      const timer = setTimeout(() => {
        onRestart()
      }, 3000)

      return () => clearTimeout(timer)
    } else {
      setFadeIn(false)
      const timer = setTimeout(() => {
        setShow(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onRestart])

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: `rgba(0, 0, 0, ${fadeIn ? 0.8 : 0})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        transition: 'opacity 0.8s ease',
        opacity: fadeIn ? 1 : 0,
      }}
    >
      <h1
        style={{
          color: '#F0F0F0',
          fontSize: '48px',
          marginBottom: '20px',
          textShadow: '0 0 20px rgba(255, 100, 100, 0.8)',
        }}
      >
        💀 你死了
      </h1>
      <p
        style={{
          color: '#E57373',
          fontSize: '24px',
          marginBottom: '40px',
        }}
      >
        死因: {reason}
      </p>
      <p style={{ color: '#888', fontSize: '16px' }}>
        游戏将在 3 秒后重新开始...
      </p>
    </div>
  )
}

export default DeathOverlay
