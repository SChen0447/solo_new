/**
 * CartContext.tsx - 购物车全局状态管理
 *
 * 调用关系：被 App.tsx 包裹（CartProvider），被 ShoppingCart.tsx / ProductCard.tsx / ProductDetailPage.tsx 使用
 * 数据流向：apiService -> CartContext 状态 -> ShoppingCart / ProductCard 子组件 props
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchCart,
  addToCart as apiAddToCart,
  removeFromCart as apiRemoveFromCart,
  updateCartQuantity as apiUpdateQuantity,
  type CartData,
  type CartItem,
  type Product,
} from '../services/apiService';

interface CartContextType {
  items: CartItem[];
  total: number;
  products: Product[];
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  setProducts: (products: Product[]) => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const debounceTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const refreshCart = useCallback(async () => {
    try {
      const data: CartData = await fetchCart();
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error('获取购物车失败:', e);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const getProduct = useCallback(
    (productId: number): Product | undefined => {
      return products.find((p) => p.id === productId);
    },
    [products]
  );

  const recalcTotal = useCallback(
    (newItems: CartItem[]): number => {
      let t = 0;
      for (const item of newItems) {
        const p = getProduct(item.productId);
        if (p) t += p.price * item.quantity;
      }
      return Math.round(t * 100) / 100;
    },
    [getProduct]
  );

  const addToCart = useCallback(
    async (productId: number, quantity: number = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === productId);
        let newItems: CartItem[];
        if (existing) {
          newItems = prev.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i
          );
        } else {
          newItems = [...prev, { productId, quantity }];
        }
        setTotal(recalcTotal(newItems));
        return newItems;
      });

      try {
        const data = await apiAddToCart(productId, quantity);
        setItems(data.items);
        setTotal(data.total);
      } catch (e) {
        console.error('添加购物车失败:', e);
        await refreshCart();
      }
    },
    [recalcTotal, refreshCart]
  );

  const removeFromCart = useCallback(
    async (productId: number) => {
      setItems((prev) => {
        const newItems = prev.filter((i) => i.productId !== productId);
        setTotal(recalcTotal(newItems));
        return newItems;
      });

      try {
        const data = await apiRemoveFromCart(productId);
        setItems(data.items);
        setTotal(data.total);
      } catch (e) {
        console.error('移除购物车失败:', e);
        await refreshCart();
      }
    },
    [recalcTotal, refreshCart]
  );

  const updateQuantity = useCallback(
    async (productId: number, quantity: number) => {
      if (quantity <= 0) {
        await removeFromCart(productId);
        return;
      }

      setItems((prev) => {
        const newItems = prev.map((i) =>
          i.productId === productId ? { ...i, quantity } : i
        );
        setTotal(recalcTotal(newItems));
        return newItems;
      });

      const existingTimer = debounceTimers.current.get(productId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(async () => {
        try {
          const data = await apiUpdateQuantity(productId, quantity);
          setItems(data.items);
          setTotal(data.total);
        } catch (e) {
          console.error('更新购物车数量失败:', e);
          await refreshCart();
        }
        debounceTimers.current.delete(productId);
      }, 500);

      debounceTimers.current.set(productId, timer);
    },
    [recalcTotal, removeFromCart, refreshCart]
  );

  return (
    <CartContext.Provider
      value={{ items, total, products, addToCart, removeFromCart, updateQuantity, setProducts, refreshCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
