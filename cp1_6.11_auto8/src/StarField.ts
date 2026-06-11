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
  baseSize: number;
  pulsePhase: number;
  pulseSpeed: number;
  pulseAmplitude: number;
  spectralFactor: number;
}

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

function getSpectralTypeByFactor(factor: number): StarInfo['spectralType'] {
  const types: { type: StarInfo['spectralType']; max: number }[] = [
    { type: 'O', max: 0.03 },
    { type: 'B', max: 0.13 },
    { type: 'A', max: 0.30 },
    { type: 'F', max: 0.55 },
    { type: 'G', max: 0.75 },
    { type: 'K', max: 0.92 },
    { type: 'M', max: 1.00 }
  ];
  for (const t of types) {
    if (factor <= t.max) return t.type;
  }
  return 'G';
}

function spectralColor(factor: number): THREE.Color {
  const stops = [
    { pos: 0.00, r: 0.0, g: 0.4, b: 1.0 },
    { pos: 0.15, r: 0.4, g: 0.6, b: 1.0 },
    { pos: 0.30, r: 0.6, g: 0.8, b: 1.0 },
    { pos: 0.45, r: 1.0, g: 1.0, b: 1.0 },
    { pos: 0.60, r: 1.0, g: 1.0, b: 0.6 },
    { pos: 0.75, r: 1.0, g: 0.8, b: 0.4 },
    { pos: 0.88, r: 1.0, g: 0.5, b: 0.2 },
    { pos: 1.00, r: 1.0, g: 0.2, b: 0.0 }
  ];
  
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (factor >= a.pos && factor <= b.pos) {
      const t = (factor - a.pos) / (b.pos - a.pos);
      return new THREE.Color(
        a.r + (b.r - a.r) * t,
        a.g + (b.g - a.g) * t,
        a.b + (b.b - a.b) * t
      );
    }
  }
  return new THREE.Color(0xffffff);
}

function colorToHex(c: THREE.Color): string {
  return '#' + c.getHexString();
}

