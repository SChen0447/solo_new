import { eventBus } from './EventBus'
import type { GameTime, WeatherType, TickEvent, WeatherChangeEvent } from './types'

const MS_PER_GAME_HOUR = 10000
const MS_PER_GAME_MINUTE = MS_PER_GAME_HOUR / 60
const WEATHER_CHANGE_INTERVAL = 30000

const WEATHER_PROBABILITIES: Record<WeatherType, number> = {
  sunny: 0.5,
  cloudy: 0.2,
  rainy: 0.15,
  snowy: 0.1,
  foggy: 0.05
}

export class GameEngine {
  private gameTime: GameTime = { hour: 6, minute: 0, day: 1 }
  private weather: WeatherType = 'sunny'
  private lastTickTime: number = 0
  private lastWeatherChange: number = 0
  private animationFrameId: number | null = null
  private lastEmitTime: number = 0
  private emitInterval: number = 100
  private running: boolean = false
  private startTime: number = 0

  start(): void {
    if (this.running) return
    this.running = true
    this.startTime = performance.now()
    this.lastTickTime = this.startTime
    this.lastWeatherChange = this.startTime
    this.lastEmitTime = 0
    this.gameLoop()
  }

  stop(): void {
    this.running = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  reset(): void {
    this.gameTime = { hour: 6, minute: 0, day: 1 }
    this.weather = 'sunny'
    this.lastWeatherChange = performance.now()
    this.startTime = performance.now()
    this.lastTickTime = this.startTime
  }

  private gameLoop = (): void => {
    if (!this.running) return

    const now = performance.now()
    const deltaRealTime = now - this.lastTickTime
    this.lastTickTime = now

    this.updateTime(deltaRealTime)
    this.updateWeather(now)

    if (now - this.lastEmitTime >= this.emitInterval) {
      this.emitTick(deltaRealTime)
      this.lastEmitTime = now
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop)
  }

  private updateTime(deltaRealTime: number): void {
    const gameMinutesPassed = deltaRealTime / MS_PER_GAME_MINUTE
    let totalMinutes = this.gameTime.hour * 60 + this.gameTime.minute + gameMinutesPassed
    
    while (totalMinutes >= 1440) {
      totalMinutes -= 1440
      this.gameTime.day++
    }
    
    this.gameTime.hour = Math.floor(totalMinutes / 60) % 24
    this.gameTime.minute = totalMinutes % 60
  }

  private updateWeather(now: number): void {
    if (now - this.lastWeatherChange >= WEATHER_CHANGE_INTERVAL) {
      const newWeather = this.rollWeather()
      if (newWeather !== this.weather) {
        const oldWeather = this.weather
        this.weather = newWeather
        const event: WeatherChangeEvent = { from: oldWeather, to: newWeather }
        eventBus.emit('weatherChange', event)
      }
      this.lastWeatherChange = now
    }
  }

  private rollWeather(): WeatherType {
    const rand = Math.random()
    let cumulative = 0

    for (const [weather, prob] of Object.entries(WEATHER_PROBABILITIES)) {
      cumulative += prob
      if (rand <= cumulative) {
        return weather as WeatherType
      }
    }
    return 'sunny'
  }

  private emitTick(deltaRealTime: number): void {
    const event: TickEvent = {
      time: { ...this.gameTime },
      weather: this.weather,
      deltaTime: deltaRealTime
    }
    eventBus.emit('tick', event)
  }

  getTime(): GameTime {
    return { ...this.gameTime }
  }

  getWeather(): WeatherType {
    return this.weather
  }

  getDayProgress(): number {
    return (this.gameTime.hour * 60 + this.gameTime.minute) / 1440
  }

  isNight(): boolean {
    return this.gameTime.hour < 6 || this.gameTime.hour >= 18
  }

  getNightIntensity(): number {
    const hour = this.gameTime.hour
    if (hour >= 6 && hour < 18) {
      return 0
    }
    if (hour >= 18 && hour < 20) {
      return (hour - 18) / 2
    }
    if (hour >= 5 && hour < 6) {
      return 1 - (hour - 5)
    }
    return 1
  }
}

export default GameEngine
