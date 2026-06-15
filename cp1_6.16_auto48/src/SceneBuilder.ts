import * as THREE from 'three';
import { DataPoint, DatasetSummary } from './types';
import { eventBus } from './EventBus';

const CUBE_WIDTH = 200;
const CUBE_HEIGHT = 100;
const CUBE_DEPTH = 200;

export class SceneBuilder {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private points: THREE.Points | null = null;
  private pointData: DataPoint[] = [];
  private summary: DatasetSummary | null = null;
  private opacityAttribute: THREE.BufferAttribute | null = null;
  private currentTime: number = 12;
  private timeWindow: number = 1;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    const { clientWidth, clientHeight } = container;
    this.camera = new THREE.PerspectiveCamera(60, clientWidth / clientHeight, 0.1, 2000);
    this.camera.position.set(250, 150, 250);
    this.camera.lookAt(0, 50, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.buildCubeFrame();
    this.buildGridLabels();
    this.buildLegend();
    this.addAmbientLight();

    window.addEventListener('resize', this.onResize.bind(this));

    eventBus.on('datasetReady', this.onDatasetReady.bind(this));
    eventBus.on('timeUpdate', this.onTimeUpdate.bind(this));
  }

  private addAmbientLight(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(100, 200, 100);
    this.scene.add(dirLight);
  }

