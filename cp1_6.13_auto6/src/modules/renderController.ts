import * as THREE from 'three';
import { DataController, DataColumn } from './dataController';

export interface ColorTheme {
  name: string;
  bottom: THREE.Color;
  top: THREE.Color;
  glow: THREE.Color;
}

export const COLOR_THEMES: Record<string, ColorTheme> = {
  ocean: {
    name: '海洋蓝',
    bottom: new THREE.Color(0x4a90d9),
    top: new THREE.Color(0x00e5ff),
    glow: new THREE.Color(0x4a90d9)
  },
  sunset: {
    name: '日落橙',
    bottom: new THREE.Color(0xff6b00),
    top: new THREE.Color(0xffcc00),
    glow: new THREE.Color(0xff6b00)
  },
  forest: {
    name: '森林绿',
    bottom: new THREE.Color(0x2ecc71),
    top: new THREE.Color(0x00ff88),
    glow: new THREE.Color(0x2ecc71)
  },
  purple: {
    name: '梦幻紫',
    bottom: new THREE.Color(0x9b59b6),
    top: new THREE.Color(0xe74cff),
    glow: new THREE.Color(0x9b59b6)
  }
};

interface ColumnMesh {
  id: number;
  group: THREE.Group;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  material: THREE.ShaderMaterial;
  edgeMaterial: THREE.LineBasicMaterial;
  opacity: number;
  targetOpacity: number;
  isBending: boolean;
  bendIntensity: number;
  targetBendIntensity: number;
}

interface ParticleData {
  velocity: THREE.Vector3;
  baseSize: number;
  phase: number;
}

