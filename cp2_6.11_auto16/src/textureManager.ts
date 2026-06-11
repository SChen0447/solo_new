export type TextureType = 'white' | 'parchment' | 'watercolor' | 'frosted' | 'metal';

export interface TextureConfig {
  id: TextureType;
  name: string;
  thumbnailColor: string;
  colorAdjustment: number;
  patternId: string;
}

export const textureConfigs: TextureConfig[] = [
  { id: 'white', name: '纯白', thumbnailColor: '#ffffff', colorAdjustment: 0, patternId: 'texture-white' },
  { id: 'parchment', name: '羊皮纸', thumbnailColor: '#f5e6c8', colorAdjustment: -20, patternId: 'texture-parchment' },
  { id: 'watercolor', name: '水彩晕染', thumbnailColor: '#e8f4f0', colorAdjustment: -10, patternId: 'texture-watercolor' },
  { id: 'frosted', name: '磨砂玻璃', thumbnailColor: '#e8e8e8', colorAdjustment: 10, patternId: 'texture-frosted' },
  { id: 'metal', name: '金属拉丝', thumbnailColor: '#c0c0c0', colorAdjustment: 15, patternId: 'texture-metal' }
];

export function generateTexturePatterns(): string {
  return `
    <defs>
      <pattern id="texture-white" patternUnits="userSpaceOnUse" width="100" height="100">
        <rect width="100" height="100" fill="#ffffff"/>
      </pattern>
      
      <pattern id="texture-parchment" patternUnits="userSpaceOnUse" width="200" height="200">
        <rect width="200" height="200" fill="#f5e6c8"/>
        <filter id="parchment-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="1"/>
          <feColorMatrix values="0 0 0 0 0.6
                                 0 0 0 0 0.5
                                 0 0 0 0 0.3
                                 0 0 0 0.15 0"/>
        </filter>
        <rect width="200" height="200" filter="url(#parchment-noise)"/>
        <circle cx="30" cy="50" r="1" fill="#d4c4a8" opacity="0.4"/>
        <circle cx="150" cy="80" r="0.8" fill="#d4c4a8" opacity="0.3"/>
        <circle cx="80" cy="150" r="1.2" fill="#d4c4a8" opacity="0.35"/>
        <circle cx="170" cy="170" r="0.6" fill="#d4c4a8" opacity="0.4"/>
      </pattern>
      
      <pattern id="texture-watercolor" patternUnits="userSpaceOnUse" width="300" height="200">
        <defs>
          <radialGradient id="wc1" cx="30%" cy="40%" r="50%">
            <stop offset="0%" stop-color="#a8d5ba" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#a8d5ba" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="wc2" cx="70%" cy="60%" r="40%">
            <stop offset="0%" stop-color="#f0c9a8" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#f0c9a8" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="wc3" cx="50%" cy="80%" r="35%">
            <stop offset="0%" stop-color="#b8c9e8" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#b8c9e8" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="300" height="200" fill="#f8f9f7"/>
        <rect width="300" height="200" fill="url(#wc1)"/>
        <rect width="300" height="200" fill="url(#wc2)"/>
        <rect width="300" height="200" fill="url(#wc3)"/>
      </pattern>
      
      <pattern id="texture-frosted" patternUnits="userSpaceOnUse" width="100" height="100">
        <rect width="100" height="100" fill="#f0f0f0"/>
        <filter id="frosted-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="5"/>
          <feDisplacementMap in="SourceGraphic" scale="4"/>
        </filter>
        <rect width="100" height="100" fill="#ffffff" opacity="0.5"/>
        <filter id="frosted-noise">
          <feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="3" seed="2"/>
          <feColorMatrix values="0 0 0 0 0.9
                                 0 0 0 0 0.9
                                 0 0 0 0 0.9
                                 0 0 0 0.08 0"/>
        </filter>
        <rect width="100" height="100" filter="url(#frosted-noise)"/>
      </pattern>
      
      <pattern id="texture-metal" patternUnits="userSpaceOnUse" width="4" height="100">
        <defs>
          <linearGradient id="metal-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#a8a8a8"/>
            <stop offset="30%" stop-color="#d8d8d8"/>
            <stop offset="50%" stop-color="#e8e8e8"/>
            <stop offset="70%" stop-color="#d0d0d0"/>
            <stop offset="100%" stop-color="#a8a8a8"/>
          </linearGradient>
        </defs>
        <rect width="4" height="100" fill="url(#metal-grad)"/>
        <rect x="0" y="0" width="1" height="100" fill="#909090" opacity="0.15"/>
        <rect x="2" y="0" width="1" height="100" fill="#ffffff" opacity="0.1"/>
      </pattern>
    </defs>
  `;
}

export function applyTexture(textureId: TextureType): TextureConfig {
  return textureConfigs.find(t => t.id === textureId) || textureConfigs[0];
}

export function switchTexture(
  currentId: TextureType,
  newId: TextureType,
  element: HTMLElement | null,
  duration: number = 0.6
): Promise<void> {
  return new Promise((resolve) => {
    if (!element) {
      resolve();
      return;
    }
    
    element.style.transition = `opacity ${duration}s ease-in-out`;
    element.style.opacity = '0.5';
    
    setTimeout(() => {
      element.style.opacity = '1';
      setTimeout(() => {
        resolve();
      }, duration * 1000);
    }, duration * 500);
  });
}

export function getTextureFill(textureId: TextureType): string {
  return `url(#texture-${textureId})`;
}
