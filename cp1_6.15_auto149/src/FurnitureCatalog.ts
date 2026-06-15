import * as THREE from 'three';
import type { FurnitureCatalogItem, FurnitureType, MaterialConfig, MaterialType, LightConfig, LightPreset } from './types';

export const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  {
    type: 'sofa',
    name: '沙发',
    icon: '🛋️',
    defaultSize: { x: 2.2, y: 0.8, z: 0.9 },
    defaultMaterial: 'fabric',
    defaultColor: '#8B7355'
  },
  {
    type: 'dining-table',
    name: '餐桌',
    icon: '🍽️',
    defaultSize: { x: 1.6, y: 0.75, z: 0.9 },
    defaultMaterial: 'wood',
    defaultColor: '#A0522D'
  },
  {
    type: 'bed',
    name: '床',
    icon: '🛏️',
    defaultSize: { x: 2.0, y: 0.5, z: 1.8 },
    defaultMaterial: 'fabric',
    defaultColor: '#F5F5DC'
  },
  {
    type: 'lamp',
    name: '落地灯',
    icon: '💡',
    defaultSize: { x: 0.4, y: 1.6, z: 0.4 },
    defaultMaterial: 'metal',
    defaultColor: '#C0C0C0'
  },
  {
    type: 'chair',
    name: '椅子',
    icon: '🪑',
    defaultSize: { x: 0.5, y: 0.9, z: 0.5 },
    defaultMaterial: 'wood',
    defaultColor: '#8B4513'
  },
  {
    type: 'cabinet',
    name: '柜子',
    icon: '🗄️',
    defaultSize: { x: 1.2, y: 1.8, z: 0.45 },
    defaultMaterial: 'wood',
    defaultColor: '#DEB887'
  },
  {
    type: 'table',
    name: '茶几',
    icon: '🪵',
    defaultSize: { x: 1.2, y: 0.45, z: 0.6 },
    defaultMaterial: 'marble',
    defaultColor: '#F5F5F5'
  },
  {
    type: 'plant',
    name: '绿植',
    icon: '🌿',
    defaultSize: { x: 0.5, y: 1.2, z: 0.5 },
    defaultMaterial: 'fabric',
    defaultColor: '#228B22'
  }
];

export const MATERIAL_CONFIGS: Record<MaterialType, MaterialConfig> = {
  wood: {
    type: 'wood',
    name: '木纹',
    color: '#A0522D',
    roughness: 0.7,
    metalness: 0.1
  },
  metal: {
    type: 'metal',
    name: '金属',
    color: '#C0C0C0',
    roughness: 0.2,
    metalness: 0.9
  },
  fabric: {
    type: 'fabric',
    name: '布艺',
    color: '#8B7355',
    roughness: 0.9,
    metalness: 0.0
  },
  marble: {
    type: 'marble',
    name: '大理石',
    color: '#F5F5F5',
    roughness: 0.3,
    metalness: 0.1
  },
  glass: {
    type: 'glass',
    name: '玻璃',
    color: '#E0FFFF',
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.4
  },
  leather: {
    type: 'leather',
    name: '皮革',
    color: '#8B4513',
    roughness: 0.6,
    metalness: 0.1
  }
};

export const LIGHT_PRESETS: Record<LightPreset, LightConfig> = {
  day: {
    ambientIntensity: 0.8,
    directionalLight1: {
      horizontalAngle: 45,
      verticalAngle: 60,
      intensity: 1.2,
      color: '#FFFACD'
    },
    directionalLight2: {
      horizontalAngle: 225,
      verticalAngle: 45,
      intensity: 0.6,
      color: '#E6E6FA'
    }
  },
  dusk: {
    ambientIntensity: 0.4,
    directionalLight1: {
      horizontalAngle: 80,
      verticalAngle: 20,
      intensity: 1.0,
      color: '#FF8C00'
    },
    directionalLight2: {
      horizontalAngle: 260,
      verticalAngle: 30,
      intensity: 0.4,
      color: '#483D8B'
    }
  },
  night: {
    ambientIntensity: 0.2,
    directionalLight1: {
      horizontalAngle: 180,
      verticalAngle: 70,
      intensity: 0.3,
      color: '#4682B4'
    },
    directionalLight2: {
      horizontalAngle: 0,
      verticalAngle: 50,
      intensity: 0.2,
      color: '#2F4F4F'
    }
  }
};

