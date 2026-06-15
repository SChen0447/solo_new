import { useEffect, useRef, useState } from 'react'
import { GameLoop } from './game/GameLoop'
import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } from './game/PhysicsEngine'
import { Player } from './components/Player'
import { HUD } from './components/HUD'
import { useGameStore } from './stores/gameStore'
import { Particle } from './game/GameLoop'

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<GameLoop | null>(null)
  const [scale, setScale] = useState(1)
  const { screenShake } = useGameStore()

  useEffect(() => {
    gameLoopRef.current = new GameLoop()
    gameLoopRef.current.start()

    return () => {
      gameLoopRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth
      const maxWidth = windowWidth < 900 ? windowWidth - 40 : CANVAS_WIDTH
      const minWidth = 400
      const targetWidth = Math.max(minWidth, Math.min(CANVAS_WIDTH, maxWidth))
      setScale(targetWidth / CANVAS_WIDTH)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !gameLoopRef.current) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const render = () => {
      const gameLoop = gameLoopRef.current!
      const levelObjects = gameLoop.getPhysicsEngine().getLevelObjects()
      const particles = gameLoop.getParticles()

      const shakeX = screenShake.duration > 0
        ? Math.sin((1 - screenShake.duration / 0.15) * Math.PI * 6) * screenShake.x
        : 0
      const shakeY = screenShake.duration > 0
        ? Math.sin((1 - screenShake.duration / 0.15) * Math.PI * 2) * screenShake.y
        : 0

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      ctx.save()
      ctx.translate(shakeX, shakeY)

      drawGround(ctx)
      drawMovingPlatforms(ctx, levelObjects.getMovingPlatforms())
      drawSpikes(ctx, levelObjects.getSpikes())
      drawDestructibleBricks(ctx, levelObjects.getDestructibleBricks())
      drawGems(ctx, levelObjects.getGems(), levelObjects)
      drawBrickDebris(ctx, levelObjects.getBrickDebris())
      drawParticles(ctx, particles)

      ctx.restore()

      animationId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [screenShake])

  const drawGround = (ctx: CanvasRenderingContext2D) => {
    const stripeWidth = 20
    for (let x = 0; x < CANVAS_WIDTH; x += stripeWidth * 2) {
      ctx.fillStyle = '#d3d3d3'
      ctx.fillRect(x, GROUND_Y - 35, stripeWidth, 70)
      ctx.fillStyle = '#a0a0a0'
      ctx.fillRect(x + stripeWidth, GROUND_Y - 35, stripeWidth, 70)
    }
  }

  const drawMovingPlatforms = (ctx: CanvasRenderingContext2D, platforms: any[]) => {
    platforms.forEach((platform) => {
      const x = platform.body.position.x - platform.width / 2
      const y = platform.body.position.y - platform.height / 2

      ctx.fillStyle = '#a9a9a9'
      ctx.fillRect(x, y, platform.width, platform.height)

      ctx.strokeStyle = '#696969'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, platform.width, platform.height)

      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.moveTo(x + 10, y + platform.height / 2)
      ctx.lineTo(x + 25, y + 8)
      ctx.lineTo(x + 25, y + platform.height - 8)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(x + platform.width - 10, y + platform.height / 2)
      ctx.lineTo(x + platform.width - 25, y + 8)
      ctx.lineTo(x + platform.width - 25, y + platform.height - 8)
      ctx.closePath()
      ctx.fill()
    })
  }

  const drawSpikes = (ctx: CanvasRenderingContext2D, spikes: any[]) => {
    spikes.forEach((spike) => {
      const x = spike.body.position.x - spike.width / 2
      const y = spike.body.position.y - spike.height / 2

      ctx.fillStyle = '#ff0000'
      ctx.beginPath()
      ctx.moveTo(x + spike.width / 2, y)
      ctx.lineTo(x + spike.width, y + spike.height)
      ctx.lineTo(x, y + spike.height)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + spike.width / 2, y + 2)
      ctx.lineTo(x + spike.width / 2, y + 8)
      ctx.stroke()
    })
  }

  const drawDestructibleBricks = (ctx: CanvasRenderingContext2D, bricks: any[]) => {
    bricks.forEach((brick) => {
      const x = brick.body.position.x - brick.width / 2
      const y = brick.body.position.y - brick.height / 2

      ctx.fillStyle = '#8b4513'
      ctx.fillRect(x, y, brick.width, brick.height)

      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, brick.width, brick.height)

      ctx.beginPath()
      ctx.moveTo(x + brick.width / 2, y)
      ctx.lineTo(x + brick.width / 2, y + brick.height)
      ctx.moveTo(x, y + brick.height / 2)
      ctx.lineTo(x + brick.width, y + brick.height / 2)
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${brick.maxHits - brick.hits}`, brick.body.position.x, brick.body.position.y + 4)
    })
  }

  const drawGems = (ctx: CanvasRenderingContext2D, gems: any[], levelObjects: any) => {
    gems.forEach((gem) => {
      const color = levelObjects.getGemColor(gem)
      const scale = gem.scale

      ctx.save()
      ctx.translate(gem.x, gem.y)
      ctx.scale(scale, scale)

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, 0, gem.radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.beginPath()
      ctx.arc(-gem.radius / 3, -gem.radius / 3, gem.radius / 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(0, 0, gem.radius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.restore()
    })
  }

  const drawBrickDebris = (ctx: CanvasRenderingContext2D, debris: any[]) => {
    debris.forEach((d) => {
      const alpha = d.lifetime / d.maxLifetime
      const size = d.size * alpha

      ctx.save()
      ctx.translate(d.x, d.y)
      ctx.rotate(d.rotation)
      ctx.globalAlpha = alpha

      ctx.fillStyle = d.color
      ctx.fillRect(-size / 2, -size / 2, size, size)

      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.strokeRect(-size / 2, -size / 2, size, size)

      ctx.restore()
    })
  }

  const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    particles.forEach((p) => {
      const alpha = p.lifetime / p.maxLifetime

      ctx.fillStyle = p.color
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    })
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          position: 'relative',
          width: CANVAS_WIDTH * scale,
          height: CANVAS_HEIGHT * scale,
          border: '2px solid #ffffff',
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              display: 'block',
            }}
          />
          <Player />
          <HUD />
        </div>
      </div>
    </div>
  )
}

export default App
