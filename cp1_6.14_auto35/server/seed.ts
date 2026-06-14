import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, 'data')
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const seedDevices = [
  {
    id: uuidv4(),
    name: 'Fender Stratocaster 电吉他',
    category: '吉他',
    dailyPrice: 80,
    deposit: 2000,
    imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&q=80',
    description: '经典款 Fender Stratocaster 电吉他，美产，音色通透，适合流行、摇滚、布鲁斯等多种风格。配有琴包和背带。',
    ownerId: 'owner-001',
    ownerName: '音乐人小王',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'Yamaha P-125 电钢琴',
    category: '键盘',
    dailyPrice: 50,
    deposit: 1500,
    imageUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&q=80',
    description: 'Yamaha P-125 88键重锤电钢琴，音色逼真，便携设计，适合演出和练习使用。',
    ownerId: 'owner-001',
    ownerName: '音乐人小王',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'Marshall DSL40CR 音箱',
    category: '音响',
    dailyPrice: 120,
    deposit: 3000,
    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80',
    description: 'Marshall DSL40CR 全电子管吉他音箱，40瓦功率，经典英式失真音色，排练演出首选。',
    ownerId: 'owner-002',
    ownerName: '老炮儿老李',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'Boss GT-100 效果器',
    category: '效果器',
    dailyPrice: 35,
    deposit: 800,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    description: 'Boss GT-100 综合效果器，内置多种经典效果，支持表情踏板，演出排练利器。',
    ownerId: 'owner-002',
    ownerName: '老炮儿老李',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'Gibson Les Paul Studio 电吉他',
    category: '吉他',
    dailyPrice: 100,
    deposit: 3500,
    imageUrl: 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=600&q=80',
    description: 'Gibson Les Paul Studio 美产电吉他，桃花心木琴身，音色温暖厚实，适合摇滚和金属。',
    ownerId: 'owner-003',
    ownerName: '吉他疯子',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'Roland TD-17KV 电子鼓',
    category: '其他',
    dailyPrice: 150,
    deposit: 4000,
    imageUrl: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=600&q=80',
    description: 'Roland TD-17KV 电子鼓套装，音色逼真，支持静音练习，配有鼓凳和鼓棒。',
    ownerId: 'owner-003',
    ownerName: '吉他疯子',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'Korg Kronos 合成器工作站',
    category: '键盘',
    dailyPrice: 200,
    deposit: 8000,
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
    description: 'Korg Kronos 顶级合成器工作站，9种音色引擎，功能强大，专业演出录音必备。',
    ownerId: 'owner-004',
    ownerName: '键盘手小张',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'Line 6 Helix 效果器',
    category: '效果器',
    dailyPrice: 60,
    deposit: 2000,
    imageUrl: 'https://images.unsplash.com/photo-1621360841013-c768371e93cf?w=600&q=80',
    description: 'Line 6 Helix 旗舰级综合效果器，模拟真实音箱和效果器音色，专业级演出设备。',
    ownerId: 'owner-004',
    ownerName: '键盘手小张',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'JBL EON 615 有源音箱',
    category: '音响',
    dailyPrice: 90,
    deposit: 2500,
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
    description: 'JBL EON 615 15寸有源音箱，1000瓦功率，适合中小型演出和活动使用。',
    ownerId: 'owner-005',
    ownerName: '音响达人',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'AKG C414 电容麦克风',
    category: '其他',
    dailyPrice: 45,
    deposit: 1800,
    imageUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=600&q=80',
    description: 'AKG C414 多指向电容麦克风，专业录音级别，人声和乐器录制效果出色。',
    ownerId: 'owner-005',
    ownerName: '音响达人',
    createdAt: new Date().toISOString()
  }
]

const seedOrders = [
  {
    id: uuidv4(),
    deviceId: seedDevices[1].id,
    deviceName: seedDevices[1].name,
    deviceImageUrl: seedDevices[1].imageUrl,
    renterId: 'renter-001',
    renterName: '学生小李',
    ownerId: seedDevices[1].ownerId,
    ownerName: seedDevices[1].ownerName,
    days: 3,
    totalPrice: 150,
    deposit: 1500,
    status: 'renting' as const,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    startDate: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: uuidv4(),
    deviceId: seedDevices[3].id,
    deviceName: seedDevices[3].name,
    deviceImageUrl: seedDevices[3].imageUrl,
    renterId: 'renter-002',
    renterName: '乐队主唱',
    ownerId: seedDevices[3].ownerId,
    ownerName: seedDevices[3].ownerName,
    days: 5,
    totalPrice: 175,
    deposit: 800,
    status: 'paid' as const,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    startDate: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: uuidv4(),
    deviceId: seedDevices[0].id,
    deviceName: seedDevices[0].name,
    deviceImageUrl: seedDevices[0].imageUrl,
    renterId: 'renter-001',
    renterName: '学生小李',
    ownerId: seedDevices[0].ownerId,
    ownerName: seedDevices[0].ownerName,
    days: 7,
    totalPrice: 560,
    deposit: 2000,
    status: 'completed' as const,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    startDate: new Date(Date.now() - 86400000 * 14).toISOString()
  }
]

fs.writeFileSync(DEVICES_FILE, JSON.stringify(seedDevices, null, 2), 'utf-8')
fs.writeFileSync(ORDERS_FILE, JSON.stringify(seedOrders, null, 2), 'utf-8')

console.log('种子数据生成完成！')
console.log(`生成了 ${seedDevices.length} 个设备`)
console.log(`生成了 ${seedOrders.length} 个订单`)
