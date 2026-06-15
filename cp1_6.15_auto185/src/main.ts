import * as THREE from 'three';
import { AudioAnalyzer } from './audioAnalyzer';
import { SculptureRenderer, type DisplayMode } from './sculptureRenderer';
import { UIController } from './uiController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private audioAnalyzer: AudioAnalyzer;
  private sculptureRenderer: SculptureRenderer;
  private uiController: UIController;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private isPlaying = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0a1a');
    this.scene.fog = new THREE.Fog('#0a0a1a', 15, 35);

    const container = document.getElementById('canvas-container')!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 8, 20);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.setupLights();

    this.audioAnalyzer = new AudioAnalyzer();
    this.sculptureRenderer = new SculptureRenderer(this.scene);

    this.uiController = new UIController(this.audioAnalyzer, {
      onFileSelected: (file) => this.handleFileSelected(file),
      onPlayToggle: () => this.handlePlayToggle(),
      onVolumeChange: (volume) => this.audioAnalyzer.setVolume(volume),
      onDisplayModeChange: (mode) => this.handleDisplayModeChange(mode),
      onSeek: (time) => this.audioAnalyzer.seek(time),
    });

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.handleResize.bind(this));

    this.startAnimationLoop();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -15;
    mainLight.shadow.camera.right = 15;
    mainLight.shadow.camera.top = 15;
    mainLight.shadow.camera.bottom = -15;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x48dbfb, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff6b6b, 0.3);
    rimLight.position.set(0, -3, 5);
    this.scene.add(rimLight);

    const pointLight1 = new THREE.PointLight(0x6c63ff, 1, 30);
    pointLight1.position.set(-8, 4, -8);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x48dbfb, 1, 30);
    pointLight2.position.set(8, 4, 8);
    this.scene.add(pointLight2);
  }

  private async handleFileSelected(file: File): Promise<void> {
    this.uiController.showLoading();
    try {
      await this.audioAnalyzer.loadAudioFile(file, (progress) => {
        this.uiController.setLoadingProgress(progress);
      });
      this.audioAnalyzer.play();
      this.isPlaying = true;
    } catch (error) {
      this.uiController.hideLoading();
      console.error('加载音频失败:', error);
      alert('加载音频失败，请选择有效的 MP3 或 WAV 文件。');
    }
  }

  private handlePlayToggle(): void {
    if (!this.audioAnalyzer.isAudioReady()) return;

    if (this.isPlaying) {
      this.audioAnalyzer.pause();
      this.isPlaying = false;
    } else {
      this.audioAnalyzer.play();
      this.isPlaying = true;
    }
  }

  private handleDisplayModeChange(mode: DisplayMode): void {
    this.sculptureRenderer.setDisplayMode(mode);
  }

  private handleResize(): void {
    const container = document.getElementById('canvas-container')!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.sculptureRenderer.resize(width, height);
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const deltaTime = Math.min(this.clock.getDelta(), 0.1);
      const frequencyData = this.audioAnalyzer.getFrequencyData();

      this.sculptureRenderer.update(frequencyData, deltaTime);

      this.renderer.render(this.scene, this.camera);
    };

    this.audioAnalyzer.on('ended', () => {
      this.isPlaying = false;