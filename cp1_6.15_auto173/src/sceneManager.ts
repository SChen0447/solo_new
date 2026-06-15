import * as THREE from 'three';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public container: HTMLElement;

  public ground!: THREE.Mesh;
  public directionalLight!: THREE.DirectionalLight;
  public ambientLight!: THREE.AmbientLight;
  public hemisphereLight!: THREE.HemisphereLight;
  public windArrow!: THREE.Group;

  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private onAnimationFrame: (dt: number) => void = () => {};

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 120, 300);

    this.clock = new THREE.Clock();

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 1000);
    this.camera.position.set(70, 55, 70);
    this.camera.lookAt(0, 5, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.initLights();
    this.initGround();
    this.initWindArrow();
    this.initOrbitControls();

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2a2a3a, 0.35);
    this.scene.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
    this.directionalLight.position.set(50, 80, 30);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(2048, 2048);
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 300;
    this.directionalLight.shadow.camera.left = -100;
    this.directionalLight.shadow.camera.right = 100;
    this.directionalLight.shadow.camera.top = 100;
    this.directionalLight.shadow.camera.bottom = -100;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02;
    this.scene.add(this.directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.25);
    fillLight.position.set(-40, 40, -30);
    this.scene.add(fillLight);
  }

  private initGround(): void {
    const gridSize = 200;
    const gridDivisions = 40;

    const groundGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e1e2f,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x333344, 0x333344);
    gridHelper.position.y = 0.01;
    const gridMat = gridHelper.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.3;
    this.scene.add(gridHelper);

    const outerGrid = new THREE.GridHelper(gridSize + 20, 4, 0x00d4aa, 0x00d4aa);
    outerGrid.position.y = 0.02;
    const outerMat = outerGrid.material as THREE.Material;
    outerMat.transparent = true;
    outerMat.opacity = 0.15;
    this.scene.add(outerGrid);

    const axesHelper = new THREE.AxesHelper(8);
    axesHelper.position.set(-95, 0.05, -95);
    this.scene.add(axesHelper);
  }

  private initWindArrow(): void {
    this.windArrow = new THREE.Group();

    const coneGeometry = new THREE.ConeGeometry(1, 3, 8);
    const coneMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: 0xff2222,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.3
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.rotation.x = Math.PI;
    cone.position.z = 1.5;
    cone.castShadow = false;

    const shaftGeometry = new THREE.CylinderGeometry(0.35, 0.5, 2, 8);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6666,
      emissive: 0xff3333,
      emissiveIntensity: 0.2,
      roughness: 0.5
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -1;
    shaft.castShadow = false;

    const ringGeometry = new THREE.TorusGeometry(1.2, 0.08, 8, 24);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xff5555,
      emissive: 0xff2222,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.7
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.y = Math.PI / 2;
    ring.position.z = -2.5;

    this.windArrow.add(cone, shaft, ring);
    this.windArrow.rotation.y = Math.PI / 2;
    this.windArrow.position.set(-85, 8, -85);
    this.scene.add(this.windArrow);

    const arrowBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2, 0.5, 16),
      new THREE.MeshStandardMaterial({
        color: 0x2a2a3a,
        roughness: 0.8,
        metalness: 0.2
      })
    );
    arrowBase.position.set(-85, 0.25, -85);
    this.scene.add(arrowBase);
  }

  private initOrbitControls(): void {
    const camera = this.camera;
    const domElement = this.renderer.domElement;

    let isMouseDown = false;
    let isRightMouseDown = false;
    let previousMouseX = 0;
    let previousMouseY = 0;
    let theta = Math.PI / 4;
    let phi = Math.PI / 3.5;
    let radius = 110;
    const target = new THREE.Vector3(0, 8, 0);

    const updateCamera = () => {
      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = target.y + radius * Math.cos(phi);
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(target);
    };

    updateCamera();

    domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) isMouseDown = true;
      if (e.button === 2) isRightMouseDown = true;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    });

    domElement.addEventListener('mouseup', (e) => {
      if (e.button === 0) isMouseDown = false;
      if (e.button === 2) isRightMouseDown = false;
    });

    domElement.addEventListener('mouseleave', () => {
      isMouseDown = false;
      isRightMouseDown = false;
    });

    domElement.addEventListener('mousemove', (e) => {
      const deltaX = e.clientX - previousMouseX;
      const deltaY = e.clientY - previousMouseY;

      if (isMouseDown) {
        theta -= deltaX * 0.005;
        phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, phi - deltaY * 0.005));
        updateCamera();
      }

      if (isRightMouseDown) {
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        camera.getWorldDirection(right);
        right.cross(camera.up).normalize();
        up.copy(camera.up);

        target.add(right.multiplyScalar(-deltaX * 0.15));
        target.add(up.multiplyScalar(deltaY * 0.15));
        target.y = Math.max(0, Math.min(80, target.y));
        updateCamera();
      }

      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    });

    domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      radius = Math.max(25, Math.min(280, radius + e.deltaY * 0.12));
      updateCamera();
    }, { passive: false });
  }

  public handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public setAnimationCallback(cb: (dt: number) => void): void {
    this.onAnimationFrame = cb;
  }

  public start(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.onAnimationFrame(dt);
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.renderer.dispose();
    this.scene.clear();
  }
}
