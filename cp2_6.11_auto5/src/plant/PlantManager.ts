import * as THREE from 'three';
import GrowthWorker from './growthWorker.worker.ts?worker';
import type { EnvParams } from '../env/EnvController';
import {
  GrowthAnimation,
  easeInOutQuad,
  lerp,
  clamp,
  getCSSColorString,
  leafWobble,
} from '../utils/effects';

interface WorkerInput {
  plantId: string;
  species: string;
  temperature: number;
  humidity: number;
  lightIntensity: number;
  currentGrowthIndex: number;
  deltaTime: number;
  age: number;
  maxAge: number;
}

interface WorkerOutput {
  plantId: string;
  growthIndex: number;
  heightFactor: number;
  leafFactor: number;
  fruitFactor: number;
  healthScore: number;
  stressLevel: number;
  temperatureEffect: number;
  humidityEffect: number;
  lightEffect: number;
  status: {
    heatStress: boolean;
    coldStress: boolean;
    droughtStress: boolean;
    overwatering: boolean;
    lightDeficiency: boolean;
    lightBurn: boolean;
  };
}

export interface PlantInfo {
  id: string;
  species: string;
  speciesName: string;
  emoji: string;
  position: THREE.Vector3;
  growthIndex: number;
  heightFactor: number;
  leafFactor: number;
  fruitFactor: number;
  healthScore: number;
  stressLevel: number;
  age: number;
  status: WorkerOutput['status'];
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
  soil: THREE.Mesh;
  targetHeight: number;
  currentHeight: number;
  baseLeafCount: number;
  baseFruitCount: number;
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
    baseLeafCount: number;
    baseFruitCount: number;
    fruitSize: number;
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
    baseLeafCount: 7,
    baseFruitCount: 5,
    fruitSize: 0.18,
  },
  strawberry: {
    name: '草莓',
    emoji: '🍓',
    stemColor: 0x6b8e4e,
    leafColor: 0x4caf50,
    fruitColor: 0xe91e63,
    flowerColor: 0xffffff,
    baseHeight: 0.5,
    baseLeafCount: 9,
    baseFruitCount: 6,
    fruitSize: 0.14,
  },
  lettuce: {
    name: '生菜',
    emoji: '🥬',
    stemColor: 0x8bc34a,
    leafColor: 0x8bc34a,
    fruitColor: 0x000000,
    flowerColor: 0x000000,
    baseHeight: 0.35,
    baseLeafCount: 14,
    baseFruitCount: 0,
    fruitSize: 0,
  },
  cucumber: {
    name: '黄瓜',
    emoji: '🥒',
    stemColor: 0x689f38,
    leafColor: 0x558b2f,
    fruitColor: 0x7cb342,
    flowerColor: 0xffd54f,
    baseHeight: 1.5,
    baseLeafCount: 8,
    baseFruitCount: 4,
    fruitSize: 0.22,
  },
  pepper: {
    name: '辣椒',
    emoji: '🌶️',
    stemColor: 0x4a7c3a,
    leafColor: 0x388e3c,
    fruitColor: 0xf44336,
    flowerColor: 0xffffff,
    baseHeight: 1.2,
    baseLeafCount: 9,
    baseFruitCount: 6,
    fruitSize: 0.16,
  },
  basil: {
    name: '罗勒',
    emoji: '🌿',
    stemColor: 0x2e7d32,
    leafColor: 0x388e3c,
    fruitColor: 0x000000,
    flowerColor: 0xba68c8,
    baseHeight: 0.7,
    baseLeafCount: 16,
    baseFruitCount: 0,
    fruitSize: 0,
  },
};

export class PlantManager {
  private scene: THREE.Scene;
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private plants: Map<string, PlantParts> = new Map();
  private plantInfos: Map<string, PlantInfo> = new Map();
  private dataPanels: Map<string, HTMLDivElement> = new Map();
  private worker: Worker;
  private pendingResults: Map<string, WorkerOutput> = new Map();
  private growthAnim: GrowthAnimation;
  private currentEnv: EnvParams;
  private selectedPlantId: string | null = null;
  private detailReportEl: HTMLDivElement | null = null;
  private time = 0;
  private readonly MAX_AGE = 180;
  private history: Array<{
    time: number;
    plantStates: Map<string, { growthIndex: number; heightFactor: number; leafFactor: number; fruitFactor: number }>;
  }> = [];
  private maxHistoryTime = 60000;
  public onPlantClick?: (plantId: string, position: THREE.Vector3) => void;
  public onPlantFocus?: (position: THREE.Vector3, target: THREE.Vector3) => void;

