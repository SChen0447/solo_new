import * as THREE from 'three';
import { NodeData, ParticleData, EdgeData, StreamParticleData, SpeciesCategory } from './types';
import { COLORS, SIZES, ANIMATION, SPECIES_DATA } from './constants';
import { eventBus } from './eventBus';

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const lerpColor = (color1: string, color2: string, t: number): THREE.Color => {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, t);
};

const getCategoryColor = (category: SpeciesCategory): string => {
  switch (category) {
    case 'animal': return COLORS.ANIMAL;
    case 'plant': return COLORS.PLANT;
    case 'microbe': return COLORS.MICROBE;
  }
};

export class TreeEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private nodes: Map<string, NodeData> = new Map();
  private nodeMeshes: Map<string, THREE.Mesh> = new Map();
  private particles: ParticleData[] = [];
  private particleMesh!: THREE.Points;
  private edges: EdgeData[] = [];
  private streamParticles: StreamParticleData[] = [];
  private streamParticleMesh!: THREE.Points;

  private highlightedNodes: Set<string> = new Set();
  private clickAnimations: Map<string, { startTime: number; expandStartTime: number; streamBoostStartTime: number }> = new Map();
  private pulseWaves: Array<{ startTime: number; center: THREE.Vector3; maxRadius: number }> = [];

  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private rotationVelocity = { x: 0, y: 0 };
  private targetRotation = { x: 0, y: 0 };
  private currentRotation = { x: 0, y: 0 };
  private zoomLevel = 1;

  private treeGroup!: THREE.Group;
  private groundStars!: THREE.Points;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private lastTime = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.BACKGROUND);

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 5, 18);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.init();
    this.setupEventListeners();
    this.setupBusListeners();
  }

  private init(): void {
    this.treeGroup = new THREE.Group();
    this.scene.add(this.treeGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 50);
    pointLight.position.set(0, 10, 10);
    this.scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x66bb6a, 0.5, 30);
    pointLight2.position.set(0, 0, 0);
    this.scene.add(pointLight2);

    this.createGroundStars();
    this.generateTreeData();
    this.createNodeMeshes();
    this.createParticles();
    this.createStreamParticles();
    this.createBranches();
  }

  private createGroundStars(): void {
    const starCount = ANIMATION.GROUND_STAR_COUNT;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * SIZES.GROUND_GRID_SIZE * 2;
      const z = (Math.random() - 0.5) * SIZES.GROUND_GRID_SIZE * 2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = -SIZES.TREE_RADIUS_MAX * 0.6;
      positions[i * 3 + 2] = z;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: SIZES.GROUND_STAR_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: ANIMATION.GROUND_STAR_OPACITY,
      sizeAttenuation: true,
    });

    this.groundStars = new THREE.Points(geometry, material);
    this.scene.add(this.groundStars);
  }

  private generateTreeData(): void {
    const species = [...SPECIES_DATA];
    const totalNodes = species.length;
    const treeRadius = (SIZES.TREE_RADIUS_MIN + SIZES.TREE_RADIUS_MAX) / 2;

    for (let i = 0; i < totalNodes; i++) {
      const speciesData = species[i];
      const depth = Math.floor(i / (totalNodes / 5)) + 1;
      
      const phi = Math.acos(-1 + (2 * i) / totalNodes);
      const theta = Math.sqrt(totalNodes * Math.PI) * phi;

      const radius = treeRadius * (0.3 + (depth / 5) * 0.7);
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi) - radius * 0.3;
      const z = radius * Math.cos(phi);

      const radiusFactor = 1 - (depth - 1) * 0.15;
      const nodeRadius = SIZES.NODE_RADIUS_MIN + (SIZES.NODE_RADIUS_MAX - SIZES.NODE_RADIUS_MIN) * radiusFactor * Math.random();

      const node: NodeData = {
        id: `node-${i}`,
        name: speciesData.name,
        category: speciesData.category,
        description: speciesData.description,
        position: { x, y, z },
        radius: nodeRadius,
        depth,
        age: totalNodes - i,
        relatedSpecies: [...speciesData.relatedSpecies],
      };

      this.nodes.set(node.id, node);
    }

    const nodeArray = Array.from(this.nodes.values());
    for (const node of nodeArray) {
      const relatedNames = node.relatedSpecies;
      for (const relatedName of relatedNames) {
        const targetNode = nodeArray.find(n => n.name === relatedName);
        if (targetNode && targetNode.id !== node.id) {
          const existingEdge = this.edges.find(
            e => (e.sourceId === node.id && e.targetId === targetNode.id) ||
                 (e.sourceId === targetNode.id && e.targetId === node.id)
          );
          if (!existingEdge) {
            const sourceId = node.age > targetNode.age ? node.id : targetNode.id;
            const targetId = node.age > targetNode.age ? targetNode.id : node.id;
            
            this.edges.push({
              id: `edge-${node.id}-${targetNode.id}`,
              sourceId,
              targetId,
              type: Math.random() > 0.5 ? 'evolution' : 'symbiosis',
              flowSpeed: ANIMATION.STREAM_FLOW_SPEED,
            });
          }
        }
      }
    }

    const usedNodes = new Set<string>();
    this.edges.forEach(e => {
      usedNodes.add(e.sourceId);
      usedNodes.add(e.targetId);
    });

    for (let i = 1; i < nodeArray.length; i++) {
      const node = nodeArray[i];
      if (!usedNodes.has(node.id)) {
        const parentIndex = Math.max(0, i - Math.floor(Math.random() * 3) - 1);
        const parent = nodeArray[parentIndex];
        const sourceId = parent.age > node.age ? parent.id : node.id;
        const targetId = parent.age > node.age ? node.id : parent.id;
        this.edges.push({
          id: `edge-auto-${sourceId}-${targetId}`,
          sourceId,
          targetId,
          type: 'evolution',
          flowSpeed: ANIMATION.STREAM_FLOW_SPEED,
        });
      }
    }
  }

  private createNodeMeshes(): void {
    this.nodes.forEach((node, id) => {
      const color = lerpColor(COLORS.TRUNK_START, COLORS.TRUNK_END, (node.depth - 1) / 5);
      const geometry = new THREE.SphereGeometry(node.radius, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(node.position.x, node.position.y, node.position.z);
      mesh.userData = { nodeId: id };
      this.nodeMeshes.set(id, mesh);
      this.treeGroup.add(mesh);
    });
  }

  private createParticles(): void {
    this.nodes.forEach((node, nodeId) => {
      const particleCount = Math.floor(
        SIZES.PARTICLE_PER_NODE_MIN +
        Math.random() * (SIZES.PARTICLE_PER_NODE_MAX - SIZES.PARTICLE_PER_NODE_MIN)
      );
      const categoryColor = getCategoryColor(node.category);

      for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const distance = node.radius * (1.2 + Math.random() * 0.5);

        const x = node.position.x + distance * Math.sin(phi) * Math.cos(theta);
        const y = node.position.y + distance * Math.sin(phi) * Math.sin(theta);
        const z = node.position.z + distance * Math.cos(phi);

        this.particles.push({
          id: `particle-${nodeId}-${i}`,
          nodeId,
          position: { x, y, z },
          basePosition: { x, y, z },
          size: SIZES.PARTICLE_SIZE_MIN + Math.random() * (SIZES.PARTICLE_SIZE_MAX - SIZES.PARTICLE_SIZE_MIN),
          color: categoryColor,
          floatPhase: Math.random() * Math.PI * 2,
          floatSpeed: ANIMATION.FLOAT_PERIOD_MIN + Math.random() * (ANIMATION.FLOAT_PERIOD_MAX - ANIMATION.FLOAT_PERIOD_MIN),
          floatAmplitude: ANIMATION.FLOAT_AMPLITUDE,
        });
      }
    });

    const positions = new Float32Array(this.particles.length * 3);
    const colors = new Float32Array(this.particles.length * 3);
    const sizes = new Float32Array(this.particles.length);

    this.particles.forEach((p, i) => {
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      const color = new THREE.Color(p.color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = p.size;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 300.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particleMesh = new THREE.Points(geometry, material);
    this.treeGroup.add(this.particleMesh);
  }

  private createStreamParticles(): void {
    this.edges.forEach(edge => {
      const particleCount = Math.floor(
        SIZES.STREAM_PARTICLE_COUNT_MIN +
        Math.random() * (SIZES.STREAM_PARTICLE_COUNT_MAX - SIZES.STREAM_PARTICLE_COUNT_MIN)
      );

      for (let i = 0; i < particleCount; i++) {
        this.streamParticles.push({
          id: `stream-${edge.id}-${i}`,
          edgeId: edge.id,
          progress: i / particleCount,
          size: SIZES.STREAM_PARTICLE_SIZE_MIN + Math.random() * (SIZES.STREAM_PARTICLE_SIZE_MAX - SIZES.STREAM_PARTICLE_SIZE_MIN),
          speed: ANIMATION.STREAM_FLOW_SPEED,
        });
      }
    });

    const positions = new Float32Array(this.streamParticles.length * 3);
    const colors = new Float32Array(this.streamParticles.length * 3);
    const sizes = new Float32Array(this.streamParticles.length);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 200.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.6);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.streamParticleMesh = new THREE.Points(geometry, material);
    this.treeGroup.add(this.streamParticleMesh);
  }

  private createBranches(): void {
    this.edges.forEach(edge => {
      const sourceNode = this.nodes.get(edge.sourceId);
      const targetNode = this.nodes.get(edge.targetId);
      if (!sourceNode || !targetNode) return;

      const sourcePos = new THREE.Vector3(sourceNode.position.x, sourceNode.position.y, sourceNode.position.z);
      const targetPos = new THREE.Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z);

      const midPoint = sourcePos.clone().add(targetPos).multiplyScalar(0.5);
      midPoint.normalize().multiplyScalar(0.3);
      midPoint.add(sourcePos.clone().add(targetPos).multiplyScalar(0.5));

      const curve = new THREE.QuadraticBezierCurve3(
        sourcePos,
        midPoint,
        targetPos
      );

      const points = curve.getPoints(20);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      const sourceColor = lerpColor(COLORS.TRUNK_START, COLORS.TRUNK_END, (sourceNode.depth - 1) / 5);
      const targetColor = lerpColor(COLORS.TRUNK_START, COLORS.TRUNK_END, (targetNode.depth - 1) / 5);
      
      const colors = new Float32Array(points.length * 3);
      points.forEach((_, i) => {
        const t = i / (points.length - 1);
        const color = sourceColor.clone().lerp(targetColor, t);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      });
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
      });

      const line = new THREE.Line(geometry, material);
      this.treeGroup.add(line);
    });
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.rotationVelocity.y = deltaX * 0.005 * ANIMATION.ROTATION_SPEED;
        this.rotationVelocity.x = deltaY * 0.005 * ANIMATION.ROTATION_SPEED;

        this.targetRotation.y += this.rotationVelocity.y;
        this.targetRotation.x += this.rotationVelocity.x;
        this.targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotation.x));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = -e.deltaY * 0.001 * ANIMATION.ZOOM_SPEED;
      this.zoomLevel = Math.max(ANIMATION.ZOOM_MIN, Math.min(ANIMATION.ZOOM_MAX, this.zoomLevel + zoomDelta));
    }, { passive: false });

    canvas.addEventListener('click', (e) => {
      if (Math.abs(this.rotationVelocity.x) > 0.001 || Math.abs(this.rotationVelocity.y) > 0.001) {
        return;
      }

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = Array.from(this.nodeMeshes.values());
      const intersects = this.raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const nodeId = intersects[0].object.userData.nodeId;
        this.handleNodeClick(nodeId);
      }
    });

    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  private setupBusListeners(): void {
    eventBus.on('search', ({ query }) => {
      this.handleSearch(query);
    });

    eventBus.on('related-click', ({ nodeId }) => {
      this.focusOnNode(nodeId);
    });

    eventBus.on('panel-close', () => {
      this.clearHighlights();
    });
  }

  private handleNodeClick(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const now = performance.now();
    this.clickAnimations.set(nodeId, {
      startTime: now,
      expandStartTime: now,
      streamBoostStartTime: now,
    });

    const nodeMesh = this.nodeMeshes.get(nodeId);
    if (nodeMesh) {
      const center = nodeMesh.position.clone();
      this.pulseWaves.push({
        startTime: now,
        center,
        maxRadius: ANIMATION.PULSE_MAX_RADIUS,
      });
    }

    this.edges.forEach(edge => {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        this.streamParticles.forEach(sp => {
          if (sp.edgeId === edge.id) {
            sp.speed = ANIMATION.STREAM_FLOW_SPEED_BOOSTED;
          }
        });
      }
    });

    eventBus.emit('node-click', { nodeId });
  }

  private handleSearch(query: string): void {
    this.highlightedNodes.clear();

    if (!query.trim()) {
      this.updateParticleColors();
      return;
    }

    const lowerQuery = query.toLowerCase();
    this.nodes.forEach((node, id) => {
      if (node.name.toLowerCase().includes(lowerQuery) ||
          node.description.toLowerCase().includes(lowerQuery)) {
        this.highlightedNodes.add(id);
      }
    });

    this.updateParticleColors();
  }

  private clearHighlights(): void {
    this.highlightedNodes.clear();
    this.updateParticleColors();
  }

  private focusOnNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    this.highlightedNodes.clear();
    this.highlightedNodes.add(nodeId);
    this.updateParticleColors();

    const now = performance.now();
    this.clickAnimations.set(nodeId, {
      startTime: now,
      expandStartTime: now,
      streamBoostStartTime: now,
    });
  }

  private updateParticleColors(): void {
    const colors = this.particleMesh.geometry.attributes.color.array as Float32Array;
    const highlightColor = new THREE.Color(COLORS.HIGHLIGHT);

    this.particles.forEach((p, i) => {
      let color: THREE.Color;
      if (this.highlightedNodes.has(p.nodeId)) {
        const flashPhase = Math.floor(performance.now() / ANIMATION.SEARCH_FLASH_PERIOD) % 2;
        color = flashPhase === 0 ? highlightColor : new THREE.Color(p.color);
      } else {
        color = new THREE.Color(p.color);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });

    this.particleMesh.geometry.attributes.color.needsUpdate = true;

    this.nodeMeshes.forEach((mesh, id) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (this.highlightedNodes.has(id)) {
        material.emissive = highlightColor;
        material.emissiveIntensity = 0.5;
      } else {
        material.emissive = new THREE.Color(0x000000);
        material.emissiveIntensity = 0;
      }
    });
  }

  private updateParticles(time: number): void {
    const positions = this.particleMesh.geometry.attributes.position.array as Float32Array;

    this.particles.forEach((p, i) => {
      const floatOffset = Math.sin(time / p.floatSpeed + p.floatPhase) * p.floatAmplitude;
      const direction = new THREE.Vector3(
        p.basePosition.x,
        p.basePosition.y,
        p.basePosition.z
      ).normalize();

      positions[i * 3] = p.basePosition.x + direction.x * floatOffset;
      positions[i * 3 + 1] = p.basePosition.y + direction.y * floatOffset;
      positions[i * 3 + 2] = p.basePosition.z + direction.z * floatOffset;
    });

    this.particleMesh.geometry.attributes.position.needsUpdate = true;
  }

  private updateStreamParticles(deltaTime: number): void {
    const positions = this.streamParticleMesh.geometry.attributes.position.array as Float32Array;
    const colors = this.streamParticleMesh.geometry.attributes.color.array as Float32Array;

    this.streamParticles.forEach((sp, i) => {
      sp.progress += (sp.speed * deltaTime) / 50;
      if (sp.progress > 1) {
        sp.progress = 0;
      }

      const edge = this.edges.find(e => e.id === sp.edgeId);
      if (!edge) return;

      const sourceNode = this.nodes.get(edge.sourceId);
      const targetNode = this.nodes.get(edge.targetId);
      if (!sourceNode || !targetNode) return;

      const sourcePos = new THREE.Vector3(sourceNode.position.x, sourceNode.position.y, sourceNode.position.z);
      const targetPos = new THREE.Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z);

      const midPoint = sourcePos.clone().add(targetPos).multiplyScalar(0.5);
      midPoint.normalize().multiplyScalar(0.3);
      midPoint.add(sourcePos.clone().add(targetPos).multiplyScalar(0.5));

      const curve = new THREE.QuadraticBezierCurve3(sourcePos, midPoint, targetPos);
      const point = curve.getPoint(sp.progress);

      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      const sourceColor = new THREE.Color(getCategoryColor(sourceNode.category));
      const targetColor = new THREE.Color(getCategoryColor(targetNode.category));
      const color = sourceColor.clone().lerp(targetColor, sp.progress);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });

    this.streamParticleMesh.geometry.attributes.position.needsUpdate = true;
    this.streamParticleMesh.geometry.attributes.color.needsUpdate = true;
  }

  private updateNodeAnimations(time: number): void {
    this.clickAnimations.forEach((anim, nodeId) => {
      const node = this.nodes.get(nodeId);
      const mesh = this.nodeMeshes.get(nodeId);
      if (!node || !mesh) return;

      const expandProgress = Math.min(1, (time - anim.expandStartTime) / ANIMATION.CLICK_EXPAND_DURATION);
      const easedProgress = easeOutCubic(expandProgress);
      const expandFactor = 1 + (SIZES.NODE_RADIUS_EXPANDED - 1) * (1 - easedProgress);
      mesh.scale.setScalar(expandFactor);

      const streamBoostProgress = (time - anim.streamBoostStartTime) / ANIMATION.CLICK_STREAM_BOOST_DURATION;
      if (streamBoostProgress >= 1) {
        this.edges.forEach(edge => {
          if (edge.sourceId === nodeId || edge.targetId === nodeId) {
            this.streamParticles.forEach(sp => {
              if (sp.edgeId === edge.id) {
                sp.speed = ANIMATION.STREAM_FLOW_SPEED;
              }
            });
          }
        });
      }

      if (expandProgress >= 1 && streamBoostProgress >= 1) {
        this.clickAnimations.delete(nodeId);
      }
    });
  }

  private updatePulseWaves(time: number): void {
    this.pulseWaves = this.pulseWaves.filter(wave => {
      const elapsed = (time - wave.startTime) / 1000;
      const currentRadius = elapsed * ANIMATION.PULSE_SPEED;
      return currentRadius < wave.maxRadius;
    });
  }

  private updateCamera(): void {
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;

    this.rotationVelocity.x *= ANIMATION.ROTATION_DAMPING;
    this.rotationVelocity.y *= ANIMATION.ROTATION_DAMPING;

    const baseDistance = 18;
    const distance = baseDistance / this.zoomLevel;

    const x = distance * Math.sin(this.currentRotation.y) * Math.cos(this.currentRotation.x);
    const y = distance * Math.sin(this.currentRotation.x) + 5;
    const z = distance * Math.cos(this.currentRotation.y) * Math.cos(this.currentRotation.x);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  public animate(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.updateParticles(currentTime);
    this.updateStreamParticles(deltaTime);
    this.updateNodeAnimations(currentTime);
    this.updatePulseWaves(currentTime);
    this.updateCamera();

    if (this.highlightedNodes.size > 0) {
      this.updateParticleColors();
    }

    this.renderer.render(this.scene, this.camera);
  }

  public getNodeData(nodeId: string): NodeData | undefined {
    return this.nodes.get(nodeId);
  }

  public getAllNodes(): NodeData[] {
    return Array.from(this.nodes.values());
  }

  public dispose(): void {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
