import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import GrowthWorker from './growthWorker.worker.ts?worker';
import type { WorkerInput, WorkerOutput } from './growthWorker.worker.ts';
import type { EnvParams } from '../env/EnvController';
import { lerp, clamp, getCSSColorString, leafWobble } from '../utils/effects';

export interface PlantInfo {
  id: string;
  species: string;
  speciesName: string;
  emoji: string;
  position: THREE.Vector3;
  growthIndex: number;
  height: number;
  leafCount: number;
  fruitCount: number;
  fruitSize: number;
  healthScore: number;
  stressLevel: number;
  age: number;
  leafCurl: number;
  leafYellow: number;
  stemThinness: number;
  overallWilt: number;
  status: {
    heatStress: boolean;
    coldStress: boolean;
    droughtStress: boolean;
    overwatering: boolean;
    lightDeficiency: boolean;
    lightBurn: boolean;
    leggyGrowth: boolean;
  };
  effects: {
    temperatureEffect: number;
    humidityEffect: number;
    lightEffect: number;
  };
}

interface PlantParts {
  group: THREE.Group;
  stem: THREE.Mesh;
  leaves: THREE.Mesh[];
  fruits: THREE.Mesh[];
  flowers: THREE.Mesh[];
  labelContainer: CSS2DObject;
  currentHeight: number;
  targetHeight: number;
  targetLeafCount: number;
  targetFruitCount: number;
  targetFruitSize: number;
  baseLeafColor: THREE.Color;
  baseStemColor: THREE.Color;
}

type SpeciesKey = 'tomato' | 'strawberry' | 'lettuce' | 'cucumber' | 'pepper' | 'basil';

const SPECIES_CONFIG: Record<
  SpeciesKey,
  {
    name: string;
    emoji: string;
    stemColor: number;
    leafColor: number;
    fruitColor: number;
    flowerColor: number;
    baseHeight: number;
    baseLeaves: number;
    baseFruits: number;
    baseFruitSize: number;
  }
> = {
  tomato: {
    name: '番茄',
    emoji: '🍅',
    stemColor: 0x5d8a4a,
    leafColor: 0x4a7a3a,
    fruitColor: 0xe53935,
    flowerColor: 0xffeb3b,
    baseHeight: 1.8,
    baseLeaves: 9,
    baseFruits: 6,
    baseFruitSize: 0.18,
  },
  strawberry: {
    name: '草莓',
    emoji: '🍓',
    stemColor: 0x6b8e4e,
    leafColor: 0x4caf50,
    fruitColor: 0xe91e63,
    flowerColor: 0xffffff,
    baseHeight: 0.45,
    baseLeaves: 12,
    baseFruits: 8,
    baseFruitSize: 0.14,
  },
  lettuce: {
    name: '生菜',
    emoji: '🥬',
    stemColor: 0x8bc34a,
    leafColor: 0x8bc34a,
    fruitColor: 0x000000,
    flowerColor: 0x000000,
    baseHeight: 0.3,
    baseLeaves: 22,
    baseFruits: 0,
    baseFruitSize: 0,
  },
  cucumber: {
    name: '黄瓜',
    emoji: '🥒',
    stemColor: 0x689f38,
    leafColor: 0x558b2f,
    fruitColor: 0x7cb342,
    flowerColor: 0xffd54f,
    baseHeight: 2.0,
    baseLeaves: 10,
    baseFruits: 5,
    baseFruitSize: 0.3,
  },
  pepper: {
    name: '辣椒',
    emoji: '🌶️',
    stemColor: 0x4a7c3a,
    leafColor: 0x388e3c,
    fruitColor: 0xf44336,
    flowerColor: 0xffffff,
    baseHeight: 1.1,
    baseLeaves: 11,
    baseFruits: 7,
    baseFruitSize: 0.15,
  },
  basil: {
    name: '罗勒',
    emoji: '🌿',
    stemColor: 0x2e7d32,
    leafColor: 0x388e3c,
    fruitColor: 0x000000,
    flowerColor: 0xba68c8,
    baseHeight: 0.6,
    baseLeaves: 20,
    baseFruits: 0,
    baseFruitSize: 0,
  },
};

interface HistoryFrame {
  time: number;
  plants: Record<string, {
    growthIndex: number;
    height: number;
    leafCount: number;
    fruitCount: number;
    fruitSize: number;
    healthScore: number;
    leafCurl: number;
    leafYellow: number;
    stemThinness: number;
    overallWilt: number;
    effects: { temperatureEffect: number; humidityEffect: number; lightEffect: number };
    status: WorkerOutput['status'];
  }>;
}