export class FurnitureCatalog {
  private catalog: FurnitureCatalogItem[];
  private materialConfigs: Record<MaterialType, MaterialConfig>;
  private lightPresets: Record<LightPreset, LightConfig>;

  constructor() {
    this.catalog = FURNITURE_CATALOG;
    this.materialConfigs = MATERIAL_CONFIGS;
    this.lightPresets = LIGHT_PRESETS;
  }

  getCatalog(): FurnitureCatalogItem[] {
    return this.catalog;
  }

  getItemByType(type: FurnitureType): FurnitureCatalogItem | undefined {
    return this.catalog.find(item => item.type === type);
  }

  getMaterialConfigs(): Record<MaterialType, MaterialConfig> {
    return this.materialConfigs;
  }

  getMaterialConfig(type: MaterialType): MaterialConfig {
    return this.materialConfigs[type];
  }

  getLightPresets(): Record<LightPreset, LightConfig> {
    return this.lightPresets;
  }

  getLightPreset(preset: LightPreset): LightConfig {
    return this.lightPresets[preset];
  }

  createFurnitureMesh(type: FurnitureType): THREE.Group {
    const item = this.getItemByType(type);
    if (!item) {
      throw new Error(`Unknown furniture type: ${type}`);
    }

    const group = new THREE.Group();
    group.userData.furnitureType = type;

    const material = new THREE.MeshStandardMaterial({
      color: item.defaultColor,
      roughness: this.materialConfigs[item.defaultMaterial].roughness,
      metalness: this.materialConfigs[item.defaultMaterial].metalness
    });

    switch (type) {
      case 'sofa':
        this.createSofaMesh(group, material, item.defaultSize);
        break;
      case 'dining-table':
        this.createDiningTableMesh(group, material, item.defaultSize);
        break;
      case 'bed':
        this.createBedMesh(group, material, item.defaultSize);
        break;
      case 'lamp':
        this.createLampMesh(group, material, item.defaultSize);
        break;
      case 'chair':
        this.createChairMesh(group, material, item.defaultSize);
        break;
      case 'cabinet':
        this.createCabinetMesh(group, material, item.defaultSize);
        break;
      case 'table':
        this.createCoffeeTableMesh(group, material, item.defaultSize);
        break;
      case 'plant':
        this.createPlantMesh(group, item.defaultSize);
        break;
    }

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.sub(center);
    group.position.y += box.min.y * -1;

    return group;
  }

  private createSofaMesh(group: THREE.Group, material: THREE.MeshStandardMaterial, size: { x: number; y: number; z: number }): void {
    const baseGeo = new THREE.BoxGeometry(size.x, size.y * 0.4, size.z);
    const base = new THREE.Mesh(baseGeo, material.clone());
    base.position.y = size.y * 0.2;
    group.add(base);

    const backGeo = new THREE.BoxGeometry(size.x, size.y * 0.6, size.z * 0.25);
    const back = new THREE.Mesh(backGeo, material.clone());
    back.position.set(0, size.y * 0.5 + size.y * 0.3, -size.z * 0.375);
    group.add(back);

    const armGeo = new THREE.BoxGeometry(size.z * 0.2, size.y * 0.5, size.z);
    const leftArm = new THREE.Mesh(armGeo, material.clone());
    leftArm.position.set(-size.x * 0.4, size.y * 0.25 + size.y * 0.2, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, material.clone());
    rightArm.position.set(size.x * 0.4, size.y * 0.25 + size.y * 0.2, 0);
    group.add(rightArm);

    const cushionGeo = new THREE.BoxGeometry(size.x * 0.35, size.y * 0.15, size.z * 0.85);
    const cushion1 = new THREE.Mesh(cushionGeo, material.clone());
    cushion1.position.set(-size.x * 0.18, size.y * 0.4 + size.y * 0.075, 0);
    (cushion1.material as THREE.MeshStandardMaterial).color.offsetHSL(0, 0, 0.05);
    group.add(cushion1);

    const cushion2 = new THREE.Mesh(cushionGeo, material.clone());
    cushion2.position.set(size.x * 0.18, size.y * 0.4 + size.y * 0.075, 0);
    (cushion2.material as THREE.MeshStandardMaterial).color.offsetHSL(0, 0, 0.05);
    group.add(cushion2);
  }

