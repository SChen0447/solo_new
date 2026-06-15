export interface ThemeObject {
  light: string;
  dark: string;
  accent1: string;
  accent2: string;
  accent3: string;
}

export interface ColorStore {
  extractedColors: string[];
  theme: ThemeObject;
  isExtracting: boolean;
  progress: number;
  mode: 'light' | 'dark';
  thumbnailUrl: string | null;
  toastColor: string | null;
  setExtractedColors: (colors: string[]) => void;
  setTheme: (theme: ThemeObject) => void;
  setIsExtracting: (val: boolean) => void;
  setProgress: (val: number) => void;
  setMode: (mode: 'light' | 'dark') => void;
  setThumbnailUrl: (url: string | null) => void;
  showToast: (color: string) => void;
  hideToast: () => void;
  updateThemeColor: (key: keyof ThemeObject, color: string) => void;
}
