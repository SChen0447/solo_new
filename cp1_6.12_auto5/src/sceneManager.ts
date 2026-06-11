import * as THREE from 'three';
import { EffectComposer, Pass } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

import { AudioEngine, FrequencyData } from './audioEngine';
import { ParticleSystem, ParticleSystemData, ThemeType, BloomParams } from './particleSystem';

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  
  private particleSystem: ParticleSystem;
  private audioEngine: AudioEngine;
  
  private points: THREE.Points;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  
  private positionAttribute: THREE.BufferAttribute;
  private colorAttribute: THREE.BufferAttribute;
  private sizeAttribute: THREE.BufferAttribute;
  
  private maxParticles: number;
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private deltaTime = 0;
  
  private isRunning = false;
  private autoRotate = true;
  
  private eventTarget: EventTarget;
  private fps = 60;
  private frameCount = 0;
  private fpsUpdateTime = 0;
  
  private resizeObserver: ResizeObserver | null = null;
  
  constructor(container: HTMLElement, maxParticles: number = 40000) {
    this.container = container;
    this.maxParticles = maxParticles;
    this.eventTarget = new EventTarget();
    
    this.audioEngine = new AudioEngine();
    this.particleSystem = new ParticleSystem(maxParticles);
    
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 30;
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    this.container.appendChild(this.renderer.domElement);
    
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      0.6,
      0.5,
      0.7
    );
    this.composer.addPass(bloomPass);
    
    const fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.x = 1 / (this.container.clientWidth * pixelRatio);
    fxaaPass.material.uniforms['resolution'].value.y = 1 / (this.container.clientHeight * pixelRatio);
    this.composer.addPass(fxaaPass);
    
    this.particleGeometry = new THREE.BufferGeometry();
    
    this.positionAttribute = new THREE.BufferAttribute(
      new Float32Array(this.maxParticles * 3),
      3
    );
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    
    this.colorAttribute = new THREE.BufferAttribute(
      new Float32Array(this.maxParticles * 3),
      3
    );
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
    
    this.sizeAttribute = new THREE.BufferAttribute(
      new Float32Array(this.maxParticles),
      1
    );
    this.sizeAttribute.setUsage(THREE.DynamicDrawUsage);
    
    this.particleGeometry.setAttribute('position', this.positionAttribute);
    this.particleGeometry.setAttribute('color', this.colorAttribute);
    this.particleGeometry.setAttribute('size', this.sizeAttribute);
    
    this.particleMaterial = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });
    
    this.points = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    
    this.setupEventListeners();
    this.setupResizeObserver();
  }
  
  private setupEventListeners(): void {
    this.audioEngine.addEventListener('play', () => {
      this.dispatchEvent('audioPlay');
    });
    
    this.audioEngine.addEventListener('pause', () => {
      this.dispatchEvent('audioPause');
    });
    
    this.audioEngine.addEventListener('stop', () => {
      this.dispatchEvent('audioStop');
    });
    
    this.particleSystem.addEventListener('themeChanged', () => {
      this.dispatchEvent('themeChanged');
    });
    
    this.particleSystem.addEventListener('countChanged', () => {
      this.updateDrawRange();
      this.dispatchEvent('countChanged');
    });
  }
  
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.onResize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    this.resizeObserver.observe(this.container);
  }
  
  private onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    
    const pixelRatio = this.renderer.getPixelRatio();
    const fxaaPass = this.composer.passes.find((p: Pass) => 
      p instanceof ShaderPass && p.material.uniforms['resolution']
    ) as ShaderPass;
    
    if (fxaaPass) {
      fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
      fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
    }
    
    const bloomPass = this.composer.passes.find((p: Pass) => 
      p instanceof UnrealBloomPass
    ) as UnrealBloomPass;
    
    if (bloomPass) {
      bloomPass.resolution.set(width, height);
    }
    
    this.updateParticleDensity();
  }
  
  private updateParticleDensity(): void {
    const area = this.container.clientWidth * this.container.clientHeight;
    const baseArea = 1920 * 1080;
    const densityFactor = Math.sqrt(area / baseArea);
    const currentCount = this.particleSystem.getParticleCount();
    const minCount = 20000;
    const maxCount = 40000;
    const targetCount = Math.max(minCount, Math.min(maxCount, 
      Math.floor(30000 * densityFactor)
    ));
    
    if (Math.abs(targetCount - currentCount) > 5000) {
      this.setParticleCount(targetCount);
    }
  }
  
  private updateDrawRange(): void {
    const count = this.particleSystem.getParticleCount();
    this.particleGeometry.setDrawRange(0, count);
  }
  
  private updateParticleAttributes(data: ParticleSystemData): void {
    const { positions, colors, sizes, count } = data;
    
    const positionArray = this.positionAttribute.array as Float32Array;
    const colorArray = this.colorAttribute.array as Float32Array;
    const sizeArray = this.sizeAttribute.array as Float32Array;
    
    const elementsToCopy = count * 3;
    positionArray.set(positions.subarray(0, elementsToCopy));
    colorArray.set(colors.subarray(0, elementsToCopy));
    sizeArray.set(sizes.subarray(0, count));
    
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
    
    this.particleGeometry.setDrawRange(0, this.maxParticles);
    this.particleGeometry.computeBoundingSphere();
  }
  
  private animate(currentTime: number): void {
    if (!this.isRunning) return;
    
    this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
    
    this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;
    
    this.frameCount++;
    this.fpsUpdateTime += this.deltaTime;
    if (this.fpsUpdateTime >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsUpdateTime);
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
      this.dispatchEvent('fpsUpdate');
    }
    
    const frequencyData: FrequencyData = this.audioEngine.getFrequencyData();
    const isPlaying = this.audioEngine.getIsPlaying();
    
    const particleData = this.particleSystem.update(
      this.deltaTime,
      frequencyData,
      isPlaying
    );
    
    this.updateParticleAttributes(particleData);
    
    const bloomParams: BloomParams = this.particleSystem.getCurrentBloomParams();
    const bloomPass = this.composer.passes.find((p: Pass) =>
      p instanceof UnrealBloomPass
    ) as UnrealBloomPass;
    if (bloomPass) {
      bloomPass.strength = bloomParams.strength;
      bloomPass.radius = bloomParams.radius;
      bloomPass.threshold = bloomParams.threshold;
    }
    
    if (this.autoRotate) {
      this.points.rotation.y += this.deltaTime * 0.05;
      this.points.rotation.x = Math.sin(currentTime * 0.0002) * 0.2;
    }
    
    this.composer.render();
  }
  
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate(this.lastTime);
    this.dispatchEvent('start');
  }
  
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.dispatchEvent('stop');
  }
  
  getAudioEngine(): AudioEngine {
    return this.audioEngine;
  }
  
  getParticleSystem(): ParticleSystem {
    return this.particleSystem;
  }
  
  getFPS(): number {
    return this.fps;
  }
  
  setTheme(theme: ThemeType): void {
    this.particleSystem.setTheme(theme);
  }
  
  getTheme(): ThemeType {
    return this.particleSystem.getTheme();
  }
  
  getBackgroundGradient(): string {
    return this.particleSystem.getBackgroundGradient();
  }
  
  setParticleCount(count: number): void {
    this.particleSystem.setParticleCount(count);
  }
  
  getParticleCount(): number {
    return this.particleSystem.getParticleCount();
  }
  
  setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  handleWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.onResize(width, height);
  }

  setBloomIntensity(intensity: number): void {
    const bloomPass = this.composer.passes.find((p: Pass) => 
      p instanceof UnrealBloomPass
    ) as UnrealBloomPass;
    
    if (bloomPass) {
      bloomPass.strength = intensity;
    }
  }
  
  resetCamera(): void {
    this.camera.position.set(0, 0, 30);
    this.camera.lookAt(0, 0, 0);
    this.points.rotation.set(0, 0, 0);
  }
  
  addEventListener(type: string, callback: EventListener): void {
    this.eventTarget.addEventListener(type, callback);
  }
  
  removeEventListener(type: string, callback: EventListener): void {
    this.eventTarget.removeEventListener(type, callback);
  }
  
  private dispatchEvent(type: string): void {
    this.eventTarget.dispatchEvent(new Event(type));
  }
  
  dispose(): void {
    this.stop();
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    this.audioEngine.dispose();
    this.particleSystem.dispose();
    
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    
    this.renderer.dispose();
    
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    
    this.composer.dispose();
    
    this.scene.clear();
  }
}
