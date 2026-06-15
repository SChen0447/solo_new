import { create } from 'zustand'
import type { 
  Product, 
  Customization, 
  Order, 
  CustomerInfo, 
  PreviewImage, 
  AppState, 
  AppActions,
  OrderStatus,
  LeatherOption,
  StitchOption,
  HardwareOption
} from './types'
import { LEATHER_OPTIONS, STITCH_OPTIONS, HARDWARE_OPTIONS } from './types'
import axios from 'axios'
import { orderManager } from './OrderManager'

const initialCustomerInfo: CustomerInfo = {
  name: '',
  phone: '',
  email: '',
  address: ''
}

const initialCustomization: Customization = {
  leather: LEATHER_OPTIONS[0],
  stitch: STITCH_OPTIONS[0],
  hardware: HARDWARE_OPTIONS[0]
}

interface StoreState extends AppState, AppActions {}

export const useAppStore = create<StoreState>((set, get) => ({
  products: [],
  selectedProduct: null,
  currentCustomization: initialCustomization,
  orders: [],
  previewImages: [],
  customerInfo: initialCustomerInfo,
  isSubmitting: false,
  currentView: 'customize',

  setSelectedProduct: (product: Product | null) => {
    set({ 
      selectedProduct: product,
      currentCustomization: product ? product.defaultCustomization : initialCustomization,
      previewImages: []
    })
  },

  updateCustomization: (customization: Partial<Customization>) => {
    set((state) => ({
      currentCustomization: {
        ...state.currentCustomization,
        ...customization
      }
    }))
  },

  setCustomerInfo: (info: Partial<CustomerInfo>) => {
    set((state) => ({
      customerInfo: {
        ...state.customerInfo,
        ...info
      }
    }))
  },

  addPreviewImage: (image: PreviewImage) => {
    set((state) => {
      const existingIndex = state.previewImages.findIndex(p => p.angle === image.angle)
      const newImages = [...state.previewImages]
      
      if (existingIndex >= 0) {
        newImages[existingIndex] = image
      } else {
        newImages.push(image)
      }
      
      return { previewImages: newImages }
    })
  },

  clearPreviewImages: () => {
    set({ previewImages: [] })
  },

  submitOrder: async (): Promise<Order | null> => {
    const state = get()
    
    if (!state.selectedProduct) {
      console.error('No product selected')
      return null
    }

    const validation = orderManager.validateCustomerInfo(state.customerInfo)
    if (!validation.valid) {
      console.error('Invalid customer info:', validation.errors)
      return null
    }

    set({ isSubmitting: true })

    try {
      const totalPrice = orderManager.calculateTotalPrice(
        state.selectedProduct.basePrice,
        state.currentCustomization
      )

      const order = await orderManager.createOrder({
        productId: state.selectedProduct.id,
        productName: state.selectedProduct.name,
        customization: state.currentCustomization,
        customerInfo: state.customerInfo,
        totalPrice,
        previewImages: state.previewImages
      })

      set({ isSubmitting: false })
      return order
    } catch (error) {
      console.error('Failed to submit order:', error)
      set({ isSubmitting: false })
      return null
    }
  },

  fetchProducts: async (): Promise<void> => {
    try {
      const response = await axios.get<Product[]>('/api/products')
      set({ products: response.data })
      
      if (response.data.length > 0 && !get().selectedProduct) {
        set({ 
          selectedProduct: response.data[0],
          currentCustomization: response.data[0].defaultCustomization
        })
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  },

  fetchOrders: async (): Promise<void> => {
    try {
      const orders = await orderManager.getOrders()
      set({ orders })
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<void> => {
    try {
      await orderManager.updateOrderStatus(orderId, status)
      
      set((state) => ({
        orders: state.orders.map(o => 
          o.id === orderId ? { ...o, status } : o
        )
      }))
    } catch (error) {
      console.error('Failed to update order status:', error)
    }
  },

  setCurrentView: (view: 'customize' | 'admin') => {
    set({ currentView: view })
  },

  resetForm: () => {
    set({
      customerInfo: initialCustomerInfo,
      previewImages: [],
      isSubmitting: false
    })
    
    const selectedProduct = get().selectedProduct
    if (selectedProduct) {
      set({
        currentCustomization: selectedProduct.defaultCustomization
      })
    }
  }
}))

export type { LeatherOption, StitchOption, HardwareOption }
