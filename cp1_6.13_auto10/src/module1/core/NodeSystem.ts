import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { ColorTheme, THEMES } from '../../module2/effects/ParticleBackground';

export interface StarNode {
  id: number;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  trail: THREE.Points | null;
  trailGeometry: THREE.BufferGeometry | null;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  targetColor: THREE.Color;
  size: number;
  baseSize: number;
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitCenter: THREE.Vector3;
  isDragging: boolean;
  createdAt: number;
  pulseProgress: number;
  trailPositions: Float32Array;
  trailColors: Float32Array;
  trailMaxLength: number;
  trailIndex: number;
}

export class NodeSystem {
  private static instance: NodeSystem | null = null;
  private sceneManager: SceneManager;

  public nodes: StarNode[] = [];
  public readonly MAX_NODES = 60;

  private nodeIdCounter = 0;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isDragging = false;
  private draggedNode: StarNode | null = null;
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();

  private gravityLines: THREE.Line[] = [];
  private gravityLineGroup: THREE.Group;
  private showGravityLines = false;

  private pulseRingGroup: THREE.Group;

  public nodeSize = 0.5;
  public rotationSpeed = 1.0;
  private currentTheme: ColorTheme = THEMES.starPurple;
  private targetTheme: ColorTheme = THEMES.starPurple;
  private themeTransitionProgress = 1;
  private themeTransitionDuration = 1.0;

  private audioContext: AudioContext | null = null;

  private boidsParams = {
    separationWeight: 1.5,
    alignmentWeight: 0.5,
    cohesionWeight: 0.8,
    maxSpeed: 0.08,
    neighborhoodRadius: 5.0
  };

  private constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.gravityLineGroup = new THREE.Group();
    this.pulseRingGroup = new THREE.Group();
    this.sceneManager.scene.add(this.gravityLineGroup);
    this.sceneManager.scene.add(this.pulseRingGroup);

