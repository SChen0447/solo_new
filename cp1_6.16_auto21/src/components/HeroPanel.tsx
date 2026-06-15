import { useState } from 'react'
import { useSelectedHero, useCurrentPlayer, usePhase, useGameActions, useHeroes } from '../store/gameStore'
import type { Skill, StatusEffect, Hero } from '../gameEngine/heroData'

const PLAYER_COLORS = {
  1: { primary: '#00ff88', secondary: '#00cc6a', glow: 'rgba(0, 255, 136, 0.5)' },
  2: { primary: '#ff4444', secondary: '#cc3333', glow: 'rgba(255, 68, 68, 0.5)' }
}

const STATUS_ICONS: Record<string, string> = {
  burn: '🔥',
  shield: '🛡️',
  heal: '💚'
}

interface HeroPanelProps {
  onSkillSelect: (skill: Skill) => void
  selectedSkill: Skill | null
}

const HeroPanel = ({ onSkillSelect, selectedSkill }: HeroPanelProps) => {
  const selectedHero = useSelectedHero()
  const currentPlayer = useCurrentPlayer()
  const phase = usePhase()
  const actions = useGameActions()
  const heroes = useHeroes()
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null)

  const colors = selectedHero ? PLAYER_COLORS[selectedHero.player] : PLAYER_COLORS[1]

  const getSkillTargetableHeroes = (skill: Skill): Hero[] => {
    if (!selectedHero) return []
    const isFriendly = skill.effect === 'shield' || skill.effect === 'heal'
    return heroes.filter(h => {
      if (h.currentHp <= 0) return false
      if (isFriendly && h.player !== selectedHero.player) return false
      if (!isFriendly && h.player === selectedHero.player) return false
      const dist = Math.abs(h.position.x - selectedHero.position.x) + Math.abs(h.position.y - selectedHero.position.y)
      return dist <= skill.range
    })
  }

  const handleSkillClick = (skill: Skill) => {
    if (!selectedHero || selectedHero.hasActed || skill.currentCooldown > 0) return
    const targetable = getSkillTargetableHeroes(skill)
    if (targetable.length === 0 && skill.range > 0) return
    onSkillSelect(skill)
  }

  const handleEndTurn = () => {
    actions.endTurn()
  }

  const handlePhaseSwitch = () => {
    if (phase === 'move') {
      actions.setPhase('action')
    } else {
      actions.setPhase('move')
    }
  }

  const renderHpBar = (current: number, max: number) => {
    const percentage = (current / max) * 100
    const isLow = percentage < 20
    const barColor = isLow ? '#ff4444' : percentage < 50 ? '#ffaa00' : '#00ff88'

    return (
      <div style={styles.hpBarContainer}>
        <div
          style={{
            ...styles.hpBar,
            width: `${percentage}%`,
            backgroundColor: barColor,
            animation: isLow ? 'pulse 1s infinite' : 'none'
          }}
        />
        <span style={styles.hpText}>{current}/{max}</span>
      </div>
    )
  }

  const renderStatusEffects = (effects: StatusEffect[]) => {
    if (effects.length === 0) return null

    return (
      <div style={styles.statusContainer}>
        {effects.map(effect => (
          <div key={effect.id} style={styles.statusIcon} title={`${effect.name} - 剩余${effect.duration}回合`}>
            <span style={styles.statusEmoji}>{STATUS_ICONS[effect.type]}</span>
            <span style={styles.statusDuration}>{effect.duration}</span>
          </div>
        ))}
      </div>
    )
  }

  const renderSkillButton = (skill: Skill) => {
    if (!selectedHero) return null
    const isOnCooldown = skill.currentCooldown > 0
    const isDisabled = isOnCooldown || selectedHero.hasActed || selectedHero.player !== currentPlayer
    const targetable = getSkillTargetableHeroes(skill)
    const hasTargets = targetable.length > 0 || skill.range === 0
    const isSelected = selectedSkill?.id === skill.id
    const isHovered = hoveredSkill === skill.id

    return (
      <div
        key={skill.id}
        style={{
          ...styles.skillButton,
          borderColor: isSelected ? colors.primary : isDisabled ? '#444' : '#666',
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          boxShadow: isSelected ? `0 0 10px ${colors.glow}` : 'none'
        }}
        onClick={() => handleSkillClick(skill)}
        onMouseEnter={() => setHoveredSkill(skill.id)}
        onMouseLeave={() => setHoveredSkill(null)}
      >
        <span style={styles.skillIcon}>{skill.icon}</span>
        <div style={styles.skillInfo}>
          <div style={styles.skillName}>{skill.name}</div>
          <div style={styles.skillCooldown}>
            {isOnCooldown ? `冷却: ${skill.currentCooldown}` : `冷却: ${skill.cooldown}`}
          </div>
        </div>
        {isOnCooldown && (
          <div style={styles.cooldownOverlay}>
            <span style={styles.cooldownText}>{skill.currentCooldown}</span>
          </div>
        )}
        {!hasTargets && !isOnCooldown && skill.range > 0 && (
          <div style={styles.noTargetsOverlay}>
            <span style={styles.noTargetsText}>无目标</span>
          </div>
        )}
        {isHovered && !isDisabled && (
          <div style={styles.skillTooltip}>
            <div style={styles.tooltipTitle}>{skill.name}</div>
            <div style={styles.tooltipDesc}>{skill.description}</div>
            <div style={styles.tooltipRange}>范围: {skill.range}格</div>
          </div>
        )}
      </div>
    )
  }

  if (!selectedHero) {
    return (
      <div style={styles.container}>
        <div style={styles.noSelection}>
          <div style={styles.noSelectionText}>选择一个英雄</div>
          <div style={styles.hintText}>点击棋盘上的英雄查看详情</div>
        </div>
        <div style={styles.gameControls}>
          <div style={styles.turnInfo}>
            <div style={{ ...styles.turnPlayer, color: PLAYER_COLORS[currentPlayer].primary }}>
              玩家 {currentPlayer} 回合
            </div>
            <div style={styles.turnPhase}>{phase === 'move' ? '移动阶段' : '行动阶段'}</div>
          </div>
          <button
            style={{
              ...styles.phaseButton,
              borderColor: PLAYER_COLORS[currentPlayer].primary
            }}
            onClick={handlePhaseSwitch}
          >
            切换到{phase === 'move' ? '行动' : '移动'}
          </button>
          <button
            style={{
              ...styles.endTurnButton,
              backgroundColor: PLAYER_COLORS[currentPlayer].primary,
              boxShadow: `0 0 15px ${PLAYER_COLORS[currentPlayer].glow}`
            }}
            onClick={handleEndTurn}
          >
            结束回合
          </button>
        </div>
      </div>
    )
  }

  const isCurrentPlayerHero = selectedHero.player === currentPlayer

  return (
    <div style={styles.container}>
      <div style={{ ...styles.heroHeader, borderColor: colors.primary }}>
        <div
          style={{
            ...styles.heroAvatar,
            borderColor: colors.primary,
            boxShadow: `0 0 20px ${colors.glow}`,
            animation: selectedHero.currentHp / selectedHero.maxHp < 0.2 ? 'pulse 1s infinite' : 'none'
          }}
        >
          <span style={styles.avatarEmoji}>{selectedHero.avatar}</span>
        </div>
        <div style={styles.heroInfo}>
          <div style={{ ...styles.heroName, color: colors.primary }}>{selectedHero.name}</div>
          <div style={styles.heroPlayer}>玩家 {selectedHero.player}</div>
          {renderHpBar(selectedHero.currentHp, selectedHero.maxHp)}
        </div>
      </div>

      {renderStatusEffects(selectedHero.statusEffects)}

      <div style={styles.statsContainer}>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>攻击力</span>
          <span style={styles.statValue}>{selectedHero.attack}</span>
        </div>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>防御力</span>
          <span style={styles.statValue}>{selectedHero.defense}</span>
        </div>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>移动力</span>
          <span style={styles.statValue}>{selectedHero.moveRange}</span>
        </div>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>攻击范围</span>
          <span style={styles.statValue}>{selectedHero.attackRange}格</span>
        </div>
      </div>

      <div style={styles.actionStatus}>
        <div style={{ ...styles.statusBadge, backgroundColor: selectedHero.hasMoved ? '#444' : '#00cc6a' }}>
          {selectedHero.hasMoved ? '已移动' : '可移动'}
        </div>
        <div style={{ ...styles.statusBadge, backgroundColor: selectedHero.hasActed ? '#444' : '#00cc6a' }}>
          {selectedHero.hasActed ? '已行动' : '可行动'}
        </div>
      </div>

      <div style={styles.skillsContainer}>
        <div style={styles.sectionTitle}>技能</div>
        {selectedHero.skills.map(skill => renderSkillButton(skill))}
      </div>

      <div style={styles.gameControls}>
        <div style={styles.turnInfo}>
          <div style={{ ...styles.turnPlayer, color: PLAYER_COLORS[currentPlayer].primary }}>
            玩家 {currentPlayer} 回合
          </div>
          <div style={styles.turnPhase}>{phase === 'move' ? '移动阶段' : '行动阶段'}</div>
        </div>
        {isCurrentPlayerHero && (
          <>
            <button
              style={{
                ...styles.phaseButton,
                borderColor: PLAYER_COLORS[currentPlayer].primary
              }}
              onClick={handlePhaseSwitch}
            >
              切换到{phase === 'move' ? '行动' : '移动'}
            </button>
            <button
              style={{
                ...styles.endTurnButton,
                backgroundColor: PLAYER_COLORS[currentPlayer].primary,
                boxShadow: `0 0 15px ${PLAYER_COLORS[currentPlayer].glow}`
              }}
              onClick={handleEndTurn}
            >
              结束回合
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '280px',
    height: '100%',
    backgroundColor: '#16213e',
    borderLeft: '3px solid #0f3460',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    fontFamily: "'Courier New', monospace",
    overflowY: 'auto'
  },
  noSelection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    border: '2px dashed #444',
    borderRadius: '8px'
  },
  noSelectionText: {
    color: '#888',
    fontSize: '18px',
    marginBottom: '8px'
  },
  hintText: {
    color: '#666',
    fontSize: '12px'
  },
  heroHeader: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#0f0f23',
    border: '2px solid',
    borderRadius: '8px'
  },
  heroAvatar: {
    width: '64px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    border: '3px solid',
    borderRadius: '8px',
    flexShrink: 0
  },
  avatarEmoji: {
    fontSize: '36px'
  },
  heroInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  heroName: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  heroPlayer: {
    color: '#888',
    fontSize: '12px'
  },
  hpBarContainer: {
    position: 'relative',
    height: '20px',
    backgroundColor: '#333',
    borderRadius: '4px',
    overflow: 'hidden',
    border: '1px solid #555'
  },
  hpBar: {
    height: '100%',
    transition: 'width 0.3s ease',
    borderRadius: '3px'
  },
  hpText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    textShadow: '1px 1px 2px #000'
  },
  statusContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  statusIcon: {
    position: 'relative',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f23',
    border: '2px solid #444',
    borderRadius: '4px'
  },
  statusEmoji: {
    fontSize: '18px'
  },
  statusDuration: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    width: '16px',
    height: '16px',
    backgroundColor: '#ff4444',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 'bold',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#0f0f23',
    borderRadius: '8px'
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statLabel: {
    color: '#888',
    fontSize: '14px'
  },
  statValue: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  actionStatus: {
    display: 'flex',
    gap: '8px'
  },
  statusBadge: {
    flex: 1,
    padding: '6px 12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: '4px'
  },
  skillsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  sectionTitle: {
    color: '#888',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  skillButton: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#0f0f23',
    border: '2px solid',
    borderRadius: '8px',
    transition: 'all 0.2s ease'
  },
  skillIcon: {
    fontSize: '28px',
    width: '40px',
    textAlign: 'center'
  },
  skillInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  skillName: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  skillCooldown: {
    color: '#888',
    fontSize: '11px'
  },
  cooldownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px'
  },
  cooldownText: {
    color: '#ff4444',
    fontSize: '32px',
    fontWeight: 'bold'
  },
  noTargetsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px'
  },
  noTargetsText: {
    color: '#888',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  skillTooltip: {
    position: 'absolute',
    left: '105%',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '200px',
    padding: '12px',
    backgroundColor: '#0f0f23',
    border: '2px solid #00ff88',
    borderRadius: '8px',
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
  },
  tooltipTitle: {
    color: '#00ff88',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  tooltipDesc: {
    color: '#ccc',
    fontSize: '12px',
    lineHeight: '1.4',
    marginBottom: '8px'
  },
  tooltipRange: {
    color: '#888',
    fontSize: '11px'
  },
  gameControls: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingTop: '16px',
    borderTop: '1px solid #333'
  },
  turnInfo: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#0f0f23',
    borderRadius: '8px'
  },
  turnPlayer: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  turnPhase: {
    color: '#888',
    fontSize: '12px'
  },
  phaseButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: '2px solid',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    fontFamily: "'Courier New', monospace",
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.2s ease'
  },
  endTurnButton: {
    padding: '14px 24px',
    border: 'none',
    color: '#000',
    fontSize: '16px',
    fontWeight: 'bold',
    fontFamily: "'Courier New', monospace",
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.2s ease'
  }
}

export default HeroPanel
