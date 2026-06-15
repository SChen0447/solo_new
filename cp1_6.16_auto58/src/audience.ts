import * as THREE from 'three';

type AudienceZone = 'red' | 'blue' | 'green' | 'gold';

const ZONE_COLORS: Record<AudienceZone, string> = {
  red: '#FF4444',
  blue: '#4444FF',
  green: '#44FF44',
  gold: '#FFD700'
};

interface AudienceMember {
  group: THREE.Group;
  lod: THREE.LOD;
  lowPolyModel: THREE.Group;
  billboard: THREE.Sprite;
  zone: AudienceZone;
  height: number;
  phase: number;
  basePosition: THREE.Vector3;
}

export class AudienceManager {
  private scene: THREE.Scene;
  private audience: AudienceMember[] = [];
  private beatInterval: number = 0.5;
  private beatTime: number = 0;
  private beatIntensity: number = 1;

  private readonly AUDIENCE_COUNT = 200;
  private readonly MIN_AUDIENCE_HEIGHT = 1.5;
  private readonly MAX_AUDIENCE_HEIGHT = 1.8;
  private readonly LOD_DISTANCE = 50;
  private readonly STAGE_RADIUS = 5;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.generateAudience();
  }

  private getZoneForAngle(angleDeg: number): AudienceZone {
    if (angleDeg >= -90 && angleDeg < -45) return 'red';
    if (angleDeg >= -45 && angleDeg < 0) return 'blue';
    if (angleDeg >= 0 && angleDeg < 45) return 'green';
    return 'gold';
  }

  private createLowPolyPerson(color: THREE.Color, height: number): THREE.Group {
    const group = new THREE.Group();

    const headR = 0.12;
    const headGeo = new THREE.IcosahedronGeometry(headR, 0);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = height - headR - 0.02;
    head.castShadow = true;
    group.add(head);

    const bodyH = height * 0.45;
    const bodyGeo = new THREE.ConeGeometry(0.22, bodyH, 5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height - headR * 2 - bodyH / 2 - 0.05;
    body.castShadow = true;
    group.add(body);

    const legH = height * 0.35;
    const legGeo = new THREE.CylinderGeometry(0.06, 0.07, legH, 4);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x333344,
      roughness: 0.8,
      flatShading: true
    });

    const legLeft = new THREE.Mesh(legGeo, legMat);
    legLeft.position.set(-0.08, legH / 2, 0);
    legLeft.castShadow = true;
    group.add(legLeft);

    const legRight = new THREE.Mesh(legGeo, legMat);
    legRight.position.set(0.08, legH / 2, 0);
    legRight.castShadow = true;
    group.add(legRight);

    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, height * 0.3, 4);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.8,
      flatShading: true
    });

    const armLeft = new THREE.Mesh(armGeo, armMat);
    armLeft.position.set(-0.2, height * 0.5, 0);
    armLeft.rotation.z = 0.3;
    armLeft.castShadow = true;
    group.add(armLeft);

    const armRight = new THREE.Mesh(armGeo, armMat);
    armRight.position.set(0.2, height * 0.5, 0);
    armRight.rotation.z = -0.3;
    armRight.castShadow = true;
    group.add(armRight);

    group.userData = {
      head,
      body,
      legLeft,
      legRight,
      armLeft,
      armRight
    };

    return group;
  }

  private createBillboard(color: THREE.Color, height: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 64, 128);

    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    const colorHex = '#' + color.getHexString();
    gradient.addColorStop(0, colorHex);
    gradient.addColorStop(1, '#333344');

    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.arc(32, 18, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(32, 32);
    ctx.lineTo(12, 90);
    ctx.lineTo(32, 100);
    ctx.lineTo(52, 90);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#333344';
    ctx.fillRect(22, 96, 8, 28);
    ctx.fillRect(34, 96, 8, 28);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.5, height, 1);
    sprite.center.set(0.5, 0);

    return sprite;
  }

  private generateAudience() {
    for (let i = 0; i < this.AUDIENCE_COUNT; i++) {
      const minRadius = this.STAGE_RADIUS + 1.5;
      const maxRadius = this.STAGE_RADIUS + 12;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const angleRad = (Math.random() - 0.5) * Math.PI;
      const angleDeg = angleRad * THREE.MathUtils.RAD2DEG;

      const x = Math.sin(angleRad) * radius + (Math.random() - 0.5) * 0.8;
      const z = Math.cos(angleRad) * radius + (Math.random() - 0.5) * 0.8;

      const height =
        this.MIN_AUDIENCE_HEIGHT +
        Math.random() * (this.MAX_AUDIENCE_HEIGHT - this.MIN_AUDIENCE_HEIGHT);
      const zone = this.getZoneForAngle(angleDeg);
      const zoneColor = new THREE.Color(ZONE_COLORS[zone]);

      const lowPolyModel = this.createLowPolyPerson(zoneColor, height);
      const billboard = this.createBillboard(zoneColor, height);

      const lod = new THREE.LOD();
      lod.addLevel(lowPolyModel, 0);
      lod.addLevel(billboard, this.LOD_DISTANCE);

      lod.position.set(x, 0, z);

      const group = new THREE.Group();
      group.add(lod);
      this.scene.add(group);

      this.audience.push({
        group,
        lod,
        lowPolyModel,
        billboard,
        zone,
        height,
        phase: Math.random() * Math.PI * 2,
        basePosition: new THREE.Vector3(x, 0, z)
      });
    }
  }

  setBeatInterval(interval: number) {
    this.beatInterval = Math.max(0.1, interval);
  }

  getBeatInterval(): number {
    return this.beatInterval;
  }

  triggerBeat() {
    this.beatIntensity = 1.5;
  }

  update(deltaTime: number, elapsedTime: number, camera: THREE.Camera) {
    this.beatTime += deltaTime;
    if (this.beatTime >= this.beatInterval) {
      this.beatTime = 0;
      this.beatIntensity = 1.3;
    } else {
      this.beatIntensity = THREE.MathUtils.lerp(this.beatIntensity, 1, deltaTime * 3);
    }

    const swingAngle = THREE.MathUtils.degToRad(5) * this.beatIntensity;
    const bobAmount = 0.05 * this.beatIntensity;
    const swingFreq = (Math.PI * 2) / this.beatInterval;

    for (const member of this.audience) {
      const time = elapsedTime * swingFreq + member.phase;
      const swing = Math.sin(time) * swingAngle;
      const bob = Math.abs(Math.sin(time)) * bobAmount;

      member.group.rotation.y = swing;
      member.lod.position.y = bob;

      const parts = member.lowPolyModel.userData as any;
      if (parts.armLeft && parts.armRight) {
        const armSwing = Math.abs(Math.sin(time * 2)) * 0.8;
        parts.armLeft.rotation.x = -0.5 - armSwing;
        parts.armRight.rotation.x = -0.5 - armSwing;
      }

      member.lod.update(camera);
    }
  }

  getAudienceCount(): number {
    return this.audience.length;
  }
}
