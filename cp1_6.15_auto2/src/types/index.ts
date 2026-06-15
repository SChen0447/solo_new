import * as THREE from 'three'

export interface EnvironmentParams {
  lightIntensity: number
  waterTurbidity: number
  currentSpeed: number
}

export interface FishSpecies {
  id: string
  name: string
  description: string
  color: number
  size: number
  speed: number
  count: number
}

export interface FishState {
  id: string
  speciesId: string
  position: THREE.Vector3
  rotation: THREE.Euler
  pathProgress: number
  pathPoints: THREE.Vector3[]
  isHovered: boolean
  hoverScale: number
}

export interface CoralConfig {
  type: number
  position: THREE.Vector3
  scale: number
  rotation: number
}

export interface SeaweedConfig {
  position: THREE.Vector3
  height: number
  swayFrequency: number
  swayPhase: number
}

export interface PlanktonParticle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  size: number
  opacity: number
}

export interface HoveredFishInfo {
  fishId: string
  speciesId: string
  screenPosition: { x: number; y: number }
  displayText: string
}

export const FISH_SPECIES: FishSpecies[] = [
  {
    id: 'clownfish',
    name: '小丑鱼',
    description: '栖息于珊瑚礁区，与海葵共生，体表橙色带白色条纹',
    color: 0xff6b35,
    size: 0.8,
    speed: 2.5,
    count: 5
  },
  {
    id: 'angelfish',
    name: '神仙鱼',
    description: '体型侧扁呈菱形，色彩艳丽，游动姿态优雅',
    color: 0x4fc3f7,
    size: 1.2,
    speed: 1.8,
    count: 4
  },
  {
    id: 'butterflyfish',
    name: '蝴蝶鱼',
    description: '身体扁平呈卵圆形，具有黑色假眼斑，以珊瑚虫为食',
    color: 0xffd54f,
    size: 1.0,
    speed: 3.0,
    count: 6
  },
  {
    id: 'bluetang',
    name: '蓝倒吊',
    description: '身体呈椭圆形，宝蓝色体色，尾柄处有黄色尾刺',
    color: 0x2196f3,
    size: 1.5,
    speed: 2.2,
    count: 3
  },
  {
    id: 'lionfish',
    name: '狮子鱼',
    description: '鳍条延长如丝状，具有毒性，体色红褐相间条纹',
    color: 0xe53935,
    size: 1.8,
    speed: 1.2,
    count: 3
  }
]

export const SCENE_CONFIG = {
  terrainSize: 100,
  terrainResolution: 128,
  minDepth: -50,
  maxDepth: -20,
  coralCount: 25,
  seaweedCount: 40,
  rockCount: 15,
  planktonCount: 500,
  fishAvoidanceRadius: 2,
  pathPointCount: 4,
  boundary: 45
} as const
