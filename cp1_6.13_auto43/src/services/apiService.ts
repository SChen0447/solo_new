/**
 * apiService.ts - API 服务模块
 *
 * 调用关系：被 App.tsx、ShoppingCart.tsx、ProductDetailPage.tsx、CheckoutPage.tsx 调用
 * 数据流向：apiService -> 组件状态(CartContext / useState) -> 子组件 props
 *
 * 性能优化：
 * - fetchProducts 使用 Map 缓存已请求过的数据，避免重复请求
 * - 筛选操作加 300ms 防抖
 * - 购物车更新操作加 500ms 防抖，防止频繁调用 API
 */

import axios from 'axios';

const API_BASE = '/api';

const productCache = new Map<string, any>();

function createDebounce(delay: number): (fn: (...args: any[]) => void) => (...args: any[]) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (fn: (...args: any[]) => void) => (...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

const debounceFilter = createDebounce(300);
const debounceCart = createDebounce(500);

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  origin: string;
  season: string[];
  nutrition: Record<string, string>;
  imageUrl: string;
}

export interface CartItem {
  productId: number;
  quantity: number;
}

export interface CartData {
  items: CartItem[];
  total: number;
}

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderRequest {
  items: OrderItem[];
  total: number;
  address: string;
  deliveryTime: string;
}

export async function fetchProducts(params?: { origin?: string; category?: string }): Promise<{ products: Product[] }> {
  const cacheKey = `products:${params?.origin || 'all'}:${params?.category || 'all'}`;

  if (productCache.has(cacheKey)) {
    return productCache.get(cacheKey);
  }

  const query: string[] = [];
  if (params?.origin && params.origin !== 'all') query.push(`origin=${encodeURIComponent(params.origin)}`);
  if (params?.category && params.category !== 'all') query.push(`category=${encodeURIComponent(params.category)}`);

  const url = `${API_BASE}/products${query.length ? '?' + query.join('&') : ''}`;
  const res = await axios.get(url);
  const data = res.data;

  productCache.set(cacheKey, data);
  return data;
}

export function fetchProductsDebounced(
  params: { origin?: string; category?: string },
  callback: (data: { products: Product[] }) => void
): void {
  debounceFilter(async () => {
    const data = await fetchProducts(params);
    callback(data);
  })();
}

export function clearProductCache(): void {
  productCache.clear();
}

export async function fetchProductById(id: number): Promise<{ product: Product }> {
  const res = await axios.get(`${API_BASE}/products/${id}`);
  return res.data;
}

export async function fetchCart(): Promise<CartData> {
  const res = await axios.get(`${API_BASE}/cart`);
  return res.data;
}

export async function addToCart(productId: number, quantity: number = 1): Promise<CartData> {
  const res = await axios.post(`${API_BASE}/cart`, { productId, quantity });
  return res.data;
}

export function addToCartDebounced(productId: number, quantity: number, callback: (data: CartData) => void): void {
  debounceCart(async () => {
    const data = await addToCart(productId, quantity);
    callback(data);
  })();
}

export async function removeFromCart(productId: number): Promise<CartData> {
  const res = await axios.delete(`${API_BASE}/cart/${productId}`);
  return res.data;
}

export async function updateCartQuantity(productId: number, quantity: number): Promise<CartData> {
  const res = await axios.post(`${API_BASE}/cart`, { productId, quantity });
  return res.data;
}

export async function createOrder(order: OrderRequest): Promise<{ success: boolean; order: any }> {
  const res = await axios.post(`${API_BASE}/orders`, order);
  clearProductCache();
  return res.data;
}

export async function fetchOrders(): Promise<{ orders: any[] }> {
  const res = await axios.get(`${API_BASE}/orders`);
  return res.data;
}