const columnVertexShader = `
  varying vec3 vPosition;
  varying float vHeight;
  uniform float uBendAmount;
  uniform vec3 uBendDirection;
  uniform float uHeight;
  uniform float uPulseAmount;

  void main() {
    vPosition = position;
    vHeight = (position.y / uHeight) + 0.5;
    
    vec3 pos = position;
    
    float bendFactor = pow(max(0.0, pos.y / uHeight), 2.0);
    pos.xz += uBendDirection.xz * uBendAmount * bendFactor * uHeight * 0.3;
    
    float pulseScale = 1.0 + uPulseAmount * 0.3 * sin(vHeight * 3.14159);
    pos.xz *= pulseScale;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const columnFragmentShader = `
  varying vec3 vPosition;
  varying float vHeight;
  uniform vec3 uBottomColor;
  uniform vec3 uTopColor;
  uniform float uOpacity;
  uniform float uGlowIntensity;
  uniform float uBendColorMix;

  void main() {
    vec3 baseColor = mix(uBottomColor, uTopColor, smoothstep(0.0, 1.0, vHeight));
    
    vec3 bendColor = vec3(1.0, 0.42, 0.0);
    baseColor = mix(baseColor, bendColor, uBendColorMix);
    
    vec3 glow = baseColor * uGlowIntensity * (0.5 + 0.5 * vHeight);
    vec3 finalColor = baseColor + glow;
    
    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;

export class RenderController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private dataController: DataController;
  private container: HTMLElement;

  private columnGroup: THREE.Group = new THREE.Group();
  private columnMeshes: Map<number, ColumnMesh> = new Map();
  private particles: THREE.Points | null = null;
  private particleData: ParticleData[] = [];

  private currentTheme: ColorTheme = COLOR_THEMES.ocean;
  private rotationSpeed: number = 0.01;
  private particleCount: number = 750;
  private isBeatMode: boolean = false;
  private beatTimer: number = 0;
  private beatInterval: number = 1;

  private selectedColumnId: number | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private transitionDuration: number = 0.3;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    dataController: DataController,
    container: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.dataController = dataController;
    this.container = container;

    this.init();
  }

  private init(): void {
    this.scene.add(this.columnGroup);
    this.createParticles();
    this.createColumnMeshes();
    this.setupLighting();

    this.dataController.on('columnsGenerated', () => {
      this.animateColumnTransition();
    });
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(10, 20, 10);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4a90d9, 0.3);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);
  }

  private createColumnMaterial(column: DataColumn): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: columnVertexShader,
      fragmentShader: columnFragmentShader,
      uniforms: {
        uBottomColor: { value: this.currentTheme.bottom.clone() },
        uTopColor: { value: this.currentTheme.top.clone() },
        uOpacity: { value: column.opacity },
        uGlowIntensity: { value: 0.3 },
        uBendAmount: { value: 0 },
        uBendDirection: { value: new THREE.Vector3(0, 0, 0) },
        uBendColorMix: { value: 0 },
        uHeight: { value: column.value },
        uPulseAmount: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  private createColumnMesh(column: DataColumn): ColumnMesh {
    const group = new THREE.Group();

    const geometry = new THREE.CylinderGeometry(0.15, 0.18, column.value, 12, 1);
    geometry.translate(0, column.value / 2, 0);

    const material = this.createColumnMaterial(column);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.columnId = column.id;
    group.add(mesh);

    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: this.currentTheme.glow,
      transparent: true,
      opacity: 0.3
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgeMaterial);
    group.add(edges);

    const x = Math.cos(column.angle) * column.radius;
    const z = Math.sin(column.angle) * column.radius;
    group.position.set(x, 0, z);
    group.lookAt(0, group.position.y, 0);

    this.columnGroup.add(group);

    return {
      id: column.id,
      group,
      mesh,
      edges,
      material,
      edgeMaterial,
      opacity: 0,
      targetOpacity: column.opacity,
      isBending: false,
      bendIntensity: 0,
      targetBendIntensity: 0
    };
  }

  private createColumnMeshes(): void {
    this.columnMeshes.forEach(cm => {
      this.columnGroup.remove(cm.group);
      cm.mesh.geometry.dispose();
      cm.material.dispose();
      cm.edges.geometry.dispose();
      cm.edgeMaterial.dispose();
    });
    this.columnMeshes.clear();

    const columns = this.dataController.getColumns();
    columns.forEach(column => {
      const columnMesh = this.createColumnMesh(column);
      this.columnMeshes.set(column.id, columnMesh);
    });
  }

  private animateColumnTransition(): void {
    const oldMeshes = Array.from(this.columnMeshes.values());
    oldMeshes.forEach(cm => {
      cm.targetOpacity = 0;
    });

    setTimeout(() => {
      this.createColumnMeshes();
      this.columnMeshes.forEach(cm => {
        cm.opacity = 0;
        cm.targetOpacity = this.dataController.getColumns().find(c => c.id === cm.id)?.opacity || 1;
      });
    }, this.transitionDuration * 500);
  }

  private createParticles(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      (this.particles.geometry as THREE.BufferGeometry).dispose();
      (this.particles.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    this.particleData = [];

    for (let i = 0; i < this.particleCount; i++) {
      const radius = 12 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = (Math.random() - 0.5) * 15;
      const z = radius * Math.sin(phi) * Math.sin(theta);

      positions.push(x, y, z);

      const colorMix = Math.random();
      const color = this.currentTheme.bottom.clone().lerp(this.currentTheme.top, colorMix);
      colors.push(color.r, color.g, color.b);

      const size = 0.05 + Math.random() * 0.25;
      sizes.push(size);

      this.particleData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.5
        ),
        baseSize: size,
        phase: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  public updateParticleCount(count: number): void {
    this.particleCount = Math.max(500, Math.min(1000, count));
    this.createParticles();
  }

  public setColorTheme(themeName: string): void {
    const theme = COLOR_THEMES[themeName];
    if (theme) {
      this.currentTheme = theme;
      this.updateColumnColors();
      this.updateParticleColors();
    }
  }

  private updateColumnColors(): void {
    this.columnMeshes.forEach(cm => {
      cm.material.uniforms.uBottomColor.value.copy(this.currentTheme.bottom);
      cm.material.uniforms.uTopColor.value.copy(this.currentTheme.top);
      cm.edgeMaterial.color.copy(this.currentTheme.glow);
    });
  }

  private updateParticleColors(): void {
    if (!this.particles) return;

    const colors = this.particles.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < colors.count; i++) {
      const colorMix = Math.random();
      const color = this.currentTheme.bottom.clone().lerp(this.currentTheme.top, colorMix);
      colors.setXYZ(i, color.r, color.g, color.b);
    }
    colors.needsUpdate = true;
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  public setBeatMode(enabled: boolean): void {
    this.isBeatMode = enabled;
    this.beatTimer = 0;
  }

  public setBeatInterval(interval: number): void {
    this.beatInterval = Math.max(0.5, Math.min(2, interval));
  }

  public pickColumn(clientX: number, clientY: number): number | null {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.columnMeshes.values()).map(cm => cm.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const columnId = intersects[0].object.userData.columnId as number;
      this.selectedColumnId = columnId;
      const columnMesh = this.columnMeshes.get(columnId);
      if (columnMesh) {
        columnMesh.isBending = true;
        columnMesh.targetBendIntensity = 1;
      }
      return columnId;
    }

    return null;
  }

  public bendSelectedColumn(deltaX: number, deltaY: number): void {
    if (this.selectedColumnId === null) return;

    const columnMesh = this.columnMeshes.get(this.selectedColumnId);
    const column = this.dataController.getColumns().find(c => c.id === this.selectedColumnId);
    
    if (!columnMesh || !column) return;

    const worldDir = new THREE.Vector3(deltaX * 0.02, 0, deltaY * 0.02);
    const localDir = worldDir.applyMatrix4(new THREE.Matrix4().extractRotation(this.columnGroup.matrixWorld));

    this.dataController.bendColumn(this.selectedColumnId, localDir.x, localDir.z);

    const heightDelta = (deltaY + deltaX) * 0.02;
    const newValue = column.value + heightDelta;
    this.dataController.updateColumnValue(this.selectedColumnId, newValue);
  }

  public releaseSelectedColumn(): void {
    if (this.selectedColumnId !== null) {
      const columnMesh = this.columnMeshes.get(this.selectedColumnId);
      if (columnMesh) {
        columnMesh.isBending = false;
        columnMesh.targetBendIntensity = 0;
      }
      this.dataController.releaseColumn(this.selectedColumnId);
      this.selectedColumnId = null;
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public update(deltaTime: number, time: number): void {
    this.columnGroup.rotation.y += this.rotationSpeed;

    if (this.isBeatMode) {
      this.beatTimer += deltaTime;
      if (this.beatTimer >= this.beatInterval) {
        this.beatTimer = 0;
        this.dataController.triggerPulse(1);
      }
    }

    this.dataController.update(deltaTime);
    this.updateColumnMeshes(deltaTime, time);
    this.updateParticles(deltaTime, time);
  }

  private updateColumnMeshes(deltaTime: number, time: number): void {
    const columns = this.dataController.getColumns();
    const smoothFactor = Math.min(deltaTime * 8, 1);

    columns.forEach(column => {
      const cm = this.columnMeshes.get(column.id);
      if (!cm) return;

      cm.opacity += (cm.targetOpacity - cm.opacity) * smoothFactor;
      cm.bendIntensity += (cm.targetBendIntensity - cm.bendIntensity) * smoothFactor;

      const bendMagnitude = Math.sqrt(
        column.bendOffset.x * column.bendOffset.x + 
        column.bendOffset.z * column.bendOffset.z
      );

      const targetColorMix = this.easeOutCubic(Math.min(bendMagnitude * 2, 1));
      const currentColorMix = cm.material.uniforms.uBendColorMix.value;
      cm.material.uniforms.uBendColorMix.value = currentColorMix + (targetColorMix - currentColorMix) * smoothFactor;

      const targetGlow = column.isHighlighted ? 0.8 : 0.3;
      const currentGlow = cm.material.uniforms.uGlowIntensity.value;
      cm.material.uniforms.uGlowIntensity.value = currentGlow + (targetGlow - currentGlow) * smoothFactor;

      if (column.isHighlighted) {
        cm.edgeMaterial.color.setHex(0xffd700);
      } else if (cm.bendIntensity > 0.1) {
        cm.edgeMaterial.color.setHex(0xff6b00);
      } else {
        cm.edgeMaterial.color.copy(this.currentTheme.glow);
      }

      const edgeOpacity = 0.3 * cm.opacity;
      cm.edgeMaterial.opacity += (edgeOpacity - cm.edgeMaterial.opacity) * smoothFactor;

      cm.material.uniforms.uBendAmount.value = bendMagnitude * cm.bendIntensity;
      cm.material.uniforms.uBendDirection.value.set(column.bendOffset.x, 0, column.bendOffset.z).normalize();
      cm.material.uniforms.uHeight.value = column.value;
      cm.material.uniforms.uPulseAmount.value = column.pulseAmount;
      cm.material.uniforms.uOpacity.value = cm.opacity;

      const targetScale = column.scale * (1 + column.pulseAmount * 0.3);
      cm.group.scale.x += (targetScale - cm.group.scale.x) * smoothFactor;
      cm.group.scale.y += (targetScale - cm.group.scale.y) * smoothFactor;
      cm.group.scale.z += (targetScale - cm.group.scale.z) * smoothFactor;

      const geo = cm.mesh.geometry as THREE.CylinderGeometry;
      const currentHeight = geo.parameters.height;
      if (Math.abs(currentHeight - column.value) > 0.01) {
        geo.dispose();
        const newGeo = new THREE.CylinderGeometry(0.15, 0.18, column.value, 12, 1);
        newGeo.translate(0, column.value / 2, 0);
        cm.mesh.geometry = newGeo;
        cm.edges.geometry.dispose();
        cm.edges.geometry = new THREE.EdgesGeometry(newGeo);
      }
    });

    this.columnMeshes.forEach(cm => {
      if (cm.opacity <= 0.01 && cm.targetOpacity <= 0.01) {
        this.columnGroup.remove(cm.group);
        cm.mesh.geometry.dispose();
        cm.material.dispose();
        cm.edges.geometry.dispose();
        cm.edgeMaterial.dispose();
        this.columnMeshes.delete(cm.id);
      }
    });
  }

  private updateParticles(deltaTime: number, time: number): void {
    if (!this.particles) return;

    const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;
    const sizes = this.particles.geometry.attributes.size as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      const data = this.particleData[i];
      if (!data) continue;

      let x = positions.getX(i);
      let y = positions.getY(i);
      let z = positions.getZ(i);

      x += data.velocity.x * deltaTime;
      y += data.velocity.y * deltaTime;
      z += data.velocity.z * deltaTime;

      const dist = Math.sqrt(x * x + y * y + z * z);
      if (dist > 25) {
        data.velocity.x *= -1;
        data.velocity.y *= -1;
        data.velocity.z *= -1;
      }

      positions.setXYZ(i, x, y, z);

      const flicker = 0.5 + 0.5 * Math.sin(time * 3 + data.phase);
      const newSize = data.baseSize * (0.4 + flicker * 0.6);
      sizes.setX(i, newSize);
    }

    positions.needsUpdate = true;
    sizes.needsUpdate = true;

    this.particles.rotation.y += deltaTime * 0.05;
  }

  public resize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