export class PlantManager {
  private scene: THREE.Scene;
  private labelRenderer: CSS2DRenderer;
  private camera: THREE.PerspectiveCamera;
  private plants: Map<string, PlantParts> = new Map();
  private plantInfos: Map<string, PlantInfo> = new Map();
  private dataPanelElements: Map<string, HTMLDivElement> = new Map();
  private worker: Worker;
  private pendingResults: Map<string, WorkerOutput> = new Map();
  private currentEnv: EnvParams;
  private detailReportEl: HTMLDivElement | null = null;
  private time = 0;
  private readonly MAX_AGE = 200;
  private history: HistoryFrame[] = [];
  private maxHistoryTime = 60000;
  private lastHistoryRecord = 0;
  private historyRecordInterval = 500;
  public onPlantClick?: (plantId: string, position: THREE.Vector3) => void;
  public onPlantFocus?: (position: THREE.Vector3, target: THREE.Vector3) => void;

  constructor(
    scene: THREE.Scene,
    container: HTMLElement,
    camera: THREE.PerspectiveCamera,
    initialEnv: EnvParams
  ) {
    this.scene = scene;
    this.camera = camera;
    this.currentEnv = initialEnv;

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(container.clientWidth, container.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.labelRenderer.domElement.style.zIndex = '100';
    container.appendChild(this.labelRenderer.domElement);

    this.worker = new GrowthWorker();
    this.worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
      this.pendingResults.set(e.data.plantId, e.data);
    };

    this.createPlants();
    this.recordHistory();
  }

  getLabelRenderer(): CSS2DRenderer {
    return this.labelRenderer;
  }

  private createPlants(): void {
    const positions: [number, number][] = [
      [-4.2, -3.2],
      [-1.4, -3.6],
      [1.4, -3.4],
      [4.2, -3.0],
      [-2.8, 2.6],
      [2.8, 3.0],
    ];
    const speciesList: SpeciesKey[] = [
      'tomato',
      'strawberry',
      'lettuce',
      'cucumber',
      'pepper',
      'basil',
    ];

    speciesList.forEach((species, i) => {
      const [x, z] = positions[i];
      const id = `plant-${i}`;
      this.createPlant(id, species, x, z);
    });
  }