  private buildCubeFrame(): void {
    const geometry = new THREE.BoxGeometry(CUBE_WIDTH, CUBE_HEIGHT, CUBE_DEPTH);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.8 });
    const cube = new THREE.LineSegments(edges, material);
    cube.position.y = CUBE_HEIGHT / 2;
    cube.userData.isFrame = true;
    this.scene.add(cube);

    const gridHelper = new THREE.GridHelper(CUBE_WIDTH, 10, 0x333333, 0x222222);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);
  }

  private buildGridLabels(): void {
    const labelGroup = new THREE.Group();
    labelGroup.name = 'labels';

    const latLabels = [-90, -60, -30, 0, 30, 60, 90];
    const halfW = CUBE_WIDTH / 2;
    const halfD = CUBE_DEPTH / 2;

    latLabels.forEach((lat) => {
      const x = (lat / 90) * halfW;
      const canvas = this.makeTextCanvas(`${lat}°`, 40, '#ffffff', '10px sans-serif');
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(x, -2, -halfD - 5);
      sprite.scale.set(15, 8, 1);
      labelGroup.add(sprite);
    });

    const lngLabels = [-180, -120, -60, 0, 60, 120, 180];
    lngLabels.forEach((lng) => {
      const z = (lng / 180) * halfD;
      const canvas = this.makeTextCanvas(`${lng}°`, 50, '#ffffff', '10px sans-serif');
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(-halfW - 5, -2, z);
      sprite.scale.set(18, 8, 1);
      labelGroup.add(sprite);
    });

    const altLabels = [0, 25, 50, 75, 100];
    altLabels.forEach((alt) => {
      const y = alt;
      const canvas = this.makeTextCanvas(`${alt}m`, 40, '#ffffff', '10px sans-serif');
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(-halfW - 10, y, halfD + 5);
      sprite.scale.set(15, 8, 1);
      labelGroup.add(sprite);
    });

    this.scene.add(labelGroup);
  }

  private makeTextCanvas(text: string, width: number, color: string, font: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = width * 2;
    canvas.height = 30;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width, 15);
    return canvas;
  }

  private buildLegend(): void {
    const legendContainer = document.createElement('div');
    legendContainer.id = 'color-legend';
    legendContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 120px;
      height: 200px;
      background: #333333;
      border: 1px solid #444444;
      border-radius: 8px;
      padding: 10px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;

    const title = document.createElement('div');
    title.textContent = '浓度值';
    title.style.cssText = `
      color: #ffffff;
      font-size: 12px;
      margin-bottom: 8px;
    `;
    legendContainer.appendChild(title);

    const gradientBar = document.createElement('div');
    gradientBar.style.cssText = `
      width: 20px;
      flex: 1;
      background: linear-gradient(to top, #0000FF, #00AAFF, #00FFFF, #FFFF00, #FFAA00, #FF0000);
      border-radius: 2px;
      margin-right: 8px;
    `;

    const labelsContainer = document.createElement('div');
    labelsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      flex: 1;
      color: #ffffff;
      font-size: 10px;
    `;
    const labels = ['100', '80', '60', '40', '20', '0'];
    labels.forEach((label) => {
      const span = document.createElement('span');
      span.textContent = label;
      labelsContainer.appendChild(span);
    });

    const barRow = document.createElement('div');
    barRow.style.cssText = `
      display: flex;
      flex: 1;
      width: 100%;
    `;
    barRow.appendChild(gradientBar);
    barRow.appendChild(labelsContainer);
    legendContainer.appendChild(barRow);

    document.body.appendChild(legendContainer);

    const mq = window.matchMedia('(max-width: 768px)');
    const handleMQ = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        legendContainer.style.width = '80px';
        legendContainer.style.height = '160px';
        legendContainer.style.right = 'auto';
        legendContainer.style.left = '20px';
        legendContainer.style.top = '140px';
      } else {
        legendContainer.style.width = '120px';
        legendContainer.style.height = '200px';
        legendContainer.style.left = 'auto';
        legendContainer.style.right = '20px';
        legendContainer.style.top = '20px';
      }
    };
    handleMQ(mq);
    mq.addEventListener('change', handleMQ);
  }

  private onDatasetReady({ data, summary }: { data: DataPoint[]; summary: DatasetSummary }): void {
    this.pointData = data;
    this.summary = summary;
    this.buildPointCloud();
    eventBus.emit('sceneBuilt', { pointCount: data.length });
  }

  private buildPointCloud(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
      this.points = null;
    }

    const count = Math.min(this.pointData.length, 10000);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    const times = new Float32Array(count);

    const halfW = CUBE_WIDTH / 2;
    const halfD = CUBE_DEPTH / 2;
    const [minVal, maxVal] = this.summary
      ? this.summary.valueRange
      : [0, 100];

    for (let i = 0; i < count; i++) {
      const p = this.pointData[i];
      const x = (p.lat / 90) * halfW;
      const y = p.alt;
      const z = (p.lng / 180) * halfD;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const t = maxVal > minVal ? (p.value - minVal) / (maxVal - minVal) : 0;
      const color = new THREE.Color();
      color.setHSL((1 - t) * 0.66, 1, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 1 + t * 9;
      times[i] = p.time;
      opacities[i] = 0.05;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    geometry.setAttribute('time', new THREE.BufferAttribute(times, 1));

    this.opacityAttribute = geometry.getAttribute('opacity') as THREE.BufferAttribute;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createCircleTexture() },
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor, vOpacity) * texColor;
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    this.updateOpacityByTime(this.currentTime);
  }

  private createCircleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private onTimeUpdate({ timeIndex }: { timeIndex: number }): void {
    this.currentTime = timeIndex;
    this.updateOpacityByTime(timeIndex);
  }

  private updateOpacityByTime(time: number): void {
    if (!this.opacityAttribute || !this.pointData.length) return;

    const opacities = this.opacityAttribute.array as Float32Array;
    const count = opacities.length;
    const timeAttr = this.points?.geometry.getAttribute('time') as THREE.BufferAttribute;
    if (!timeAttr) return;
    const times = timeAttr.array as Float32Array;

    const halfWindow = this.timeWindow;
    for (let i = 0; i < count; i++) {
      const t = times[i];
      let diff = Math.abs(t - time);
      if (diff > 12) diff = 24 - diff;
      opacities[i] = diff <= halfWindow ? 1.0 : 0.05;
    }

    this.opacityAttribute.needsUpdate = true;
  }

  private onResize(): void {
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
  }
}
