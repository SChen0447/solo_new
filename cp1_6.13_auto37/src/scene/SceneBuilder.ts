import * as THREE from 'three';

export class SceneBuilder {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  ground: THREE.Mesh;
  groundGrid: THREE.Group;

  private container: HTMLElement | null = null;
  private cameraAngle: { theta: number; phi: number } = { theta: 0, phi: Math.PI / 4 };
  private cameraDistance: number = 50;
  private readonly minDistance: number = 20;
  private readonly maxDistance: number = 100;
  private readonly rotationSpeed: number = 0.005;
  private readonly zoomSpeed: number = 0.01;
  private isDragging: boolean = false;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private lights: { ambient: THREE.AmbientLight; directional: THREE.DirectionalLight; point: THREE.PointLight } | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.ground = new THREE.Mesh();
    this.groundGrid = new THREE.Group();
  }

  init(container: HTMLElement): void {
    this.container = container;

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0e1a, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.setupCamera();
    this.setupLights();
    this.createGround();
    this.createSky();
    this.setupEventListeners();
  }

  private setupCamera(): void {
    this.camera.position.set(0, 30, 50);
    this.camera.lookAt(0, 0, 0);
    this.updateCameraPosition();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4da6ff, 1.0, 200);
    pointLight.position.set(0, 50, 0);
    this.scene.add(pointLight);

    this.lights = { ambient: ambientLight, directional: directionalLight, point: pointLight };
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0e1a,
      roughness: 0.9,
      metalness: 0.1
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.createGridLines();
  }

  private createGridLines(): void {
    const gridSize = 200;
    const gridDivisions = 40;
    const step = gridSize / gridDivisions;
    const centerOffset = gridSize / 2;

    for (let i = 0; i <= gridDivisions; i++) {
      const distFromCenter = Math.abs(i - gridDivisions / 2) / (gridDivisions / 2);
      
      const color = new THREE.Color();
      const centerColor = new THREE.Color(0x4da6ff);
      const edgeColor = new THREE.Color(0x3d2466);
      color.lerpColors(centerColor, edgeColor, distFromCenter);

      const opacity = 0.6 * (1 - distFromCenter * 0.5);

      const lineMaterial = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity
      });

      const points1: THREE.Vector3[] = [];
      points1.push(new THREE.Vector3(i * step - centerOffset, 0.01, -centerOffset));
      points1.push(new THREE.Vector3(i * step - centerOffset, 0.01, centerOffset));
      const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);
      const line1 = new THREE.Line(geometry1, lineMaterial);
      this.groundGrid.add(line1);

      const points2: THREE.Vector3[] = [];
      points2.push(new THREE.Vector3(-centerOffset, 0.01, i * step - centerOffset));
      points2.push(new THREE.Vector3(centerOffset, 0.01, i * step - centerOffset));
      const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
      const line2 = new THREE.Line(geometry2, lineMaterial);
      this.groundGrid.add(line2);
    }

    this.scene.add(this.groundGrid);
  }

  private createSky(): void {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0e1a) },
        bottomColor: { value: new THREE.Color(0x1a1e3a) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 400 + Math.random() * 100;
      
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta) + 50;
      positions[i + 2] = radius * Math.cos(phi);
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8
    });
    
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    window.addEventListener('resize', this.resize.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isDragging = true;
      this.lastMousePos = { x: event.clientX, y: event.clientY };
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = event.clientX - this.lastMousePos.x;
      const deltaY = event.clientY - this.lastMousePos.y;
      this.updateCameraRotation(deltaX, deltaY);
      this.lastMousePos = { x: event.clientX, y: event.clientY };
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.updateCameraZoom(event.deltaY);
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isDragging = true;
      this.lastMousePos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (this.isDragging && event.touches.length === 1) {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - this.lastMousePos.x;
      const deltaY = event.touches[0].clientY - this.lastMousePos.y;
      this.updateCameraRotation(deltaX, deltaY);
      this.lastMousePos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  updateCameraRotation(deltaX: number, deltaY: number): void {
    this.cameraAngle.theta -= deltaX * this.rotationSpeed;
    this.cameraAngle.phi -= deltaY * this.rotationSpeed;
    this.cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.cameraAngle.phi));
    this.updateCameraPosition();
  }

  updateCameraZoom(delta: number): void {
    this.cameraDistance += delta * this.zoomSpeed;
    this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance));
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.sin(this.cameraAngle.theta);
    const y = this.cameraDistance * Math.cos(this.cameraAngle.phi);
    const z = this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.cos(this.cameraAngle.theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  addBuilding(mesh: THREE.Object3D): void {
    this.scene.add(mesh);
  }

  removeBuilding(mesh: THREE.Object3D): void {
    this.scene.remove(mesh);
  }

  addSeed(mesh: THREE.Object3D): void {
    this.scene.add(mesh);
  }

  removeSeed(mesh: THREE.Object3D): void {
    this.scene.remove(mesh);
  }

  getMouseGroundIntersection(event: MouseEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObject(this.ground);
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    if (!this.container) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose(): void {
    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  }

  getIsDragging(): boolean {
    return this.isDragging;
  }
}
