import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { LUTPass } from 'three/examples/jsm/postprocessing/LUTPass.js';
import { LUT3dlLoader } from 'three/examples/jsm/loaders/LUT3dlLoader.js';
import { eventBus, Events } from '../core/EventBus';

export interface PostProcessingSettings {
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  fxaaEnabled: boolean;
  vignetteEnabled: boolean;
  vignetteStrength: number;
  lutEnabled: boolean;
  lutIntensity: number;
}

export class PostProcessor {
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private fxaaPass: ShaderPass;
  private vignettePass: ShaderPass;
  private lutPass: LUTPass;
  
  private settings: PostProcessingSettings = {
    bloomEnabled: true,
    bloomStrength: 0.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.85,
    fxaaEnabled: true,
    vignetteEnabled: true,
    vignetteStrength: 0.3,
    lutEnabled: false,
    lutIntensity: 1.0,
  };
  
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    const size = new THREE.Vector2();
    renderer.getSize(size);
    
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(size.x, size.y);
    
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    
    this.lutPass = new LUTPass({} as any);
    this.lutPass.enabled = this.settings.lutEnabled;
    this.composer.addPass(this.lutPass);
    
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      this.settings.bloomStrength,
      this.settings.bloomRadius,
      this.settings.bloomThreshold
    );
    this.bloomPass.enabled = this.settings.bloomEnabled;
    this.composer.addPass(this.bloomPass);
    
    this.fxaaPass = new ShaderPass(FXAAShader);
    this.updateFXAAUniforms(size.x, size.y);
    this.fxaaPass.enabled = this.settings.fxaaEnabled;
    this.composer.addPass(this.fxaaPass);
    
    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms['offset'].value = 1.0;
    this.vignettePass.uniforms['darkness'].value = this.settings.vignetteStrength;
    this.vignettePass.enabled = this.settings.vignetteEnabled;
    this.composer.addPass(this.vignettePass);
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    eventBus.on<Partial<PostProcessingSettings>>(Events.POST_PROCESSING_CHANGED, (settings) => {
      this.updateSettings(settings);
    });
  }
  
  private updateFXAAUniforms(width: number, height: number): void {
    this.fxaaPass.material.uniforms['resolution'].value.set(
      1 / width,
      1 / height
    );
  }
  
  public updateSettings(settings: Partial<PostProcessingSettings>): void {
    Object.assign(this.settings, settings);
    
    if (settings.bloomStrength !== undefined) {
      this.bloomPass.strength = settings.bloomStrength;
    }
    if (settings.bloomRadius !== undefined) {
      this.bloomPass.radius = settings.bloomRadius;
    }
    if (settings.bloomThreshold !== undefined) {
      this.bloomPass.threshold = settings.bloomThreshold;
    }
    if (settings.bloomEnabled !== undefined) {
      this.bloomPass.enabled = settings.bloomEnabled;
    }
    
    if (settings.vignetteStrength !== undefined) {
      this.vignettePass.uniforms['darkness'].value = settings.vignetteStrength;
    }
    if (settings.vignetteEnabled !== undefined) {
      this.vignettePass.enabled = settings.vignetteEnabled;
    }
    
    if (settings.fxaaEnabled !== undefined) {
      this.fxaaPass.enabled = settings.fxaaEnabled;
    }
    
    if (settings.lutEnabled !== undefined) {
      this.lutPass.enabled = settings.lutEnabled;
    }
    if (settings.lutIntensity !== undefined) {
      this.lutPass.intensity = settings.lutIntensity;
    }
  }
  
  public async loadLUT(url: string): Promise<void> {
    try {
      const loader = new LUT3dlLoader();
      const lut = await loader.loadAsync(url);
      this.lutPass.lut = lut as any;
      this.settings.lutEnabled = true;
      this.lutPass.enabled = true;
    } catch (error) {
      console.warn('Failed to load LUT:', error);
    }
  }
  
  public setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.updateFXAAUniforms(width, height);
    this.bloomPass.setSize(width, height);
  }
  
  public render(deltaTime: number): void {
    this.composer.render(deltaTime);
  }
  
  public getSettings(): PostProcessingSettings {
    return { ...this.settings };
  }
  
  public dispose(): void {
    this.composer.dispose();
    this.bloomPass.dispose();
    this.fxaaPass.dispose();
    this.vignettePass.dispose();
    this.lutPass.dispose();
  }
}
