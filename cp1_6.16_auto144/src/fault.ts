import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

export interface FaultParams {
  strike?: number;
  dip?: number;
  throw?: number;
  position?: THREE.Vector3;
}

export class Fault {
  public id: string;
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public controlPoints: THREE.Mesh[] = [];
  public strike: number;
  public dip: number;
  public throw: number;
  public position: THREE.Vector3;

  private planeGeometry: THREE.PlaneGeometry;
  private planeMaterial: THREE.MeshBasicMaterial;
  private controlMaterial: THREE.MeshBasicMaterial;
  private controlHoverMaterial: THREE.MeshBasicMaterial;
  private isDragging: boolean = false;
  private dragIndex: number = -1;
  private hoveredControl: number = -1;
  private controlAnimations: { scale: number; targetScale: number }[] = [];

  constructor(params: FaultParams = {}) {
    this.id = uuidv4();
    this.strike = params.strike ?? 45;
    this.dip = params.dip ?? 60;
    this.throw = params.throw ?? 10;
    this.position = params.position ?? new THREE.Vector3(0, -5, 0);

    this.group = new THREE.Group();
    this.planeGeometry = new THREE.PlaneGeometry(60, 40, 1, 1);
    this.planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF5252,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });

    this.controlMaterial = new THREE.MeshBasicMaterial({ color: 0xE53935 });
    this.controlHoverMaterial = new THREE.MeshBasicMaterial({ color: 0xEF5350 });

    this.mesh = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
    this.mesh.userData = { type: 'fault', faultId: this.id, isSelectable: true };
    this.group.add(this.mesh);

    this.createControlPoints();
    this.updateTransform();
    this.group.position.copy(this.position);
  }

  private createControlPoints(): void {
    const positions = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 15, 0),
      new THREE.Vector3(15, 0, 0)
    ];

    positions.forEach((pos, index) => {
      const geo = new THREE.SphereGeometry(0.5, 16, 16);
      const mesh = new THREE.Mesh(geo, this.controlMaterial);
      mesh.position.copy(pos);
      mesh.userData = {
        type: 'faultControl',
        faultId: this.id,
        controlIndex: index,
        isSelectable: false,
        isDraggable: true
      };
      this.controlPoints.push(mesh);
      this.group.add(mesh);
      this.controlAnimations.push({ scale: 1, targetScale: 1 });
    });
  }

  public updateTransform(): void {
    const strikeRad = THREE.MathUtils.degToRad(this.strike);
    const dipRad = THREE.MathUtils.degToRad(this.dip);

    this.mesh.rotation.set(0, 0, 0);
    this.mesh.rotateX(-Math.PI / 2 + dipRad);
    this.mesh.rotateY(strikeRad);

    this.controlPoints[0].position.set(0, 0, 0);

    const dipDir = new THREE.Vector3(0, Math.sin(dipRad), -Math.cos(dipRad));
    dipDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), strikeRad);
    this.controlPoints[1].position.copy(dipDir.multiplyScalar(15));

    const strikeDir = new THREE.Vector3(Math.sin(strikeRad), 0, Math.cos(strikeRad));
    this.controlPoints[2].position.copy(strikeDir.multiplyScalar(15));
  }

  public getPlane(): THREE.Plane {
    const strikeRad = THREE.MathUtils.degToRad(this.strike);
    const dipRad = THREE.MathUtils.degToRad(this.dip);

    const normal = new THREE.Vector3(0, Math.cos(dipRad), Math.sin(dipRad));
    normal.applyAxisAngle(new THREE.Vector3(0, 1, 0), strikeRad);
    normal.normalize();

    return new THREE.Plane(normal, -normal.dot(this.group.position));
  }

  public getThrowDirection(): THREE.Vector3 {
    const dipRad = THREE.MathUtils.degToRad(this.dip);
    const strikeRad = THREE.MathUtils.degToRad(this.strike);

    const dir = new THREE.Vector3(0, Math.sin(dipRad), -Math.cos(dipRad));
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), strikeRad);
    return dir.normalize();
  }

  public setHoveredControl(index: number, hovered: boolean): void {
    this.hoveredControl = hovered ? index : -1;
    this.controlAnimations[index].targetScale = hovered ? 1.2 : 1;
  }

  public startDrag(index: number): void {
    this.isDragging = true;
    this.dragIndex = index;
  }

  public endDrag(): void {
    this.isDragging = false;
    this.dragIndex = -1;
  }

  public isControlDragging(): boolean {
    return this.isDragging;
  }

  public update(delta: number): void {
    const animSpeed = 1 / 0.5;

    this.controlAnimations.forEach((anim, index) => {
      const diff = anim.targetScale - anim.scale;
      anim.scale += diff * Math.min(delta * animSpeed, 1);
      this.controlPoints[index].scale.setScalar(anim.scale);

      const mat = anim.scale > 1.05 ? this.controlHoverMaterial : this.controlMaterial;
      if (this.controlPoints[index].material !== mat) {
        this.controlPoints[index].material = mat;
      }
    });
  }

  public setStrike(value: number): void {
    this.strike = value;
    this.updateTransform();
  }

  public setDip(value: number): void {
    this.dip = value;
    this.updateTransform();
  }

  public setThrow(value: number): void {
    this.throw = value;
  }

  public dispose(): void {
    this.planeGeometry.dispose();
    this.planeMaterial.dispose();
    this.controlMaterial.dispose();
    this.controlHoverMaterial.dispose();
    this.controlPoints.forEach(cp => cp.geometry.dispose());
  }
}
