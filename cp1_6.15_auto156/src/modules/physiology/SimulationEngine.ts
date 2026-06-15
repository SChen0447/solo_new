import { useStore, type CellType, type OrganelleId, type SimulationParams } from '@/store/Store'

export class SimulationEngine {
  private isRunning: boolean
  private lastUpdateTime: number
  private animationFrameId: number | null
  private cellType: CellType
  private params: SimulationParams
  private baseValues: Record<OrganelleId, number>
  private lastValues: Record<OrganelleId, number>
  private readonly UPDATE_INTERVAL = 1000
  private readonly NOISE_FACTOR = 0.15
  private readonly SMOOTHING_FACTOR = 0.3

  constructor() {
    this.isRunning = false
    this.lastUpdateTime = 0
    this.animationFrameId = null
    this.cellType = 'animal'
    this.params = { lightIntensity: 500, glucoseConcentration: 10 }
    this.baseValues = {
      nucleus: 50,
      mitochondria: 25,
      chloroplast: 30,
      golgi: 40,
      endoplasmicReticulum: 35,
      cellMembrane: -70,
      cellWall: 20,
      vacuole: 0.5,
    }
    this.lastValues = { ...this.baseValues }
  }

  public start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.lastUpdateTime = performance.now()
    this.simulationLoop()
  }

  public stop(): void {
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  public setCellType(cellType: CellType): void {
    this.cellType = cellType
    this.resetValues()
  }

  public setParams(params: SimulationParams): void {
    this.params = params
  }

  private resetValues(): void {
    this.lastValues = { ...this.baseValues }
  }

  private simulationLoop = (): void => {
    if (!this.isRunning) return

    const now = performance.now()
    const delta = now - this.lastUpdateTime

    if (delta >= this.UPDATE_INTERVAL) {
      this.updateSimulation()
      this.lastUpdateTime = now
    }

    this.animationFrameId = requestAnimationFrame(this.simulationLoop)
  }

  private updateSimulation(): void {
    const state = useStore.getState()
    if (!state.isRunning) return

    const newTime = state.simulationTime + 1
    state.setSimulationTime(newTime)

    const activeOrganelles = this.getActiveOrganelles()

    for (const organelleId of activeOrganelles) {
      const value = this.calculateOrganelleValue(organelleId)
      state.appendDataPoint(organelleId, value)
    }
  }

  private getActiveOrganelles(): OrganelleId[] {
    const baseOrganelles: OrganelleId[] = [
      'nucleus',
      'mitochondria',
      'golgi',
      'endoplasmicReticulum',
      'cellMembrane',
    ]

    if (this.cellType === 'plant') {
      return [...baseOrganelles, 'chloroplast', 'cellWall', 'vacuole']
    }

    return baseOrganelles
  }

  private calculateOrganelleValue(organelleId: OrganelleId): number {
    const baseValue = this.baseValues[organelleId]
    const lastValue = this.lastValues[organelleId]

    let value = baseValue
    const lightFactor = this.params.lightIntensity / 1000
    const glucoseFactor = this.params.glucoseConcentration / 20

    switch (organelleId) {
      case 'mitochondria':
        value = baseValue * (0.3 + glucoseFactor * 0.5 + lightFactor * 0.2)
        value = Math.min(50, Math.max(0, value))
        break

      case 'chloroplast':
        value = baseValue * (0.2 + lightFactor * 0.7 + glucoseFactor * 0.1)
        value = Math.min(60, Math.max(0, value))
        break

      case 'nucleus':
        value = baseValue * (0.6 + (lightFactor + glucoseFactor) * 0.2)
        value = Math.min(100, Math.max(10, value))
        break

      case 'golgi':
        value = baseValue * (0.5 + glucoseFactor * 0.3 + lightFactor * 0.2)
        value = Math.min(80, Math.max(10, value))
        break

      case 'endoplasmicReticulum':
        value = baseValue * (0.4 + glucoseFactor * 0.4 + lightFactor * 0.2)
        value = Math.min(70, Math.max(10, value))
        break

      case 'cellMembrane':
        value = baseValue + (lightFactor + glucoseFactor) * 10
        value = Math.min(-40, Math.max(-90, value))
        break

      case 'cellWall':
        value = baseValue * (0.3 + glucoseFactor * 0.5 + lightFactor * 0.2)
        value = Math.min(40, Math.max(5, value))
        break

      case 'vacuole':
        value = baseValue * (0.5 + lightFactor * 0.3 + glucoseFactor * 0.2)
        value = Math.min(1, Math.max(0.1, value))
        break
    }

    const noise = value * this.NOISE_FACTOR * (Math.random() * 2 - 1)
    value += noise

    const smoothedValue = lastValue + (value - lastValue) * this.SMOOTHING_FACTOR
    this.lastValues[organelleId] = smoothedValue

    return Math.round(smoothedValue * 100) / 100
  }

  public getLinkedOrganelle(selectedId: OrganelleId): OrganelleId | null {
    const links: Record<OrganelleId, OrganelleId> = {
      nucleus: 'mitochondria',
      mitochondria: 'nucleus',
      chloroplast: 'mitochondria',
      golgi: 'endoplasmicReticulum',
      endoplasmicReticulum: 'golgi',
      cellMembrane: 'nucleus',
      cellWall: 'vacuole',
      vacuole: 'cellWall',
    }
    return links[selectedId] || null
  }

  public dispose(): void {
    this.stop()
  }
}