    this.setupEventListeners();
    this.sceneManager.onUpdate(this.update.bind(this));
    this.initAudio();
  }

  public static getInstance(sceneManager?: SceneManager): NodeSystem {
    if (!NodeSystem.instance) {
      if (!sceneManager) throw new Error('NodeSystem needs SceneManager on first init');
      NodeSystem.instance = new NodeSystem(sceneManager);
    }
    return NodeSystem.instance;
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  private playSound(type: 'create' | 'drag' | 'drop' | 'connect'): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);

    switch (type) {
      case 'create':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'drag':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'drop':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(550, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      case 'connect':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.1);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
    }
  }

  private setupEventListeners(): void {
    const canvas = this.sceneManager.renderer.domElement;

    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointercancel', this.onPointerUp.bind(this));
  }

  private onPointerDown(e: PointerEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    const meshes = this.nodes.map(n => n.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const node = this.nodes.find(n => n.mesh === hitMesh);
      if (node) {
        this.isDragging = true;
        this.draggedNode = node;
        node.isDragging = true;
        this.showGravityLines = true;

        this.dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, 1),
          node.position
        );

        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        this.dragOffset.copy(node.position).sub(intersectPoint);

        this.playSound('drag');
        return;
      }
    }

    if (this.nodes.length < this.MAX_NODES) {
      const worldPos = this.sceneManager.screenToWorld(e.clientX, e.clientY, 0);
      this.createNode(worldPos);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDragging || !this.draggedNode) return;

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
    const newPos = intersectPoint.add(this.dragOffset);

    newPos.x = Math.max(-25, Math.min(25, newPos.x));
    newPos.y = Math.max(-20, Math.min(20, newPos.y));
    newPos.z = Math.max(-15, Math.min(15, newPos.z));

    this.draggedNode.position.copy(newPos);
    this.draggedNode.targetPosition.copy(newPos);
    this.draggedNode.mesh.position.copy(newPos);
    this.draggedNode.glow.position.copy(newPos);

    this.updateGravityLines(this.draggedNode);
  }

  private onPointerUp(): void {
    if (this.draggedNode) {
      this.draggedNode.isDragging = false;
      this.draggedNode.velocity.multiplyScalar(0.3);

      this.snapToNearbyNode(this.draggedNode);
      this.playSound('drop');
    }

    this.isDragging = false;
    this.draggedNode = null;
    this.showGravityLines = false;
    this.clearGravityLines();
  }

  private snapToNearbyNode(node: StarNode): void {
    const snapRadius = 3.5;
    let nearest: StarNode | null = null;
    let nearestDist = Infinity;

    for (const other of this.nodes) {
      if (other === node) continue;
      const dist = node.position.distanceTo(other.position);
      if (dist < snapRadius && dist < nearestDist) {
        nearest = other;
        nearestDist = dist;
      }
    }

    if (nearest) {
      const direction = new THREE.Vector3().subVectors(nearest.position, node.position);
      const snapDistance = Math.max(1.5, nearestDist * 0.7);
      direction.normalize().multiplyScalar(snapDistance);
      node.targetPosition.copy(nearest.position).sub(direction);
    }
  }

  public createNode(position: THREE.Vector3): StarNode | null {
    if (this.nodes.length >= this.MAX_NODES) return null;

    const id = this.nodeIdCounter++;
    const colorPalette = [this.currentTheme.primary, this.currentTheme.secondary, this.currentTheme.accent];
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)].clone();
    const targetColor = color.clone();

    const size = this.nodeSize * (0.8 + Math.random() * 0.4);

    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    const glowGeometry = new THREE.SphereGeometry(size * 2.2, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color.clone() },
        uTime: { value: 0 },
        uPulse: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uPulse;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float pulse = 1.0 + uPulse * 0.5;
          vec3 finalColor = uColor * intensity * pulse;
          gl_FragColor = vec4(finalColor, intensity * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(position);

    const trailMaxLength = 60;
    const trailPositions = new Float32Array(trailMaxLength * 3);
    const trailColors = new Float32Array(trailMaxLength * 3);

    for (let i = 0; i < trailMaxLength; i++) {
      trailPositions[i * 3] = position.x;
      trailPositions[i * 3 + 1] = position.y;
      trailPositions[i * 3 + 2] = position.z;
      trailColors[i * 3] = color.r;
      trailColors[i * 3 + 1] = color.g;
      trailColors[i * 3 + 2] = color.b;
    }

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

    const sizes = new Float32Array(trailMaxLength);
    for (let i = 0; i < trailMaxLength; i++) {
      sizes[i] = (i / trailMaxLength) * size * 0.8;
    }
    trailGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vAlpha = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vAlpha * 0.6;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const trail = new THREE.Points(trailGeometry, trailMaterial);
    trail.frustumCulled = false;

    this.sceneManager.scene.add(mesh);
    this.sceneManager.scene.add(glow);
    this.sceneManager.scene.add(trail);

    const angle = Math.atan2(position.y, position.x);
    const radius = Math.max(2, position.length());

    const node: StarNode = {
      id,
      mesh,
      glow,
      trail,
      trailGeometry,
      position: position.clone(),
      targetPosition: position.clone(),
      velocity: new THREE.Vector3(),
      color,
      targetColor,
      size,
      baseSize: size,
      orbitAngle: angle,
      orbitRadius: radius,
      orbitSpeed: (0.1 + Math.random() * 0.2) * (Math.random() > 0.5 ? 1 : -1),
      orbitCenter: new THREE.Vector3(0, 0, 0),
      isDragging: false,
      createdAt: this.sceneManager.elapsedTime,
      pulseProgress: 0,
      trailPositions,
      trailColors,
      trailMaxLength,
      trailIndex: 0
    };

    this.nodes.push(node);
    this.createPulseRing(position, color);
    this.playSound('create');

    return node;
  }

  private createPulseRing(position: THREE.Vector3, color: THREE.Color): void {
    const ringGeometry = new THREE.RingGeometry(0.1, 0.15, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(position);
    ring.lookAt(this.sceneManager.camera.position);
    ring.userData = { startTime: this.sceneManager.elapsedTime, life: 0.8 };

    this.pulseRingGroup.add(ring);
  }

  private updatePulseRings(delta: number, elapsed: number): void {
    const toRemove: THREE.Mesh[] = [];

    for (const ring of this.pulseRingGroup.children as THREE.Mesh[]) {
      const data = ring.userData;
      const age = elapsed - data.startTime;
      const progress = age / data.life;

      if (progress >= 1) {
        toRemove.push(ring);
        continue;
      }

      const scale = 1 + progress * 12;
      ring.scale.set(scale, scale, scale);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - progress);
      ring.lookAt(this.sceneManager.camera.position);
    }

    for (const ring of toRemove) {
      this.pulseRingGroup.remove(ring);
      (ring.geometry as THREE.BufferGeometry).dispose();
      (ring.material as THREE.Material).dispose();
    }
  }

  private updateGravityLines(node: StarNode): void {
    this.clearGravityLines();

    const influenceRadius = 8;

    for (const other of this.nodes) {
      if (other === node) continue;

      const distance = node.position.distanceTo(other.position);
      if (distance > influenceRadius) continue;

      const strength = 1 - distance / influenceRadius;
      const lineCount = Math.floor(strength * 5) + 1;

      for (let i = 0; i < lineCount; i++) {
        const points: THREE.Vector3[] = [];
        const segments = 12;
        const offsetAmount = (i + 1) * 0.15 * strength;

        for (let s = 0; s <= segments; s++) {
          const t = s / segments;
          const lerped = new THREE.Vector3().lerpVectors(node.position, other.position, t);

          const perpendicular = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          ).normalize().multiplyScalar(Math.sin(t * Math.PI) * offsetAmount);

          lerped.add(perpendicular);
          points.push(lerped);
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: this.currentTheme.primary,
          transparent: true,
          opacity: strength * 0.35,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        const line = new THREE.Line(geometry, material);
        this.gravityLineGroup.add(line);
        this.gravityLines.push(line);
      }
    }
  }

  private clearGravityLines(): void {
    for (const line of this.gravityLines) {
      this.gravityLineGroup.remove(line);
      (line.geometry as THREE.BufferGeometry).dispose();
      (line.material as THREE.Material).dispose();
    }
    this.gravityLines = [];
  }

  public setNodeSize(size: number): void {
    this.nodeSize = size;
    for (const node of this.nodes) {
      node.baseSize = size * (0.8 + Math.random() * 0.001);
    }
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  public setTheme(theme: ColorTheme, animate: boolean = true): void {
    this.targetTheme = theme;
    for (const node of this.nodes) {
      const palette = [theme.primary, theme.secondary, theme.accent];
      node.targetColor = palette[node.id % palette.length].clone();
    }
    if (animate) {
      this.themeTransitionProgress = 0;
    } else {
      this.currentTheme = theme;
      this.themeTransitionProgress = 1;
      for (const node of this.nodes) {
        node.color.copy(node.targetColor);
        this.applyNodeColor(node);
      }
    }
  }

  private applyNodeColor(node: StarNode): void {
    const mat = node.mesh.material as THREE.MeshStandardMaterial;
    mat.color.copy(node.color);
    mat.emissive.copy(node.color);

    const glowMat = node.glow.material as THREE.ShaderMaterial;
    glowMat.uniforms.uColor.value.copy(node.color);
  }

  private updateThemeTransition(delta: number): void {
    if (this.themeTransitionProgress >= 1) return;

    this.themeTransitionProgress = Math.min(1, this.themeTransitionProgress + delta / this.themeTransitionDuration);
    const t = this.themeTransitionProgress;
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const lerpColor = new THREE.Color();
    for (const node of this.nodes) {
      lerpColor.copy(node.color).lerp(node.targetColor, easeT * 0.1);
      node.color.lerp(node.targetColor, easeT * 0.1);
      this.applyNodeColor(node);

      if (node.trailGeometry) {
        const colors = node.trailGeometry.attributes.color.array as Float32Array;
        for (let i = 0; i < node.trailMaxLength; i++) {
          const i3 = i * 3;
          colors[i3] = node.color.r * (i / node.trailMaxLength);
          colors[i3 + 1] = node.color.g * (i / node.trailMaxLength);
          colors[i3 + 2] = node.color.b * (i / node.trailMaxLength);
        }
        node.trailGeometry.attributes.color.needsUpdate = true;
      }
    }

    if (this.themeTransitionProgress >= 1) {
      this.currentTheme = this.targetTheme;
    }
  }

  private updateBoids(delta: number): void {
    if (this.nodes.length < 2) return;

    const lowPerf = this.sceneManager.isLowPerformance();
    if (lowPerf && this.nodes.length > 40) return;

    for (const node of this.nodes) {
      if (node.isDragging) continue;

      let separation = new THREE.Vector3();
      let alignment = new THREE.Vector3();
      let cohesion = new THREE.Vector3();
      let neighbors = 0;

      for (const other of this.nodes) {
        if (other === node) continue;
        const dist = node.position.distanceTo(other.position);
        if (dist < this.boidsParams.neighborhoodRadius) {
          neighbors++;

          if (dist < 1.5) {
            const repel = new THREE.Vector3().subVectors(node.position, other.position);
            repel.normalize().divideScalar(Math.max(0.1, dist));
            separation.add(repel);
          }

          alignment.add(other.velocity);
          cohesion.add(other.position);
        }
      }

      if (neighbors > 0) {
        alignment.divideScalar(neighbors);
        cohesion.divideScalar(neighbors);
        cohesion.sub(node.position).normalize();

        node.velocity.add(separation.multiplyScalar(this.boidsParams.separationWeight * delta));
        node.velocity.add(alignment.multiplyScalar(this.boidsParams.alignmentWeight * delta));
        node.velocity.add(cohesion.multiplyScalar(this.boidsParams.cohesionWeight * delta));
      }

      node.velocity.clampLength(0, this.boidsParams.maxSpeed);
    }
  }

  private update(delta: number, elapsed: number): void {
    this.updateThemeTransition(delta);
    this.updateBoids(delta);
    this.updatePulseRings(delta, elapsed);

    const nearLimit = this.nodes.length >= this.MAX_NODES * 0.85 || this.sceneManager.isLowPerformance();
    const updateInterval = nearLimit ? 2 : 1;
    const frame = Math.floor(elapsed * 60);

    for (const node of this.nodes) {
      if (!node.isDragging) {
        node.orbitAngle += node.orbitSpeed * this.rotationSpeed * delta;

        const orbitX = Math.cos(node.orbitAngle) * node.orbitRadius;
        const orbitY = Math.sin(node.orbitAngle) * node.orbitRadius;
        const orbitTarget = new THREE.Vector3(
          node.orbitCenter.x + orbitX,
          node.orbitCenter.y + orbitY,
          node.position.z + Math.sin(elapsed * 0.5 + node.id) * 0.02
        );

        node.targetPosition.lerp(orbitTarget, 0.02);
        node.targetPosition.add(node.velocity);

        node.position.lerp(node.targetPosition, 0.08);
        node.velocity.multiplyScalar(0.95);
      }

      node.mesh.position.copy(node.position);
      node.glow.position.copy(node.position);

      if (frame % updateInterval === 0 && node.trailGeometry && node.trail) {
        const posArray = node.trailGeometry.attributes.position.array as Float32Array;
        const colorArray = node.trailGeometry.attributes.color.array as Float32Array;

        for (let i = node.trailMaxLength - 1; i > 0; i--) {
          posArray[i * 3] = posArray[(i - 1) * 3];
          posArray[i * 3 + 1] = posArray[(i - 1) * 3 + 1];
          posArray[i * 3 + 2] = posArray[(i - 1) * 3 + 2];
        }
        posArray[0] = node.position.x;
        posArray[1] = node.position.y;
        posArray[2] = node.position.z;

        for (let i = 0; i < node.trailMaxLength; i++) {
          const fade = 1 - i / node.trailMaxLength;
          colorArray[i * 3] = node.color.r * fade;
          colorArray[i * 3 + 1] = node.color.g * fade;
          colorArray[i * 3 + 2] = node.color.b * fade;
        }

        node.trailGeometry.attributes.position.needsUpdate = true;
        node.trailGeometry.attributes.color.needsUpdate = true;
      }

      node.pulseProgress = Math.min(1, (elapsed - node.createdAt) * 2.5);
      const glowMat = node.glow.material as THREE.ShaderMaterial;
      glowMat.uniforms.uTime.value = elapsed;
      glowMat.uniforms.uPulse.value = Math.sin(node.pulseProgress * Math.PI) * 1.5;

      const breatheScale = 1 + Math.sin(elapsed * 2 + node.id) * 0.05;
      const pulseScale = 1 + (1 - node.pulseProgress) * 0.8;
      node.mesh.scale.setScalar(breatheScale * pulseScale);
      node.glow.scale.setScalar(breatheScale * pulseScale);

      node.orbitRadius += (node.position.length() - node.orbitRadius) * 0.01;
    }
  }

  public removeNode(node: StarNode): void {
    const idx = this.nodes.indexOf(node);
    if (idx === -1) return;

    this.sceneManager.scene.remove(node.mesh);
    this.sceneManager.scene.remove(node.glow);
    if (node.trail) this.sceneManager.scene.remove(node.trail);

    (node.mesh.geometry as THREE.BufferGeometry).dispose();
    (node.mesh.material as THREE.Material).dispose();
    (node.glow.geometry as THREE.BufferGeometry).dispose();
    (node.glow.material as THREE.Material).dispose();
    if (node.trailGeometry) node.trailGeometry.dispose();
    if (node.trail) (node.trail.material as THREE.Material).dispose();

    this.nodes.splice(idx, 1);
  }

  public clearAll(): void {
    while (this.nodes.length > 0) {
      this.removeNode(this.nodes[0]);
    }
    this.clearGravityLines();
  }

  public getNodeCount(): number {
    return this.nodes.length;
  }

  public playConnectSound(): void {
    this.playSound('connect');
  }

  public isNearLimit(): boolean {
    return this.nodes.length >= this.MAX_NODES * 0.85;
  }
}
