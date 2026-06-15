import axios from 'axios'
import type { Order, OrderStatus, CustomerInfo, Customization, PreviewImage } from './types'

const API_BASE = '/api'

export class OrderManager {
  private static instance: OrderManager | null = null

  private constructor() {}

  public static getInstance(): OrderManager {
    if (!OrderManager.instance) {
      OrderManager.instance = new OrderManager()
    }
    return OrderManager.instance
  }

  public async createOrder(params: {
    productId: string
    productName: string
    customization: Customization
    customerInfo: CustomerInfo
    totalPrice: number
    previewImages: PreviewImage[]
    notes?: string
  }): Promise<Order> {
    const startTime = performance.now()

    try {
      const response = await axios.post<Order>(`${API_BASE}/orders`, params, {
        timeout: 5000
      })

      const elapsed = performance.now() - startTime
      console.log(`[OrderManager] Order created in ${elapsed.toFixed(2)}ms, ID: ${response.data.id}`)

      return response.data
    } catch (error) {
      console.error('[OrderManager] Failed to create order:', error)
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to create order')
      }
      throw error
    }
  }

  public async getOrders(status?: OrderStatus): Promise<Order[]> {
    const startTime = performance.now()

    try {
      const params = status ? { status } : {}
      const response = await axios.get<Order[]>(`${API_BASE}/orders`, {
        params,
        timeout: 3000
      })

      const elapsed = performance.now() - startTime
      console.log(`[OrderManager] Fetched ${response.data.length} orders in ${elapsed.toFixed(2)}ms`)

      return response.data
    } catch (error) {
      console.error('[OrderManager] Failed to fetch orders:', error)
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to fetch orders')
      }
      throw error
    }
  }

  public async getOrderById(orderId: string): Promise<Order> {
    const startTime = performance.now()

    try {
      const response = await axios.get<Order>(`${API_BASE}/orders/${orderId}`, {
        timeout: 3000
      })

      const elapsed = performance.now() - startTime
      console.log(`[OrderManager] Fetched order ${orderId} in ${elapsed.toFixed(2)}ms`)

      return response.data
    } catch (error) {
      console.error('[OrderManager] Failed to fetch order:', error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Order not found')
        }
        throw new Error(error.response?.data?.error || 'Failed to fetch order')
      }
      throw error
    }
  }

  public async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const startTime = performance.now()

    try {
      const response = await axios.patch<Order>(
        `${API_BASE}/orders/${orderId}/status`,
        { status },
        { timeout: 3000 }
      )

      const elapsed = performance.now() - startTime
      console.log(`[OrderManager] Updated order ${orderId} status to ${status} in ${elapsed.toFixed(2)}ms`)

      return response.data
    } catch (error) {
      console.error('[OrderManager] Failed to update order status:', error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Order not found')
        }
        throw new Error(error.response?.data?.error || 'Failed to update order status')
      }
      throw error
    }
  }

  public async deleteOrder(orderId: string): Promise<void> {
    const startTime = performance.now()

    try {
      await axios.delete(`${API_BASE}/orders/${orderId}`, {
        timeout: 3000
      })

      const elapsed = performance.now() - startTime
      console.log(`[OrderManager] Deleted order ${orderId} in ${elapsed.toFixed(2)}ms`)
    } catch (error) {
      console.error('[OrderManager] Failed to delete order:', error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Order not found')
        }
        throw new Error(error.response?.data?.error || 'Failed to delete order')
      }
      throw error
    }
  }

  public async saveCustomization(productId: string, customization: Customization): Promise<void> {
    const startTime = performance.now()

    try {
      await axios.post(
        `${API_BASE}/customization/save`,
        { productId, customization },
        { timeout: 3000 }
      )

      const elapsed = performance.now() - startTime
      console.log(`[OrderManager] Saved customization for product ${productId} in ${elapsed.toFixed(2)}ms`)
    } catch (error) {
      console.error('[OrderManager] Failed to save customization:', error)
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to save customization')
      }
      throw error
    }
  }

  public validateCustomerInfo(info: Partial<CustomerInfo>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!info.name || info.name.trim().length < 2) {
      errors.push('请输入有效的姓名')
    }

    if (!info.phone || !/^1[3-9]\d{9}$/.test(info.phone)) {
      errors.push('请输入有效的手机号码')
    }

    if (!info.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) {
      errors.push('请输入有效的邮箱地址')
    }

    if (!info.address || info.address.trim().length < 10) {
      errors.push('请输入完整的收货地址')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  public calculateTotalPrice(basePrice: number, customization: Customization): number {
    const leatherMultiplier = this.getLeatherPriceMultiplier(customization.leather.id)
    const hardwareMultiplier = this.getHardwarePriceMultiplier(customization.hardware.id)
    
    return Math.round(basePrice * leatherMultiplier * hardwareMultiplier)
  }

  private getLeatherPriceMultiplier(leatherId: string): number {
    const multipliers: Record<string, number> = {
      'veg-tan': 1.0,
      'waxed-brown': 1.15,
      'matte-black': 1.1,
      'vintage-red': 1.2
    }
    return multipliers[leatherId] || 1.0
  }

  private getHardwarePriceMultiplier(hardwareId: string): number {
    const multipliers: Record<string, number> = {
      'brass': 1.0,
      'silver': 1.15,
      'black-nickel': 1.1,
      'bronze': 1.05
    }
    return multipliers[hardwareId] || 1.0
  }
}

export const orderManager = OrderManager.getInstance()
