import Matter from 'matter-js';
import { CANVAS_SIZE, COLORS } from './PhysicsEngine';
import type { PhysicsEngine } from './PhysicsEngine';
import { useGameStore } from '../store/gameStore';

const BALL_RADIUS = 15;
const BASE_SPEED = 12;
const MAX_DRAG_DISTANCE = 200;
const BALL_FRICTION = 0.01;
const BALL_RESTITUTION = 0.8;
const BALL_FRICTION_AIR = 0.01;

const INITIAL_X = 150;
const INITIAL_Y = CANVAS_SIZE.height - 20 - 150;

export class ThrowableBall {
  private engine: PhysicsEngine;
  private ball: Matter.Body | null = null;
  private isDragging: boolean = false;
  private dragStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private initialPos: { x: number; y: number } = { x: INITIAL_X, y: INITIAL_Y };
  private onThrowCallback: (() => void) | null = null;

  constructor(engine: PhysicsEngine) {
    this.engine = engine;
  }

  create(): Matter.Body {
    this.ball = Matter.Bodies.circle(INITIAL_X, INITIAL_Y, BALL_RADIUS, {
      label: 'ball',
      restitution: BALL_RESTITUTION,
      friction: BALL_FRICTION,
      frictionAir: BALL_FRICTION_AIR,
      density: 0.001,
      collisionFilter: {
        category: 0x0001,
        mask: 0x0001,
      },
    });
    
    this.engine.addBody(this.ball);
    this.engine.setBall(this.ball);
    
    return this.ball;
  }

  reset(): void {
    if (!this.ball) return;
    
    Matter.Body.setPosition(this.ball, { x: INITIAL_X, y: INITIAL_Y });
    Matter.Body.setVelocity(this.ball, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(this.ball, 0);
    Matter.Body.setAngle(this.ball, 0);
    
    this.isDragging = false;
    this.initialPos = { x: INITIAL_X, y: INITIAL_Y };
  }

  handleMouseDown(clientX: number, clientY: number, canvasRect: DOMRect): boolean {
    if (!this.ball) return false;
    
    const x = clientX - canvasRect.left;
    const y = clientY - canvasRect.top;
    
    const dx = x - this.ball.position.x;
    const dy = y - this.ball.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= BALL_RADIUS + 10) {
      this.isDragging = true;
      this.dragStartPos = { x, y };
      useGameStore.getState().setIsDragging(true);
      useGameStore.getState().setPower(0);
      
      Matter.Body.setVelocity(this.ball, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(this.ball, 0);
      
      return true;
    }
    
    return false;
  }

  handleMouseMove(clientX: number, clientY: number, canvasRect: DOMRect): void {
    if (!this.isDragging || !this.ball) return;
    
    const x = clientX - canvasRect.left;
    const y = clientY - canvasRect.top;
    
    const dx = x - this.dragStartPos.x;
    const dy = y - this.dragStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const clampedDistance = Math.min(distance, MAX_DRAG_DISTANCE);
    const power = (clampedDistance / MAX_DRAG_DISTANCE) * 100;
    
    useGameStore.getState().setPower(power);
  }

  handleMouseUp(): void {
    if (!this.isDragging || !this.ball) return;
    
    const state = useGameStore.getState();
    const power = state.power;
    
    if (power > 5) {
      const dragDx = this.ball.position.x - this.dragStartPos.x;
      const dragDy = this.ball.position.y - this.dragStartPos.y;
      const dragDistance = Math.sqrt(dragDx * dragDx + dragDy * dragDy);
      
      if (dragDistance > 0) {
        const normalizedDx = dragDx / dragDistance;
        const normalizedDy = dragDy / dragDistance;
        
        const speed = BASE_SPEED * (power / 100);
        const vx = normalizedDx * speed;
        const vy = normalizedDy * speed;
        
        Matter.Body.setVelocity(this.ball, { x: vx, y: vy });
        
        state.incrementThrowCount();
        if (this.onThrowCallback) {
          this.onThrowCallback();
        }
      }
    }
    
    this.isDragging = false;
    state.setIsDragging(false);
    state.setPower(0);
  }

  getBall(): Matter.Body | null {
    return this.ball;
  }

  getRadius(): number {
    return BALL_RADIUS;
  }

  getColor(): string {
    return COLORS.BALL_COLOR;
  }

  getInitialPosition(): { x: number; y: number } {
    return { ...this.initialPos };
  }

  isBallDragging(): boolean {
    return this.isDragging;
  }

  setOnThrowCallback(callback: (() => void) | null): void {
    this.onThrowCallback = callback;
  }

  getDragDirection(): { x: number; y: number } | null {
    if (!this.isDragging || !this.ball) return null;
    
    const dx = this.ball.position.x - this.dragStartPos.x;
    const dy = this.ball.position.y - this.dragStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return null;
    
    return {
      x: dx / distance,
      y: dy / distance,
    };
  }
}
