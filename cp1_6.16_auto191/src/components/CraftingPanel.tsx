import React, { useState, useEffect, useRef } from 'react'
import type { Recipe } from '../types'

interface CraftingPanelProps {
  recipes: Recipe[]
  inventory: Record<string, number>
  onCraft: (recipeId: string) => void
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

const CraftingPanel: React.FC<CraftingPanelProps> = ({ recipes, inventory, onCraft }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [pressedButton, setPressedButton] = useState<string | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const particleIdRef = useRef(0)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    particlesRef.current = particles
  }, [particles])

  const canCraft = (recipe: Recipe): boolean => {
    for (const [itemId, quantity] of Object.entries(recipe.materials)) {
      if ((inventory[itemId] ?? 0) < quantity) {
        return false
      }
    }
    return true
  }

  const handleCraft = (recipeId: string, e: React.MouseEvent) => {
    const recipe = recipes.find(r => r.id === recipeId)
    if (!recipe || !canCraft(recipe)) return

    setPressedButton(recipeId)
    setTimeout(() => setPressedButton(null), 200)

    const button = e.currentTarget as HTMLElement
    const rect = button.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const newParticles: Particle[] = []
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5
      const speed = 50 + Math.random() * 50
      newParticles.push({
        id: particleIdRef.current++,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      })
    }

    setParticles(prev => [...prev, ...newParticles])
    onCraft(recipeId)

    const startTime = performance.now()
    const duration = 400
    const animateParticles = (now: number) => {
      const progress = (now - startTime) / duration
      if (progress >= 1) {
        setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)))
        return
      }

      setParticles(prev => prev.map(p => {
        const np = newParticles.find(x => x.id === p.id)
        if (!np) return p
        const t = progress
        return {
          ...p,
          x: np.x + np.vx * t,
          y: np.y + np.vy * t,
          life: 1 - t,
        }
      }))

      requestAnimationFrame(animateParticles)
    }

    requestAnimationFrame(animateParticles)
  }

  const getItemName = (itemId: string): string => {
    const names: Record<string, string> = {
      wood: '木材',
      stone: '石头',
      berry: '浆果',
      rawFish: '生鱼',
      cloth: '布料',
      herb: '药草',
      woodAxe: '木斧',
      stonePickaxe: '石镐',
      tent: '帐篷',
      torch: '火把',
      grilledFish: '烤鱼',
      herbSoup: '草药汤',
      leatherCoat: '皮革外套',
      waterBottle: '水壶',
      trap: '陷阱',
      campfire: '篝火',
      water: '水',
    }
    return names[itemId] || itemId
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.toggleButton,
          right: isOpen ? '520px' : '20px',
        }}
      >
        🔨 工作台
      </button>

      <div
        style={{
          ...styles.panel,
          right: isOpen ? '20px' : '-520px',
        }}
      >
        <div style={styles.header}>
          <h3 style={styles.title}>🔨 工作台合成</h3>
          <button onClick={() => setIsOpen(false)} style={styles.closeButton}>
            ✕
          </button>
        </div>
        <div style={styles.grid}>
          {recipes.map(recipe => {
            const craftable = canCraft(recipe)
            const isPressed = pressedButton === recipe.id

            return (
              <div
                key={recipe.id}
                style={{
                  ...styles.card,
                  opacity: craftable ? 1 : 0.6,
                  transform: isPressed ? 'scale(0.95)' : 'scale(1)',
                }}
                className="recipe-card"
              >
                <div style={styles.cardIcon}>{recipe.icon}</div>
                <div style={styles.cardName}>{recipe.name}</div>
                <div style={styles.materials}>
                  {Object.entries(recipe.materials).map(([itemId, qty]) => {
                    const has = inventory[itemId] ?? 0
                    const enough = has >= qty
                    return (
                      <div
                        key={itemId}
                        style={{
                          ...styles.materialItem,
                          color: enough ? '#81C784' : '#E57373',
                        }}
                      >
                        <span>{getItemName(itemId)}</span>
                        <span>{has}/{qty}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={styles.output}>
                  产出: {Object.entries(recipe.output).map(([id, qty]) => (
                    <span key={id} style={styles.outputItem}>
                      {getItemName(id)} x{qty}
                    </span>
                  ))}
                </div>
                <button
                  onClick={(e) => handleCraft(recipe.id, e)}
                  disabled={!craftable}
                  style={{
                    ...styles.craftButton,
                    backgroundColor: craftable ? '#4FC3F7' : '#555',
                    cursor: craftable ? 'pointer' : 'not-allowed',
                    transform: isPressed ? 'scale(0.95)' : 'scale(1)',
                  }}
                >
                  合成
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: p.x - 2,
            top: p.y - 2,
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: '#4CAF50',
            opacity: p.life,
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 0 6px #4CAF50',
          }}
        />
      ))}

      <style>{`
        .recipe-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease, margin 0.2s ease;
        }
        .recipe-card:hover {
          transform: translateY(-4px) translateX(4px) !important;
          box-shadow: 0 8px 20px rgba(79, 195, 247, 0.4) !important;
        }
      `}</style>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toggleButton: {
    position: 'absolute',
    bottom: '20px',
    backgroundColor: '#263238',
    color: '#F0F0F0',
    border: '2px solid #4FC3F7',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    zIndex: 101,
    transition: 'right 0.3s ease, background-color 0.2s ease',
  },
  panel: {
    position: 'absolute',
    bottom: '20px',
    width: '500px',
    maxHeight: '500px',
    backgroundColor: 'rgba(44, 44, 44, 0.95)',
    border: '2px solid #4FC3F7',
    borderRadius: '8px',
    padding: '16px',
    zIndex: 100,
    transition: 'right 0.3s ease',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    borderBottom: '1px solid #4FC3F7',
    paddingBottom: '8px',
  },
  title: {
    color: '#F0F0F0',
    fontSize: '18px',
    margin: 0,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#F0F0F0',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  card: {
    backgroundColor: '#263238',
    border: '1px solid #4FC3F7',
    borderRadius: '6px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    cursor: 'default',
  },
  cardIcon: {
    fontSize: '28px',
    marginBottom: '6px',
  },
  cardName: {
    color: '#F0F0F0',
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '8px',
    textAlign: 'center',
  },
  materials: {
    width: '100%',
    marginBottom: '8px',
  },
  materialItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    marginBottom: '2px',
  },
  output: {
    color: '#81C784',
    fontSize: '11px',
    marginBottom: '8px',
    textAlign: 'center',
  },
  outputItem: {
    display: 'block',
  },
  craftButton: {
    width: '100%',
    padding: '6px',
    border: 'none',
    borderRadius: '4px',
    color: '#1A1A2E',
    fontWeight: 'bold',
    fontSize: '12px',
    transition: 'transform 0.1s ease, background-color 0.2s ease',
  },
}

export default CraftingPanel
