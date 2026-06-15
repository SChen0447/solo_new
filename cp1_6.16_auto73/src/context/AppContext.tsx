import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type { ImageItem, AppState, AppContextType } from '../types';
import { extractDominantColor } from '../modules/colorExtractor';

const initialState: AppState = {
  images: [],
  currentEditingId: null,
  sortedIds: [],
  isLoading: false,
  viewMode: 'waterfall'
};

type Action =
  | { type: 'ADD_IMAGES'; payload: ImageItem[] }
  | { type: 'UPDATE_IMAGE'; payload: { id: string; updates: Partial<ImageItem> } }
  | { type: 'SET_EDITING_ID'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VIEW_MODE'; payload: 'waterfall' | 'gallery' }
  | { type: 'REORDER_IMAGES'; payload: { startIndex: number; endIndex: number } };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_IMAGES': {
      const newImages = action.payload.map((img, idx) => ({
        ...img,
        order: state.images.length + idx
      }));
      return {
        ...state,
        images: [...state.images, ...newImages],
        sortedIds: [...state.sortedIds, ...newImages.map((img) => img.id)]
      };
    }
    case 'UPDATE_IMAGE': {
      return {
        ...state,
        images: state.images.map((img) =>
          img.id === action.payload.id ? { ...img, ...action.payload.updates } : img
        )
      };
    }
    case 'SET_EDITING_ID':
      return { ...state, currentEditingId: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'REORDER_IMAGES': {
      const { startIndex, endIndex } = action.payload;
      const result = Array.from(state.sortedIds);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      const reorderedImages = state.images.map((img) => ({
        ...img,
        order: result.indexOf(img.id)
      }));
      return {
        ...state,
        sortedIds: result,
        images: reorderedImages
      };
    }
    default:
      return state;
  }
}

const AppContext = createContext<AppContextType | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addImages = useCallback(async (files: File[]) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const validFiles = files.filter((file) => {
        const isValidType = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
        const isValidSize = file.size <= 10 * 1024 * 1024;
        return isValidType && isValidSize;
      });

      const imageItems: ImageItem[] = [];

      for (const file of validFiles) {
        const { width, height } = await loadImageDimensions(file);
        const originalUrl = URL.createObjectURL(file);
        const colorResult = await extractDominantColor(originalUrl).catch(() => ({
          color: 'hsl(0, 0%, 50%)',
          colorName: '灰色'
        }));

        imageItems.push({
          id: generateId(),
          file,
          originalUrl,
          editedUrl: null,
          originalBlob: file,
          editedBlob: null,
          name: file.name,
          width,
          height,
          dominantColor: colorResult.color,
          colorName: colorResult.colorName,
          filterType: 'none',
          cropData: null,
          selected: false,
          order: 0
        });
      }

      dispatch({ type: 'ADD_IMAGES', payload: imageItems });
    } catch (error) {
      console.error('Failed to process images:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const updateImage = useCallback((id: string, updates: Partial<ImageItem>) => {
    dispatch({ type: 'UPDATE_IMAGE', payload: { id, updates } });
  }, []);

  const selectImage = useCallback((id: string, selected: boolean) => {
    dispatch({ type: 'UPDATE_IMAGE', payload: { id, updates: { selected } } });
  }, []);

  const selectAllImages = useCallback((selected: boolean) => {
    state.images.forEach((img) => {
      dispatch({ type: 'UPDATE_IMAGE', payload: { id: img.id, updates: { selected } } });
    });
  }, [state.images]);

  const reorderImages = useCallback((startIndex: number, endIndex: number) => {
    dispatch({ type: 'REORDER_IMAGES', payload: { startIndex, endIndex } });
  }, []);

  const setEditingImage = useCallback((id: string | null) => {
    dispatch({ type: 'SET_EDITING_ID', payload: id });
  }, []);

  const setViewMode = useCallback((mode: 'waterfall' | 'gallery') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const generateExhibition = useCallback((): string => {
    const selectedImages = state.images
      .filter((img) => img.selected)
      .sort((a, b) => a.order - b.order);

    const exhibitionHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>我的策展展示</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #000;
      color: #fff;
      overflow: hidden;
    }
    .exhibition-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      padding: 24px 40px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 2px;
    }
    .image-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .slide-wrapper {
      position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      transition: transform 0.4s ease-out;
    }
    .slide {
      min-width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    .slide img {
      max-width: 90%;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .navigation {
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 24px;
    }
    .nav-btn {
      width: 100px;
      height: 40px;
      border: none;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.3);
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.2s ease-out;
    }
    .nav-btn:hover {
      background: rgba(255, 255, 255, 0.9);
      color: #1A237E;
    }
    .nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .counter {
      position: absolute;
      top: 24px;
      right: 40px;
      font-size: 16px;
      color: rgba(255,255,255,0.8);
    }
    .slide-enter {
      animation: slideFromRight 0.4s ease-out;
    }
    @keyframes slideFromRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  </style>
</head>
<body>
  <div class="exhibition-container">
    <div class="header">
      <h1>我的策展展示</h1>
    </div>
    <div class="counter"><span id="current">1</span> / ${selectedImages.length}</div>
    <div class="image-container">
      <div class="slide-wrapper" id="slideWrapper">
        ${selectedImages.map((img) => `
          <div class="slide">
            <img src="${img.editedUrl || img.originalUrl}" alt="${img.name}">
          </div>
        `).join('')}
      </div>
    </div>
    <div class="navigation">
      <button class="nav-btn" id="prevBtn">上一张</button>
      <button class="nav-btn" id="nextBtn">下一张</button>
    </div>
  </div>
  <script>
    const images = ${JSON.stringify(selectedImages.map((img) => ({ url: img.editedUrl || img.originalUrl, name: img.name })))};
    let currentIndex = 0;
    const slideWrapper = document.getElementById('slideWrapper');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentSpan = document.getElementById('current');

    function updateSlide() {
      slideWrapper.style.transform = \`translateX(-\${currentIndex * 100}%)\`;
      currentSpan.textContent = currentIndex + 1;
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex === images.length - 1;
    }

    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateSlide();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentIndex < images.length - 1) {
        currentIndex++;
        updateSlide();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) { currentIndex--; updateSlide(); }
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) { currentIndex++; updateSlide(); }
    });

    updateSlide();
  </script>
</body>
</html>`;

    const blob = new Blob([exhibitionHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    return url;
  }, [state.images]);

  const value: AppContextType = {
    state,
    addImages,
    updateImage,
    selectImage,
    selectAllImages,
    reorderImages,
    setEditingImage,
    setViewMode,
    generateExhibition,
    setLoading
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
