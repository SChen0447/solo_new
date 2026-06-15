import { create } from 'zustand';
import axios from 'axios';
import type { CustomizationState, HardwareOption } from '../../types';

interface CustomizerStore extends CustomizationState {
  isLoading: boolean;
  shareUrl: string | null;
  setMaterial: (materialId: string) => void;
  setColor: (colorId: string) => void;
  setHardware: (hardware: Partial<HardwareOption>) => void;
  calculatePrice: () => Promise<void>;
  generateShareLink: () => Promise<void>;
  resetShareUrl: () => void;
}

const defaultState: CustomizationState = {
  materialId: 'leather-001',
  colorId: 'color-002',
  hardware: {
    zipperColor: 'gold',
    buckleShape: 'circle',
    rivetStyle: 'round',
  },
  price: 988.9,
};

export const useCustomizerStore = create<CustomizerStore>((set, get) => ({
  ...defaultState,
  isLoading: false,
  shareUrl: null,

  setMaterial: (materialId: string) => {
    set({ materialId });
    get().calculatePrice();
  },

  setColor: (colorId: string) => {
    set({ colorId });
    get().calculatePrice();
  },

  setHardware: (hardware: Partial<HardwareOption>) => {
    set((state) => ({
      hardware: { ...state.hardware, ...hardware },
    }));
    get().calculatePrice();
  },

  calculatePrice: async () => {
    set({ isLoading: true });
    try {
      const state = get();
      const response = await axios.post('/api/calculate-price', {
        materialId: state.materialId,
        colorId: state.colorId,
        hardware: state.hardware,
      });
      set({ price: response.data.price, isLoading: false });
    } catch (error) {
      console.error('Price calculation failed:', error);
      set({ isLoading: false });
    }
  },

  generateShareLink: async () => {
    set({ isLoading: true });
    try {
      const state = get();
      const response = await axios.post('/api/share', {
        materialId: state.materialId,
        colorId: state.colorId,
        hardware: state.hardware,
        price: state.price,
      });
      set({ shareUrl: response.data.url, isLoading: false });
    } catch (error) {
      console.error('Share link generation failed:', error);
      set({ isLoading: false });
    }
  },

  resetShareUrl: () => set({ shareUrl: null }),
}));