  private createDiningTableMesh(group: THREE.Group, material: THREE.MeshStandardMaterial, size: { x: number; y: number; z: number }): void {
    const topGeo = new THREE.BoxGeometry(size.x, size.y * 0.08, size.z);
    const top = new THREE.Mesh(topGeo, material.clone());
    top.position.y = size.y - size.y * 0.04;
    group.add(top);

    const legGeo = new THREE.BoxGeometry(size.x * 0.08, size.y * 0.92, size.z * 0.08);
    const legPositions = [
      { x: -size.x * 0.42, z: -size.z * 0.42 },
      { x: size.x * 0.42, z: -size.z * 0.42 },
      { x: -size.x * 0.42, z: size.z * 0.42 },
      { x: size.x * 0.42, z: size.z * 0.42 }
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, material.clone());
      leg.position.set(pos.x, size.y * 0.46, pos.z);
      group.add(leg);
    });
  }

  private createBedMesh(group: THREE.Group, material: THREE.MeshStandardMaterial, size: { x: number; y: number; z: number }): void {
    const frameGeo = new THREE.BoxGeometry(size.x, size.y * 0.5, size.z);
    const frame = new THREE.Mesh(frameGeo, material.clone());
    frame.position.y = size.y * 0.25;
    (frame.material as THREE.MeshStandardMaterial).color.offsetHSL(0, 0, -0.1);
    group.add(frame);

    const mattressGeo = new THREE.BoxGeometry(size.x * 0.95, size.y * 0.35, size.z * 0.95);
    const mattress = new THREE.Mesh(mattressGeo, material.clone());
    mattress.position.y = size.y * 0.5 + size.y * 0.175;
    group.add(mattress);

    const pillowGeo = new THREE.BoxGeometry(size.x * 0.35, size.y * 0.12, size.z * 0.25);
    const pillow1 = new THREE.Mesh(pillowGeo, material.clone());
    pillow1.position.set(-size.x * 0.2, size.y * 0.675 + size.y * 0.06, -size.z * 0.3);
    (pillow1.material as THREE.MeshStandardMaterial).color.offsetHSL(0, 0, 0.1);
    group.add(pillow1);

    const pillow2 = new THREE.Mesh(pillowGeo, material.clone());
    pillow2.position.set(size.x * 0.2, size.y * 0.675 + size.y * 0.06, -size.z * 0.3);
    (pillow2.material as THREE.MeshStandardMaterial).color.offsetHSL(0, 0, 0.1);
    group.add(pillow2);

    const headboardGeo = new THREE.BoxGeometry(size.x * 1.02, size.y * 0.8, size.z * 0.1);
    const headboard = new THREE.Mesh(headboardGeo, material.clone());
    headboard.position.set(0, size.y * 0.4 + size.y * 0.4, -size.z * 0.525);
    (headboard.material as THREE.MeshStandardMaterial).color.offsetHSL(0, 0, -0.15);
    group.add(headboard);
  }

  private createLampMesh(group: THREE.Group, material: THREE.MeshStandardMaterial, size: { x: number; y: number; z: number }): void {
    const baseGeo = new THREE.CylinderGeometry(size.x * 0.4, size.x * 0.5, size.y * 0.05, 32);
    const base = new THREE.Mesh(baseGeo, material.clone());
    base.position.y = size.y * 0.025;
    group.add(base);

    const poleGeo = new THREE.CylinderGeometry(size.x * 0.05, size.x * 0.05, size.y * 0.7, 16);
    const pole = new THREE.Mesh(poleGeo, material.clone());
    pole.position.y = size.y * 0.05 + size.y * 0.35;
    group.add(pole);

    const shadeGeo = new THREE.ConeGeometry(size.x * 0.6, size.y * 0.3, 32, 1, true);
    const shadeMaterial = new THREE.MeshStandardMaterial({
      color: '#FFF8DC',
      roughness: 0.5,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const shade = new THREE.Mesh(shadeGeo, shadeMaterial);
    shade.position.y = size.y * 0.75 + size.y * 0.15;
    group.add(shade);

    const bulbGeo = new THREE.SphereGeometry(size.x * 0.12, 16, 16);
    const bulbMaterial = new THREE.MeshBasicMaterial({ color: '#FFFFE0' });
    const bulb = new THREE.Mesh(bulbGeo, bulbMaterial);
    bulb.position.y = size.y * 0.78;
    group.add(bulb);
  }

  private createChairMesh(group: THREE.Group, material: THREE.MeshStandardMaterial, size: { x: number; y: number; z: number }): void {
    const seatGeo = new THREE.BoxGeometry(size.x * 0.9, size.y * 0.08, size.z * 0.9);
    const seat = new THREE.Mesh(seatGeo, material.clone());
    seat.position.y = size.y * 0.45;
    group.add(seat);

    const backGeo = new THREE.BoxGeometry(size.x * 0.85, size.y * 0.45, size.z * 0.08);
    const back = new THREE.Mesh(backGeo, material.clone());
    back.position.set(0, size.y * 0.45 + size.y * 0.225, -size.z * 0.41);
    group.add(back);

    const legGeo = new THREE.BoxGeometry(size.x * 0.08, size.y * 0.45, size.z * 0.08);
    const legPositions = [
      { x: -size.x * 0.35, z: -size.z * 0.35 },
      { x: size.x * 0.35, z: -size.z * 0.35 },
      { x: -size.x * 0.35, z: size.z * 0.35 },
      { x: size.x * 0.35, z: size.z * 0.35 }
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, material.clone());
      leg.position.set(pos.x, size.y * 0.225, pos.z);
      group.add(leg);
    });
  }

  private createCabinetMesh(group: THREE.Group, material: THREE.MeshStandardMaterial, size: { x: number; y: number; z: number }): void {
    const bodyGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const body = new THREE.Mesh(bodyGeo, material.clone());
    body.position.y = size.y * 0.5;
    group.add(body);

    const doorGap = size.x * 0.02;
    const doorWidth = (size.x - doorGap * 3) / 2;
    
    const door1Geo = new THREE.BoxGeometry(doorWidth, size.y * 0.95, size.z * 0.05);
    const door1 = new THREE.Mesh(door1Geo, material.clone());
    door1.position.set(-doorWidth / 2 - doorGap, size.y * 0.5, size.z * 0.5 + size.z * 0.025);
    (door1.material as THREE.MeshStandardMaterial).color.offsetHSL(0, 0, 0.05);
    group.add(door1);

    const door2 = new THREE.Mesh(door1Geo, material.clone());
    door2.position.set(doorWidth / 2 + doorGap, size.y * 0.5, size.z * 0.5 + size.z * 0.025);
    (door2.material as THREE.MeshStandardMaterial).color.offsetHSL(0, 0, 0.05);
    group.add(door2);

    const handleGeo = new THREE.BoxGeometry(size.x * 0.03, size.y * 0.08, size.z * 0.02);
    const handle1 = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: '#DAA520', metalness: 0.8, roughness: 0.3 }));
    handle1.position.set(-doorGap * 0.5, size.y * 0.5, size.z * 0.55);
    group.add(handle1);

    const handle2 = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: '#DAA520', metalness: 0.8, roughness: 0.3 }));
    handle2.position.set(doorGap * 0.5, size.y * 0.5, size.z * 0.55);
    group.add(handle2);
  }

  private createCoffeeTableMesh(group: THREE.Group, material: THREE.MeshStandardMaterial, size: { x: number; y: number; z: number }): void {
    const topGeo = new THREE.BoxGeometry(size.x, size.y * 0.12, size.z);
    const top = new THREE.Mesh(topGeo, material.clone());
    top.position.y = size.y - size.y * 0.06;
    group.add(top);

    const legGeo = new THREE.BoxGeometry(size.x * 0.06, size.y * 0.88, size.z * 0.06);
    const legPositions = [
      { x: -size.x * 0.4, z: -size.z * 0.4 },
      { x: size.x * 0.4, z: -size.z * 0.4 },
      { x: -size.x * 0.4, z: size.z * 0.4 },
      { x: size.x * 0.4, z: size.z * 0.4 }
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: '#2F2F2F', metalness: 0.7, roughness: 0.3 }));
      leg.position.set(pos.x, size.y * 0.44, pos.z);
      group.add(leg);
    });
  }

  private createPlantMesh(group: THREE.Group, size: { x: number; y: number; z: number }): void {
    const potGeo = new THREE.CylinderGeometry(size.x * 0.35, size.x * 0.45, size.y * 0.3, 32);
    const potMaterial = new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.8, metalness: 0.1 });
    const pot = new THREE.Mesh(potGeo, potMaterial);
    pot.position.y = size.y * 0.15;
    group.add(pot);

    const soilGeo = new THREE.CylinderGeometry(size.x * 0.33, size.x * 0.33, size.y * 0.05, 32);
    const soilMaterial = new THREE.MeshStandardMaterial({ color: '#3D2B1F', roughness: 0.95 });
    const soil = new THREE.Mesh(soilGeo, soilMaterial);
    soil.position.y = size.y * 0.3;
    group.add(soil);

    const leafMaterial = new THREE.MeshStandardMaterial({ color: '#228B22', roughness: 0.7, side: THREE.DoubleSide });
    const leafCount = 12;
    
    for (let i = 0; i < leafCount; i++) {
      const leafHeight = size.y * 0.4 + Math.random() * size.y * 0.35;
      const leafWidth = size.x * (0.25 + Math.random() * 0.15);
      const leafGeo = new THREE.SphereGeometry(leafWidth / 2, 8, 6);
      leafGeo.scale(1, 0.6, 0.15);
      
      const leaf = new THREE.Mesh(leafGeo, leafMaterial.clone());
      const angle = (i / leafCount) * Math.PI * 2;
      const radius = size.x * 0.15 + Math.random() * size.x * 0.15;
      
      leaf.position.set(
        Math.cos(angle) * radius,
        size.y * 0.35 + leafHeight * 0.5,
        Math.sin(angle) * radius
      );
      leaf.rotation.y = angle;
      leaf.rotation.z = (Math.random() - 0.5) * 0.3;
      
      const hueShift = (Math.random() - 0.5) * 0.1;
      (leaf.material as THREE.MeshStandardMaterial).color.offsetHSL(hueShift, 0, (Math.random() - 0.5) * 0.1);
      
      group.add(leaf);
    }

    const stemGeo = new THREE.CylinderGeometry(size.x * 0.04, size.x * 0.06, size.y * 0.4, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#2E8B57', roughness: 0.8 });
    const stem = new THREE.Mesh(stemGeo, stemMaterial);
    stem.position.y = size.y * 0.3 + size.y * 0.2;
    group.add(stem);
  }
}
