import { eventBus } from './EventBus'
import type { PlayerStats, TickEvent, WeatherChangeEvent, WeatherType } from './types'
import { InventoryModule } from './InventoryModule'

const HUNGER_DECAY_PER_HOUR = 1.5
const WATER_DECAY_PER_HOUR = 2.0
const DAY_TEMP_BONUS = 10
const MS_PER_GAME_HOUR = 10000

const WEATHER_TEMPERATURES: Record<WeatherType, number> = {
  sunny: 25,
  cloudy: 20,
  rainy: 15,
  snowy: 0,
  foggy: 18
}

export class PlayerModule {
  private stats: PlayerStats = { hunger: 100, temperature: 25, water: 100 }
  private initialStats: PlayerStats = { hunger: 100, temperature: 25, water: 100 }
  private currentWeather: WeatherType = 'sunny'
  private isNight: boolean = false
  private isDead: boolean = false
  private inventory: InventoryModule
  private tickUnsubscribe: (() => void) | null = null
  private weatherUnsubscribe: (() => void) | null = null

  constructor(inventory: InventoryModule) {
    this.inventory = inventory
  }

  init(initialStats?: PlayerStats): void {
    if (initialStats) {
      this.initialStats = { ...initialStats }
    }
    this.stats = { ...this.initialStats }
    this.isDead = false
    this.currentWeather = 'sunny'
    this.isNight = false
    this.subscribeEvents()
    this.emitStatsChange()
  }

  private subscribeEvents(): void {
    this.unsubscribeEvents()
    this.tickUnsubscribe = eventBus.on('tick', this.handleTick)
    this.weatherUnsubscribe = eventBus.on('weatherChange', this.handleWeatherChange)
  }

  private unsubscribeEvents(): void {
    if (this.tickUnsubscribe) {
      this.tickUnsubscribe()
      this.tickUnsubscribe = null
    }
    if (this.weatherUnsubscribe) {
      this.weatherUnsubscribe()
      this.weatherUnsubscribe = null
    }
  }

  private handleTick = (event: TickEvent): void => {
    if (this.isDead) return

    const gameHoursPassed = event.deltaTime / MS_PER_GAME_HOUR
    
    this.isNight = event.time.hour < 6 || event.time.hour >= 18
    
    this.updateTemperature()
    this.updateHunger(gameHoursPassed)
    this.updateWater(gameHoursPassed)
    this.checkDeath()
    
    this.emitStatsChange()
  }

  private handleWeatherChange = (event: WeatherChangeEvent): void => {
    this.currentWeather = event.to
    this.updateTemperature()
    this.emitStatsChange()
  }

  private updateTemperature(): void {
    const baseTemp = WEATHER_TEMPERATURES[this.currentWeather]
    const dayBonus = this.isNight ? 0 : DAY_TEMP_BONUS
    this.stats.temperature = baseTemp + dayBonus
  }

  private updateHunger(gameHours: number): void {
    this.stats.hunger = Math.max(0, this.stats.hunger - HUNGER_DECAY_PER_HOUR * gameHours)
  }

  private updateWater(gameHours: number): void {
    this.stats.water = Math.max(0, this.stats.water - WATER_DECAY_PER_HOUR * gameHours)
  }

  private checkDeath(): void {
    if (this.isDead) return

    let reason = ''
    if (this.stats.hunger <= 0) {
      reason = '饥饿'
    } else if (this.stats.water <= 0) {
      reason = '脱水'
    } else if (this.stats.temperature <= -10) {
      reason = '体温过低'
    }

    if (reason) {
      this.isDead = true
      eventBus.emit('gameOver', { reason })
    }
  }

  useItem(itemId: string): boolean {
    if (this.isDead) return false
    if (this.inventory.query(itemId) < 1) return false

    let effect = false

    switch (itemId) {
      case 'grilledFish':
        effect = this.eatFood(30)
        break
      case 'berry':
        effect = this.eatFood(10)
        this.drinkWater(5)
        effect = true
        break
      case 'herbSoup':
        effect = this.eatFood(20)
        this.drinkWater(15)
        break
      case 'waterBottle':
        effect = this.drinkWater(40)
        break
      case 'leatherCoat':
        effect = this.wearClothing(10)
        break
      default:
        return false
    }

    if (effect) {
      this.inventory.removeItem(itemId, 1)
      this.emitStatsChange()
    }

    return effect
  }

  private eatFood(amount: number): boolean {
    if (this.stats.hunger >= 100) return false
    this.stats.hunger = Math.min(100, this.stats.hunger + amount)
    return true
  }

  private drinkWater(amount: number): boolean {
    if (this.stats.water >= 100) return false
    this.stats.water = Math.min(100, this.stats.water + amount)
    return true
  }

  private wearClothing(tempBonus: number): boolean {
    this.stats.temperature += tempBonus
    return true
  }

  getStats(): PlayerStats {
    return { ...this.stats }
  }

  getIsDead(): boolean {
    return this.isDead
  }

  reset(): void {
    this.stats = { ...this.initialStats }
    this.isDead = false
    this.currentWeather = 'sunny'
    this.isNight = false
    this.emitStatsChange()
  }

  private emitStatsChange(): void {
    eventBus.emit('statsChange', { ...this.stats })
  }

  destroy(): void {
    this.unsubscribeEvents()
  }
}

export default PlayerModule
