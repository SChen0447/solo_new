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
  pulsePeriod: number;
  pulseAmplitude: number;
  spectralWavelength: number;
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

function getSpectralTypeByWavelength(wl: number): StarInfo['spectralType'] {
  if (wl < 440) return 'O';
  if (wl < 490) return 'B';
  if (wl < 565) return 'A';
  if (wl < 600) return 'F';
  if (wl < 630) return 'G';
  if (wl < 690) return 'K';
  return 'M';
}

function wavelengthToRGB(wavelength: number): THREE.Color {
  let r = 0;
  let g = 0;
  let b = 0;

  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0;
    b = 1.0;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1.0;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0;
    g = 1.0;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1.0;
    b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1.0;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    r = 1.0;
    g = 0;
    b = 0;
  }

  let factor = 0;
  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
  } else if (wavelength >= 420 && wavelength <= 700) {
    factor = 1.0;
  } else if (wavelength > 700 && wavelength <= 780) {
    factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
  }

  const gamma = 0.8;
  r = Math.pow(r * factor, gamma);
  g = Math.pow(g * factor, gamma);
  b = Math.pow(b * factor, gamma);

  return new THREE.Color(r, g, b);
}

function colorToHex(c: THREE.Color): string {
  return '#' + c.getHexString();
}

const vertexShader = `
  attribute float aSize;
  attribute float aPulse;
  attribute float aHighlight;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uPixelRatio;
  uniform float uNear;
  uniform float uFar;
  
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = -mvPosition.z;
    
    float logNear = log(uNear + 1.0);
    float logFar = log(uFar + 1.0);
    float logDist = log(dist + 1.0);
    float depthNorm = clamp((logDist - logNear) / (logFar - logNear), 0.0, 1.0);
    float sizeFactor = mix(2.8, 0.25, depthNorm);
    
    float finalSize = aSize * sizeFactor * uPixelRatio * (1.0 + aPulse * 0.5) * (1.0 + aHighlight * 1.2);
    gl_PointSize = max(1.0, finalSize);
    
    vAlpha = mix(1.0, 0.4, depthNorm * depthNorm);
    vAlpha *= (1.0 + aPulse * 0.3);
    vAlpha = clamp(vAlpha, 0.0, 1.0);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha = pow(alpha, 1.3) * vAlpha;
    vec3 finalColor = vColor * (1.0 + (1.0 - alpha) * 0.3);
    gl_FragColor = vec4(finalColor, alpha);
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
  private baseSizes: Float32Array;
  private starsData: StarData[] = [];
  
  private galaxyRotation: number = 0;
  private rotationSpeed: number = 0.05;
  private pulseTriggerTime: number = 0;
  private pulseInterval: number = 3000;
  private pulsingStars: Map<number, number> = new Map();
  private highlightedIndex: number | null = null;

  constructor(starCount: number = 2500) {
    this.starCount = starCount;
    this.positions = new Float32Array(starCount * 3);
    this.colors = new Float32Array(starCount * 3);
    this.sizes = new Float32Array(starCount);
    this.pulses = new Float32Array(starCount);
    this.highlights = new Float32Array(starCount);
    this.baseSizes = new Float32Array(starCount);

    this.geometry = new THREE.BufferGeometry();
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uNear: { value: 1.0 },
        uFar: { value: 3000.0 }
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
      const wavelength = 400 + distFactor * 350 + (Math.random() - 0.5) * 30;
      const clampedWavelength = Math.max(380, Math.min(780, wavelength));
      const color = wavelengthToRGB(clampedWavelength);
      const spectralType = getSpectralTypeByWavelength(clampedWavelength);
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      const sizeDistFactor = 1.1 - distFactor * 0.4;
      const coreBonus = Math.max(0, 1 - distFactor * 1.8) * 0.6;
      const baseSize = (3.0 + Math.random() * 4.0) * sizeDistFactor + coreBonus;
      
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      
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
        pulsePeriod: 0.8 + Math.random() * 1.5,
        pulseAmplitude: 0.35 + Math.random() * 0.45,
        spectralWavelength: clampedWavelength
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
    
    const nowMs = elapsed * 1000;
    
    for (let i = 0; i < this.starCount; i++) {
      const star = this.starsData[i];
      const rotationFactor = 1.0 - star.radius / 900 + 0.25;
      const currentAngle = star.angle + this.galaxyRotation * rotationFactor;
      const x = Math.cos(currentAngle) * star.radius;
      const z = Math.sin(currentAngle) * star.radius;
      
      this.positions[i * 3] = x;
      this.positions[i * 3 + 2] = z;
      
      if (this.highlightedIndex === i) {
        this.highlights[i] = Math.min(1.0, this.highlights[i] + delta * 6);
      } else {
        this.highlights[i] = Math.max(0, this.highlights[i] - delta * 4);
      }
    }
    
    if (nowMs - this.pulseTriggerTime > this.pulseInterval) {
      this.triggerRandomPulse(nowMs);
      this.pulseTriggerTime = nowMs;
      this.pulseInterval = 2000 + Math.random() * 2500;
    }
    
    for (let i = 0; i < this.starCount; i++) {
      if (this.pulsingStars.has(i)) {
        const startTime = this.pulsingStars.get(i)!;
        const localElapsed = (nowMs - startTime) / 1000;
        const star = this.starsData[i];
        
        const fadeIn = Math.min(1, localElapsed / 0.3);
        const fadeOut = Math.max(0, 1 - localElapsed / 2.0);
        const envelope = fadeIn * fadeOut;
        
        const wave = Math.sin(localElapsed / star.pulsePeriod * Math.PI * 2 + star.pulsePhase);
        this.pulses[i] = wave * star.pulseAmplitude * envelope;
        
        if (localElapsed > 2.5) {
          this.pulsingStars.delete(i);
          this.pulses[i] = 0;
        }
      } else {
        this.pulses[i] *= Math.max(0, 1 - delta * 3);
        if (Math.abs(this.pulses[i]) < 0.005) this.pulses[i] = 0;
      }
    }
    
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aPulse as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aHighlight as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  private triggerRandomPulse(triggerTime: number): void {
    const pulseCount = 20 + Math.floor(Math.random() * 40);
    for (let i = 0; i < pulseCount; i++) {
      const index = Math.floor(Math.random() * this.starCount);
      if (!this.pulsingStars.has(index)) {
        const offset = Math.random() * 400;
        this.pulsingStars.set(index, triggerTime + offset);
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
    this.highlightedIndex = index;
  }

  public setPixelRatio(ratio: number): void {
    this.material.uniforms.uPixelRatio.value = ratio;
  }

  public setDepthRange(near: number, far: number): void {
    this.material.uniforms.uNear.value = near;
    this.material.uniforms.uFar.value = far;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
