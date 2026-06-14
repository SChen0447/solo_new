export interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  dailyRate: number;
  stock: number;
  imageUrl: string;
  description: string;
  specs: Record<string, string>;
  reviews: Review[];
}

export type OrderStatus = 'pending' | 'in_use' | 'returned';

export interface CartItem {
  productId: string;
  productName: string;
  dailyRate: number;
  startDate: string;
  endDate: string;
  days: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  dailyRate: number;
  startDate: string;
  endDate: string;
  days: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNo: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  actualReturnDate?: string;
  lateFee?: number;
}
