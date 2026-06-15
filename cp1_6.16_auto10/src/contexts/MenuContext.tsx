import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

export type MenuCategory = '前菜' | '主菜' | '甜品' | '饮品';

export const CATEGORIES: MenuCategory[] = ['前菜', '主菜', '甜品', '饮品'];

export type ItemStatus = 'available' | 'soldout';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: MenuCategory;
  description: string;
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;
}

export interface MenuState {
  items: MenuItem[];
  lastUpdated: number;
}

type Action =
  | { type: 'ADD_ITEM'; payload: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> }
  | { type: 'EDIT_ITEM'; payload: { id: string; updates: Partial<Pick<MenuItem, 'price' | 'description' | 'name' | 'category' | 'status'>> } }
  | { type: 'DELETE_ITEM'; payload: { id: string } }
  | { type: 'MOVE_ITEM'; payload: { id: string; direction: 'up' | 'down' } }
  | { type: 'TOGGLE_STATUS'; payload: { id: string } };

const generateId = (): string => {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

const initialItems: MenuItem[] = [
  {
    id: generateId(),
    name: '法式鹅肝酱',
    price: 168,
    category: '前菜',
    description: '选用法国西南部顶级鹅肝，搭配无花果酱和烤布里欧修面包，口感丝滑细腻，入口即化。',
    status: 'available',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: generateId(),
    name: '地中海海鲜沙拉',
    price: 88,
    category: '前菜',
    description: '新鲜虾仁、扇贝、章鱼配混合生菜，淋上柠檬橄榄油酱汁，清爽开胃。',
    status: 'available',
    createdAt: Date.now() - 72000000,
    updatedAt: Date.now() - 72000000,
  },
  {
    id: generateId(),
    name: '和牛A5菲力牛排',
    price: 688,
    category: '主菜',
    description: '日本神户A5级和牛菲力，大理石纹理分布均匀，搭配黑松露酱与时令蔬菜。',
    status: 'available',
    createdAt: Date.now() - 60000000,
    updatedAt: Date.now() - 60000000,
  },
  {
    id: generateId(),
    name: '香煎银鳕鱼',
    price: 258,
    category: '主菜',
    description: '法国银鳕鱼配柠檬黄油酱，鱼肉鲜嫩多汁，佐以菠菜泥和烤番茄。',
    status: 'available',
    createdAt: Date.now() - 50000000,
    updatedAt: Date.now() - 50000000,
  },
  {
    id: generateId(),
    name: '藏红花意式烩饭',
    price: 138,
    category: '主菜',
    description: '选用意大利阿尔博里欧米，加入西班牙藏红花和帕玛森芝士，风味浓郁。',
    status: 'soldout',
    createdAt: Date.now() - 40000000,
    updatedAt: Date.now() - 40000000,
  },
  {
    id: generateId(),
    name: '舒芙蕾芝士蛋糕',
    price: 68,
    category: '甜品',
    description: '轻盈如云的日式舒芙蕾芝士蛋糕，搭配北海道鲜奶油和莓果酱汁。',
    status: 'available',
    createdAt: Date.now() - 30000000,
    updatedAt: Date.now() - 30000000,
  },
  {
    id: generateId(),
    name: '提拉米苏',
    price: 58,
    category: '甜品',
    description: '经典意式甜品，马斯卡彭芝士与浓缩咖啡的完美结合，撒上可可粉。',
    status: 'available',
    createdAt: Date.now() - 20000000,
    updatedAt: Date.now() - 20000000,
  },
  {
    id: generateId(),
    name: '手冲埃塞俄比亚咖啡',
    price: 48,
    category: '饮品',
    description: '埃塞俄比亚耶加雪菲产区单品豆，花香与柑橘风味明显，回甘悠长。',
    status: 'available',
    createdAt: Date.now() - 10000000,
    updatedAt: Date.now() - 10000000,
  },
  {
    id: generateId(),
    name: '伯爵红茶',
    price: 38,
    category: '饮品',
    description: '经典英式伯爵红茶，佛手柑香气馥郁，可搭配牛奶或柠檬。',
    status: 'available',
    createdAt: Date.now() - 5000000,
    updatedAt: Date.now() - 5000000,
  },
];

const initialState: MenuState = {
  items: initialItems,
  lastUpdated: Date.now(),
};

const menuReducer = (state: MenuState, action: Action): MenuState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const newItem: MenuItem = {
        ...action.payload,
        id: generateId(),
        status: 'available',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return {
        items: [...state.items, newItem],
        lastUpdated: Date.now(),
      };
    }
    case 'EDIT_ITEM': {
      return {
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates, updatedAt: Date.now() }
            : item
        ),
        lastUpdated: Date.now(),
      };
    }
    case 'DELETE_ITEM': {
      return {
        items: state.items.filter((item) => item.id !== action.payload.id),
        lastUpdated: Date.now(),
      };
    }
    case 'MOVE_ITEM': {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index === -1) return state;

      const newItems = [...state.items];
      const { direction } = action.payload;

      if (direction === 'up' && index > 0) {
        [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
      } else if (direction === 'down' && index < newItems.length - 1) {
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      } else {
        return state;
      }

      return {
        items: newItems,
        lastUpdated: Date.now(),
      };
    }
    case 'TOGGLE_STATUS': {
      return {
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? {
                ...item,
                status: item.status === 'available' ? 'soldout' : 'available',
                updatedAt: Date.now(),
              }
            : item
        ),
        lastUpdated: Date.now(),
      };
    }
    default:
      return state;
  }
};

export interface MenuContextType {
  items: MenuItem[];
  lastUpdated: number;
  totalCount: number;
  addItem: (data: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  editItem: (id: string, updates: Partial<Pick<MenuItem, 'price' | 'description' | 'name' | 'category' | 'status'>>) => void;
  deleteItem: (id: string) => void;
  moveItem: (id: string, direction: 'up' | 'down') => void;
  toggleStatus: (id: string) => void;
  getFilteredItems: (category: MenuCategory | 'all') => MenuItem[];
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(menuReducer, initialState);

  const addItem = useCallback(
    (data: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
      dispatch({ type: 'ADD_ITEM', payload: data });
    },
    []
  );

  const editItem = useCallback(
    (id: string, updates: Partial<Pick<MenuItem, 'price' | 'description' | 'name' | 'category' | 'status'>>) => {
      dispatch({ type: 'EDIT_ITEM', payload: { id, updates } });
    },
    []
  );

  const deleteItem = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ITEM', payload: { id } });
  }, []);

  const moveItem = useCallback((id: string, direction: 'up' | 'down') => {
    dispatch({ type: 'MOVE_ITEM', payload: { id, direction } });
  }, []);

  const toggleStatus = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_STATUS', payload: { id } });
  }, []);

  const getFilteredItems = useCallback(
    (category: MenuCategory | 'all'): MenuItem[] => {
      if (category === 'all') return state.items;
      return state.items.filter((item) => item.category === category);
    },
    [state.items]
  );

  const totalCount = state.items.length;

  const value = useMemo(
    () => ({
      items: state.items,
      lastUpdated: state.lastUpdated,
      totalCount,
      addItem,
      editItem,
      deleteItem,
      moveItem,
      toggleStatus,
      getFilteredItems,
    }),
    [state.items, state.lastUpdated, totalCount, addItem, editItem, deleteItem, moveItem, toggleStatus, getFilteredItems]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};

export const useMenu = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};