  constructor(
    scene: THREE.Scene,
    container: HTMLElement,
    camera: THREE.PerspectiveCamera,
    initialEnv: EnvParams
  ) {
    this.scene = scene;
    this.container = container;
    this.camera = camera;
    this.currentEnv = initialEnv;
    this.growthAnim = new GrowthAnimation();

    this.worker = new GrowthWorker();
    this.worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
      this.pendingResults.set(e.data.plantId, e.data);
    };

    this.createPlants();
    this.recordHistory();
  }

  private createPlants(): void {
    const positions: [number, number][] = [
      [-4, -3],
      [-1.5, -3.5],
      [1.5, -3.2],
      [4, -3],
      [-2.5, 2.5],
      [2.5, 2.8],
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
    group.userData.interactive = true;

    const soilGeo = new THREE.CylinderGeometry(0.55, 0.7, 0.15, 16);
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x4a3a2a,
      roughness: 0.95,
      metalness: 0.05,
    });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.075;
    soil.receiveShadow = true;
    group.add(soil);

    const potGeo = new THREE.CylinderGeometry(0.6, 0.5, 0.4, 16, 1, false);
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

    const stemGeo = new THREE.CylinderGeometry(0.06, 0.1, config.baseHeight, 8);
    const stemMat = new THREE.MeshStandardMaterial({
      color: config.stemColor,
      roughness: 0.8,
      metalness: 0.05,
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = config.baseHeight / 2 + 0.2;
    stem.castShadow = true;
    stem.receiveShadow = true;
    group.add(stem);

    const leaves: THREE.Mesh[] = [];
    for (let i = 0; i < config.baseLeafCount; i++) {
      const leafGeo = new THREE.SphereGeometry(0.18, 8, 6);
      leafGeo.scale(1.2, 0.4, 1.4);
      const leafMat = new THREE.MeshStandardMaterial({
        color: config.leafColor,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      const leaf = new THREE.Mesh(leafGeo, leafMat);

      const yOffset =
        species === 'lettuce'
          ? 0.15 + i * 0.03
          : 0.3 + (i / config.baseLeafCount) * (config.baseHeight - 0.4);
      const angle = (i / config.baseLeafCount) * Math.PI * 2 + i * 0.3;
      const radius = species === 'lettuce' ? 0.1 + Math.random() * 0.15 : 0.2;

      leaf.position.set(
        Math.cos(angle) * radius,
        yOffset,
        Math.sin(angle) * radius
      );
      leaf.rotation.set(
        Math.random() * 0.5 - 0.25,
        angle + Math.random() * 0.4 - 0.2,
        Math.random() * 0.4 - 0.2
      );
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      leaf.userData.leafIndex = i;
      leaf.userData.baseScale = 1 + Math.random() * 0.3 - 0.15;
      leaf.userData.wobbleOffset = Math.random() * Math.PI * 2;
      leaves.push(leaf);
      group.add(leaf);
    }

    const fruits: THREE.Mesh[] = [];
    if (config.baseFruitCount > 0) {
      for (let i = 0; i < config.baseFruitCount; i++) {
        let fruitGeo: THREE.BufferGeometry;
        if (species === 'cucumber') {
          fruitGeo = new THREE.CylinderGeometry(
            config.fruitSize * 0.3,
            config.fruitSize * 0.35,
            config.fruitSize * 2,
            8
          );
        } else if (species === 'pepper') {
          fruitGeo = new THREE.ConeGeometry(
            config.fruitSize * 0.5,
            config.fruitSize * 2,
            8
          );
        } else if (species === 'strawberry') {
          fruitGeo = new THREE.SphereGeometry(config.fruitSize, 10, 8);
          fruitGeo.scale(1, 0.8, 0.9);
        } else {
          fruitGeo = new THREE.SphereGeometry(config.fruitSize, 12, 10);
        }

        const fruitMat = new THREE.MeshStandardMaterial({
          color: config.fruitColor,
          roughness: 0.45,
          metalness: 0.1,
        });
        const fruit = new THREE.Mesh(fruitGeo, fruitMat);

        const yOffset = 0.5 + Math.random() * (config.baseHeight - 0.6);
        const angle = (i / config.baseFruitCount) * Math.PI * 2;
        fruit.position.set(
          Math.cos(angle) * 0.25,
          yOffset,
          Math.sin(angle) * 0.25
        );
        fruit.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          species === 'pepper' || species === 'cucumber'
            ? Math.PI + Math.random() * 0.3 - 0.15
            : 0
        );
        fruit.castShadow = true;
        fruit.receiveShadow = true;
        fruit.userData.baseScale = 1;
        fruit.userData.ripeProgress = 0.5 + Math.random() * 0.5;
        fruits.push(fruit);
        group.add(fruit);
      }
    }

    const flowers: THREE.Mesh[] = [];
    if (species !== 'lettuce') {
      const flowerCount = species === 'basil' ? 6 : 3;
      for (let i = 0; i < flowerCount; i++) {
        const flowerGeo = new THREE.SphereGeometry(0.07, 8, 6);
        const flowerMat = new THREE.MeshStandardMaterial({
          color: config.flowerColor,
          roughness: 0.6,
          metalness: 0.1,
          emissive: config.flowerColor,
          emissiveIntensity: 0.1,
        });
        const flower = new THREE.Mesh(flowerGeo, flowerMat);

        const yOffset = 0.6 + Math.random() * (config.baseHeight * 0.5);
        const angle = (i / flowerCount) * Math.PI * 2;
        flower.position.set(
          Math.cos(angle) * 0.18,
          yOffset,
          Math.sin(angle) * 0.18
        );
        flower.castShadow = true;
        flower.userData.wobbleOffset = Math.random() * Math.PI * 2;
        flowers.push(flower);
        group.add(flower);
      }
    }

    this.scene.add(group);
    this.growthAnim.registerObject(group);
    group.scale.setScalar(0);
    this.growthAnim.startGrowth(group, 1, 1.8);

    this.plants.set(id, {
      group,
      stem,
      leaves,
      fruits,
      flowers,
      soil,
      targetHeight: config.baseHeight,
      currentHeight: 0,
      baseLeafCount: config.baseLeafCount,
      baseFruitCount: config.baseFruitCount,
    });

    const initialGrowth = 35 + Math.random() * 25;
    const info: PlantInfo = {
      id,
      species,
      speciesName: config.name,
      emoji: config.emoji,
      position: group.position.clone(),
      growthIndex: initialGrowth,
      heightFactor: 0.4,
      leafFactor: 0.5,
      fruitFactor: 0.3,
      healthScore: 75,
      stressLevel: 25,
      age: Math.random() * 30,
      status: {
        heatStress: false,
        coldStress: false,
        droughtStress: false,
        overwatering: false,
        lightDeficiency: false,
        lightBurn: false,
      },
      effects: {
        temperatureEffect: 0.8,
        humidityEffect: 0.8,
        lightEffect: 0.8,
      },
    };
    this.plantInfos.set(id, info);
    this.createDataPanel(id, info);
  }

  private createDataPanel(id: string, info: PlantInfo): void {
    const panel = document.createElement('div');
    panel.className = 'plant-data-panel';
    panel.dataset.plantId = id;
    panel.style.borderColor = getCSSColorString(info.growthIndex);

    const color = getCSSColorString(info.growthIndex);
    panel.innerHTML = `
      <div class="panel-plant-name">
        <span>${info.emoji}</span>
        <span>${info.speciesName}</span>
        <span class="growth-index-badge" style="background:${color}">${Math.round(info.growthIndex)}</span>
      </div>
      <div class="panel-growth-bar">
        <div class="panel-growth-fill" style="width:${info.growthIndex}%; background:${color}; color:${color}"></div>
      </div>
      <div class="panel-metrics">
        <div class="panel-metric">
          <span>🌡️</span>
          <span class="panel-metric-value">${Math.round(info.effects.temperatureEffect * 100)}%</span>
        </div>
        <div class="panel-metric">
          <span>💧</span>
          <span class="panel-metric-value">${Math.round(info.effects.humidityEffect * 100)}%</span>
        </div>
        <div class="panel-metric">
          <span>☀️</span>
          <span class="panel-metric-value">${Math.round(info.effects.lightEffect * 100)}%</span>
        </div>
        <div class="panel-metric">
          <span>❤️</span>
          <span class="panel-metric-value">${info.healthScore}%</span>
        </div>
      </div>
    `;

    panel.addEventListener('click', (e) => {
      e.stopPropagation();
      this.focusPlant(id);
    });

    this.container.appendChild(panel);
    this.dataPanels.set(id, panel);
  }

  focusPlant(id: string): void {
    const info = this.plantInfos.get(id);
    const parts = this.plants.get(id);
    if (!info || !parts) return;

    this.selectedPlantId = id;
    this.showDetailReport(info);

    const plantPos = info.position.clone();
    const offset = new THREE.Vector3(0, 1.2, 2.5);
    const cameraTarget = plantPos.clone().add(new THREE.Vector3(0, 0.8, 0));
    const cameraPos = plantPos.clone().add(offset);

    if (this.onPlantFocus) {
      this.onPlantFocus(cameraPos, cameraTarget);
    }
  }

  private showDetailReport(info: PlantInfo): void {
    this.removeDetailReport();

    const color = getCSSColorString(info.growthIndex);
    const status = info.status;

    const statusItems: { text: string; level: 'good' | 'warning' | 'danger' }[] = [];
    statusItems.push({
      text: `整体健康: ${info.healthScore}%`,
      level: info.healthScore >= 70 ? 'good' : info.healthScore >= 40 ? 'warning' : 'danger',
    });
    if (status.heatStress) statusItems.push({ text: '⚠️ 高温胁迫', level: 'danger' });
    if (status.coldStress) statusItems.push({ text: '⚠️ 低温胁迫', level: 'danger' });
    if (status.droughtStress) statusItems.push({ text: '⚠️ 干旱胁迫', level: 'warning' });
    if (status.overwatering) statusItems.push({ text: '⚠️ 水分过多', level: 'warning' });
    if (status.lightDeficiency) statusItems.push({ text: '⚠️ 光照不足', level: 'warning' });
    if (status.lightBurn) statusItems.push({ text: '⚠️ 光照灼伤', level: 'danger' });

    const report = document.createElement('div');
    report.className = 'plant-detail-report';
    report.innerHTML = `
      <div class="report-header">
        <div class="report-title">
          <span style="font-size:28px">${info.emoji}</span>
          <div>
            <div style="color:${color};font-weight:700">${info.speciesName}</div>
            <div style="font-size:12px;color:#81c784;margin-top:2px">生长指数: ${Math.round(info.growthIndex)} / 100</div>
          </div>
        </div>
        <button class="report-close-btn" id="report-close">✕</button>
      </div>
      
      <div class="report-section">
        <div class="report-section-title">📊 生长状态</div>
        <div class="report-stats">
          <div class="report-stat">
            <div class="report-stat-label">植株高度</div>
            <div>
              <span class="report-stat-value">${(info.heightFactor * SPECIES_CONFIG[info.species as SpeciesKey].baseHeight).toFixed(2)}</span>
              <span class="report-stat-unit">m</span>
            </div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">叶片数量</div>
            <div>
              <span class="report-stat-value">${Math.round(info.leafFactor * parts?.baseLeafCount || 0)}</span>
              <span class="report-stat-unit">片</span>
            </div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">果实数量</div>
            <div>
              <span class="report-stat-value">${Math.round(info.fruitFactor * parts?.baseFruitCount || 0)}</span>
              <span class="report-stat-unit">个</span>
            </div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">生长龄期</div>
            <div>
              <span class="report-stat-value">${info.age.toFixed(1)}</span>
              <span class="report-stat-unit">天</span>
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
              <span class="report-stat-value">${Math.round(info.effects.temperatureEffect * 100)}</span>
              <span class="report-stat-unit">%</span>
            </div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">湿度适应</div>
            <div>
              <span class="report-stat-value">${Math.round(info.effects.humidityEffect * 100)}</span>
              <span class="report-stat-unit">%</span>
            </div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">光照适应</div>
            <div>
              <span class="report-stat-value">${Math.round(info.effects.lightEffect * 100)}</span>
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
          ${statusItems.map((s) => `
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
      this.selectedPlantId = null;
    });
  }

  private removeDetailReport(): void {
    if (this.detailReportEl) {
      this.detailReportEl.style.animation = 'reportSlideIn 0.3s ease reverse';
      setTimeout(() => {
        this.detailReportEl?.remove();
        this.detailReportEl = null;
      }, 280);
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
          const info = this.plantInfos.get(id);
          if (info) {
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
    this.pendingResults.forEach((result, id) => {
      const info = this.plantInfos.get(id);
      if (!info) return;

      const t = 0.12;
      info.growthIndex = lerp(info.growthIndex, result.growthIndex, t);
      info.heightFactor = lerp(info.heightFactor, result.heightFactor, t);
      info.leafFactor = lerp(info.leafFactor, result.leafFactor, t);
      info.fruitFactor = lerp(info.fruitFactor, result.fruitFactor, t);
      info.healthScore = result.healthScore;
      info.stressLevel = result.stressLevel;
      info.status = result.status;
      info.effects = {
        temperatureEffect: result.temperatureEffect,
        humidityEffect: result.humidityEffect,
        lightEffect: result.lightEffect,
      };
      info.age = Math.min(info.age + 0.01, this.MAX_AGE);
    });
    this.pendingResults.clear();
  }

  private updatePlantVisuals(delta: number): void {
    this.plants.forEach((parts, id) => {
      const info = this.plantInfos.get(id);
      if (!info) return;
      const config = SPECIES_CONFIG[info.species as SpeciesKey];

      const targetStemHeight = config.baseHeight * info.heightFactor;
      parts.currentHeight = lerp(parts.currentHeight, targetStemHeight, 0.1);
      parts.stem.scale.y = parts.currentHeight / config.baseHeight;
      parts.stem.position.y = parts.currentHeight / 2 + 0.2;

      const stemMat = parts.stem.material as THREE.MeshStandardMaterial;
      const baseColor = new THREE.Color(config.stemColor);
      if (info.status.droughtStress) {
        stemMat.color.lerpColors(baseColor, new THREE.Color(0x8b7355), 0.4);
      } else if (info.status.overwatering) {
        stemMat.color.lerpColors(baseColor, new THREE.Color(0x3a5a3a), 0.3);
      } else {
        stemMat.color.lerp(baseColor, 0.15);
      }

      parts.leaves.forEach((leaf, i) => {
        const leafInfo = leaf.userData;
        const offset = leafInfo.wobbleOffset || 0;
        const baseScale = leafInfo.baseScale || 1;
        const wobbleIntensity = clamp(info.healthScore / 100, 0.2, 1);

        leafWobble(leaf, this.time, wobbleIntensity, offset);

        const visProgress = clamp(
          (i / parts.baseLeafCount) * 2 - (1 - info.leafFactor),
          0,
          1
        );
        const targetLeafScale = easeInOutQuad(visProgress) * baseScale;
        const s = lerp(leaf.scale.x, targetLeafScale, 0.15);
        leaf.scale.setScalar(s);

        const leafMat = leaf.material as THREE.MeshStandardMaterial;
        const leafBaseColor = new THREE.Color(config.leafColor);

        if (info.status.heatStress) {
          leafMat.color.lerpColors(
            leafBaseColor,
            new THREE.Color(0xc9a961),
            0.5
          );
          leaf.rotation.z += Math.sin(this.time * 3 + offset) * 0.003;
        } else if (info.status.lightDeficiency) {
          leafMat.color.lerpColors(
            leafBaseColor,
            new THREE.Color(0x8bc34a),
            0.25
          );
        } else if (info.status.droughtStress) {
          leafMat.color.lerpColors(
            leafBaseColor,
            new THREE.Color(0x9e9d65),
            0.35
          );
        } else if (info.status.overwatering) {
          leafMat.color.lerpColors(
            leafBaseColor,
            new THREE.Color(0x2e4e2e),
            0.25
          );
        } else {
          leafMat.color.lerp(leafBaseColor, 0.15);
        }
      });

      parts.fruits.forEach((fruit, i) => {
        const visProgress = clamp(
          (i / Math.max(1, parts.baseFruitCount)) * 2 - (1 - info.fruitFactor),
          0,
          1
        );
        const targetFruitScale = easeInOutQuad(visProgress);
        const s = lerp(fruit.scale.x, targetFruitScale, 0.12);
        fruit.scale.setScalar(s);

        const fruitMat = fruit.material as THREE.MeshStandardMaterial;
        const ripe = (fruit.userData.ripeProgress || 0.8) * info.healthScore / 100;
        const ripeColor = new THREE.Color(config.fruitColor);
        const unripeColor = new THREE.Color(0x8bc34a);
        fruitMat.color.lerpColors(unripeColor, ripeColor, clamp(ripe, 0.2, 1));
      });

      parts.flowers.forEach((flower, i) => {
        const offset = flower.userData.wobbleOffset || 0;
        flower.position.y += Math.sin(this.time * 1.2 + offset) * 0.002;
        const flowerScale = clamp(info.growthIndex / 50, 0.3, 1);
        flower.scale.setScalar(lerp(flower.scale.x, flowerScale, 0.1));
      });
    });
  }

  private updateDataPanels(): void {
    this.dataPanels.forEach((panel, id) => {
      const info = this.plantInfos.get(id);
      const parts = this.plants.get(id);
      if (!info || !parts) return;

      const worldPos = parts.group.position.clone();
      const topOffset = SPECIES_CONFIG[info.species as SpeciesKey].baseHeight * info.heightFactor + 0.6;
      worldPos.y += topOffset;

      const screenPos = worldPos.project(this.camera);
      const rect = this.container.getBoundingClientRect();
      const x = (screenPos.x * 0.5 + 0.5) * rect.width;
      const y = (-screenPos.y * 0.5 + 0.5) * rect.height;

      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      panel.style.transform = 'translate(-50%, -100%)';

      const color = getCSSColorString(info.growthIndex);
      panel.style.borderColor = color;

      const badge = panel.querySelector('.growth-index-badge') as HTMLElement | null;
      if (badge) {
        badge.style.background = color;
        badge.textContent = `${Math.round(info.growthIndex)}`;
      }

      const growthFill = panel.querySelector('.panel-growth-fill') as HTMLElement | null;
      if (growthFill) {
        growthFill.style.width = `${info.growthIndex}%`;
        growthFill.style.background = color;
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
    const plantStates = new Map<
      string,
      {
        growthIndex: number;
        heightFactor: number;
        leafFactor: number;
        fruitFactor: number;
      }
    >();

    this.plantInfos.forEach((info) => {
      plantStates.set(info.id, {
        growthIndex: info.growthIndex,
        heightFactor: info.heightFactor,
        leafFactor: info.leafFactor,
        fruitFactor: info.fruitFactor,
      });
    });

    this.history.push({ time: now, plantStates });

    while (
      this.history.length > 0 &&
      now - this.history[0].time > this.maxHistoryTime
    ) {
      this.history.shift();
    }
  }

  getHistory(): typeof this.history {
    return [...this.history];
  }

  applyHistoryState(
    state: Map<string, {
      growthIndex: number;
      heightFactor: number;
      leafFactor: number;
      fruitFactor: number;
    }>
  ): void {
    state.forEach((data, id) => {
      const info = this.plantInfos.get(id);
      if (info) {
        info.growthIndex = data.growthIndex;
        info.heightFactor = data.heightFactor;
        info.leafFactor = data.leafFactor;
        info.fruitFactor = data.fruitFactor;
      }
    });
  }

  update(delta: number): void {
    this.time += delta;

    this.dispatchWorkerMessages(delta);
    this.applyWorkerResults();
    this.updatePlantVisuals(delta);
    this.updateDataPanels();
    this.growthAnim.update();

    if (this.time % 1 < delta * 2) {
      this.recordHistory();
    }
  }

  dispose(): void {
    this.worker.terminate();
    this.dataPanels.forEach((panel) => panel.remove());
    this.dataPanels.clear();
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
  }
}
