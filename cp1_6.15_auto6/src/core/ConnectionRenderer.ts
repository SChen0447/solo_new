import * as THREE from 'three';
import { ParticleData } from '../types';

const MAX_DISTANCE = 8;
const CURVE_SEGMENTS = 32;
const FLOW_DOT_COUNT = 3;

interface ConnectionData {
  id: string;
  particleA: ParticleData;
  particleB: ParticleData;
  line: THREE.Line;
  flowDots: THREE.Mesh[];
  curve: THREE.QuadraticBezierCurve3;
}

export class ConnectionRenderer {
  private scene: THREE.Scene;
  private connections: Map<string, ConnectionData> = new Map();
  private gradientStart: THREE.Color = new THREE.Color('#ff00ff');
  private gradientEnd: THREE.Color = new THREE.Color('#00ffff');

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setGradient(start: string, end: string): void {
    this.gradientStart.set(start);
    this.gradientEnd.set(end);
  }

  private createConnectionKey(aId: string, bId: string): string {
    return aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
  }

  private createFlowDots(): THREE.Mesh[] {
    const dots: THREE.Mesh[] = [];
    const geometry = new THREE.SphereGeometry(0.06, 8, 8);
    
    for (let i = 0; i < FLOW_DOT_COUNT; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: this.gradientEnd,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
      dots.push(mesh);
    }
    return dots;
  }

  private createLine(curve: THREE.QuadraticBezierCurve3, colorStart: THREE.Color, colorEnd: THREE.Color): THREE.Line {
    const points = curve.getPoints(CURVE_SEGMENTS);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const colors: number[] = [];
    for (let i = 0; i <= CURVE_SEGMENTS; i++) {
      const t = i / CURVE_SEGMENTS;
      const color = new THREE.Color().lerpColors(colorStart, colorEnd, t);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    return line;
  }

  private removeConnection(data: ConnectionData): void {
    this.scene.remove(data.line);
    data.line.geometry.dispose();
    (data.line.material as THREE.Material).dispose();
    
    data.flowDots.forEach((dot) => {
      this.scene.remove(dot);
      dot.geometry.dispose();
      (dot.material as THREE.Material).dispose();
    });
  }

  update(particles: ParticleData[], time: number): void {
    const activeKeys = new Set<string>();

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const pA = particles[i];
        const pB = particles[j];
        const distance = pA.position.distanceTo(pB.position);

        if (distance <= MAX_DISTANCE) {
          const key = this.createConnectionKey(pA.id, pB.id);
          activeKeys.add(key);

          const midPoint = new THREE.Vector3().addVectors(pA.position, pB.position).multiplyScalar(0.5);
          const direction = new THREE.Vector3().subVectors(pB.position, pA.position).normalize();
          const normal = new THREE.Vector3(0, 1, 0);
          const perpendicular = new THREE.Vector3().crossVectors(direction, normal).normalize();
          const curveHeight = distance * 0.15;
          const controlPoint = midPoint.clone().add(perpendicular.multiplyScalar(curveHeight));

          const curve = new THREE.QuadraticBezierCurve3(
            pA.position.clone(),
            controlPoint,
            pB.position.clone()
          );

          let conn = this.connections.get(key);
          const colorA = new THREE.Color(pA.color);
          const colorB = new THREE.Color(pB.color);

          if (!conn) {
            const line = this.createLine(curve, colorA, colorB);
            const flowDots = this.createFlowDots();
            conn = { id: key, particleA: pA, particleB: pB, line, flowDots, curve };
            this.connections.set(key, conn);
          } else {
            const positions = curve.getPoints(CURVE_SEGMENTS);
            const positionAttr = conn.line.geometry.getAttribute('position') as THREE.BufferAttribute;
            for (let k = 0; k <= CURVE_SEGMENTS; k++) {
              positionAttr.setXYZ(k, positions[k].x, positions[k].y, positions[k].z);
            }
            positionAttr.needsUpdate = true;
            conn.curve = curve;
          }

          const opacity = 1 - distance / MAX_DISTANCE;
          (conn.line.material as THREE.LineBasicMaterial).opacity = opacity * 0.8;

          for (let d = 0; d < conn.flowDots.length; d++) {
            const t = ((time / 2000) + d / FLOW_DOT_COUNT) % 1;
            const point = curve.getPoint(t);
            conn.flowDots[d].position.copy(point);
            (conn.flowDots[d].material as THREE.MeshBasicMaterial).opacity = opacity * 0.9;
          }
        }
      }
    }

    const keysToRemove: string[] = [];
    this.connections.forEach((conn, key) => {
      if (!activeKeys.has(key)) {
        this.removeConnection(conn);
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach((k) => this.connections.delete(k));
  }

  dispose(): void {
    this.connections.forEach((conn) => this.removeConnection(conn));
    this.connections.clear();
  }
}
