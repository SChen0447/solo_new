import { useEffect, useRef, useState } from 'react'
import {
  useHeroes,
  useCurrentPlayer,
  useSelectedHeroId,
  useMoveableCells,
  useAttackableTargets,
  useUIState,
  useGameActions,
  usePhase,
  useGameStatus,
  useWinner,
  useTurnNumber
} from '../store/gameStore'
import { GRID_WIDTH, GRID_HEIGHT } from '../gameEngine/gameCore'
import type { Hero, Skill } from '../gameEngine/heroData'
import { eventBus } from '../gameEngine/eventBus'

const CELL_SIZE = 64
const PLAYER_COLORS = {
  1: { primary: '#00ff88', secondary: '#00cc6a', glow: 'rgba(0, 255, 136, 0.5)' },
  2: { primary: '#ff4444', secondary: '#cc3333', glow: 'rgba(255, 68, 68, 0.5)' }
}

interface GameBoardProps {
  selectedSkill: Skill | null
  onSkillTargetSelect: (targetId: string) => void
  onSkillCancel: () => void
}

const GameBoard = ({ selectedSkill, onSkillTargetSelect, onSkillCancel }: GameBoardProps) => {
  const heroes = useHeroes()
  const currentPlayer = useCurrentPlayer()
  const selectedHeroId = useSelectedHeroId()
  const moveableCells = useMoveableCells()
  const attackableTargets = useAttackableTargets()
  const uiState = useUIState()
  const actions = useGameActions()
  const phase = usePhase()
  const gameStatus = useGameStatus()
  const winner = useWinner()
  const turnNumber = useTurnNumber()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const [particles, setParticles] = useState<Array<{
    id: string
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    color: string
    size: number
  }>>([])
  const [animatingHeroes, setAnimatingHeroes] = useState<Set<string>>(new Set())
  const [attackAnimations, setAttackAnimations] = useState<Array<{
    id: string
    fromX: number
    fromY: number
    toX: number
    toY: number
    progress: number
    type: string
  }>>([])

  useEffect(() => {
    const handleHeroMove = () => {}

    const handleHeroAttack = (event: { data: { attacker: Hero; defender: Hero; damage: number } }) => {
      const { attacker, defender, damage } = event.data
      const fromX = attacker.position.x * CELL_SIZE + CELL_SIZE / 2
      const fromY = attacker.position.y * CELL_SIZE + CELL_SIZE / 2
      const toX = defender.position.x * CELL_SIZE + CELL_SIZE / 2
      const toY = defender.position.y * CELL_SIZE + CELL_SIZE / 2

      setAttackAnimations(prev => [...prev, {
        id: `attack-${Date.now()}`,
        fromX, fromY, toX, toY,
        progress: 0,
        type: 'attack'
      }])

      createHitParticles(toX, toY, '#ff4444')
      actions.addDamageNumber(defender.position.x, defender.position.y, damage, false)
      actions.setScreenShake(true, 8)
      setTimeout(() => actions.setScreenShake(false), 200)
    }

    const handleSkillCast = (event: { data: { caster: Hero; target: Hero; effect: { type: string } } }) => {
      const { caster, target, effect } = event.data
      const fromX = caster.position.x * CELL_SIZE + CELL_SIZE / 2
      const fromY = caster.position.y * CELL_SIZE + CELL_SIZE / 2
      const toX = target.position.x * CELL_SIZE + CELL_SIZE / 2
      const toY = target.position.y * CELL_SIZE + CELL_SIZE / 2

      const skillColor = effect.type === 'burn' ? '#ff6600' : effect.type === 'shield' ? '#00aaff' : '#00ff88'

      setAttackAnimations(prev => [...prev, {
        id: `skill-${Date.now()}`,
        fromX, fromY, toX, toY,
        progress: 0,
        type: effect.type
      }])

      actions.showSkillEffect(effect.type, caster, target)
      createHitParticles(toX, toY, skillColor, 30)
      setTimeout(() => actions.hideSkillEffect(), 800)
    }

    const handleHeroDeath = (event: { data: { hero: Hero } }) => {
      const { hero } = event.data
      actions.addDeathAnimation(hero.id)
      const x = hero.position.x * CELL_SIZE + CELL_SIZE / 2
      const y = hero.position.y * CELL_SIZE + CELL_SIZE / 2
      createDeathParticles(x, y)
      setTimeout(() => actions.removeDeathAnimation(hero.id), 1000)
    }

    const handleDamageDealt = (event: { data: { target: Hero; damage: number } }) => {
      const { target, damage } = event.data
      actions.addDamageNumber(target.position.x, target.position.y, damage, false)
    }

    const handleHealApplied = (event: { data: { target: Hero; amount: number } }) => {
      const { target, amount } = event.data
      actions.addDamageNumber(target.position.x, target.position.y, amount, true)
    }

    const unsub1 = eventBus.subscribe('HERO_ATTACK', handleHeroAttack)
    const unsub2 = eventBus.subscribe('SKILL_CAST', handleSkillCast)
    const unsub3 = eventBus.subscribe('HERO_DEATH', handleHeroDeath)
    const unsub4 = eventBus.subscribe('DAMAGE_DEALT', handleDamageDealt)
    const unsub5 = eventBus.subscribe('HEAL_APPLIED', handleHealApplied)
    const unsub6 = eventBus.subscribe('HERO_MOVE', handleHeroMove)

    return () => {
      unsub1()
      unsub2()
      unsub3()
      unsub4()
      unsub5()
      unsub6()
    }
  }, [actions])

  useEffect(() => {
    const interval = setInterval(() => {
      actions.clearDamageNumbers()
    }, 100)
    return () => clearInterval(interval)
  }, [actions])

  useEffect(() => {
    if (attackAnimations.length === 0) return

    const interval = setInterval(() => {
      setAttackAnimations(prev =>
        prev
          .map(anim => ({ ...anim, progress: anim.progress + 0.08 }))
          .filter(anim => anim.progress < 1)
      )
    }, 16)

    return () => clearInterval(interval)
  }, [attackAnimations.length])

  useEffect(() => {
    if (particles.length === 0) return

    const interval = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.1,
            life: p.life - 1
          }))
          .filter(p => p.life > 0)
      )
    }, 16)

    return () => clearInterval(interval)
  }, [particles.length])

  const createHitParticles = (x: number, y: number, color: string, count: number = 15) => {
    const newParticles = []
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 2 + Math.random() * 4
      newParticles.push({
        id: `p-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        color,
        size: 3 + Math.random() * 4
      })
    }
    setParticles(prev => [...prev, ...newParticles])
  }

  const createDeathParticles = (x: number, y: number) => {
    const newParticles = []
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 6
      newParticles.push({
        id: `death-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 60 + Math.random() * 40,
        maxLife: 100,
        color: i % 2 === 0 ? '#ff4444' : '#888',
        size: 4 + Math.random() * 6
      })
    }
    setParticles(prev => [...prev, ...newParticles])
  }

  const handleCellClick = (x: number, y: number) => {
    if (gameStatus !== 'playing' || uiState.isTransitioning) return

    const heroAtCell = heroes.find(h => h.position.x === x && h.position.y === y && h.currentHp > 0)

    if (selectedSkill) {
      if (heroAtCell) {
        onSkillTargetSelect(heroAtCell.id)
      }
      return
    }

    if (selectedHeroId) {
      const selectedHero = heroes.find(h => h.id === selectedHeroId)
      if (!selectedHero) return

      if (heroAtCell && attackableTargets.includes(heroAtCell.id) && phase === 'action') {
        actions.attackTarget(selectedHeroId, heroAtCell.id)
        return
      }

      if (moveableCells.some(c => c.x === x && c.y === y) && phase === 'move') {
        actions.moveHero(selectedHeroId, { x, y })
        return
      }

      if (heroAtCell && heroAtCell.player === currentPlayer) {
        actions.selectHero(heroAtCell.id)
        return
      }

      actions.selectHero(null)
      return
    }

    if (heroAtCell && heroAtCell.player === currentPlayer) {
      actions.selectHero(heroAtCell.id)
    }
  }

  const handleCellHover = (x: number, y: number) => {
    actions.setHoveredCell({ x, y })
  }

  const handleCellLeave = () => {
    actions.setHoveredCell(null)
  }

  const getSkillTargetableHeroes = (): string[] => {
    if (!selectedSkill || !selectedHeroId) return []
    const caster = heroes.find(h => h.id === selectedHeroId)
    if (!caster) return []
    const isFriendly = selectedSkill.effect === 'shield' || selectedSkill.effect === 'heal'

    return heroes
      .filter(h => {
        if (h.currentHp <= 0) return false
        if (isFriendly && h.player !== caster.player) return false
        if (!isFriendly && h.player === caster.player) return false
        const dist = Math.abs(h.position.x - caster.position.x) + Math.abs(h.position.y - caster.position.y)
        return dist <= selectedSkill.range
      })
      .map(h => h.id)
  }

  const skillTargetableHeroes = getSkillTargetableHeroes()

  const shakeStyle = uiState.screenShake.active
    ? {
        transform: `translate(${Math.random() * uiState.screenShake.intensity - uiState.screenShake.intensity / 2}px, ${Math.random() * uiState.screenShake.intensity - uiState.screenShake.intensity / 2}px)`
      }
    : {}

  const renderGrid = () => {
    const cells = []
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const isMoveable = moveableCells.some(c => c.x === x && c.y === y)
        const isHovered = uiState.hoveredCell?.x === x && uiState.hoveredCell?.y === y
        const heroAtCell = heroes.find(h => h.position.x === x && h.position.y === y && h.currentHp > 0)
        const isAttackable = heroAtCell && attackableTargets.includes(heroAtCell.id)
        const isSkillTarget = heroAtCell && skillTargetableHeroes.includes(heroAtCell.id)
        const isInPath = uiState.movePath.some(p => p.x === x && p.y === y)

        let cellBg = (x + y) % 2 === 0 ? '#1a1a2e' : '#16213e'
        let borderColor = 'rgba(255, 255, 255, 0.1)'

        if (isMoveable && phase === 'move') {
          cellBg = 'rgba(255, 255, 255, 0.15)'
        }
        if (isHovered && isMoveable) {
          cellBg = 'rgba(255, 255, 255, 0.3)'
        }
        if (isAttackable && phase === 'action') {
          borderColor = '#ff4444'
        }
        if (isSkillTarget) {
          borderColor = '#ffaa00'
        }

        cells.push(
          <div
            key={`${x}-${y}`}
            style={{
              ...styles.cell,
              left: x * CELL_SIZE,
              top: y * CELL_SIZE,
              backgroundColor: cellBg,
              borderColor,
              cursor: (isMoveable && phase === 'move') || (isAttackable && phase === 'action') || isSkillTarget || (heroAtCell?.player === currentPlayer)
                ? 'pointer'
                : 'default'
            }}
            onClick={() => handleCellClick(x, y)}
            onMouseEnter={() => handleCellHover(x, y)}
            onMouseLeave={handleCellLeave}
          >
            {isInPath && uiState.movePath.length > 1 && !isMoveable && (
              <div style={styles.pathDot} />
            )}
          </div>
        )
      }
    }
    return cells
  }

  const renderMovePath = () => {
    if (uiState.movePath.length < 2) return null

    const pathPoints = uiState.movePath.map(p => ({
      x: p.x * CELL_SIZE + CELL_SIZE / 2,
      y: p.y * CELL_SIZE + CELL_SIZE / 2
    }))

    return (
      <svg
        style={styles.pathSvg}
        width={GRID_WIDTH * CELL_SIZE}
        height={GRID_HEIGHT * CELL_SIZE}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255, 255, 255, 0.7)" />
          </marker>
        </defs>
        {pathPoints.map((point, i) => {
          if (i === 0) return null
          const prev = pathPoints[i - 1]
          return (
            <line
              key={i}
              x1={prev.x}
              y1={prev.y}
              x2={point.x}
              y2={point.y}
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="3"
              strokeDasharray="8,4"
              markerEnd={i === pathPoints.length - 1 ? "url(#arrowhead)" : undefined}
            />
          )
        })}
      </svg>
    )
  }

  const renderHeroes = () => {
    return heroes
      .filter(h => h.currentHp > 0 || uiState.deathAnimations.includes(h.id))
      .map(hero => {
        const isSelected = hero.id === selectedHeroId
        const isAttackable = attackableTargets.includes(hero.id) && phase === 'action'
        const isSkillTarget = skillTargetableHeroes.includes(hero.id)
        const isDying = uiState.deathAnimations.includes(hero.id)
        const isAnimating = animatingHeroes.has(hero.id)
        const hpPercentage = hero.currentHp / hero.maxHp
        const isLowHp = hpPercentage < 0.2

        const colors = PLAYER_COLORS[hero.player]

        return (
          <div
            key={hero.id}
            style={{
              ...styles.hero,
              left: hero.position.x * CELL_SIZE + 4,
              top: hero.position.y * CELL_SIZE + 4,
              width: CELL_SIZE - 8,
              height: CELL_SIZE - 8,
              borderColor: isSelected ? '#ffd700' : isAttackable ? '#ff4444' : isSkillTarget ? '#ffaa00' : colors.primary,
              boxShadow: isSelected
                ? `0 0 20px #ffd700, 0 0 40px rgba(255, 215, 0, 0.5)`
                : isAttackable
                ? `0 0 15px rgba(255, 68, 68, 0.7)`
                : isSkillTarget
                ? `0 0 15px rgba(255, 170, 0, 0.7)`
                : `0 0 10px ${colors.glow}`,
              animation: isDying
                ? 'death 1s forwards'
                : isAnimating
                ? 'walk 0.3s steps(2) infinite'
                : isLowHp && !isDying
                ? 'breathing 1s infinite'
                : 'none',
              opacity: isDying ? 0 : 1,
              cursor: hero.player === currentPlayer && gameStatus === 'playing' ? 'pointer' : 'default'
            }}
            onClick={(e) => {
              e.stopPropagation()
              handleCellClick(hero.position.x, hero.position.y)
            }}
          >
            <div style={styles.heroInner}>
              <span style={styles.heroAvatar}>{hero.avatar}</span>
            </div>

            <div style={styles.hpBarBg}>
              <div
                style={{
                  ...styles.hpBar,
                  width: `${hpPercentage * 100}%`,
                  backgroundColor: hpPercentage < 0.2 ? '#ff4444' : hpPercentage < 0.5 ? '#ffaa00' : '#00ff88'
                }}
              />
            </div>

            <div style={styles.statusIcons}>
              {hero.statusEffects.slice(0, 3).map(effect => (
                <div key={effect.id} style={styles.statusIconSmall}>
                  {effect.type === 'burn' ? '🔥' : effect.type === 'shield' ? '🛡️' : '💚'}
                </div>
              ))}
            </div>

            {(hero.hasMoved || hero.hasActed) && hero.player === currentPlayer && (
              <div style={styles.actionIndicator}>
                {hero.hasMoved && <span style={styles.indicatorDotMoved} />}
                {hero.hasActed && <span style={styles.indicatorDotActed} />}
              </div>
            )}
          </div>
        )
      })
  }

  const renderDamageNumbers = () => {
    return uiState.damageNumbers.map(dn => {
      const age = Date.now() - dn.timestamp
      const opacity = Math.max(0, 1 - age / 1500)
      const yOffset = -age / 20

      return (
        <div
          key={dn.id}
          style={{
            ...styles.damageNumber,
            left: dn.x * CELL_SIZE + CELL_SIZE / 2,
            top: dn.y * CELL_SIZE + CELL_SIZE / 2 + yOffset,
            color: dn.isHeal ? '#00ff88' : '#ff4444',
            opacity,
            textShadow: `0 0 10px ${dn.isHeal ? 'rgba(0, 255, 136, 0.8)' : 'rgba(255, 68, 68, 0.8)'}`
          }}
        >
          {dn.isHeal ? '+' : '-'}{dn.damage}
        </div>
      )
    })
  }

  const renderParticles = () => {
    return particles.map(p => (
      <div
        key={p.id}
        style={{
          ...styles.particle,
          left: p.x,
          top: p.y,
          width: p.size,
          height: p.size,
          backgroundColor: p.color,
          opacity: p.life / p.maxLife,
          boxShadow: `0 0 ${p.size * 2}px ${p.color}`
        }}
      />
    ))
  }

  const renderAttackAnimations = () => {
    return attackAnimations.map(anim => {
      const currentX = anim.fromX + (anim.toX - anim.fromX) * anim.progress
      const currentY = anim.fromY + (anim.toY - anim.fromY) * anim.progress

      const color = anim.type === 'burn' ? '#ff6600' : anim.type === 'shield' ? '#00aaff' : anim.type === 'heal' ? '#00ff88' : '#ffffff'

      return (
        <div
          key={anim.id}
          style={{
            ...styles.attackProjectile,
            left: currentX - 8,
            top: currentY - 8,
            backgroundColor: color,
            boxShadow: `0 0 15px ${color}, 0 0 30px ${color}`
          }}
        />
      )
    })
  }

  const renderSkillEffectOverlay = () => {
    if (!uiState.skillEffect.active) return null

    const color = uiState.skillEffect.type === 'burn'
      ? 'rgba(255, 102, 0, 0.3)'
      : uiState.skillEffect.type === 'shield'
      ? 'rgba(0, 170, 255, 0.3)'
      : 'rgba(0, 255, 136, 0.3)'

    return (
      <div
        style={{
          ...styles.skillEffectOverlay,
          backgroundColor: color,
          animation: 'skillFlash 0.8s ease-out forwards'
        }}
      >
        <div style={styles.skillEffectIcon}>
          {uiState.skillEffect.type === 'burn' ? '🔥' : uiState.skillEffect.type === 'shield' ? '🛡️' : '💚'}
        </div>
      </div>
    )
  }

  const renderTurnTransition = () => {
    if (!uiState.isTransitioning) return null

    const player = uiState.transitioningPlayer
    const colors = PLAYER_COLORS[player]

    return (
      <div style={styles.transitionOverlay}>
        <div
          style={{
            ...styles.transitionContent,
            animation: 'turnFlip 0.6s ease-out forwards'
          }}
        >
          <div style={{ ...styles.transitionAvatar, borderColor: colors.primary, boxShadow: `0 0 60px ${colors.glow}` }}>
            {player === 1 ? '👤' : '👥'}
          </div>
          <div style={{ ...styles.transitionText, color: colors.primary }}>
            玩家 {player} 回合
          </div>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.sparkleParticle,
                left: `${30 + Math.random() * 40}%`,
                top: `${30 + Math.random() * 40}%`,
                backgroundColor: colors.primary,
                animationDelay: `${Math.random() * 0.3}s`,
                animation: `sparkle 0.6s ease-out forwards`
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  const renderGameOver = () => {
    if (gameStatus !== 'finished' || !winner) return null

    const colors = PLAYER_COLORS[winner]

    return (
      <div style={styles.gameOverOverlay}>
        <div style={styles.gameOverContent}>
          <div
            style={{
              ...styles.gameOverTitle,
              color: colors.primary,
              textShadow: `0 0 30px ${colors.glow}`
            }}
          >
            玩家 {winner} 获胜！
          </div>
          <div style={styles.gameOverSubtitle}>战斗结束</div>
          <button
            style={{ ...styles.restartButton, backgroundColor: colors.primary }}
            onClick={() => actions.resetGame()}
          >
            再来一局
          </button>
        </div>
      </div>
    )
  }

  const renderSkillSelectionHint = () => {
    if (!selectedSkill) return null

    return (
      <div style={styles.skillHint}>
        <span style={styles.skillHintText}>选择技能目标 - {selectedSkill.name}</span>
        <button style={styles.cancelSkillButton} onClick={onSkillCancel}>
          取消
        </button>
      </div>
    )
  }

  const renderTurnIndicator = () => {
    const colors = PLAYER_COLORS[currentPlayer]
    return (
      <div style={styles.turnIndicator}>
        <div style={{ ...styles.turnIndicatorDot, backgroundColor: colors.primary }} />
        <span style={{ ...styles.turnIndicatorText, color: colors.primary }}>
          回合 {turnNumber} - {phase === 'move' ? '移动' : '行动'}阶段
        </span>
      </div>
    )
  }

  return (
    <div style={{ ...styles.container, ...shakeStyle }}>
      <div style={styles.boardWrapper}>
        {renderTurnIndicator()}

        <div
          style={{
            ...styles.board,
            width: GRID_WIDTH * CELL_SIZE,
            height: GRID_HEIGHT * CELL_SIZE
          }}
        >
          {renderGrid()}
          {renderMovePath()}
          {renderHeroes()}
          {renderDamageNumbers()}
          {renderParticles()}
          {renderAttackAnimations()}
          {renderSkillEffectOverlay()}
        </div>

        {renderSkillSelectionHint()}
        {renderTurnTransition()}
        {renderGameOver()}
      </div>

      <style>{`
        @keyframes walk {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes breathing {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes death {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(0) rotate(180deg); opacity: 0; }
        }
        @keyframes turnFlip {
          0% { transform: perspective(1000px) rotateY(90deg) scale(0.5); opacity: 0; }
          50% { transform: perspective(1000px) rotateY(0deg) scale(1.2); opacity: 1; }
          100% { transform: perspective(1000px) rotateY(0deg) scale(1); opacity: 0; }
        }
        @keyframes sparkle {
          0% { transform: scale(0) translate(0, 0); opacity: 0; }
          50% { transform: scale(1.5) translate(0, 0); opacity: 1; }
          100% { transform: scale(0) translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px); opacity: 0; }
        }
        @keyframes skillFlash {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    transition: 'transform 0.05s'
  },
  boardWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  board: {
    position: 'relative',
    backgroundColor: '#0f0f23',
    border: '4px solid #0f3460',
    borderRadius: '8px',
    boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), inset 0 0 60px rgba(0, 0, 0, 0.3)'
  },
  cell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pathDot: {
    width: '12px',
    height: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '50%'
  },
  pathSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    zIndex: 5
  },
  hero: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    border: '3px solid',
    borderRadius: '8px',
    transition: 'left 0.3s ease, top 0.3s ease, transform 0.15s ease',
    zIndex: 10
  },
  heroInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  heroAvatar: {
    fontSize: '32px'
  },
  hpBarBg: {
    position: 'absolute',
    bottom: '4px',
    left: '4px',
    right: '4px',
    height: '6px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  hpBar: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease'
  },
  statusIcons: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    display: 'flex',
    gap: '2px'
  },
  statusIconSmall: {
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f23',
    border: '1px solid #444',
    borderRadius: '4px',
    fontSize: '10px'
  },
  actionIndicator: {
    position: 'absolute',
    top: '-8px',
    left: '-8px',
    display: 'flex',
    gap: '2px'
  },
  indicatorDotMoved: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#888',
    border: '1px solid #0f0f23'
  },
  indicatorDotActed: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#888',
    border: '1px solid #0f0f23'
  },
  damageNumber: {
    position: 'absolute',
    transform: 'translateX(-50%)',
    fontSize: '28px',
    fontWeight: 'bold',
    fontFamily: "'Courier New', monospace",
    pointerEvents: 'none',
    zIndex: 100
  },
  particle: {
    position: 'absolute',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 50
  },
  attackProjectile: {
    position: 'absolute',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 60
  },
  skillEffectOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 80
  },
  skillEffectIcon: {
    fontSize: '80px',
    animation: 'pulse 0.4s ease-in-out'
  },
  transitionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    borderRadius: '8px'
  },
  transitionContent: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  transitionAvatar: {
    width: '120px',
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    border: '4px solid',
    borderRadius: '50%',
    fontSize: '64px'
  },
  transitionText: {
    fontSize: '32px',
    fontWeight: 'bold',
    fontFamily: "'Courier New', monospace"
  },
  sparkleParticle: {
    position: 'absolute',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    pointerEvents: 'none'
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    borderRadius: '8px'
  },
  gameOverContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  gameOverTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    fontFamily: "'Courier New', monospace"
  },
  gameOverSubtitle: {
    color: '#888',
    fontSize: '18px',
    marginBottom: '16px'
  },
  restartButton: {
    padding: '16px 48px',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '20px',
    fontWeight: 'bold',
    fontFamily: "'Courier New', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s ease'
  },
  skillHint: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 24px',
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
    border: '2px solid #ffaa00',
    borderRadius: '8px'
  },
  skillHintText: {
    color: '#ffaa00',
    fontSize: '16px',
    fontWeight: 'bold',
    fontFamily: "'Courier New', monospace"
  },
  cancelSkillButton: {
    padding: '6px 16px',
    backgroundColor: 'transparent',
    border: '2px solid #ff4444',
    color: '#ff4444',
    fontSize: '14px',
    fontWeight: 'bold',
    fontFamily: "'Courier New', monospace",
    cursor: 'pointer',
    borderRadius: '4px'
  },
  turnIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '20px'
  },
  turnIndicatorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  turnIndicatorText: {
    fontSize: '14px',
    fontWeight: 'bold',
    fontFamily: "'Courier New', monospace"
  }
}

export default GameBoard
