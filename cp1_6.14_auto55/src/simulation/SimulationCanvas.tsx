import React, { useRef, useEffect, useCallback } from 'react'
import {
  useGameStore,
  LEVEL_WIDTH,
  LEVEL_HEIGHT,
  LevelElement
} from '../store/gameStore'

const GRAVITY = 0.6
const MOVE_SPEED = 3.5
const JUMP_FORCE = 13
const CHAR_RADIUS = 14
const CHAR_FOOT_WIDTH = 10
const CHAR_FOOT_HEIGHT = 8
const START_X = 40
const GROUND_Y = LEVEL_HEIGHT - CHAR_RADIUS - CHAR_FOOT_HEIGHT - 20

interface CharacterState {
  x: number
  y: number
  vx: number
  vy: number
  onGround: boolean
  isCelebrating: boolean
  celebrateJumpsLeft: number
  celebrateGlowPhase: number
  dead: boolean
}

const SimulationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const charRef = useRef<CharacterState>({
    x: START_X,
    y: GROUND_Y,
    vx: MOVE_SPEED,
    vy: 0,
    onGround: true,
    isCelebrating: false,
    celebrateJumpsLeft: 0,
    celebrateGlowPhase: 0,
    dead: false
  })
  const jumpCooldownRef = useRef(0)
  const scaleRef = useRef(1)
  const lastTimeRef = useRef(0)

  const {
    elements,
    isSimulationRunning,
    isSimulationPaused,
    simulationResetKey,
    stopSimulation,
    addNotification
  } = useGameStore()

  const resetCharacter = useCallback(() => {
    charRef.current = {
      x: START_X,
      y: GROUND_Y,
      vx: MOVE_SPEED,
      vy: 0,
      onGround: true,
      isCelebrating: false,
      celebrateJumpsLeft: 0,
      celebrateGlowPhase: 0,
      dead: false
    }
    jumpCooldownRef.current = 0
  }, [])

  useEffect(() => {
    resetCharacter()
  }, [simulationResetKey, resetCharacter])

  const getScale = useCallback(() => {
    const container = containerRef.current
    if (!container) return 1
    const maxW = container.clientWidth - 24
    const maxH = container.clientHeight - 120
    const scaleX = maxW / LEVEL_WIDTH
    const scaleY = maxH / LEVEL_HEIGHT
    return Math.min(scaleX, scaleY, 1)
  }, [])

  const rectsIntersect = (
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number
  ) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by

  const checkPlatformCollision = useCallback(
    (
      oldX: number,
      oldY: number,
      newX: number,
      newY: number,
      char: CharacterState
    ): { x: number; y: number; vy: number; onGround: boolean } => {
      const charW = CHAR_RADIUS * 2
      const charH = CHAR_RADIUS * 2 + CHAR_FOOT_HEIGHT
      const charLeft = newX - CHAR_RADIUS
      const charRight = newX + CHAR_RADIUS
      const charTop = newY - CHAR_RADIUS
      const charBottom = newY + CHAR_RADIUS + CHAR_FOOT_HEIGHT

      let finalX = newX
      let finalY = newY
      let finalVy = char.vy
      let onGround = false

      const bottom = LEVEL_HEIGHT - 20
      if (charBottom >= bottom) {
        finalY = bottom - CHAR_RADIUS - CHAR_FOOT_HEIGHT
        finalVy = 0
        onGround = true
      }

      for (const el of elements) {
        if (el.type !== 'platform') continue

        const elLeft = el.x
        const elRight = el.x + el.width
        const elTop = el.y
        const elBottom = el.y + el.height

        const wasAbove = oldY + CHAR_RADIUS + CHAR_FOOT_HEIGHT <= elTop + 2
        const isNowBelow = finalY + CHAR_RADIUS + CHAR_FOOT_HEIGHT >= elTop
        const horizontalOverlap = charRight > elLeft && charLeft < elRight

        if (wasAbove && isNowBelow && horizontalOverlap && finalVy >= 0) {
          finalY = elTop - CHAR_RADIUS - CHAR_FOOT_HEIGHT
          finalVy = 0
          onGround = true
          continue
        }

        if (
          rectsIntersect(
            charLeft,
            charTop,
            charW,
            charH,
            elLeft,
            elTop,
            el.width,
            el.height
          )
        ) {
          const oldBottom = oldY + CHAR_RADIUS + CHAR_FOOT_HEIGHT
          const oldTop = oldY - CHAR_RADIUS
          const oldLeft = oldX - CHAR_RADIUS
          const oldRight = oldX + CHAR_RADIUS

          const overlapTop = Math.abs(charBottom - elTop)
          const overlapBottom = Math.abs(elBottom - charTop)
          const overlapLeft = Math.abs(charRight - elLeft)
          const overlapRight = Math.abs(elRight - charLeft)

          const minOverlap = Math.min(
            overlapTop,
            overlapBottom,
            overlapLeft,
            overlapRight
          )

          if (minOverlap === overlapTop && oldBottom <= elTop + 1 && finalVy >= 0) {
            finalY = elTop - CHAR_RADIUS - CHAR_FOOT_HEIGHT
            finalVy = 0
            onGround = true
          } else if (minOverlap === overlapBottom && oldTop >= elBottom - 1 && finalVy < 0) {
            finalY = elBottom + CHAR_RADIUS
            finalVy = 0.5
          } else if (minOverlap === overlapLeft && oldRight <= elLeft + 1) {
            finalX = elLeft - CHAR_RADIUS
          } else if (minOverlap === overlapRight && oldLeft >= elRight - 1) {
            finalX = elRight + CHAR_RADIUS
          }
        }
      }

      if (finalX < CHAR_RADIUS) finalX = CHAR_RADIUS
      if (finalX > LEVEL_WIDTH - CHAR_RADIUS) {
        finalX = LEVEL_WIDTH - CHAR_RADIUS
      }

      return { x: finalX, y: finalY, vy: finalVy, onGround }
    },
    [elements]
  )

  const checkTrapCollision = useCallback(
    (x: number, y: number): boolean => {
      const charLeft = x - CHAR_RADIUS * 0.7
      const charRight = x + CHAR_RADIUS * 0.7
      const charTop = y - CHAR_RADIUS * 0.7
      const charBottom = y + CHAR_RADIUS + CHAR_FOOT_HEIGHT * 0.8

      for (const el of elements) {
        if (el.type !== 'trap') continue
        const trapBottom = el.y + el.height
        const triggerTop = el.y + el.height * 0.3
        if (
          charRight > el.x + 3 &&
          charLeft < el.x + el.width - 3 &&
          charBottom > triggerTop &&
          charTop < trapBottom
        ) {
          return true
        }
      }
      return false
    },
    [elements]
  )

  const checkFlagCollision = useCallback(
    (x: number, y: number): boolean => {
      for (const el of elements) {
        if (el.type !== 'flag') continue
        const cx = x
        const cy = y
        if (
          cx > el.x - 5 &&
          cx < el.x + el.width + 5 &&
          cy > el.y - CHAR_RADIUS &&
          cy < el.y + el.height
        ) {
          return true
        }
      }
      return false
    },
    [elements]
  )

  const shouldJump = useCallback(
    (char: CharacterState): boolean => {
      if (!char.onGround || jumpCooldownRef.current > 0) return false

      const lookAheadX = char.x + CHAR_RADIUS + 30
      const lookAheadY = char.y + CHAR_RADIUS + CHAR_FOOT_HEIGHT + 5

      let hasGroundAhead = false
      for (const el of elements) {
        if (el.type !== 'platform') continue
        if (
          lookAheadX >= el.x &&
          lookAheadX <= el.x + el.width &&
          lookAheadY >= el.y - 8 &&
          lookAheadY <= el.y + 15
        ) {
          hasGroundAhead = true
          break
        }
      }
      if (
        lookAheadY >= LEVEL_HEIGHT - 25 &&
        lookAheadY <= LEVEL_HEIGHT - 15
      ) {
        hasGroundAhead = true
      }

      let wallAhead = false
      for (const el of elements) {
        if (el.type !== 'platform') continue
        const feetY = char.y + CHAR_RADIUS + CHAR_FOOT_HEIGHT - 5
        const topY = char.y - CHAR_RADIUS + 5
        if (
          lookAheadX > el.x &&
          lookAheadX < el.x + el.width + 5 &&
          feetY > el.y &&
          topY < el.y + el.height
        ) {
          wallAhead = true
          break
        }
      }

      if (!hasGroundAhead || wallAhead) {
        jumpCooldownRef.current = 15
        return true
      }

      for (const el of elements) {
        if (el.type !== 'trap') continue
        const feetX = char.x + CHAR_RADIUS + 20
        const feetY = char.y + CHAR_RADIUS + CHAR_FOOT_HEIGHT
        if (
          feetX >= el.x - 5 &&
          feetX <= el.x + el.width + 5 &&
          feetY >= el.y - 15
        ) {
          jumpCooldownRef.current = 15
          return true
        }
      }

      const flag = elements.find((e) => e.type === 'flag')
      if (flag) {
        const distToFlag = flag.x - char.x
        if (distToFlag > 0 && distToFlag < 250 && char.onGround) {
          if (Math.random() < 0.02) {
            jumpCooldownRef.current = 12
            return true
          }
        }
      }

      return false
    },
    [elements]
  )

  const drawLevel = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, LEVEL_HEIGHT)
      gradient.addColorStop(0, '#1A252F')
      gradient.addColorStop(1, '#2C3E50')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT)

      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      for (let gx = 0; gx <= LEVEL_WIDTH; gx += 40) {
        ctx.beginPath()
        ctx.moveTo(gx, 0)
        ctx.lineTo(gx, LEVEL_HEIGHT)
        ctx.stroke()
      }
      for (let gy = 0; gy <= LEVEL_HEIGHT; gy += 40) {
        ctx.beginPath()
        ctx.moveTo(0, gy)
        ctx.lineTo(LEVEL_WIDTH, gy)
        ctx.stroke()
      }

      ctx.fillStyle = '#34495E'
      ctx.fillRect(0, LEVEL_HEIGHT - 20, LEVEL_WIDTH, 20)
      ctx.fillStyle = '#2C3E50'
      ctx.fillRect(0, LEVEL_HEIGHT - 4, LEVEL_WIDTH, 4)

      elements.forEach((el: LevelElement) => {
        if (el.type === 'platform') {
          ctx.fillStyle = '#27AE60'
          ctx.strokeStyle = '#219653'
          ctx.lineWidth = 2
          ctx.beginPath()
          const r = 4
          ctx.moveTo(el.x + r, el.y)
          ctx.lineTo(el.x + el.width - r, el.y)
          ctx.quadraticCurveTo(el.x + el.width, el.y, el.x + el.width, el.y + r)
          ctx.lineTo(el.x + el.width, el.y + el.height - r)
          ctx.quadraticCurveTo(
            el.x + el.width,
            el.y + el.height,
            el.x + el.width - r,
            el.y + el.height
          )
          ctx.lineTo(el.x + r, el.y + el.height)
          ctx.quadraticCurveTo(el.x, el.y + el.height, el.x, el.y + el.height - r)
          ctx.lineTo(el.x, el.y + r)
          ctx.quadraticCurveTo(el.x, el.y, el.x + r, el.y)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = 'rgba(46, 204, 113, 0.3)'
          ctx.fillRect(el.x + 4, el.y + 2, el.width - 8, 3)
        } else if (el.type === 'trap') {
          const spikeCount = Math.max(2, Math.floor(el.width / 15))
          const spikeW = el.width / spikeCount
          for (let i = 0; i < spikeCount; i++) {
            ctx.beginPath()
            ctx.moveTo(el.x + i * spikeW, el.y + el.height)
            ctx.lineTo(el.x + i * spikeW + spikeW / 2, el.y)
            ctx.lineTo(el.x + (i + 1) * spikeW, el.y + el.height)
            ctx.closePath()
            const g = ctx.createLinearGradient(
              el.x + i * spikeW,
              el.y,
              el.x + i * spikeW,
              el.y + el.height
            )
            g.addColorStop(0, '#FF6B6B')
            g.addColorStop(1, '#C0392B')
            ctx.fillStyle = g
            ctx.fill()
            ctx.strokeStyle = '#922B21'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        } else if (el.type === 'flag') {
          ctx.fillStyle = '#7F8C8D'
          ctx.fillRect(el.x + 4, el.y, 4, el.height)

          ctx.beginPath()
          ctx.moveTo(el.x + 8, el.y + 2)
          ctx.lineTo(el.x + el.width, el.y + el.height * 0.3)
          ctx.lineTo(el.x + 8, el.y + el.height * 0.6)
          ctx.closePath()
          const fg = ctx.createLinearGradient(
            el.x + 8,
            el.y,
            el.x + el.width,
            el.y + el.height * 0.6
          )
          fg.addColorStop(0, '#F1C40F')
          fg.addColorStop(1, '#F39C12')
          ctx.fillStyle = fg
          ctx.fill()
          ctx.strokeStyle = '#D4AC0D'
          ctx.lineWidth = 1.5
          ctx.stroke()

          ctx.fillStyle = '#BDC3C7'
          ctx.fillRect(el.x, el.y + el.height - 6, el.width, 6)
        }
      })

      ctx.fillStyle = 'rgba(52, 152, 219, 0.7)'
      ctx.beginPath()
      ctx.moveTo(20, LEVEL_HEIGHT - 50)
      ctx.lineTo(40, LEVEL_HEIGHT - 40)
      ctx.lineTo(20, LEVEL_HEIGHT - 30)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(52, 152, 219, 0.9)'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('起点', 12, LEVEL_HEIGHT - 55)
    },
    [elements]
  )

  const drawCharacter = useCallback(
    (ctx: CanvasRenderingContext2D, char: CharacterState, time: number) => {
      const cx = char.x
      const cy = char.y

      let glowAlpha = 0
      if (char.isCelebrating) {
        glowAlpha = 0.35 + 0.25 * Math.sin(char.celebrateGlowPhase)
      }

      if (glowAlpha > 0) {
        const glowRadius = CHAR_RADIUS + 16 + 6 * Math.sin(char.celebrateGlowPhase * 2)
        const gradient = ctx.createRadialGradient(
          cx,
          cy,
          CHAR_RADIUS,
          cx,
          cy,
          glowRadius
        )
        gradient.addColorStop(0, `rgba(241, 196, 15, ${glowAlpha})`)
        gradient.addColorStop(1, 'rgba(241, 196, 15, 0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      const bobOffset = char.onGround && !char.isCelebrating
        ? Math.sin(time * 0.02) * 0.8
        : 0
      const bodyY = cy + bobOffset

      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath()
      ctx.ellipse(
        cx,
        cy + CHAR_RADIUS + CHAR_FOOT_HEIGHT + 2,
        CHAR_RADIUS * 0.8,
        3,
        0,
        0,
        Math.PI * 2
      )
      ctx.fill()

      ctx.fillStyle = '#34495E'
      const footY = bodyY + CHAR_RADIUS
      const legAnim = char.onGround
        ? Math.sin(time * 0.04) * 4
        : char.vy < 0
        ? -3
        : 2
      ctx.fillRect(
        cx - CHAR_FOOT_WIDTH - 1,
        footY + legAnim * 0.5,
        CHAR_FOOT_WIDTH,
        CHAR_FOOT_HEIGHT
      )
      ctx.fillStyle = '#2C3E50'
      ctx.fillRect(
        cx - CHAR_FOOT_WIDTH - 1,
        footY + CHAR_FOOT_HEIGHT - 3 + legAnim * 0.5,
        CHAR_FOOT_WIDTH,
        3
      )

      const bodyGrad = ctx.createRadialGradient(
        cx - 3,
        bodyY - 3,
        2,
        cx,
        bodyY,
        CHAR_RADIUS
      )
      bodyGrad.addColorStop(0, '#5DADE2')
      bodyGrad.addColorStop(1, '#2980B9')
      ctx.fillStyle = bodyGrad
      ctx.beginPath()
      ctx.arc(cx, bodyY, CHAR_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#1A5276'
      ctx.lineWidth = 2
      ctx.stroke()

      const eyeOffsetX = 4
      const eyeOffsetY = -2
      ctx.fillStyle = 'white'
      ctx.beginPath()
      ctx.arc(cx - 4 + eyeOffsetX * 0.3, bodyY + eyeOffsetY, 4, 0, Math.PI * 2)
      ctx.arc(cx + 4 + eyeOffsetX * 0.3, bodyY + eyeOffsetY, 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#1C2833'
      const pupilX = char.isCelebrating ? 0 : 0.5
      ctx.beginPath()
      ctx.arc(
        cx - 4 + eyeOffsetX * 0.3 + pupilX,
        bodyY + eyeOffsetY,
        2,
        0,
        Math.PI * 2
      )
      ctx.arc(
        cx + 4 + eyeOffsetX * 0.3 + pupilX,
        bodyY + eyeOffsetY,
        2,
        0,
        Math.PI * 2
      )
      ctx.fill()

      ctx.strokeStyle = '#1C2833'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      if (char.isCelebrating) {
        ctx.arc(cx, bodyY + 3, 5, 0, Math.PI)
      } else if (!char.onGround && char.vy < 0) {
        ctx.arc(cx, bodyY + 4, 3, 0.15 * Math.PI, 0.85 * Math.PI)
      } else {
        ctx.moveTo(cx - 4, bodyY + 5)
        ctx.lineTo(cx + 4, bodyY + 5)
      }
      ctx.stroke()
    },
    []
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const updateScale = () => {
      const scale = getScale()
      scaleRef.current = scale
      const dpr = window.devicePixelRatio || 1
      canvas.width = LEVEL_WIDTH * dpr * scale
      canvas.height = LEVEL_HEIGHT * dpr * scale
      canvas.style.width = `${LEVEL_WIDTH * scale}px`
      canvas.style.height = `${LEVEL_HEIGHT * scale}px`
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
    }
    updateScale()

    window.addEventListener('resize', updateScale)

    const loop = (timestamp: number) => {
      const char = charRef.current
      const dt = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      if (isSimulationRunning && !isSimulationPaused) {
        if (jumpCooldownRef.current > 0) jumpCooldownRef.current--

        if (char.isCelebrating) {
          char.celebrateGlowPhase += 0.15
          if (char.onGround && char.celebrateJumpsLeft > 0) {
            if (jumpCooldownRef.current <= 0) {
              char.vy = -JUMP_FORCE * 0.7
              char.onGround = false
              char.celebrateJumpsLeft--
              jumpCooldownRef.current = 20
            }
          }
          if (!char.onGround) {
            char.vy += GRAVITY
            const oldY = char.y
            char.y += char.vy
            const result = checkPlatformCollision(
              char.x,
              oldY,
              char.x,
              char.y,
              char
            )
            char.y = result.y
            char.vy = result.vy
            char.onGround = result.onGround
          }
          if (char.celebrateJumpsLeft === 0 && char.onGround && jumpCooldownRef.current === 0) {
            stopSimulation()
          }
        } else {
          if (shouldJump(char)) {
            char.vy = -JUMP_FORCE
            char.onGround = false
          }

          const oldX = char.x
          const oldY = char.y

          if (!char.onGround) {
            char.vy += GRAVITY
            if (char.vy > 18) char.vy = 18
          }

          char.x += char.vx
          char.y += char.vy

          const result = checkPlatformCollision(oldX, oldY, char.x, char.y, char)
          char.x = result.x
          char.y = result.y
          char.vy = result.vy
          char.onGround = result.onGround

          if (checkTrapCollision(char.x, char.y) && !char.dead) {
            char.dead = true
            addNotification({
              type: 'error',
              message: '角色遇到陷阱，正在重置...',
              dismissible: false
            })
            setTimeout(() => {
              resetCharacter()
            }, 600)
          }

          if (checkFlagCollision(char.x, char.y) && !char.dead) {
            char.isCelebrating = true
            char.celebrateJumpsLeft = 3
            char.celebrateGlowPhase = 0
            char.vx = 0
            jumpCooldownRef.current = 10
            addNotification({
              type: 'success',
              message: '🎉 到达终点！',
              dismissible: false
            })
          }

          if (char.x >= LEVEL_WIDTH - CHAR_RADIUS && !char.dead) {
            stopSimulation()
            addNotification({
              type: 'error',
              message: '角色走出了地图边界',
              dismissible: true
            })
          }

          if (char.y > LEVEL_HEIGHT + 100 && !char.dead) {
            char.dead = true
            addNotification({
              type: 'error',
              message: '角色掉出地图，正在重置...',
              dismissible: false
            })
            setTimeout(() => {
              resetCharacter()
            }, 600)
          }
        }
      }

      ctx.clearRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT)
      drawLevel(ctx)
      if (!char.dead) {
        drawCharacter(ctx, char, timestamp)
      } else {
        ctx.save()
        ctx.globalAlpha = 0.4
        drawCharacter(ctx, char, timestamp)
        ctx.restore()
        ctx.fillStyle = '#E74C3C'
        ctx.font = 'bold 16px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('💥', char.x, char.y - 25)
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', updateScale)
    }
  }, [
    isSimulationRunning,
    isSimulationPaused,
    elements,
    checkPlatformCollision,
    checkTrapCollision,
    checkFlagCollision,
    shouldJump,
    drawLevel,
    drawCharacter,
    resetCharacter,
    stopSimulation,
    addNotification,
    getScale
  ])

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#34495E',
          borderBottom: '1px solid #2C3E50',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}
      >
        <span
          style={{
            color: '#E67E22',
            fontWeight: 700,
            fontSize: 14
          }}
        >
          🎯 角色模拟
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            backgroundColor: isSimulationRunning
              ? isSimulationPaused
                ? 'rgba(241, 196, 15, 0.2)'
                : 'rgba(39, 174, 96, 0.2)'
              : 'rgba(149, 165, 166, 0.2)',
            borderRadius: 6,
            fontSize: 12,
            color: isSimulationRunning
              ? isSimulationPaused
                ? '#F1C40F'
                : '#27AE60'
              : '#95A5A6',
            fontWeight: 600
          }}
        >
          {isSimulationRunning
            ? isSimulationPaused
              ? '⏸ 已暂停'
              : '▶ 运行中'
            : '⏹ 就绪'}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#7F8C8D', fontSize: 11 }}>
          缩放: {Math.round(scaleRef.current * 100)}%
        </span>
      </div>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F181F',
          padding: 12
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            imageRendering: 'auto'
          }}
        />
      </div>
    </div>
  )
}

export default SimulationCanvas
