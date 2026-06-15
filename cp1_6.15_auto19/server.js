import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

const DATA_DIR = path.join(__dirname, 'data')
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')

const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    return []
  }
}

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error)
    return false
  }
}

app.get('/api/products', (req, res) => {
  const startTime = Date.now()
  const products = readJsonFile(PRODUCTS_FILE)
  const responseTime = Date.now() - startTime
  console.log(`[GET /api/products] ${responseTime}ms`)
  res.json(products)
})

app.get('/api/products/:id', (req, res) => {
  const startTime = Date.now()
  const { id } = req.params
  const products = readJsonFile(PRODUCTS_FILE)
  const product = products.find(p => p.id === id)
  const responseTime = Date.now() - startTime
  console.log(`[GET /api/products/${id}] ${responseTime}ms`)
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
  }
  res.json(product)
})

app.get('/api/orders', (req, res) => {
  const startTime = Date.now()
  const { status } = req.query
  let orders = readJsonFile(ORDERS_FILE)
  
  if (status) {
    orders = orders.filter(o => o.status === status)
  }
  
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const responseTime = Date.now() - startTime
  console.log(`[GET /api/orders] ${responseTime}ms, status: ${status || 'all'}`)
  res.json(orders)
})

app.get('/api/orders/:id', (req, res) => {
  const startTime = Date.now()
  const { id } = req.params
  const orders = readJsonFile(ORDERS_FILE)
  const order = orders.find(o => o.id === id)
  const responseTime = Date.now() - startTime
  console.log(`[GET /api/orders/${id}] ${responseTime}ms`)
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }
  res.json(order)
})

app.post('/api/orders', (req, res) => {
  const startTime = Date.now()
  try {
    const { productId, productName, customization, customerInfo, totalPrice, previewImages, notes } = req.body
    
    if (!productId || !productName || !customization || !customerInfo) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    const newOrder = {
      id: uuidv4(),
      productId,
      productName,
      customization,
      customerInfo,
      totalPrice,
      previewImages: previewImages || [],
      notes: notes || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    }
    
    const orders = readJsonFile(ORDERS_FILE)
    orders.push(newOrder)
    writeJsonFile(ORDERS_FILE, orders)
    
    const responseTime = Date.now() - startTime
    console.log(`[POST /api/orders] ${responseTime}ms, orderId: ${newOrder.id}`)
    res.status(201).json(newOrder)
  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({ error: 'Failed to create order' })
  }
})

app.patch('/api/orders/:id/status', (req, res) => {
  const startTime = Date.now()
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (!['pending', 'producing', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    
    const orders = readJsonFile(ORDERS_FILE)
    const orderIndex = orders.findIndex(o => o.id === id)
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    orders[orderIndex].status = status
    writeJsonFile(ORDERS_FILE, orders)
    
    const responseTime = Date.now() - startTime
    console.log(`[PATCH /api/orders/${id}/status] ${responseTime}ms, new status: ${status}`)
    res.json(orders[orderIndex])
  } catch (error) {
    console.error('Error updating order status:', error)
    res.status(500).json({ error: 'Failed to update order status' })
  }
})

app.delete('/api/orders/:id', (req, res) => {
  const startTime = Date.now()
  try {
    const { id } = req.params
    const orders = readJsonFile(ORDERS_FILE)
    const filteredOrders = orders.filter(o => o.id !== id)
    
    if (filteredOrders.length === orders.length) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    writeJsonFile(ORDERS_FILE, filteredOrders)
    const responseTime = Date.now() - startTime
    console.log(`[DELETE /api/orders/${id}] ${responseTime}ms`)
    res.json({ message: 'Order deleted successfully' })
  } catch (error) {
    console.error('Error deleting order:', error)
    res.status(500).json({ error: 'Failed to delete order' })
  }
})

app.post('/api/customization/save', (req, res) => {
  const startTime = Date.now()
  try {
    const { productId, customization } = req.body
    
    if (!productId || !customization) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    const savedCustomization = {
      id: uuidv4(),
      productId,
      customization,
      createdAt: new Date().toISOString()
    }
    
    const responseTime = Date.now() - startTime
    console.log(`[POST /api/customization/save] ${responseTime}ms`)
    res.json({ success: true, data: savedCustomization })
  } catch (error) {
    console.error('Error saving customization:', error)
    res.status(500).json({ error: 'Failed to save customization' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Leather Customization API Server running on http://localhost:${PORT}`)
  console.log(`Data directory: ${DATA_DIR}`)
})
