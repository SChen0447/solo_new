import * as THREE from 'three';
import { SceneManager } from '../../module1/core/SceneManager';
import { NodeSystem, StarNode } from '../../module1/core/NodeSystem';
import { ColorTheme, THEMES } from '../effects/ParticleBackground';

export interface Connection {
  id: number;
  source: StarNode;
  target: StarNode;
  line: THREE.Line;
  glowLine: THREE.Line;
  geometry: THREE.BufferGeometry;
  glowGeometry: THREE.BufferGeometry;
  flowOffset: number;
  flowSpeed: number;
  createdAt: number;
  curve: THREE.QuadraticBezierCurve3;
  controlPoint: THREE.Vector3;
  targetControlPoint: THREE.Vector3;
  midPoint: THREE.Vector3;
}

export class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private sceneManager: SceneManager;
  private nodeSystem: NodeSystem;

  public connections: Connection[] = [];
  public readonly MAX_CONNECTIONS = 100;

  private connectionIdCounter = 0;
  private connectionGroup: THREE.Group;
  private previewLine: THREE.Line | null = null;
  private isConnecting = false;
  private connectionSource: StarNode | null = null;

  public connectionThickness = 0.06;
  private currentTheme: ColorTheme = THEMES.starPurple;
  private targetTheme: ColorTheme = THEMES.starPurple;
  private themeTransitionProgress = 1;
  private themeTransitionDuration = 1.0;

  private constructor(sceneManager: SceneManager, nodeSystem: NodeSystem) {
    this.sceneManager = sceneManager;
    this.nodeSystem = nodeSystem;
    this.connectionGroup = new THREE.Group();
    this.sceneManager.scene.add(this.connectionGroup);

    this.setupEventListeners();
    this.sceneManager.onUpdate(this.update.bind(this));
  }

  public static getInstance(sceneManager?: SceneManager, nodeSystem?: NodeSystem): ConnectionManager {
    if (!ConnectionManager.instance) {
      if (!sceneManager || !nodeSystem) throw new Error('ConnectionManager needs SceneManager and NodeSystem on first init');
      ConnectionManager.instance = new ConnectionManager(sceneManager, nodeSystem);
    }
    return ConnectionManager.instance;
  }

  private setupEventListeners(): void {
    const canvas = this.sceneManager.renderer.domElement;

    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this), true);
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this), true);
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this), true);
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 2 && e.pointerType !== 'mouse' || !e.shiftKey) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.sceneManager.camera);

    const meshes = this.nodeSystem.nodes.map(n => n.mesh);
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const node = this.nodeSystem.nodes.find(n => n.mesh === hitMesh);
      if (node) {
        this.isConnecting = true;
        this.connectionSource = node;
        this.createPreviewLine(node.position);
      }
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isConnecting || !this.connectionSource) return;

    const worldPos = this.sceneManager.screenToWorld(e.clientX, e.clientY, 0);
    this.updatePreviewLine(this.connectionSource.position, worldPos);
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.isConnecting || !this.connectionSource) {
      this.clearPreviewLine();
      return;
    }

    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.sceneManager.camera);

    const meshes = this.nodeSystem.nodes.map(n => n.mesh);
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const targetNode = this.nodeSystem.nodes.find(n => n.mesh === hitMesh);
      if (targetNode && targetNode !== this.connectionSource) {
        this.createConnection(this.connectionSource, targetNode);
      }
    }

    this.clearPreviewLine();
    this.isConnecting = false;
    this.connectionSource = null;
  }

  private createPreviewLine(start: THREE.Vector3): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, start.clone()]);
    const material = new THREE.LineBasicMaterial({
      color: this.currentTheme.primary,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 2
    });

    this.previewLine = new THREE.Line(geometry, material);
    this.sceneManager.scene.add(this.previewLine);
  }

  private updatePreviewLine(start: THREE.Vector3, end: THREE.Vector3): void {
    if (!this.previewLine) return;

    const positions = new Float32Array([
      start.x, start.y, start.z,
      end.x, end.y, end.z
    ]);
    this.previewLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.previewLine.geometry.attributes.position.needsUpdate = true;
  }

  private clearPreviewLine(): void {
    if (!this.previewLine) return;
    this.sceneManager.scene.remove(this.previewLine);
    this.previewLine.geometry.dispose();
    (this.previewLine.material as THREE.Material).dispose();
    this.previewLine = null;
  }

  public createConnection(source: StarNode, target: StarNode): Connection | null {
    if (this.connections.length >= this.MAX_CONNECTIONS) return null;

    const exists = this.connections.find(
      c => (c.source === source && c.target === target) ||
           (c.source === target && c.target === source)
    );
    if (exists) return null;

    const id = this.connectionIdCounter++;
    const segments = 40;

    const midPoint = new THREE.Vector3().addVectors(source.position, target.position).multiplyScalar(0.5);
    const distance = source.position.distanceTo(target.position);
    const normal = new THREE.Vector3().subVectors(target.position, source.position).normalize();

    const perpX = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.dot(perpX)) > 0.9) {
      perpX.set(1, 0, 0);
    }
    const perp = new THREE.Vector3().crossVectors(normal, perpX).normalize();
    perp.crossVectors(normal, perp).normalize();

    const curvature = distance * 0.25;
    const controlPoint = midPoint.clone().add(perp.multiplyScalar(curvature + Math.random() * 0.5));
    const targetControlPoint = controlPoint.clone();

    const curve = new THREE.QuadraticBezierCurve3(
      source.position.clone(),
      controlPoint.clone(),
      target.position.clone()
    );

    const points = curve.getPoints(segments);

    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);

    for (let i = 0; i < points.length; i++) {
      positions[i * 3] = points[i].x;
      positions[i * 3 + 1] = points[i].y;
      positions[i * 3 + 2] = points[i].z;

      const t = i / (points.length - 1);
      const color = source.color.clone().lerp(target.color, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: Math.max(1, this.connectionThickness * 5)
    });

    const line = new THREE.Line(geometry, material);

    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    glowGeometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3));

    const glowMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: Math.max(2, this.connectionThickness * 15)
    });

    const glowLine = new THREE.Line(glowGeometry, glowMaterial);

    this.connectionGroup.add(glowLine);
    this.connectionGroup.add(line);

    const connection: Connection = {
      id,
      source,
      target,
      line,
      glowLine,
      geometry,
      glowGeometry,
      flowOffset: Math.random() * Math.PI * 2,
      flowSpeed: 1.5 + Math.random() * 1.5,
      createdAt: this.sceneManager.elapsedTime,
      curve,
      controlPoint,
      targetControlPoint,
      midPoint
    };

    this.connections.push(connection);
    this.nodeSystem.playConnectSound();

    return connection;
  }

  public setConnectionThickness(thickness: number): void {
    this.connectionThickness = thickness;
    for (const conn of this.connections) {
      (conn.line.material as THREE.LineBasicMaterial).linewidth = Math.max(1, thickness * 5);
      (conn.glowLine.material as THREE.LineBasicMaterial).linewidth = Math.max(2, thickness * 15);
    }
  }

  public setTheme(theme: ColorTheme, animate: boolean = true): void {
    this.targetTheme = theme;
    if (animate) {
      this.themeTransitionProgress = 0;
    } else {
      this.currentTheme = theme;
      this.themeTransitionProgress = 1;
    }
  }

  private updateThemeTransition(delta: number): void {
    if (this.themeTransitionProgress >= 1) return;

    this.themeTransitionProgress = Math.min(1, this.themeTransitionProgress + delta / this.themeTransitionDuration);

    if (this.themeTransitionProgress >= 1) {
      this.currentTheme = this.targetTheme;
    }
  }

  private updateCurve(connection: Connection, delta: number, elapsed: number): void {
    const sourcePos = connection.source.position;
    const targetPos = connection.target.position;

    connection.midPoint.lerpVectors(sourcePos, targetPos, 0.5);

    const distance = sourcePos.distanceTo(targetPos);
    const normal = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();

    const perpX = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.dot(perpX)) > 0.9) perpX.set(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(normal, perpX).normalize();
    perp.crossVectors(normal, perp).normalize();

    const targetCurvature = distance * 0.2 + Math.sin(elapsed * 0.8 + connection.id * 0.5) * distance * 0.08;
    connection.targetControlPoint.copy(connection.midPoint).add(perp.multiplyScalar(targetCurvature));

    connection.controlPoint.lerp(connection.targetControlPoint, 0.08);

    connection.curve.v0.copy(sourcePos);
    connection.curve.v1.copy(connection.controlPoint);
    connection.curve.v2.copy(targetPos);
  }

  private update(delta: number, elapsed: number): void {
    this.updateThemeTransition(delta);

    const nearLimit = this.connections.length >= this.MAX_CONNECTIONS * 0.85 || this.nodeSystem.isNearLimit() || this.sceneManager.isLowPerformance();
    const updateInterval = nearLimit ? 2 : 1;
    const frame = Math.floor(elapsed * 60);

    for (const conn of this.connections) {
      if (frame % updateInterval === 0) {
        this.updateCurve(conn, delta, elapsed);

        const segments = 40;
        const points = conn.curve.getPoints(segments);

        const positions = conn.geometry.attributes.position.array as Float32Array;
        const colors = conn.geometry.attributes.color.array as Float32Array;
        const glowPositions = conn.glowGeometry.attributes.position.array as Float32Array;
        const glowColors = conn.glowGeometry.attributes.color.array as Float32Array;

        for (let i = 0; i < points.length; i++) {
          positions[i * 3] = points[i].x;
          positions[i * 3 + 1] = points[i].y;
          positions[i * 3 + 2] = points[i].z;
          glowPositions[i * 3] = points[i].x;
          glowPositions[i * 3 + 1] = points[i].y;
          glowPositions[i * 3 + 2] = points[i].z;

          const t = i / (points.length - 1);
          const flowT = (t + (elapsed * conn.flowSpeed * 0.05 + conn.flowOffset) % 1) % 1;
          const flowPulse = Math.sin(flowT * Math.PI * 4) * 0.3 + 0.7;

          const baseColor = conn.source.color.clone().lerp(conn.target.color, t);
          const intensity = 0.6 + flowPulse * 0.4;
          colors[i * 3] = baseColor.r * intensity;
          colors[i * 3 + 1] = baseColor.g * intensity;
          colors[i * 3 + 2] = baseColor.b * intensity;

          glowColors[i * 3] = baseColor.r * flowPulse * 0.8;
          glowColors[i * 3 + 1] = baseColor.g * flowPulse * 0.8;
          glowColors[i * 3 + 2] = baseColor.b * flowPulse * 0.8;
        }

        conn.geometry.attributes.position.needsUpdate = true;
        conn.geometry.attributes.color.needsUpdate = true;
        conn.glowGeometry.attributes.position.needsUpdate = true;
        conn.glowGeometry.attributes.color.needsUpdate = true;
      }

      const age = elapsed - conn.createdAt;
      const fadeIn = Math.min(1, age * 3);
      (conn.line.material as THREE.LineBasicMaterial).opacity = 0.75 * fadeIn;
      (conn.glowLine.material as THREE.LineBasicMaterial).opacity = 0.35 * fadeIn;
    }
  }

  public removeConnection(connection: Connection): void {
    const idx = this.connections.indexOf(connection);
    if (idx === -1) return;

    this.connectionGroup.remove(connection.line);
    this.connectionGroup.remove(connection.glowLine);
    connection.geometry.dispose();
    connection.glowGeometry.dispose();
    (connection.line.material as THREE.Material).dispose();
    (connection.glowLine.material as THREE.Material).dispose();

    this.connections.splice(idx, 1);
  }

  public clearAll(): void {
    while (this.connections.length > 0) {
      this.removeConnection(this.connections[0]);
    }
  }

  public getConnectionCount(): number {
    return this.connections.length;
  }
}
