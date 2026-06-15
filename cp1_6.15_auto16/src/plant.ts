import { v4 as uuidv4 } from 'uuid'
import type { PlantStructure, GrowthStage, BranchData, LeafData, FlowerData } from './store'

const DARK_GREEN = { r: 0x2d / 255, g: 0x5a / 255, b: 0x27 / 255 }
const LIGHT_GREEN = { r: 0x7c / 255, g: 0xb3 / 255, b: 0x42 / 255 }
const PINK = { r: 0xff / 255, g: 0x6b / 255, b: 0x81 / 255 }
const PURPLE = { r: 0x9b / 255, g: 0x59 / 255, b: 0xb6 / 255 }

function lerpColor(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }, t: number): string {
  const r = Math.round((color1.r + (color2.r - color1.r) * t) * 255)
  const g = Math.round((color1.g + (color2.g - color1.g) * t) * 255)
  const b = Math.round((color1.b + (color2.b - color1.b) * t) * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t
}

function calculateStageProgress(light: number, humidity: number, temperature: number): number {
  const idealLight = 70
  const idealHumidity = 60
  const idealTemp = 65

  const lightScore = 1 - Math.abs(light - idealLight) / 100
  const humidityScore = 1 - Math.abs(humidity - idealHumidity) / 100
  const tempScore = 1 - Math.abs(temperature - idealTemp) / 100

  return (lightScore * 0.35 + humidityScore * 0.35 + tempScore * 0.3)
}

function determineGrowthStage(progress: number): GrowthStage {
  if (progress < 0.25) return 'seed'
  if (progress < 0.5) return 'sprout'
  if (progress < 0.75) return 'seedling'
  return 'flowering'
}

function generateBranches(count: number, mainStemHeight: number): BranchData[] {
  const branches: BranchData[] = []
  const branchStartY = mainStemHeight * 0.3
  const branchEndY = mainStemHeight * 0.85
  const stepY = (branchEndY - branchStartY) / Math.max(1, count)

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
    const y = branchStartY + stepY * i + Math.random() * 0.2
    const length = lerp(0.3, 0.8, Math.random())
    const thickness = lerp(0.04, 0.08, Math.random())
    const xRot = lerp(0.3, 0.8, Math.random())

    branches.push({
      id: uuidv4(),
      position: { x: 0, y, z: 0 },
      rotation: { x: xRot, y: angle, z: 0 },
      length,
      thickness
    })
  }

  return branches
}

function generateLeaves(count: number, thickness: number, leafColor: string, branches: BranchData[], mainStemHeight: number): LeafData[] {
  const leaves: LeafData[] = []

  for (let i = 0; i < count; i++) {
    if (branches.length > 0 && i < branches.length * 2) {
      const branchIndex = Math.floor(i / 2) % branches.length
      const branch = branches[branchIndex]
      const side = i % 2 === 0 ? 1 : -1
      const t = 0.5 + Math.random() * 0.4

      const branchAngleY = branch.rotation.y
      const branchAngleX = branch.rotation.x
      const branchLength = branch.length * t

      const baseX = Math.sin(branchAngleY) * branchLength * Math.cos(branchAngleX)
      const baseY = branch.position.y + branchLength * Math.sin(branchAngleX)
      const baseZ = Math.cos(branchAngleY) * branchLength * Math.cos(branchAngleX)

      const leafAngle = branchAngleY + side * (Math.PI / 2 + Math.random() * 0.3)
      const leafX = baseX + Math.sin(leafAngle) * 0.1
      const leafZ = baseZ + Math.cos(leafAngle) * 0.1

      leaves.push({
        id: uuidv4(),
        position: { x: leafX, y: baseY, z: leafZ },
        rotation: {
          x: Math.random() * 0.3 - 0.15,
          y: leafAngle + Math.random() * 0.2,
          z: side * (Math.PI / 4 + Math.random() * 0.2)
        },
        scale: {
          x: lerp(0.2, 0.4, Math.random()),
          y: thickness,
          z: lerp(0.35, 0.55, Math.random())
        },
        color: leafColor
      })
    } else {
      const y = lerp(mainStemHeight * 0.25, mainStemHeight * 0.75, Math.random())
      const angle = Math.random() * Math.PI * 2
      const dist = 0.1 + Math.random() * 0.15

      leaves.push({
        id: uuidv4(),
        position: {
          x: Math.sin(angle) * dist,
          y,
          z: Math.cos(angle) * dist
        },
        rotation: {
          x: Math.random() * 0.4 - 0.2,
          y: angle + Math.random() * 0.3,
          z: Math.random() * 0.5 - 0.25
        },
        scale: {
          x: lerp(0.2, 0.4, Math.random()),
          y: thickness,
          z: lerp(0.35, 0.55, Math.random())
        },
        color: leafColor
      })
    }
  }

  return leaves
}

