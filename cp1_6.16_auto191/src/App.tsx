import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { GameEngine } from './GameEngine'
import { PlayerModule } from './PlayerModule'
import { InventoryModule } from './InventoryModule'
import { CraftingModule } from './CraftingModule'
import { eventBus } from './EventBus'
import type { PlayerStats, GameTime, WeatherType, Recipe, GameOverEvent } from './types'
import StatusPanel from './components/StatusPanel'
import CraftingPanel from './components/CraftingPanel'
import DayNightClock from './components/DayNightClock'
import WeatherEffects from './components/WeatherEffects'
import DeathOverlay from './components/DeathOverlay'

const App: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<PlayerStats>({ hunger: 100, temperature: 25, water: 100 })
  const [inventory, setInventory] = useState<Record<string, number>>({})
  const [time, setTime] = useState<GameTime>({ hour: 6, minute: 0, day: 1 })
  const [weather, setWeather] = useState<WeatherType>('sunny')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isDead, setIsDead] = useState(false)
  const [deathReason, setDeathReason] = useState('')
  const [fadeIn, setFadeIn] = useState(false)
  const [nightIntensity, setNightIntensity] = useState(0)

  const gameEngineRef = useRef<GameEngine | null>(null)
  const playerModuleRef = useRef<PlayerModule | null>(null)
  const inventoryModuleRef = useRef<InventoryModule | null>(null)
  const craftingModuleRef = useRef<CraftingModule | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    const initData = async () => {
      try {
        const [playerRes, recipesRes] = await Promise.all([
          axios.get('/api/init/player'),
          axios.get('/api/init/recipes'),
        ])

        const playerData = playerRes.data
        const recipesData = recipesRes.data

        const inventoryModule = new InventoryModule(playerData.inventory)
        const playerModule = new PlayerModule(inventoryModule)
        const gameEngine = new GameEngine()
        const craftingModule = new CraftingModule(inventoryModule)

        inventoryModuleRef.current = inventoryModule
        playerModuleRef.current = playerModule
        gameEngineRef.current = gameEngine
        craftingModuleRef.current = craftingModule

        playerModule.init({
          hunger: playerData.hunger,
          temperature: playerData.temperature,
          water: playerData.water,
        })
        craftingModule.setRecipes(recipesData)

        setStats(playerModule.getStats())
        setInventory(inventoryModule.getAllItems())
        setTime(gameEngine.getTime())
        setWeather(gameEngine.getWeather())
        setRecipes(recipesData)
        setNightIntensity(gameEngine.getNightIntensity())

        initializedRef.current = true
        setLoading(false)

        requestAnimationFrame(() => {
          setFadeIn(true)
        })

        gameEngine.start()
      } catch (error) {
        console.error('Failed to initialize game:', error)
        setLoading(false)
      }
    }

    initData()

    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.stop()
      }
      if (playerModuleRef.current) {
        playerModuleRef.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    if (!initializedRef.current) return

    const tickUnsubscribe = eventBus.on('tick', (event) => {
      setTime(event.time)
      setWeather(event.weather)
      if (gameEngineRef.current) {
        setNightIntensity(gameEngineRef.current.getNightIntensity())
      }
    })

    const statsUnsubscribe = eventBus.on('statsChange', (newStats) => {
      setStats(newStats)
    })

    const inventoryUnsubscribe = eventBus.on('inventoryChange', (newInventory) => {
      setInventory(newInventory)
    })

    const gameOverUnsubscribe = eventBus.on('gameOver', (event: GameOverEvent) => {
      setIsDead(true)
      setDeathReason(event.reason)
      if (gameEngineRef.current) {
        gameEngineRef.current.stop()
      }
    })

    return () => {
      tickUnsubscribe()
      statsUnsubscribe()
      inventoryUnsubscribe()
      gameOverUnsubscribe()
    }
  }, [])

  const handleCraft = (recipeId: string) => {
    if (craftingModuleRef.current) {
      craftingModuleRef.current.craft(recipeId)
    }
  }

  const handleRestart = () => {
    setFadeIn(false)

    setTimeout(() => {
      if (gameEngineRef.current) {
        gameEngineRef.current.reset()
      }
      if (inventoryModuleRef.current) {
        inventoryModuleRef.current.reset()
      }
      if (playerModuleRef.current) {
        playerModuleRef.current.reset()
      }

      setIsDead(false)
      setDeathReason('')

      if (gameEngineRef.current) {
        setTime(gameEngineRef.current.getTime())
        setWeather(gameEngineRef.current.getWeather())
        setNightIntensity(gameEngineRef.current.getNightIntensity())
      }
      if (inventoryModuleRef.current) {
        setInventory(inventoryModuleRef.current.getAllItems())
      }
      if (playerModuleRef.current) {
        setStats(playerModuleRef.current.getStats())
      }

      requestAnimationFrame(() => {
        setFadeIn(true)
      })

      setTimeout(() => {
        if (gameEngineRef.current) {
          gameEngineRef.current.start()
        }
      }, 500)
    }, 500)
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>加载中...</div>
      </div>
    )
  }

  return (
    <div
      style={{
        ...styles.container,
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      <WeatherEffects weather={weather} nightIntensity={nightIntensity} />
      <DayNightClock time={time} weather={weather} />
      <StatusPanel stats={stats} />
      <CraftingPanel recipes={recipes} inventory={inventory} onCraft={handleCraft} />

      <div style={styles.inventoryDisplay}>
        <h4 style={styles.inventoryTitle}>📦 库存</h4>
        <div style={styles.inventoryGrid}>
          {Object.entries(inventory).map(([itemId, qty]) => (
            <div key={itemId} style={styles.inventoryItem}>
              <span>{getItemEmoji(itemId)}</span>
              <span style={styles.inventoryQty}>x{qty}</span>
            </div>
          ))}
        </div>
      </div>

      <DeathOverlay isVisible={isDead} reason={deathReason} onRestart={handleRestart} />
    </div>
  )
}

const getItemEmoji = (itemId: string): string => {
  const emojis: Record<string, string> = {
    wood: '🪵',
    stone: '🪨',
    berry: '🫐',
    rawFish: '🐟',
    cloth: '🧵',
    herb: '🌿',
    woodAxe: '🪓',
    stonePickaxe: '⛏️',
    tent: '⛺',
    torch: '🔦',
    grilledFish: '🍣',
    herbSoup: '🍲',
    leatherCoat: '🧥',
    waterBottle: '🫗',
    trap: '🪤',
    campfire: '🔥',
    water: '💧',
  }
  return emojis[itemId] || '📦'
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2C',
  },
  loadingText: {
    color: '#F0F0F0',
    fontSize: '24px',
  },
  inventoryDisplay: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    backgroundColor: 'rgba(44, 44, 44, 0.9)',
    border: '2px solid #4FC3F7',
    borderRadius: '8px',
    padding: '12px',
    minWidth: '200px',
    zIndex: 100,
  },
  inventoryTitle: {
    color: '#F0F0F0',
    fontSize: '14px',
    margin: '0 0 10px 0',
    textAlign: 'center',
    borderBottom: '1px solid #4FC3F7',
    paddingBottom: '6px',
  },
  inventoryGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  inventoryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#263238',
    borderRadius: '6px',
    padding: '6px 10px',
    border: '1px solid #555',
    fontSize: '20px',
    minWidth: '45px',
  },
  inventoryQty: {
    fontSize: '11px',
    color: '#F0F0F0',
    marginTop: '2px',
  },
}

export default App