  private createPlant(
    id: string,
    species: SpeciesKey,
    x: number,
    z: number
  ): void {
    const config = SPECIES_CONFIG[species];
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.name = id;
    group.userData.plantId = id;

    const soilGeo = new THREE.CylinderGeometry(0.55, 0.7, 0.15, 20);
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x4a3a2a,
      roughness: 0.95,
      metalness: 0.05,
    });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.075;
    soil.receiveShadow = true;
    group.add(soil);

    const potGeo = new THREE.CylinderGeometry(0.6, 0.5, 0.4, 20, 1, false);
    const potMat = new THREE.MeshStandardMaterial({
      color: 0xa0826d,
      roughness: 0.85,
      metalness: 0.1,
    });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = -0.05;
    pot.receiveShadow = true;
    pot.castShadow = true;
    group.add(pot);

    const stem = this.createStem(species, config);
    group.add(stem);

    const leaves: THREE.Mesh[] = [];
    const leafCount = Math.max(4, Math.floor(config.baseLeaves * 0.4));
    for (let i = 0; i < leafCount; i++) {
      const leaf = this.createLeaf(species, config, i, leafCount);
      leaves.push(leaf);
      group.add(leaf);
    }

    const fruits: THREE.Mesh[] = [];
    if (config.baseFruits > 0) {
      const fruitCount = Math.max(1, Math.floor(config.baseFruits * 0.3));
      for (let i = 0; i < fruitCount; i++) {
        const fruit = this.createFruit(species, config, i, fruitCount);
        fruits.push(fruit);
        group.add(fruit);
      }
    }

    const flowers: THREE.Mesh[] = [];
    if (species !== 'lettuce' && species !== 'basil') {
      for (let i = 0; i < 3; i++) {
        const flower = this.createFlower(species, config, i);
        flowers.push(flower);
        group.add(flower);
      }
    }

    const labelDiv = document.createElement('div');
    labelDiv.className = 'plant-data-panel';
    labelDiv.dataset.plantId = id;
    const initialColor = getCSSColorString(35);
    labelDiv.style.borderColor = initialColor;
    labelDiv.innerHTML = `
      <div class="panel-plant-name">
        <span>${config.emoji}</span>
        <span>${config.name}</span>
        <span class="growth-index-badge" style="background:${initialColor}">35</span>
      </div>
      <div class="panel-growth-bar">
        <div class="panel-growth-fill" style="width:35%; background:${initialColor}"></div>
      </div>
      <div class="panel-metrics">
        <div class="panel-metric">
          <span>🌡️</span>
          <span class="panel-metric-value">80%</span>
        </div>
        <div class="panel-metric">
          <span>💧</span>
          <span class="panel-metric-value">80%</span>
        </div>
        <div class="panel-metric">
          <span>☀️</span>
          <span class="panel-metric-value">80%</span>
        </div>
        <div class="panel-metric">
          <span>❤️</span>
          <span class="panel-metric-value">75%</span>
        </div>
      </div>
    `;
    labelDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      this.focusPlant(id);
    });

    const labelObj = new CSS2DObject(labelDiv);
    labelObj.position.set(0, config.baseHeight * 1.2, 0);
    group.add(labelObj);

    this.scene.add(group);

    const initialGrowth = 30 + Math.random() * 15;

    const info: PlantInfo = {
      id,
      species,
      speciesName: config.name,
      emoji: config.emoji,
      position: group.position.clone(),
      growthIndex: initialGrowth,
      height: config.baseHeight * 0.35,
      leafCount: Math.floor(config.baseLeaves * 0.3),
      fruitCount: 0,
      fruitSize: 0,
      healthScore: 75,
      stressLevel: 25,
      age: Math.random() * 30,
      leafCurl: 0,
      leafYellow: 0,
      stemThinness: 0,
      overallWilt: 0,
      status: {
        heatStress: false,
        coldStress: false,
        droughtStress: false,
        overwatering: false,
        lightDeficiency: false,
        lightBurn: false,
        leggyGrowth: false,
      },
      effects: {
        temperatureEffect: 0.8,
        humidityEffect: 0.8,
        lightEffect: 0.8,
      },
    };
    this.plantInfos.set(id, info);
    this.dataPanelElements.set(id, labelDiv);

    this.plants.set(id, {
      group,
      stem,
      leaves,
      fruits,
      flowers,
      labelContainer: labelObj,
      currentHeight: config.baseHeight * 0.3,
      targetHeight: config.baseHeight * 0.35,
      targetLeafCount: Math.floor(config.baseLeaves * 0.3),
      targetFruitCount: 0,
      targetFruitSize: 0,
      baseLeafColor: new THREE.Color(config.leafColor),
      baseStemColor: new THREE.Color(config.stemColor),
    });
  }

  private createStem(species: SpeciesKey, config: typeof SPECIES_CONFIG[SpeciesKey]): THREE.Mesh {
    let geo: THREE.BufferGeometry;
    const h = config.baseHeight;

    if (species === 'cucumber') {
      const points: THREE.Vector3[] = [];
      const segments = 16;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = t * h;
        const angle = t * Math.PI * 1.5;
        const radius = 0.04 + t * 0.03;
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius * 0.3,
          y,
          Math.sin(angle) * radius * 0.3
        ));
      }
      const path = new THREE.CatmullRomCurve3(points);
      geo = new THREE.TubeGeometry(path, 20, 0.05, 8, false);
    } else if (species === 'lettuce') {
      geo = new THREE.CylinderGeometry(0.03, 0.06, h * 0.3, 8);
    } else if (species === 'strawberry') {
      geo = new THREE.CylinderGeometry(0.04, 0.07, h, 10);
    } else if (species === 'basil') {
      geo = new THREE.CylinderGeometry(0.035, 0.06, h, 6);
    } else {
      geo = new THREE.CylinderGeometry(0.05, 0.09, h, 10);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: config.stemColor,
      roughness: 0.85,
      metalness: 0.05,
    });
    const stem = new THREE.Mesh(geo, mat);
    stem.position.y = h / 2 + 0.2;
    stem.castShadow = true;
    stem.receiveShadow = true;
    stem.userData.baseHeight = h;
    return stem;
  }

  private createLeaf(
    species: SpeciesKey,
    config: typeof SPECIES_CONFIG[SpeciesKey],
    index: number,
    total: number
  ): THREE.Mesh {
    let geo: THREE.BufferGeometry;
    const leafSize = 0.22 + Math.random() * 0.15;
    const h = config.baseHeight;

    if (species === 'tomato') {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.bezierCurveTo(leafSize * 0.6, leafSize * 0.3, leafSize * 0.8, leafSize * 0.7, 0, leafSize);
      shape.bezierCurveTo(-leafSize * 0.8, leafSize * 0.7, -leafSize * 0.6, leafSize * 0.3, 0, 0);
      geo = new THREE.ShapeGeometry(shape, 6);
      geo.rotateX(Math.PI / 2);
    } else if (species === 'strawberry') {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI - Math.PI / 2;
        const r = leafSize * (0.7 + Math.sin(i * 2.1) * 0.3);
        shape.lineTo(Math.cos(a) * r, Math.sin(a) * r + leafSize * 0.5);
      }
      geo = new THREE.ShapeGeometry(shape, 6);
      geo.rotateX(Math.PI / 2.2);
    } else if (species === 'lettuce') {
      const shape = new THREE.Shape();
      shape.moveTo(0, -leafSize * 0.5);
      shape.quadraticCurveTo(leafSize * 0.8, 0, 0, leafSize);
      shape.quadraticCurveTo(-leafSize * 0.8, 0, 0, -leafSize * 0.5);
      geo = new THREE.ShapeGeometry(shape, 8);
      geo.rotateX(-Math.PI / 3);
    } else if (species === 'cucumber') {
      const shape = new THREE.Shape();
      shape.moveTo(-leafSize * 0.5, 0);
      shape.quadraticCurveTo(0, leafSize * 0.8, leafSize * 0.5, 0);
      shape.quadraticCurveTo(0, -leafSize * 0.3, -leafSize * 0.5, 0);
      geo = new THREE.ShapeGeometry(shape, 8);
      geo.rotateX(Math.PI / 2);
    } else if (species === 'pepper') {
      geo = new THREE.SphereGeometry(leafSize * 0.45, 8, 6);
      geo.scale(1.5, 0.3, 0.9);
    } else {
      geo = new THREE.SphereGeometry(leafSize * 0.4, 8, 6);
      geo.scale(1.3, 0.4, 1.0);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: config.leafColor,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const leaf = new THREE.Mesh(geo, mat);

    if (species === 'lettuce') {
      const t = index / total;
      const angle = (index / total) * Math.PI * 2 + index * 0.25;
      const radius = 0.08 + t * 0.45;
      leaf.position.set(
        Math.cos(angle) * radius,
        0.15 + t * h * 0.5,
        Math.sin(angle) * radius
      );
      leaf.rotation.set(
        -Math.PI / 3 + t * 0.8,
        angle + Math.PI / 2,
        Math.sin(index) * 0.2
      );
    } else if (species === 'strawberry') {
      const t = index / total;
      const angle = (index / total) * Math.PI * 2;
      const radius = 0.2 + t * 0.25;
      leaf.position.set(
        Math.cos(angle) * radius,
        0.1 + t * h * 0.6,
        Math.sin(angle) * radius
      );
      leaf.rotation.set(
        -Math.PI / 2.5,
        angle + Math.random() * 0.3,
        0
      );
    } else {
      const t = index / total;
      const y = 0.25 + t * (h - 0.35);
      const angle = (index / total) * Math.PI * 2.5 + index * 0.4;
      const radius = 0.12 + t * 0.18;
      leaf.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      leaf.rotation.set(
        0.3 + Math.random() * 0.4,
        angle + Math.random() * 0.4 - 0.2,
        Math.random() * 0.3 - 0.15
      );
    }

    leaf.castShadow = true;
    leaf.receiveShadow = true;
    leaf.userData.leafIndex = index;
    leaf.userData.baseScale = 1 + Math.random() * 0.4 - 0.2;
    leaf.userData.wobbleOffset = Math.random() * Math.PI * 2;
    leaf.userData.baseY = leaf.position.y;
    return leaf;
  }

  private createFruit(
    species: SpeciesKey,
    config: typeof SPECIES_CONFIG[SpeciesKey],
    index: number,
    total: number
  ): THREE.Mesh {
    let geo: THREE.BufferGeometry;
    const size = config.baseFruitSize;

    if (species === 'tomato') {
      geo = new THREE.SphereGeometry(size, 14, 12);
      geo.scale(1.05, 0.95, 1.05);
    } else if (species === 'strawberry') {
      geo = new THREE.ConeGeometry(size * 0.7, size * 1.8, 10);
      geo.rotateX(Math.PI);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = (y + size * 0.9) / (size * 1.8);
        const wobble = Math.sin(i * 3.7) * size * 0.08;
        pos.setX(i, pos.getX(i) + wobble * t);
        pos.setZ(i, pos.getZ(i) + wobble * t);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    } else if (species === 'cucumber') {
      geo = new THREE.CylinderGeometry(size * 0.28, size * 0.35, size * 2.5, 10);
      geo.rotateZ(0.3);
    } else if (species === 'pepper') {
      geo = new THREE.ConeGeometry(size * 0.5, size * 2.5, 10);
      geo.rotateX(0.2);
    } else {
      geo = new THREE.SphereGeometry(size, 10, 8);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: config.fruitColor,
      roughness: 0.45,
      metalness: 0.12,
    });
    const fruit = new THREE.Mesh(geo, mat);

    const h = config.baseHeight;
    const t = index / total;
    const y = 0.4 + t * (h - 0.5);
    const angle = (index / total) * Math.PI * 2 + index * 0.5;
    fruit.position.set(
      Math.cos(angle) * 0.25,
      y,
      Math.sin(angle) * 0.25
    );
    fruit.rotation.set(
      Math.random() * Math.PI * 0.5,
      Math.random() * Math.PI,
      species === 'pepper' ? Math.PI + Math.random() * 0.4 - 0.2 : 0
    );

    fruit.castShadow = true;
    fruit.receiveShadow = true;
    fruit.userData.baseScale = 1;
    fruit.userData.ripeProgress = 0.5 + Math.random() * 0.5;
    return fruit;
  }

  private createFlower(
    species: SpeciesKey,
    config: typeof SPECIES_CONFIG[SpeciesKey],
    index: number
  ): THREE.Mesh {
    const petalCount = 5;
    const petalSize = 0.06 + Math.random() * 0.02;
    const shape = new THREE.Shape();
    for (let i = 0; i < petalCount; i++) {
      const a = (i / petalCount) * Math.PI * 2;
      const r = petalSize;
      if (i === 0) {
        shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      } else {
        const prevA = ((i - 0.5) / petalCount) * Math.PI * 2;
        shape.quadraticCurveTo(
          Math.cos(prevA) * r * 1.3,
          Math.sin(prevA) * r * 1.3,
          Math.cos(a) * r,
          Math.sin(a) * r
        );
      }
    }
    const geo = new THREE.ShapeGeometry(shape, 6);

    const mat = new THREE.MeshStandardMaterial({
      color: config.flowerColor,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide,
      emissive: config.flowerColor,
      emissiveIntensity: 0.08,
    });
    const flower = new THREE.Mesh(geo, mat);

    const h = config.baseHeight;
    flower.position.set(
      (Math.random() - 0.5) * 0.25,
      0.55 + index * 0.15 + Math.random() * (h * 0.3),
      (Math.random() - 0.5) * 0.25
    );
    flower.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI * 0.5
    );
    flower.castShadow = true;
    flower.userData.wobbleOffset = Math.random() * Math.PI * 2;
    flower.userData.baseY = flower.position.y;
    return flower;
  }

  focusPlant(id: string): void {
    const info = this.plantInfos.get(id);
    const parts = this.plants.get(id);
    if (!info || !parts) return;

    this.showDetailReport(info);

    const plantPos = info.position.clone();
    const height = info.height;
    const camOffset = new THREE.Vector3(0, height * 0.6 + 0.8, height * 1.6 + 2.0);
    const target = plantPos.clone().add(new THREE.Vector3(0, height * 0.5, 0));
    const camPos = plantPos.clone().add(camOffset);

    if (this.onPlantFocus) {
      this.onPlantFocus(camPos, target);
    }
  }

  private showDetailReport(info: PlantInfo): void {
    this.removeDetailReport();

    const color = getCSSColorString(info.growthIndex);
    const status = info.status;

    const items: { text: string; level: 'good' | 'warning' | 'danger' }[] = [];
    items.push({
      text: `整体健康度: ${info.healthScore}%`,
      level: info.healthScore >= 70 ? 'good' : info.healthScore >= 40 ? 'warning' : 'danger',
    });
    if (status.heatStress) items.push({ text: '⚠️ 高温胁迫 - 叶片卷曲发黄', level: 'danger' });
    if (status.coldStress) items.push({ text: '⚠️ 低温胁迫 - 生长迟缓', level: 'danger' });
    if (status.droughtStress) items.push({ text: '⚠️ 干旱胁迫 - 植株萎蔫', level: 'warning' });
    if (status.overwatering) items.push({ text: '⚠️ 水分过多 - 根部缺氧', level: 'warning' });
    if (status.lightDeficiency) items.push({ text: '⚠️ 光照不足 - 徒长趋势', level: 'warning' });
    if (status.lightBurn) items.push({ text: '⚠️ 光照过强 - 叶片灼伤', level: 'danger' });
    if (status.leggyGrowth) items.push({ text: '⚠️ 徒长现象 - 茎细叶疏', level: 'warning' });

    const report = document.createElement('div');
    report.className = 'plant-detail-report';
    report.innerHTML = `
      <div class="report-header">
        <div class="report-title">
          <span style="font-size:32px">${info.emoji}</span>
          <div>
            <div style="color:${color};font-weight:700;font-size:18px">${info.speciesName} 生长报告</div>
            <div style="font-size:13px;color:#81c784;margin-top:3px">综合生长指数: ${Math.round(info.growthIndex)} / 100</div>
          </div>
        </div>
        <button class="report-close-btn" id="report-close">✕</button>
      </div>

      <div class="report-section">
        <div class="report-section-title">📏 生长指标</div>
        <div class="report-stats">
          <div class="report-stat">
            <div class="report-stat-label">植株高度</div>
            <div>
              <span class="report-stat-value">${info.height.toFixed(2)}</span>
              <span class="report-stat-unit">m</span>
            </div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">叶片数量</div>
            <div>
              <span class="report-stat-value">${info.leafCount}</span>
              <span class="report-stat-unit">片</span>
            </div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">果实数量</div>
            <div>
              <span class="report-stat-value">${info.fruitCount}</span>
              <span class="report-stat-unit">个</span>
            </div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">果实大小</div>
            <div>
              <span class="report-stat-value">${(info.fruitSize * 100).toFixed(1)}</span>
              <span class="report-stat-unit">cm</span>
            </div>
          </div>
        </div>
      </div>

      <div class="report-section">
        <div class="report-section-title">🌱 环境适应度</div>
        <div class="report-stats">
          <div class="report-stat">
            <div class="report-stat-label">温度适应</div>
            <div>
              <span class="report-stat-value" style="color:${getCSSColorString(info.effects.temperatureEffect * 100)}">${Math.round(info.effects.temperatureEffect * 100)}</span>
              <span class="report-stat-unit">%</span>
            </div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">湿度适应</div>
            <div>
              <span class="report-stat-value" style="color:${getCSSColorString(info.effects.humidityEffect * 100)}">${Math.round(info.effects.humidityEffect * 100)}</span>
              <span class="report-stat-unit">%</span>
            </div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">光照适应</div>
            <div>
              <span class="report-stat-value" style="color:${getCSSColorString(info.effects.lightEffect * 100)}">${Math.round(info.effects.lightEffect * 100)}</span>
              <span class="report-stat-unit">%</span>
            </div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">胁迫水平</div>
            <div>
              <span class="report-stat-value" style="color:${getCSSColorString(100 - info.stressLevel)}">${info.stressLevel}</span>
              <span class="report-stat-unit">%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="report-section">
        <div class="report-section-title">📋 状态诊断</div>
        <ul class="report-status-list">
          ${items.map((s) => `
            <li class="report-status-item">
              <span class="status-indicator status-${s.level}"></span>
              ${s.text}
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    document.body.appendChild(report);
    this.detailReportEl = report;

    report.querySelector('#report-close')?.addEventListener('click', () => {
      this.removeDetailReport();
    });
  }

  private removeDetailReport(): void {
    if (this.detailReportEl) {
      this.detailReportEl.remove();
      this.detailReportEl = null;
    }
  }

  updateEnvironment(env: EnvParams): void {
    this.currentEnv = env;
  }

  getAllPlantPositions(): { id: string; position: THREE.Vector3 }[] {
    const result: { id: string; position: THREE.Vector3 }[] = [];
    this.plantInfos.forEach((info) => {
      result.push({ id: info.id, position: info.position.clone() });
    });
    return result;
  }

  handleRaycast(intersects: THREE.Intersection[]): boolean {
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.plantId) {
          const id = obj.userData.plantId as string;
          if (this.plantInfos.has(id)) {
            this.focusPlant(id);
            return true;
          }
        }
        obj = obj.parent;
      }
    }
    return false;
  }

  private dispatchWorkerMessages(delta: number): void {
    this.plantInfos.forEach((info) => {
      const input: WorkerInput = {
        plantId: info.id,
        species: info.species,
        temperature: this.currentEnv.temperature,
        humidity: this.currentEnv.humidity,
        lightIntensity: this.currentEnv.lightIntensity,
        currentGrowthIndex: info.growthIndex,
        deltaTime: delta,
        age: info.age,
        maxAge: this.MAX_AGE,
      };
      this.worker.postMessage(input);
    });
  }

  private applyWorkerResults(): void {
    if (this.pendingResults.size === 0) return;

    this.pendingResults.forEach((result, id) => {
      const info = this.plantInfos.get(id);
      if (!info) return;

      const smoothT = 0.15;
      info.growthIndex = lerp(info.growthIndex, result.growthIndex, smoothT);
      info.height = lerp(info.height, result.height, smoothT);
      info.leafCount = Math.round(
        lerp(info.leafCount, result.leafCount, smoothT)
      );
      info.fruitCount = Math.round(
        lerp(info.fruitCount, result.fruitCount, smoothT)
      );
      info.fruitSize = lerp(info.fruitSize, result.fruitSize, smoothT);
      info.healthScore = result.healthScore;
      info.stressLevel = result.stressLevel;
      info.leafCurl = lerp(info.leafCurl, result.leafCurl, smoothT);
      info.leafYellow = lerp(info.leafYellow, result.leafYellow, smoothT);
      info.stemThinness = lerp(info.stemThinness, result.stemThinness, smoothT);
      info.overallWilt = lerp(info.overallWilt, result.overallWilt, smoothT);
      info.status = result.status;
      info.effects = {
        temperatureEffect: result.temperatureEffect,
        humidityEffect: result.humidityEffect,
        lightEffect: result.lightEffect,
      };
      info.age = Math.min(info.age + 0.008, this.MAX_AGE);

      const parts = this.plants.get(id);
      if (parts) {
        parts.targetHeight = result.height;
        parts.targetLeafCount = result.leafCount;
        parts.targetFruitCount = result.fruitCount;
        parts.targetFruitSize = result.fruitSize;
      }
    });
    this.pendingResults.clear();
  }

  private updatePlantVisuals(): void {
    this.plants.forEach((parts, id) => {
      const info = this.plantInfos.get(id);
      if (!info) return;
      const config = SPECIES_CONFIG[info.species as SpeciesKey];

      const targetH = parts.targetHeight;
      parts.currentHeight = lerp(parts.currentHeight, targetH, 0.12);

      const baseH = (parts.stem.userData.baseHeight as number) || config.baseHeight;
      const scaleY = parts.currentHeight / baseH;
      const scaleX = 1 - info.stemThinness * 0.5;
      parts.stem.scale.set(scaleX, scaleY, scaleX);
      parts.stem.position.y = parts.currentHeight / 2 + 0.2;

      const stemMat = parts.stem.material as THREE.MeshStandardMaterial;
      const wiltColor = new THREE.Color(0x8b7355);
      stemMat.color.lerpColors(
        parts.baseStemColor,
        wiltColor,
        info.overallWilt * 0.5
      );
      if (info.status.overwatering) {
        stemMat.color.lerp(new THREE.Color(0x3a5a3a), 0.2);
      }

      const leafT = clamp(
        info.leafCount / Math.max(1, parts.leaves.length),
        0,
        1
      );

      parts.leaves.forEach((leaf, i) => {
        const leafData = leaf.userData;
        const offset = leafData.wobbleOffset || 0;
        const baseScale = leafData.baseScale || 1;
        const wobbleInt = clamp(info.healthScore / 100, 0.25, 1);

        leafWobble(leaf, this.time, wobbleInt, offset);

        const visibleRatio = clamp(
          (i + 1) / Math.max(1, parts.targetLeafCount),
          0,
          3
        );
        const visT = clamp(visibleRatio, 0, 1);
        const targetScale = visT * baseScale * (1 - info.overallWilt * 0.3);
        const s = lerp(leaf.scale.x, targetScale, 0.1);
        leaf.scale.setScalar(s);

        const curlAngle = info.leafCurl * 0.6;
        leaf.rotation.x += curlAngle * 0.01;
        leaf.rotation.z += curlAngle * 0.005;

        const leafMat = leaf.material as THREE.MeshStandardMaterial;
        const yellowColor = new THREE.Color(0xd4c25a);
        const driedColor = new THREE.Color(0x9e8a55);
        const paleColor = new THREE.Color(0xa4cf6b);

        let targetColor = parts.baseLeafColor.clone();
        if (info.leafYellow > 0) {
          targetColor.lerp(yellowColor, info.leafYellow * 0.6);
        }
        if (info.status.lightDeficiency) {
          targetColor.lerp(paleColor, 0.35);
        }
        if (info.overallWilt > 0.3) {
          targetColor.lerp(driedColor, info.overallWilt * 0.4);
        }
        leafMat.color.lerp(targetColor, 0.12);

        if (leafData.baseY !== undefined) {
          const wiltDrop = info.overallWilt * 0.2;
          leaf.position.y = leafData.baseY * scaleY - wiltDrop;
        }
      });

      parts.fruits.forEach((fruit, i) => {
        const visibleRatio = clamp(
          (i + 1) / Math.max(1, parts.targetFruitCount),
          0,
          3
        );
        const visT = clamp(visibleRatio, 0, 1);
        const targetScale = visT * (info.fruitSize / config.baseFruitSize);
        const s = lerp(fruit.scale.x, targetScale, 0.1);
        fruit.scale.setScalar(s);

        const fruitMat = fruit.material as THREE.MeshStandardMaterial;
        const ripe =
          ((fruit.userData.ripeProgress || 0.7) * info.healthScore) / 100;
        const ripeColor = new THREE.Color(config.fruitColor);
        const unripeColor = new THREE.Color(0x9ccc65);
        fruitMat.color.lerpColors(
          unripeColor,
          ripeColor,
          clamp(ripe, 0.15, 1)
        );
      });

      parts.flowers.forEach((flower) => {
        const flowerOffset = flower.userData.wobbleOffset || 0;
        flower.position.y =
          (flower.userData.baseY || 0.6) +
          Math.sin(this.time * 1.2 + flowerOffset) * 0.005;
        const flowerScale = clamp(info.growthIndex / 40, 0.2, 1);
        flower.scale.setScalar(lerp(flower.scale.x, flowerScale, 0.08));
      });

      parts.labelContainer.position.y = parts.currentHeight * 1.25 + 0.3;
    });
  }

  private updateDataPanels(): void {
    this.dataPanelElements.forEach((panel, id) => {
      const info = this.plantInfos.get(id);
      if (!info) return;

      const color = getCSSColorString(info.growthIndex);
      panel.style.borderColor = color;
      panel.style.boxShadow = `0 4px 20px rgba(0,0,0,0.4), 0 0 ${15 + info.growthIndex * 0.15}px ${color}33`;

      const badge = panel.querySelector('.growth-index-badge');
      if (badge) {
        (badge as HTMLElement).style.background = color;
        badge.textContent = `${Math.round(info.growthIndex)}`;
      }

      const bar = panel.querySelector('.panel-growth-fill');
      if (bar) {
        (bar as HTMLElement).style.width = `${info.growthIndex}%`;
        (bar as HTMLElement).style.background = `linear-gradient(90deg, ${color}, ${color}cc)`;
      }

      const metrics = panel.querySelectorAll('.panel-metric-value');
      if (metrics.length >= 4) {
        metrics[0].textContent = `${Math.round(info.effects.temperatureEffect * 100)}%`;
        metrics[1].textContent = `${Math.round(info.effects.humidityEffect * 100)}%`;
        metrics[2].textContent = `${Math.round(info.effects.lightEffect * 100)}%`;
        metrics[3].textContent = `${info.healthScore}%`;
      }
    });
  }

  private recordHistory(): void {
    const now = Date.now();
    const plants: HistoryFrame['plants'] = {};

    this.plantInfos.forEach((info) => {
      plants[info.id] = {
        growthIndex: info.growthIndex,
        height: info.height,
        leafCount: info.leafCount,
        fruitCount: info.fruitCount,
        fruitSize: info.fruitSize,
        healthScore: info.healthScore,
        leafCurl: info.leafCurl,
        leafYellow: info.leafYellow,
        stemThinness: info.stemThinness,
        overallWilt: info.overallWilt,
        effects: { ...info.effects },
        status: { ...info.status },
      };
    });

    this.history.push({ time: now, plants });

    while (
      this.history.length > 0 &&
      now - this.history[0].time > this.maxHistoryTime
    ) {
      this.history.shift();
    }
  }

  getHistory(): HistoryFrame[] {
    return [...this.history];
  }

  applyHistoryState(plants: HistoryFrame['plants']): void {
    for (const id of Object.keys(plants)) {
      const info = this.plantInfos.get(id);
      const data = plants[id];
      if (!info || !data) continue;

      info.growthIndex = data.growthIndex;
      info.height = data.height;
      info.leafCount = data.leafCount;
      info.fruitCount = data.fruitCount;
      info.fruitSize = data.fruitSize;
      info.healthScore = data.healthScore;
      info.leafCurl = data.leafCurl;
      info.leafYellow = data.leafYellow;
      info.stemThinness = data.stemThinness;
      info.overallWilt = data.overallWilt;
      info.effects = data.effects;
      info.status = data.status;

      const parts = this.plants.get(id);
      if (parts) {
        parts.targetHeight = data.height;
        parts.targetLeafCount = data.leafCount;
        parts.targetFruitCount = data.fruitCount;
        parts.targetFruitSize = data.fruitSize;
      }
    }
  }

  onResize(width: number, height: number): void {
    this.labelRenderer.setSize(width, height);
  }

  update(delta: number): void {
    this.time += delta;

    this.dispatchWorkerMessages(delta);
    this.applyWorkerResults();
    this.updatePlantVisuals();
    this.updateDataPanels();

    const now = Date.now();
    if (now - this.lastHistoryRecord > this.historyRecordInterval) {
      this.recordHistory();
      this.lastHistoryRecord = now;
    }

    this.labelRenderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.worker.terminate();
    this.dataPanelElements.forEach((el) => el.remove());
    this.dataPanelElements.clear();
    this.removeDetailReport();
    this.plants.forEach((parts) => {
      parts.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.scene.remove(parts.group);
    });
    this.plants.clear();
    this.plantInfos.clear();
    this.labelRenderer.domElement.remove();
  }
}