function generateFlowers(count: number, flowerColor: string, branches: BranchData[], mainStemHeight: number): FlowerData[] {
  const flowers: FlowerData[] = []

  if (count <= 0) return flowers

  flowers.push({
    id: uuidv4(),
    position: { x: 0, y: mainStemHeight, z: 0 },
    rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
    color: flowerColor,
    petalCount: 5,
    scale: lerp(0.15, 0.25, Math.random())
  })

  const branchFlowerCount = Math.min(count - 1, branches.length)
  for (let i = 0; i < branchFlowerCount; i++) {
    const branch = branches[i % branches.length]
    const branchAngleY = branch.rotation.y
    const branchAngleX = branch.rotation.x
    const branchLength = branch.length

    const tipX = Math.sin(branchAngleY) * branchLength * Math.cos(branchAngleX)
    const tipY = branch.position.y + branchLength * Math.sin(branchAngleX)
    const tipZ = Math.cos(branchAngleY) * branchLength * Math.cos(branchAngleX)

    flowers.push({
      id: uuidv4(),
      position: { x: tipX, y: tipY, z: tipZ },
      rotation: {
        x: Math.random() * 0.3,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * 0.3
      },
      color: flowerColor,
      petalCount: 5,
      scale: lerp(0.1, 0.18, Math.random())
    })
  }

  return flowers
}

export function calculatePlantStructure(light: number, humidity: number, temperature: number): PlantStructure {
  const progress = calculateStageProgress(light, humidity, temperature)
  const stage = determineGrowthStage(progress)

  const lightNorm = light / 100
  const humidityNorm = humidity / 100
  const tempNorm = temperature / 100

  const mainStemHeight = lerp(0.5, 3, lightNorm)
  const leafCount = Math.round(lerp(2, 8, humidityNorm))
  const leafThickness = lerp(0.1, 0.3, humidityNorm)
  const flowerCount = Math.round(lerp(0, 6, tempNorm))

  const leafColor = lerpColor(DARK_GREEN, LIGHT_GREEN, lightNorm)
  const flowerColor = lerpColor(PINK, PURPLE, tempNorm)

  let branchCount = 0
  if (stage === 'seedling' || stage === 'flowering') {
    branchCount = Math.round(lerp(3, 5, humidityNorm))
  }

  const branches = generateBranches(branchCount, mainStemHeight)
  const leaves = (stage === 'seedling' || stage === 'flowering')
    ? generateLeaves(leafCount, leafThickness, leafColor, branches, mainStemHeight)
    : []
  const flowers = stage === 'flowering'
    ? generateFlowers(flowerCount, flowerColor, branches, mainStemHeight)
    : []

  const stageProgress = calculateStageProgressWithinStage(progress, stage)

  return {
    stage,
    mainStemHeight,
    mainStemThickness: 0.12 + lightNorm * 0.08,
    branches,
    leaves,
    flowers,
    stageProgress
  }
}

function calculateStageProgressWithinStage(overallProgress: number, stage: GrowthStage): number {
  switch (stage) {
    case 'seed':
      return overallProgress / 0.25
    case 'sprout':
      return (overallProgress - 0.25) / 0.25
    case 'seedling':
      return (overallProgress - 0.5) / 0.25
    case 'flowering':
      return (overallProgress - 0.75) / 0.25
    default:
      return 0
  }
}

export const STAGE_NAMES: Record<GrowthStage, string> = {
  seed: '种子',
  sprout: '幼芽',
  seedling: '成苗',
  flowering: '开花'
}

export const STAGE_COLORS: Record<GrowthStage, string> = {
  seed: '#888888',
  sprout: '#4caf50',
  seedling: '#2196f3',
  flowering: 'linear-gradient(135deg, #ff6b81, #9b59b6, #ffeb3b)'
}
