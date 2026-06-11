import * as THREE from 'three';

export interface StarInfo {
  id: number;
  name: string;
  spectralType: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
  brightness: number;
  distance: number;
  color: string;
}

interface StarData {
  info: StarInfo;
  angle: number;
  radius: number;
  height: number;
  pulsePhase: number;
  pulseSpeed: number;
  pulseAmplitude: number;
  baseSize: number;
}

const SPECTRAL_DATA: Record<StarInfo['spectralType'], { color: string; temp: string; desc: string }> = {
  O: { color: '#0066FF', temp: '30000K+', desc: '蓝色巨星' },
  B: { color: '#99BBFF', temp: '10000-30000K', desc: '蓝白色主序星' },
  A: { color: '#FFFFFF', temp: '7500-10000K', desc: '白色主序星' },
  F: { color: '#FFFFCC', temp: '6000-7500K', desc: '黄白色次巨星' },
  G: { color: '#FFCC66', temp: '5200-6000K', desc: '黄色主序星' },
  K: { color: '#FF9933', temp: '3700-5200K', desc: '橙色红巨星' },
  M: { color: '#FF3300', temp: '2400-3700K', desc: '红色红矮星' }
};

const STAR_NAMES = [
  '天琴座α', '天鹅座α', '仙女座α', '猎户座α', '半人马座α',
  '御夫座α', '牧夫座α', '天蝎座α', '室女座α', '双子座α',
  '大熊座α', '天鹰座α', '南十字座α', '金牛座α', '狮子座α',
  '大犬座α', '小犬座α', '船底座α', '波江座α', '参宿四',
  '参宿七', '天狼星', '织女星', '牛郎星', '北极星',
  '五车二', '角宿一', '心宿二', '大角星', '南河三',
  '北河三', '天津四', '北落师门', '水委一', '老人星',
  '南门二', '马腹一', '河鼓二', '织女二', '天津一'
];

const NAME_SUFFIXES = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'A', 'B', 'C', 'D'];

function generateStarName(index: number): string {
  const baseName = STAR_NAMES[index % STAR_NAMES.length];
  const suffixIndex = Math.floor(index / STAR_NAMES.length);
  if (suffixIndex === 0) return baseName;
  const suffix = NAME_SUFFIXES[(suffixIndex - 1) % NAME_SUFFIXES.length];
  return `${baseName} ${suffix}`;
}

function getRandomSpectralType(): StarInfo['spectralType'] {
  const types: StarInfo['spectralType'][] = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
  const weights = [0.03, 0.1, 0.2, 0.25, 0.2, 0.15, 0.07];
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) return types[i];
  }
  return 'G';
}

function hexToRgb(hex: string): THREE.Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return new THREE.Color(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    );
  }
  return new THREE.Color(0xffffff);
}

export class StarField {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;
  
  private starCount: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private baseSizes: Float32Array;
  private starsData: StarData[] = [];
  
  private galaxyRotation: number = 0;
  private rotationSpeed: number = 0.05;
  private lastPulseTrigger: number = 0;
  private pulseInterval: number = 3000;
  private pulsingStars: Set<number> = new Set();

  constructor(starCount: number = 2500) {
    this.starCount = starCount;
    this.positions = new Float32Array(starCount * 3);
    this.colors = new Float32Array(starCount * 3);
    this.sizes = new Float32Array(starCount);
    this.baseSizes = new Float32Array(starCount);

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    
    this.generateSpiralGalaxy();
    this.updateGeometry();
  }