const vertexShader = `
  attribute float aSize;
  attribute float aPulse;
  attribute float aHighlight;
  varying vec3 vColor;
  uniform float uPixelRatio;
  
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = -mvPosition.z;
    float sizeFactor = 300.0 / max(dist, 1.0);
    float finalSize = aSize * sizeFactor * uPixelRatio * (1.0 + aPulse * 0.6) * (1.0 + aHighlight * 1.0);
    gl_PointSize = max(1.5, finalSize);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha = pow(alpha, 1.5);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export class StarField {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;
  
  private starCount: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private pulses: Float32Array;
  private highlights: Float32Array;
  private baseColors: Float32Array;
  private baseSizes: Float32Array;
  private starsData: StarData[] = [];
  
  private galaxyRotation: number = 0;
  private rotationSpeed: number = 0.05;
  private pulseTriggerTime: number = 0;
  private pulseInterval: number = 2500;
  private pulsingStars: Map<number, number> = new Map();
  private highlightedIndex: number | null = null;

  constructor(starCount: number = 2500) {
    this.starCount = starCount;
    this.positions = new Float32Array(starCount * 3);
    this.colors = new Float32Array(starCount * 3);
    this.sizes = new Float32Array(starCount);
    this.pulses = new Float32Array(starCount);
    this.highlights = new Float32Array(starCount);
    this.baseColors = new Float32Array(starCount * 3);
    this.baseSizes = new Float32Array(starCount);

    this.geometry = new THREE.BufferGeometry();
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    
    this.generateSpiralGalaxy();
    this.setupGeometry();
  }

  private generateSpiralGalaxy(): void {
    const arms = 4;
    const maxRadius = 600;
    const coreRadius = 60;
    const armSpread = 0.35;
    
    for (let i = 0; i < this.starCount; i++) {
      const t = Math.random();
      const radius = coreRadius + (maxRadius - coreRadius) * Math.pow(t, 0.65);
      
      const armOffset = (i % arms) * (Math.PI * 2 / arms);
      const angle = armOffset + t * Math.PI * 2 * 2.5 + (Math.random() - 0.5) * armSpread * (1 - t * 0.5);
      
      const heightSpread = 40 + (1 - t) * 20;
      const height = (Math.random() - 0.5) * heightSpread;
      
      const radialJitter = (Math.random() - 0.5) * 25 * (1 - t + 0.2);
      const x = Math.cos(angle) * (radius + radialJitter);
      const z = Math.sin(angle) * (radius + radialJitter);
      const y = height + (Math.random() - 0.5) * 8;
      
      const distFactor = radius / maxRadius;
      const spectralFactor = Math.max(0, Math.min(1, distFactor * 0.85 + Math.random() * 0.15));
      const color = spectralColor(spectralFactor);
      const spectralType = getSpectralTypeByFactor(spectralFactor);
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      const sizeDistFactor = 1.1 - distFactor * 0.5;
      const coreBonus = Math.max(0, 1 - distFactor * 2) * 0.8;
      const baseSize = (2.5 + Math.random() * 3.0) * sizeDistFactor + coreBonus;
      
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      
      this.baseColors[i * 3] = color.r;
      this.baseColors[i * 3 + 1] = color.g;
      this.baseColors[i * 3 + 2] = color.b;
      
      this.sizes[i] = baseSize;
      this.baseSizes[i] = baseSize;
      this.pulses[i] = 0;
      this.highlights[i] = 0;
      
      const brightness = Math.round((3 + (1 - distFactor) * 5 + Math.random() * 2) * 10) / 10;
      
      this.starsData.push({
        info: {
          id: i,
          name: generateStarName(i),
          spectralType,
          brightness,
          distance: Math.round(distance),
          color: colorToHex(color)
        },
        angle,
        radius,
        height: y,
        baseSize,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 1.5 + Math.random() * 2.5,
        pulseAmplitude: 0.4 + Math.random() * 0.5,
        spectralFactor
      });
    }
  }

  private setupGeometry(): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aPulse', new THREE.BufferAttribute(this.pulses, 1));
    this.geometry.setAttribute('aHighlight', new THREE.BufferAttribute(this.highlights, 1));
  }

  public update(delta: number, elapsed: number, _cameraDistance: number): void {
    this.galaxyRotation += this.rotationSpeed * delta;
    
    for (let i = 0; i < this.starCount; i++) {
      const star = this.starsData[i];
      const rotationFactor = 1.0 - star.radius / 900 + 0.25;
      const currentAngle = star.angle + this.galaxyRotation * rotationFactor;
      const x = Math.cos(currentAngle) * star.radius;
      const z = Math.sin(currentAngle) * star.radius;
      
      this.positions[i * 3] = x;
      this.positions[i * 3 + 2] = z;
      
      if (this.highlightedIndex === i) {
        this.highlights[i] = 1.0;
      } else {
        this.highlights[i] *= 0.9;
        if (this.highlights[i] < 0.01) this.highlights[i] = 0;
      }
    }
    
    if (elapsed * 1000 - this.pulseTriggerTime > this.pulseInterval) {
      this.triggerRandomPulse();
      this.pulseTriggerTime = elapsed * 1000;
      this.pulseInterval = 2000 + Math.random() * 2000;
    }
    
    const pulseElapsed = (elapsed * 1000 - this.pulseTriggerTime) / 1000;
    this.pulsingStars.forEach((_startTime, idx) => {
      const star = this.starsData[idx];
      if (!star) return;
      const localTime = pulseElapsed;
      const pulseWave = Math.sin(localTime * star.pulseSpeed * 3 + star.pulsePhase);
      const envelope = Math.max(0, 1 - localTime / 1.5);
      this.pulses[idx] = pulseWave * star.pulseAmplitude * envelope;
    });
    
    if (pulseElapsed > 1.8) {
      this.pulsingStars.clear();
      for (let i = 0; i < this.starCount; i++) {
        this.pulses[i] *= 0.8;
      }
    }
    
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aPulse as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aHighlight as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  private triggerRandomPulse(): void {
    this.pulsingStars.clear();
    const pulseCount = 25 + Math.floor(Math.random() * 45);
    for (let i = 0; i < pulseCount; i++) {
      const index = Math.floor(Math.random() * this.starCount);
      if (!this.pulsingStars.has(index)) {
        this.pulsingStars.set(index, performance.now());
      }
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
    if (this.highlightedIndex !== null && this.highlightedIndex !== index) {
      const prev = this.highlightedIndex;
      this.highlights[prev] = 0;
    }
    this.highlightedIndex = index;
    if (index !== null) {
      this.highlights[index] = 1.0;
      (this.geometry.attributes.aHighlight as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  public setPixelRatio(ratio: number): void {
    this.material.uniforms.uPixelRatio.value = ratio;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
