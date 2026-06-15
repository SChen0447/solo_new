import * as THREE from 'three';
import { World } from './world';
import { Player } from './player';
import { VoxelRenderer } from './renderer';
import { UIManager } from './ui';
import { VoxelType, VoxelCoord } from './types';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private world: World;
  private player: Player;
  private voxelRenderer: VoxelRenderer;
  private ui: UIManager;
  private audioCtx: AudioContext | null = null;
  private lastTime: number = 0;

  constructor() {
    const container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 50);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B6914, 0.3);
    this.scene.add(hemiLight);

    this.world = new World();
    this.world.generateTerrain();

    this.voxelRenderer = new VoxelRenderer(this.scene, this.world);
    this.voxelRenderer.buildWorld();

    this.player = new Player(this.world, this.camera, this.renderer.domElement);
    this.player.onBlockChange = (action, coord, normal) => {
      this.handlePlayerBlockAction(action, coord, normal);
    };

    this.ui = new UIManager(container);
    this.ui.onBlockSelect = (blockType) => {
      // handled through getSelectedBlockType
    };

    window.addEventListener('resize', () => this.onResize());

    this.initAudio();
  }

  private initAudio(): void {
    const unlock = () => {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
  }

  private playSound(isAdd: boolean): void {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    if (isAdd) {
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(660, this.audioCtx.currentTime + 0.1);
    } else {
      osc.frequency.setValueAtTime(330, this.audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(220, this.audioCtx.currentTime + 0.1);
    }

    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);

    osc.start(this.audioCtx.currentTime);
    osc.stop(this.audioCtx.currentTime + 0.15);
  }

  private handlePlayerBlockAction(action: 'add' | 'remove', coord: VoxelCoord, _normal: VoxelCoord): void {
    if (action === 'add') {
      const blockType = this.ui.getSelectedBlockType();
      const canPlace = this.ui.useBlock();
      if (!canPlace) return;
      this.world.setVoxel(coord.x, coord.y, coord.z, blockType);
      this.playSound(true);
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start(): void {
    this.lastTime = performance.now() / 1000;
    this.loop();
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop);

    const now = performance.now() / 1000;
    let delta = now - this.lastTime;
    this.lastTime = now;

    if (delta > 0.1) delta = 0.1;

    if (!this.ui.isInventoryOpenState()) {
      this.player.update(delta, this.camera);
    }

    this.voxelRenderer.updateAnimations();
    this.voxelRenderer.updateHighlight(this.player.facingBlock);

    this.ui.updateCoords(
      this.player.position.x,
      this.player.position.y,
      this.player.position.z,
      this.player.getFacingBlockName()
    );

    this.world.onWorldChange.on(() => {
      this.playSound(false);
    });

    this.renderer.render(this.scene, this.camera);
  };
}

const app = new App();
app.start();
