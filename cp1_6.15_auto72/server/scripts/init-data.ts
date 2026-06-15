import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '../../data')

const roomId1 = uuidv4()
const roomId2 = uuidv4()

const rooms = [
  {
    id: roomId1,
    name: '主展厅 - 当代艺术展',
    description: '展示精选当代艺术家的优秀作品，融合绘画、雕塑和数字艺术。',
    wallColor: '#2c2c3a',
    initialCamera: { x: 0, y: 2, z: 12 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: roomId2,
    name: '数字艺术长廊',
    description: '探索数字艺术的无限可能，体验科技与艺术的完美融合。',
    wallColor: '#1e2a3a',
    initialCamera: { x: 0, y: 2, z: 12 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const artworks = [
  {
    id: uuidv4(),
    roomId: roomId1,
    name: '晨曦之光',
    author: '李明远',
    year: 2023,
    description: '这幅作品捕捉了清晨第一缕阳光穿透云层的瞬间，金色的光芒洒落在宁静的湖面上，象征着希望与新生。艺术家运用细腻的笔触和温暖的色调，将大自然的壮美与宁静完美融合。',
    modelFile: '',
    position: { x: -8, y: 1.5, z: -10 },
    rotation: { x: 0, y: 0.3, z: 0 },
    scale: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    roomId: roomId1,
    name: '城市记忆',
    author: '张艺华',
    year: 2022,
    description: '以抽象的形式展现都市生活的繁华与喧嚣。几何形态的堆叠与交错，如同城市中林立的高楼大厦；色彩的碰撞与融合，恰似人群中各异的面孔与故事。',
    modelFile: '',
    position: { x: 0, y: 1.5, z: -12 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1.2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    roomId: roomId1,
    name: '静谧之境',
    author: '王思远',
    year: 2024,
    description: '一件以极简主义风格创作的雕塑作品，光滑的曲面在灯光下呈现出柔和的渐变。作品探讨了空间、光影与观者感知之间的微妙关系。',
    modelFile: '',
    position: { x: 8, y: 1.5, z: -10 },
    rotation: { x: 0, y: -0.3, z: 0 },
    scale: 0.9,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    roomId: roomId1,
    name: '时间的河流',
    author: '陈雨晴',
    year: 2023,
    description: '这幅作品以流动的线条和渐变的色彩表现时间的流逝。从左至右，色彩由暖转冷，形态由实转虚，隐喻着生命从诞生到消逝的永恒循环。',
    modelFile: '',
    position: { x: -12, y: 1.5, z: 0 },
    rotation: { x: 0, y: 1.57, z: 0 },
    scale: 1.1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    roomId: roomId1,
    name: '梦境花园',
    author: '林小溪',
    year: 2024,
    description: '超现实主义风格的数字艺术作品，展现了一个奇幻的梦境世界。悬浮的岛屿、发光的植物、梦幻的光影，共同构建出一个超越现实的美丽幻境。',
    modelFile: '',
    position: { x: 12, y: 1.5, z: 0 },
    rotation: { x: 0, y: -1.57, z: 0 },
    scale: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const visitLogs: any[] = []

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

fs.writeFileSync(path.join(dataDir, 'rooms.json'), JSON.stringify(rooms, null, 2))
fs.writeFileSync(path.join(dataDir, 'artworks.json'), JSON.stringify(artworks, null, 2))
fs.writeFileSync(path.join(dataDir, 'visit-logs.json'), JSON.stringify(visitLogs, null, 2))

console.log('Sample data initialized successfully!')
console.log(`Created ${rooms.length} rooms and ${artworks.length} artworks.`)
