import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { MoleculeObjects, AtomObject, BondObject } from './MoleculeParser';

interface AnimationState {
  targetOpacity: Record<string, number>;
  currentOpacity: Record<string, number>;
  animating: boolean;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private labelsContainer: HTMLElement;
  
  private moleculeGroup: THREE.Group;
  private labels: Map<number, HTMLElement>;
  
  private atoms: AtomObject[];
  private bonds: BondObject[];
  private atomBondMap: Map<number, number[]>;
  
  private selectedAtom: AtomObject | null;
  private animationState: AnimationState;
  
  private moleculeCenter: THREE.Vector3;
  private isZoomAnimating: boolean;
  private zoomAnimationStart: number;
  private zoomAnimationDuration: number;
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  constructor(container: HTMLElement, labelsContainer: HTMLElement) {
    this.container = container;
    this.labelsContainer = labelsContainer;
    
    this.scene = new THREE.Scene();
    this.setupScene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(8, 6, 8);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.setupRenderer();
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupControls();
    
    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);
    
    this.labels = new Map();
    this.atoms = [];
    this.bonds = [];
    this.atomBondMap = new Map();
    this.selectedAtom = null;
    
    this.moleculeCenter = new THREE.Vector3();
    this.isZoomAnimating = false;
    this.zoomAnimationStart = 0;
    this.zoomAnimationDuration = 400;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.animationState = {
      targetOpacity: {},
      currentOpacity: {},
      animating: false
    };
    
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
  }
  
  private setupScene(): void {
    this.scene.background = null;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 10, 7);
    this.scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -5, -5);
    this.scene.add(directionalLight2);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.3, 50);
    pointLight.position.set(0, 5, 0);
    this.scene.add(pointLight);
  }
  
  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);
  }
  
  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 30;
    this.controls.minZoom = 0.3;
    this.controls.maxZoom = 5;
    this.controls.screenSpacePanning = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    
    this.controls.addEventListener('zoom', this.onZoom.bind(this));
  }
  
  private onZoom(): void {
    this.isZoomAnimating = true;
    this.zoomAnimationStart = performance.now();
  }
  
  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.atoms.map(a => a.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const atom = this.atoms.find(a => a.mesh === clickedMesh);
      if (atom) {
        this.highlightAtom(atom);
      }
    } else {
      this.clearHighlight();
    }
  }
  
  loadMolecule(objects: MoleculeObjects): void {
    this.clearMolecule();
    
    this.atoms = objects.atoms;
    this.bonds = objects.bonds;
    
    this.buildAtomBondMap();
    this.calculateMoleculeCenter();
    
    this.atoms.forEach(atom => {
      this.moleculeGroup.add(atom.mesh);
      if (atom.highlightMesh) {
        this.moleculeGroup.add(atom.highlightMesh);
      }
      this.createLabel(atom);
    });
    
    this.bonds.forEach(bond => {
      bond.meshes.forEach(mesh => {
        this.moleculeGroup.add(mesh);
      });
    });
    
    const elements = new Set(this.atoms.map(a => a.element));
    elements.forEach(element => {
      this.animationState.targetOpacity[element] = 1;
      this.animationState.currentOpacity[element] = 1;
    });
    
    this.resetView();
  }
  
  private buildAtomBondMap(): void {
    this.atomBondMap.clear();
    this.bonds.forEach((bond, bondIndex) => {
      if (!this.atomBondMap.has(bond.atom1)) {
        this.atomBondMap.set(bond.atom1, []);
      }
      if (!this.atomBondMap.has(bond.atom2)) {
        this.atomBondMap.set(bond.atom2, []);
      }
      this.atomBondMap.get(bond.atom1)!.push(bondIndex);
      this.atomBondMap.get(bond.atom2)!.push(bondIndex);
    });
  }
  
  private calculateMoleculeCenter(): void {
    if (this.atoms.length === 0) {
      this.moleculeCenter.set(0, 0, 0);
      return;
    }
    
    const sum = new THREE.Vector3();
    this.atoms.forEach(atom => {
      sum.add(atom.mesh.position);
    });
    sum.divideScalar(this.atoms.length);
    this.moleculeCenter.copy(sum);
  }
  
  private createLabel(atom: AtomObject): void {
    const label = document.createElement('div');
    label.className = 'atom-label';
    label.textContent = atom.label;
    this.labelsContainer.appendChild(label);
    this.labels.set(atom.index, label);
  }
  
  private clearMolecule(): void {
    while (this.moleculeGroup.children.length > 0) {
      const child = this.moleculeGroup.children[0];
      this.moleculeGroup.remove(child);
    }
    
    this.labels.forEach(label => {
      label.remove();
    });
    this.labels.clear();
    
    this.atoms = [];
    this.bonds = [];
    this.atomBondMap.clear();
    this.selectedAtom = null;
    this.animationState = {
      targetOpacity: {},
      currentOpacity: {},
      animating: false
    };
  }
  
  setElementOpacity(element: string, opacity: number): void {
    this.animationState.targetOpacity[element] = opacity;
    this.animationState.animating = true;
  }
  
  private updateOpacityAnimation(deltaTime: number): void {
    if (!this.animationState.animating) return;
    
    const animationSpeed = 2 * deltaTime;
    let allConverged = true;
    
    Object.keys(this.animationState.targetOpacity).forEach(element => {
      const target = this.animationState.targetOpacity[element];
      const current = this.animationState.currentOpacity[element];
      
      const diff = target - current;
      if (Math.abs(diff) > 0.001) {
        allConverged = false;
        const newValue = current + diff * Math.min(animationSpeed, 1);
        this.animationState.currentOpacity[element] = newValue;
        this.applyElementOpacity(element, newValue);
      } else {
        this.animationState.currentOpacity[element] = target;
        this.applyElementOpacity(element, target);
      }
    });
    
    this.animationState.animating = !allConverged;
  }
  
  private applyElementOpacity(element: string, opacity: number): void {
    this.atoms.forEach(atom => {
      if (atom.element === element) {
        const material = atom.mesh.material as THREE.MeshPhongMaterial;
        material.opacity = opacity;
        
        if (atom.highlightMesh) {
          const highlightMaterial = atom.highlightMesh.material as THREE.MeshBasicMaterial;
          if (this.selectedAtom !== atom) {
            highlightMaterial.opacity = 0;
          }
        }
        
        const label = this.labels.get(atom.index);
        if (label) {
          label.style.opacity = String(opacity);
        }
        
        const bondIndices = this.atomBondMap.get(atom.index) || [];
        bondIndices.forEach(bondIndex => {
          const bond = this.bonds[bondIndex];
          const otherAtom = this.atoms[bond.atom1 === atom.index ? bond.atom2 : bond.atom1];
          if (otherAtom) {
            const otherOpacity = this.animationState.currentOpacity[otherAtom.element] ?? 1;
            const bondOpacity = Math.min(opacity, otherOpacity) * 0.7;
            bond.meshes.forEach(mesh => {
              const material = mesh.material as THREE.MeshPhongMaterial;
              material.opacity = bondOpacity;
            });
          }
        });
      }
    });
  }
  
  highlightAtom(atom: AtomObject): void {
    this.clearHighlight();
    this.selectedAtom = atom;
    
    if (atom.highlightMesh) {
      const material = atom.highlightMesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.5;
    }
  }
  
  clearHighlight(): void {
    if (this.selectedAtom && this.selectedAtom.highlightMesh) {
      const material = this.selectedAtom.highlightMesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0;
    }
    this.selectedAtom = null;
  }
  
  resetView(): void {
    const center = this.moleculeCenter.clone();
    this.controls.target.copy(center);
    
    const radius = this.getMoleculeRadius();
    const distance = radius * 3;
    
    const direction = new THREE.Vector3(1, 0.75, 1).normalize();
    this.camera.position.copy(center.clone().add(direction.multiplyScalar(distance)));
    
    this.controls.update();
  }
  
  private getMoleculeRadius(): number {
    if (this.atoms.length === 0) return 5;
    
    let maxDist = 0;
    const center = this.moleculeCenter;
    
    this.atoms.forEach(atom => {
      const dist = atom.mesh.position.distanceTo(center);
      const scale = (atom.mesh.scale.x + atom.mesh.scale.y + atom.mesh.scale.z) / 3;
      maxDist = Math.max(maxDist, dist + scale);
    });
    
    return Math.max(maxDist, 2);
  }
  
  private updateZoomAnimation(): void {
    if (!this.isZoomAnimating) return;
    
    const now = performance.now();
    const elapsed = now - this.zoomAnimationStart;
    
    if (elapsed >= this.zoomAnimationDuration) {
      this.isZoomAnimating = false;
      this.controls.target.copy(this.moleculeCenter);
      return;
    }
    
    const t = elapsed / this.zoomAnimationDuration;
    const easeT = 1 - Math.pow(1 - t, 3);
    
    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    const targetCenter = this.moleculeCenter;
    
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    const targetPosition = targetCenter.clone().add(direction.multiplyScalar(currentDistance));
    
    this.camera.position.lerp(targetPosition, easeT * 0.1);
    this.controls.target.lerp(targetCenter, easeT * 0.1);
  }
  
  private updateLabels(): void {
    this.atoms.forEach(atom => {
      const label = this.labels.get(atom.index);
      if (!label) return;
      
      const position = atom.mesh.position.clone();
      position.y += (atom.mesh.scale.x + atom.mesh.scale.y + atom.mesh.scale.z) / 6;
      
      const projected = position.clone().project(this.camera);
      const x = (projected.x + 1) / 2 * window.innerWidth;
      const y = (-projected.y + 1) / 2 * window.innerHeight;
      
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      label.style.transform = 'translate(-50%, -100%)';
      
      const distance = this.camera.position.distanceTo(atom.mesh.position);
      const zIndex = Math.floor(1000 - distance);
      label.style.zIndex = String(zIndex);
    });
  }
  
  update(deltaTime: number): void {
    this.updateOpacityAnimation(deltaTime);
    this.updateZoomAnimation();
    this.controls.update();
    this.updateLabels();
  }
  
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
  
  getElements(): string[] {
    const elements = new Set(this.atoms.map(a => a.element));
    return Array.from(elements).sort();
  }
  
  getAtomCount(): number {
    return this.atoms.length;
  }
  
  getBondCount(): number {
    return this.bonds.length;
  }
  
  dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.removeEventListener('click', this.onClick.bind(this));
    this.controls.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
