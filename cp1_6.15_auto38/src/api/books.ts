export interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  coverImage: string;
  description: string;
  pages: number;
  publisher: string;
  publishDate: string;
  coverColor: string;
  spineColor: string;
  pageColor: string;
  edgeDesign: string;
  specialFeatures: string[];
}

export interface CartItem {
  book: Book;
  edition: 'hardcover' | 'special' | 'collectors';
  engraving: string;
  quantity: number;
}

export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  shippingInfo: ShippingInfo;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'completed';
  createdAt: string;
  estimatedDelivery?: string;
  updatedAt?: string;
}

export interface OrderResponse {
  orderId: string;
  estimatedDelivery: string;
  status: string;
}

export const EDITION_PRICES: Record<string, number> = {
  hardcover: 1,
  special: 1.5,
  collectors: 2.5
};

export const EDITION_NAMES: Record<string, string> = {
  hardcover: '普通精装',
  special: '特装刷边',
  collectors: '典藏版'
};

export const getBooks = async (): Promise<Book[]> => {
  const response = await fetch('/api/books');
  if (!response.ok) {
    throw new Error('Failed to fetch books');
  }
  return response.json();
};

export const getBookById = async (id: string): Promise<Book> => {
  const response = await fetch(`/api/books/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch book');
  }
  return response.json();
};

export const getOrders = async (): Promise<Order[]> => {
  const response = await fetch('/api/orders');
  if (!response.ok) {
    throw new Error('Failed to fetch orders');
  }
  return response.json();
};

export const submitOrder = async (
  items: CartItem[],
  shippingInfo: ShippingInfo,
  total: number
): Promise<OrderResponse> => {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ items, shippingInfo, total })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit order');
  }
  
  return response.json();
};

export const updateOrderStatus = async (
  orderId: string,
  status: string
): Promise<{ success: boolean; order: Order }> => {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update order status');
  }
  
  return response.json();
};

export const calculateItemPrice = (basePrice: number, edition: string): number => {
  return Math.round(basePrice * EDITION_PRICES[edition]);
};

export const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => {
    const itemPrice = calculateItemPrice(item.book.price, item.edition);
    return total + itemPrice * item.quantity;
  }, 0);
};
