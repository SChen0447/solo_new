export interface Product {
  id: string
  name: string
  category: 'wallet' | 'handbag' | 'cardholder' | 'belt'
  description: string
  basePrice: number
  modelConfig: ModelConfig
  defaultCustomization: Customization
}

export interface ModelConfig {
  type: string
  dimensions: {
    width: number
    height: number
    depth: number
  }
  parts: ModelPart[]
}

export interface ModelPart {
  id: string
  name: string
  geometry: string
  materialType: 'leather' | 'stitch' | 'hardware'
  position: [number, number, number]
  rotation: [number, number, number]
}

export interface Customization {
  leather: LeatherOption
  stitch: StitchOption
  hardware: HardwareOption
}

export interface LeatherOption {
  id: string
  name: string
  color: string
  roughness: number
  metalness: number
}

export interface StitchOption {
  id: string
  name: string
  color: string
}

export interface HardwareOption {
  id: string
  name: string
  color: string
  metalness: number
  roughness: number
}

export interface Order {
  id: string
  productId: string
  productName: string
  customization: Customization
  customerInfo: CustomerInfo
  status: OrderStatus
  totalPrice: number
  createdAt: string
  previewImages: PreviewImage[]
  notes?: string
}

export interface CustomerInfo {
  name: string
  phone: string
  email: string
  address: string
}

export type OrderStatus = 'pending' | 'producing' | 'completed'

export interface PreviewImage {
  angle: string
  dataUrl: string
}

export interface SceneConfig {
  productId: string
  modelConfig: ModelConfig
  customization: Customization
  cameraPosition: [number, number, number]
  autoRotate: boolean
  rotateSpeed: number
}

export interface AppState {
  products: Product[]
  selectedProduct: Product | null
  currentCustomization: Customization
  orders: Order[]
  previewImages: PreviewImage[]
  customerInfo: CustomerInfo
  isSubmitting: boolean
  currentView: 'customize' | 'admin'
}

export interface AppActions {
  setSelectedProduct: (product: Product | null) => void
  updateCustomization: (customization: Partial<Customization>) => void
  setCustomerInfo: (info: Partial<CustomerInfo>) => void
  addPreviewImage: (image: PreviewImage) => void
  clearPreviewImages: () => void
  submitOrder: () => Promise<Order | null>
  fetchProducts: () => Promise<void>
  fetchOrders: () => Promise<void>
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
  setCurrentView: (view: 'customize' | 'admin') => void
  resetForm: () => void
}

export const LEATHER_OPTIONS: LeatherOption[] = [
  { id: 'veg-tan', name: '植鞣本色', color: '#c4a578', roughness: 0.6, metalness: 0.05 },
  { id: 'waxed-brown', name: '擦蜡棕', color: '#8b6914', roughness: 0.4, metalness: 0.1 },
  { id: 'matte-black', name: '雾面黑', color: '#2d2d2d', roughness: 0.7, metalness: 0.05 },
  { id: 'vintage-red', name: '复古红', color: '#8b0000', roughness: 0.5, metalness: 0.08 }
]

export const STITCH_OPTIONS: StitchOption[] = [
  { id: 'beige', name: '米色', color: '#f5deb3' },
  { id: 'brown', name: '棕色', color: '#8b4513' },
  { id: 'gold', name: '金色', color: '#ffd700' },
  { id: 'black', name: '黑色', color: '#1a1a1a' },
  { id: 'white', name: '白色', color: '#ffffff' },
  { id: 'red', name: '红色', color: '#dc143c' }
]

export const HARDWARE_OPTIONS: HardwareOption[] = [
  { id: 'brass', name: '黄铜', color: '#b5a642', metalness: 0.9, roughness: 0.3 },
  { id: 'silver', name: '银', color: '#c0c0c0', metalness: 0.95, roughness: 0.15 },
  { id: 'black-nickel', name: '黑镍', color: '#2a2a2a', metalness: 0.85, roughness: 0.4 },
  { id: 'bronze', name: '古铜', color: '#cd7f32', metalness: 0.8, roughness: 0.5 }
]

export const CAMERA_ANGLES: Record<string, [number, number, number]> = {
  front: [0, 0, 5],
  side: [5, 0, 0],
  top: [0, 5, 0],
  'back-45': [3.5, 2, 3.5]
}

export const ANGLE_LABELS: Record<string, string> = {
  front: '正面',
  side: '侧面',
  top: '俯视',
  'back-45': '45度背面'
}
