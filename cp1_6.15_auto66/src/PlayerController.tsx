import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, Vec3 } from './store';

export function PlayerController() {
  const { camera, gl } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const isPointerLocked = useRef(false);
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition);
  const setPlayerRunning = useGameStore((s) => s.setPlayerRunning);
  const setCameraBobOffset = useGameStore((s) => s.setCameraBobOffset);
  const setFlashlightShakeOffset = useGameStore((s) => s.setFlashlightShakeOffset);
  const setVignetteOpacity = useGameStore((s) => s.setVignetteOpacity);
  const caveMap = useGameStore((s) => s.caveMap);
  const currentVignetteRef = useRef(0);

  useEffect(() => {
    camera.position.set(0, 1.6, 0);
    yawRef.current = 0;
    pitchRef.current = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked.current) return;
      const sensitivity = 0.002;
      yawRef.current -= e.movementX * sensitivity;
      pitchRef.current -= e.movementY * sensitivity;
      pitchRef.current = Math.max(
        -Math.PI / 2 + 0.01,
        Math.min(Math.PI / 2 - 0.01, pitchRef.current)
      );
    };

    const onPointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === gl.domElement;
    };

    const onCanvasClick = () => {
      if (!isPointerLocked.current) {
        gl.domElement.requestPointerLock();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    gl.domElement.addEventListener('click', onCanvasClick);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      gl.domElement.removeEventListener('click', onCanvasClick);
    };
  }, [camera, gl]);

  const playerRadius = 0.4;

  const checkWallCollision = useMemo(() => {
    return (pos: THREE.Vector3): boolean => {
      for (const wall of caveMap.walls) {
        const [wx, wy, wz] = wall.position;
        const [sx, sy, sz] = wall.size;
        const halfX = sx / 2 + playerRadius;
        const halfZ = sz / 2 + playerRadius;
        const halfY = sy / 2;

        const distX = Math.abs(pos.x - wx);
        const distY = Math.abs(pos.y - wy);
        const distZ = Math.abs(pos.z - wz);

        if (distX < halfX && distY < halfY && distZ < halfZ) {
          return true;
        }
      }
      return false;
    };
  }, [caveMap.walls]);

  const findNearestWallDistance = useMemo(() => {
    return (pos: THREE.Vector3): number => {
      let minDist = Infinity;
      for (const wall of caveMap.walls) {
        const [wx, wy, wz] = wall.position;
        const [sx, sy, sz] = wall.size;
        const dx = Math.max(Math.abs(pos.x - wx) - sx / 2, 0);
        const dy = Math.max(Math.abs(pos.y - wy) - sy / 2, 0);
        const dz = Math.max(Math.abs(pos.z - wz) - sz / 2, 0);
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    };
  }, [caveMap.walls]);

  useFrame((state, delta) => {
    const keys = keysRef.current;
    const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
    setPlayerRunning(isRunning);

    const baseSpeed = isRunning ? 7 : 4;
    const moveSpeed = baseSpeed * delta;

    const forward = new THREE.Vector3(
      -Math.sin(yawRef.current),
      0,
      -Math.cos(yawRef.current)
    );
    const right = new THREE.Vector3(
      Math.cos(yawRef.current),
      0,
      -Math.sin(yawRef.current)
    );

    const moveDir = new THREE.Vector3();
    if (keys['KeyW'] || keys['ArrowUp']) moveDir.add(forward);
    if (keys['KeyS'] || keys['ArrowDown']) moveDir.sub(forward);
    if (keys['KeyD'] || keys['ArrowRight']) moveDir.add(right);
    if (keys['KeyA'] || keys['ArrowLeft']) moveDir.sub(right);

    let isMoving = false;
    if (moveDir.lengthSq() > 0.001) {
      isMoving = true;
      moveDir.normalize().multiplyScalar(moveSpeed);

      const newPos = camera.position.clone();
      newPos.x += moveDir.x;
      newPos.z += moveDir.z;

      if (!checkWallCollision(newPos)) {
        camera.position.x = newPos.x;
        camera.position.z = newPos.z;
      } else {
        const testX = camera.position.clone();
        testX.x += moveDir.x;
        if (!checkWallCollision(testX)) {
          camera.position.x = testX.x;
        }
        const testZ = camera.position.clone();
        testZ.z += moveDir.z;
        if (!checkWallCollision(testZ)) {
          camera.position.z = testZ.z;
        }
      }
    }

    const targetY = 1.6;
    camera.position.y += (targetY - camera.position.y) * 0.2;

    const lookDir = new THREE.Vector3(
      Math.sin(yawRef.current) * Math.cos(pitchRef.current),
      Math.sin(pitchRef.current),
      Math.cos(yawRef.current) * Math.cos(pitchRef.current)
    );
    const lookTarget = new THREE.Vector3().copy(camera.position).add(lookDir);
    camera.lookAt(lookTarget);

    let bobOffset = 0;
    let shakeX = 0;
    let shakeY = 0;
    let shakeZ = 0;

    if (isMoving) {
      const bobFreq = isRunning ? 3 : 2;
      const bobAmp = isRunning ? 0.03 : 0.02;
      bobOffset = Math.sin(state.clock.elapsedTime * Math.PI * 2 * bobFreq) * bobAmp;

      if (isRunning) {
        const shakeFreq = 3;
        const shakeAmp = 0.03;
        shakeX = Math.sin(state.clock.elapsedTime * Math.PI * 2 * shakeFreq) * shakeAmp;
        shakeY = Math.cos(state.clock.elapsedTime * Math.PI * 2 * shakeFreq * 1.3) * shakeAmp * 0.5;
        shakeZ = Math.sin(state.clock.elapsedTime * Math.PI * 2 * shakeFreq * 0.7) * shakeAmp * 0.3;
      }
    }

    setCameraBobOffset(bobOffset);
    setFlashlightShakeOffset([shakeX, shakeY, shakeZ] as Vec3);
    setPlayerPosition([
      camera.position.x,
      camera.position.y + bobOffset,
      camera.position.z,
    ] as Vec3);

    const nearestDist = findNearestWallDistance(camera.position);
    const targetVignette = nearestDist < 0.5 ? 0.3 : 0;
    const vignetteSpeed = delta / 0.2;
    currentVignetteRef.current += (targetVignette - currentVignetteRef.current) * Math.min(1, vignetteSpeed);
    setVignetteOpacity(currentVignetteRef.current);
  });

  return null;
}
