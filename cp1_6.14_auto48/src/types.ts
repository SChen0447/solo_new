export type OrderStatus = 'pending' | 'cooking' | 'delivering' | 'delivered';

export interface OrderItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface Location {
  x: number;
  y: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  customerName: string;
  address: string;
  phone: string;
  location: Location;
  items: OrderItem[];
  customItems: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: number;
  deliveredAt?: number;
  notes?: string;
}

export interface RoutePoint {
  orderId: string;
  orderNumber: number;
  location: Location;
  index: number;
}

export interface RouteResult {
  sequence: RoutePoint[];
  totalDistance: number;
}

export interface DailyStats {
  totalOrders: number;
  avgDeliveryTime: number;
  totalSales: number;
}

export interface WeeklyData {
  date: string;
  sales: number;
  target: number;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '待处理',
  cooking: '制作中',
  delivering: '配送中',
  delivered: '已送达',
};

export const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'status-pending',
  cooking: 'status-cooking',
  delivering: 'status-delivering',
  delivered: 'status-delivered',
};

export const TIMEOUT_MINUTES = 30;
