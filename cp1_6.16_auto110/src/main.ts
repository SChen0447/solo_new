import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EventBus } from './eventBus';
import { EarthquakeSource } from './earthquakeSource';
import { BuildingParticle } from './buildingParticle';
import { GeologicalLayer } from './geologicalLayer';
import { UIController } from './uiController';

class App {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();

  private bus!: EventBus;
  private earthquakeSource!: EarthquakeSource;
  private buildingParticle!: BuildingParticle;
  private geologicalLayer!: GeologicalLayer;
  private uiController!: UIController;

  private rafId = 0;
  private fpsSmooth = 60;
  private statsEl!: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;
    this.initStats();
    this.initThree();
    this.initLights();
    this.initFogAndHelpers();
    this.initModules();
    this.bindResize();
    this.animate();
  }

  private initStats(): void {
    this.statsEl = document.createElement('div');
    this.statsEl.style.cssText = `
      position: fixed; left: 16px; bottom: 16px; z-index: 60;
      background: rgba(26,26,46,0.75); backdrop-filter: blur(8px);
      border: 1px solid rgba(15,52,96,0.55); border-radius: 8px;
      padding: 8px 12px; font-size: 11px; color: rgba(255,255,255,0.8);
      line-height: 1.6; font-variant-numeric: tabular-nums;
      pointer-events: none;
    `;
    this.statsEl.innerHTML = '<div>FPS: <b style="color:#3ddbd9">--</b></div><div>Draws: <b style="color:#ff8a3d">--</b></div>';
    document.body.appendChild(this.statsEl);
  }

  private initThree(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2; bgCanvas.height = 256;
    const bgCtx = bgCanvas.getContext('2d')!;
    const grd = bgCtx.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#0a0a1a');
    grd.addColorStop(0.5, '#131328');
    grd.addColorStop(1, '#0f3460');
    bgCtx.fillStyle = grd;
    bgCtx.fillRect(0, 0, 2, 256);
    const bgTex = new THREE.CanvasTexture(bgCanvas);
    bgTex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = bgTex;

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1500
    );
    this.camera.position.set(90, 70, 110);
    this.camera.lookAt(0, -20, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 30;
    this.controls.maxDistance = 320;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minPolarAngle = Math.PI * 0.1;
    this.controls.target.set(0, -20, 0);
    this.controls.update();
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0x8a9bcc, 0.55);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x88aaff, 0x221833, 0.4);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xfff0e0, 1.05);
    dir.position.set(70, 120, 60);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 500;
    dir.shadow.camera.left = -130;
    dir.shadow.camera.right = 130;
    dir.shadow.camera.top = 130;
    dir.shadow.camera.bottom = -130;
    dir.shadow.bias = -0.0005;
    this.scene.add(dir);

    const rim = new THREE.DirectionalLight(0x6f8cff, 0.55);
    rim.position.set(-80, 40, -70);
    this.scene.add(rim);

    const accent = new THREE.PointLight(0xe94560, 0.8, 260, 2);
    accent.position.set(0, -15, 0);
    this.scene.add(accent);
  }

  private initFogAndHelpers(): void {
    this.scene.fog = new THREE.FogExp2(0x0a1026, 0.0045);

    const axesHelper = new THREE.AxesHelper(18);
    (axesHelper.material as THREE.Material).opacity = 0.25;
    (axesHelper.material as THREE.Material).transparent = true;
    axesHelper.position.y = -139.5;
    this.scene.add(axesHelper);

    const originRing = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.9, 48),
      new THREE.MeshBasicMaterial({
        color: 0xe94560,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      })
    );
    originRing.rotation.x = -Math.PI / 2;
    originRing.position.y = 0.005;
    this.scene.add(originRing);
  }

  private initModules(): void {
    this.bus = new EventBus();
    this.geologicalLayer = new GeologicalLayer(this.scene, this.bus);
    this.earthquakeSource = new EarthquakeSource(this.scene, this.bus);
    this.buildingParticle = new BuildingParticle(this.scene, this.bus);
    this.uiController = new UIController(this.bus);
  }

  private bindResize(): void {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const fps = 1 / Math.max(dt, 0.0001);
    this.fpsSmooth = this.fpsSmooth * 0.9 + fps * 0.1;

    this.controls.update();

    this.earthquakeSource.update(dt);
    this.buildingParticle.update(dt);
    this.geologicalLayer.update(dt);

    this.renderer.render(this.scene, this.camera);

    if (Math.floor(this.clock.elapsedTime * 4) % 2 === 0) {
      const info = this.renderer.info;
      const draws = info.render.calls;
      this.statsEl.innerHTML =
        `<div>FPS: <b style="color:${this.fpsSmooth > 45 ? '#3ddbd9' : this.fpsSmooth > 30 ? '#ffd166' : '#e94560'}">${this.fpsSmooth.toFixed(0)}</b></div>` +
        `<div>Draws: <b style="color:#ff8a3d">${draws}</b> · Tris: <b style="color:#b266ff">${(info.render.triangles / 1000).toFixed(1)}k</b></div>`;
    }
  };

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.earthquakeSource.dispose();
    this.buildingParticle.dispose();
    this.geologicalLayer.dispose();
    this.uiController.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.bus.clear();
  }
}

(function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App('app'), { once: true });
  } else {
    new App('app');
  }
})();

export {};