  private generateSpiralGalaxy(): void {
    const arms = 4;
    const maxRadius = 600;
    const coreRadius = 80;
    const armSpread = 0.4;
    
    for (let i = 0; i < this.starCount; i++) {
      const t = Math.random();
      const radius = coreRadius + (maxRadius - coreRadius) * Math.pow(t, 0.7);
      const angle = (t * Math.PI * 2 * arms) + (Math.random() - 0.5) * armSpread * (1 - t + 0.3);
      
      const height = (Math.random() - 0.5) * 60 * (1 - t + 0.2);
      
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 30 * (1 - t);
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 30 * (1 - t);
      const y = height + (Math.random() - 0.5) * 10;
      
      const spectralType = getRandomSpectralType();
      const colorData = SPECTRAL_DATA[spectralType];
      const color = hexToRgb(colorData.color);
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      const distFactor = 1 - (distance / maxRadius) * 0.5;
      const baseSize = 2 + Math.random() * 3 * distFactor;
      
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      
      this.sizes[i] = baseSize;
      this.baseSizes[i] = baseSize;
      
      const brightness = Math.round((5 + Math.random() * 5) * 10) / 10;
      
      this.starsData.push({
        info: {
          id: i,
          name: generateStarName(i),
          spectralType,
          brightness,
          distance: Math.round(distance),
          color: colorData.color
        },
        angle,
        radius,
        height: y,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 1 + Math.random() * 2,
        pulseAmplitude: 0.3 + Math.random() * 0.4,
        baseSize
      });
    }
  }

  private updateGeometry(): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
  }

  public update(delta: number, elapsed: number, cameraDistance: number): void {
    this.galaxyRotation += this.rotationSpeed * delta;
    
    for (let i = 0; i < this.starCount; i++) {
      const star = this.starsData[i];
      
      const currentAngle = star.angle + this.galaxyRotation * (1 - star.radius / 800 + 0.3);
      const x = Math.cos(currentAngle) * star.radius;
      const z = Math.sin(currentAngle) * star.radius;
      
      this.positions[i * 3] = x;
      this.positions[i * 3 + 2] = z;
      
      let sizeMultiplier = 1;
      
      if (this.pulsingStars.has(i)) {
        const pulseTime = (elapsed * 1000 - this.lastPulseTrigger) / 1000;
        const pulse = Math.sin(pulseTime * star.pulseSpeed * 4 + star.pulsePhase);
        sizeMultiplier = 1 + pulse * star.pulseAmplitude;
      }
      
      const distanceFactor = Math.max(0.3, 1 - cameraDistance / 1500);
      this.sizes[i] = star.baseSize * sizeMultiplier * distanceFactor;
    }
    
    if (elapsed * 1000 - this.lastPulseTrigger > this.pulseInterval) {
      this.triggerRandomPulse();
      this.lastPulseTrigger = elapsed * 1000;
    }
    
    if (this.pulsingStars.size > 0 && elapsed * 1000 - this.lastPulseTrigger > 1500) {
      this.pulsingStars.clear();
    }
    
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  private triggerRandomPulse(): void {
    this.pulsingStars.clear();
    const pulseCount = Math.floor(30 + Math.random() * 50);
    for (let i = 0; i < pulseCount; i++) {
      const index = Math.floor(Math.random() * this.starCount);
      this.pulsingStars.add(index);
    }
  }

  public getStarInfo(index: number): StarInfo | null {
    if (index >= 0 && index < this.starsData.length) {
      return this.starsData[index].info;
    }
    return null;
  }

  public getStarCount(): number {
    return this.starCount;
  }

  public highlightStar(index: number | null): void {
    for (let i = 0; i < this.starCount; i++) {
      const star = this.starsData[i];
      const color = hexToRgb(star.info.color);
      
      if (index === i) {
        this.colors[i * 3] = Math.min(1, color.r * 1.5);
        this.colors[i * 3 + 1] = Math.min(1, color.g * 1.5);
        this.colors[i * 3 + 2] = Math.min(1, color.b * 1.5);
        this.sizes[i] = star.baseSize * 2;
      } else {
        this.colors[i * 3] = color.r;
        this.colors[i * 3 + 1] = color.g;
        this.colors[i * 3 + 2] = color.b;
      }
    }
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
