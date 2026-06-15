export type ActionType = 'idle' | 'walk' | 'jump' | 'attack' | 'hurt' | 'fall' | 'crouch';

export interface Joint {
  name: string;
  x: number;
  y: number;
  parent: string | null;
}

export interface SkeletonFrame {
  joints: Joint[];
}

export interface AnimationData {
  name: ActionType;
  frames: SkeletonFrame[];
  frameRate: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CharacterState {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  hp: number;
  maxHp: number;
  attack: number;
  maxAttack: number;
  currentAction: ActionType;
  collisionRect: Rect;
  facingRight: boolean;
  isGrounded: boolean;
}

export type ObjectType = 'box' | 'vase' | 'spring';

export interface PhysicsObject {
  id: string;
  type: ObjectType;
  rect: Rect;
  mass: number;
  velocity: { x: number; y: number };
  hp?: number;
  maxHp?: number;
  elasticity?: number;
  color: string;
  isActive: boolean;
}

export interface CollisionResult {
  collided: boolean;
  normal: { x: number; y: number };
  penetration: number;
}

export type ParticleType = 'dust' | 'spark' | 'debris';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  rotation?: number;
  rotationSpeed?: number;
  active: boolean;
}

export type GameEventType =
  | { type: 'ACTION'; payload: ActionType }
  | { type: 'COLLISION'; payload: { objectId: string; objectType: ObjectType } }
  | { type: 'EFFECT'; payload: { type: ParticleType; x: number; y: number; color?: string } }
  | { type: 'ATTACK_HIT'; payload: { x: number; y: number } }
  | { type: 'VASE_BROKEN'; payload: { x: number; y: number; color: string } }
  | { type: 'JUMP'; payload: { x: number; y: number } }
  | { type: 'PHYSICS_DEBUG'; payload: { collisionEnabled?: boolean; showBounds?: boolean; particlesEnabled?: boolean } };

export interface PhysicsDebugState {
  collisionEnabled: boolean;
  showBounds: boolean;
  particlesEnabled: boolean;
}
