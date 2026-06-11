export interface ColorScheme {
  id: string;
  name: string;
  isPreset: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
  _originalColors?: ColorScheme['colors'];
}

type ColorKey = keyof ColorScheme['colors'];

const generateId = (): string => {
  return `scheme_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const generateRandomHex = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const generateRandomColors = (): ColorScheme['colors'] => {
  return {
    primary: generateRandomHex(),
    secondary: generateRandomHex(),
    background: generateRandomHex(),
    surface: generateRandomHex(),
    text: generateRandomHex(),
    textSecondary: generateRandomHex(),
    border: generateRandomHex()
  };
};

const lightPresetColors: ColorScheme['colors'] = {
  primary: '#3B82F6',
  secondary: '#10B981',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB'
};

const darkPresetColors: ColorScheme['colors'] = {
  primary: '#60A5FA',
  secondary: '#34D399',
  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  border: '#374151'
};

class ThemeManager {
  private schemes: Map<string, ColorScheme> = new Map();

  constructor() {
    this.initPresets();
  }

  private initPresets(): void {
    const lightScheme: ColorScheme = {
      id: 'preset_light',
      name: '明亮方案',
      isPreset: true,
      colors: { ...lightPresetColors },
      _originalColors: { ...lightPresetColors }
    };

    const darkScheme: ColorScheme = {
      id: 'preset_dark',
      name: '暗黑方案',
      isPreset: true,
      colors: { ...darkPresetColors },
      _originalColors: { ...darkPresetColors }
    };

    this.schemes.set(lightScheme.id, lightScheme);
    this.schemes.set(darkScheme.id, darkScheme);
  }

  getAllSchemes(): ColorScheme[] {
    return Array.from(this.schemes.values());
  }

  getSchemeById(id: string): ColorScheme | undefined {
    return this.schemes.get(id);
  }

  addScheme(name?: string): ColorScheme {
    const id = generateId();
    const scheme: ColorScheme = {
      id,
      name: name || `新方案 ${this.schemes.size + 1}`,
      isPreset: false,
      colors: generateRandomColors()
    };
    this.schemes.set(id, scheme);
    return scheme;
  }

  deleteScheme(id: string): boolean {
    const scheme = this.schemes.get(id);
    if (!scheme) return false;
    if (scheme.isPreset) return false;
    this.schemes.delete(id);
    return true;
  }

  updateColor(schemeId: string, colorKey: ColorKey, value: string): ColorScheme | null {
    const scheme = this.schemes.get(schemeId);
    if (!scheme) return null;
    scheme.colors[colorKey] = value;
    return scheme;
  }

  updateSchemeName(schemeId: string, name: string): ColorScheme | null {
    const scheme = this.schemes.get(schemeId);
    if (!scheme) return null;
    scheme.name = name;
    return scheme;
  }

  resetScheme(schemeId: string): ColorScheme | null {
    const scheme = this.schemes.get(schemeId);
    if (!scheme || !scheme.isPreset || !scheme._originalColors) return null;
    scheme.colors = { ...scheme._originalColors };
    return scheme;
  }

  exportAsCSSVariables(schemeId: string): string | null {
    const scheme = this.schemes.get(schemeId);
    if (!scheme) return null;
    const lines: string[] = [];
    for (const [key, value] of Object.entries(scheme.colors)) {
      lines.push(`--${key}: ${value};`);
    }
    return lines.join('\n');
  }
}

export const themeManager = new ThemeManager();
export type { ColorKey };
