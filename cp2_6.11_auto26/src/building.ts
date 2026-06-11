import * as THREE from 'three';

export type BuildingType = 'commercial' | 'residential' | 'hotel' | 'stadium' | 'ferrisWheel';
export type BuildPhase = 'foundation' | 'framework' | 'floor' | 'wall' | 'window' | 'top';

export const BUILD_PHASES: BuildPhase[] = ['foundation', 'framework', 'floor', 'wall', 'window', 'top'];
export const PHASE_NAMES: Record<BuildPhase, string> = {
  foundation: '地基',
  framework: '框架',
  floor: '楼板',
  wall: '外墙',
  window: '窗户',
  top: '顶部装饰'
};

export interface BuildingBlueprint {
  type: BuildingType;
  name: string;
  floors: number;
  floorHeight: number;
  width: number;
  depth: number;
  color: number;
  isSpecial: boolean;
}

export const BLUEPRINTS: Record<BuildingType, BuildingBlueprint> = {
  commercial: { type: 'commercial', name: '商业塔楼', floors: 30, floorHeight: 5, width: 18, depth: 18, color: 0xffa500, isSpecial: false },
  residential: { type: 'residential', name: '住宅大厦', floors: 24, floorHeight: 5, width: 16, depth: 16, color: 0xffd700, isSpecial: false },
  hotel: { type: 'hotel', name: '酒店', floors: 20, floorHeight: 5, width: 20, depth: 14, color: 0xff8c00, isSpecial: false },
  stadium: { type: 'stadium', name: '体育场', floors: 8, floorHeight: 5, width: 60, depth: 60, color: 0xff6347, isSpecial: true },
  ferrisWheel: { type: 'ferrisWheel', name: '摩天轮', floors: 12, floorHeight: 5, width: 50, depth: 50, color: 0xff4500, isSpecial: true }
};

export interface FloorBuildEvent {
  buildingId: string;
  type: BuildingType;
  phase: BuildPhase;
  floorIndex: number;
  position: THREE.Vector3;
}

export interface PhaseCompleteEvent {
  buildingId: string;
  type: BuildingType;
  phase: BuildPhase;
  progress: number;
}

export class Building {
  public id: string;
  public blueprint: BuildingBlueprint;
  public root: THREE.Group;
  public ghost: THREE.Mesh | null = null;
  public foundationGroup = new THREE.Group();
  public frameworkGroup = new THREE.Group();
  public floorGroup = new THREE.Group();
  public wallGroup = new THREE.Group();
  public windowGroup = new THREE.Group();
  public topGroup = new THREE.Group();

  private currentPhase = -1;
  private animatingPhase = -1;
  private animatingFloor = -1;
  private phaseStartTime = 0;
  private floorDuration = 0.15;
  private eventTarget: EventTarget;
  private basePosition: THREE.Vector3;
  private phaseMaterials: Map<string, THREE.MeshStandardMaterial> = new Map();
  private isBuilding = false;
  private completed = false;

  constructor(blueprint: BuildingBlueprint, position: THREE.Vector3) {
    this.id = Math.random().toString(36).substring(2, 10);
    this.blueprint = blueprint;
    this.basePosition = position.clone();
    this.eventTarget = new EventTarget();

    this.root = new THREE.Group();
    this.root.position.copy(position);
    this.root.add(this.foundationGroup, this.frameworkGroup, this.floorGroup, this.wallGroup, this.windowGroup, this.topGroup);

    this.createGhost