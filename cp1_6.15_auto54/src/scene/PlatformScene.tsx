import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore, SnapshotData, Position3D } from '../store/gameStore';
import {
  TimeEngine,
  GRAVITY,
  REWIND_DURATION_MS,
  REWIND_SPEED,
} from '../engine/TimeEngine';

interface PlatformSceneProps {
  isRewinding: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const PLATFORM_COUNT = 2;
const PLATFORM_PERIOD = 4000;
const PLATFORM_AMPLITUDE = 3;

const GROUND_Y = 0;
const BOTTOM_BOUNDARY = -8;
const JUMP_VELOCITY = 7;
const PLAYER_SIZE = 0.5;
const PLATFORM_HEIGHT = 0.2;
const PLATFORM_WIDTH = 1;
const PLATFORM_DEPTH = 0.2;

export default function PlatformScene({ isRewinding, containerRef }: PlatformSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerMeshRef = useRef<THREE.Mesh | null>(null);
  const platformMeshesRef = useRef<THREE.Mesh[]>([]);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const rafRef = useRef<number | null>(null);

  const timeEngineRef = useRef<TimeEngine>(new TimeEngine());

  const playerStateRef = useRef({
    x: 0,
    y: 1,
    z: 0,
    velocityY: 0,
    onGround: true,
    onPlatform: null as number | null,
  });

  const platformStateRef = useRef<Position3D[]>([
    { x: -3, y: 2.5, z: 0 },
    { x: 3, y: 4, z: 0 },
  ]);

  const startTimeRef = useRef<number>(performance.now());
  const lastFrameTimeRef = useRef<number>(performance.now());
  const fpsFramesRef = useRef<number>(0);
  const fpsLastCheckRef = useRef<number>(performance.now());

  const keyStateRef = useRef<{ jump: boolean; jumpQueued: boolean }>({
    jump: false,
    jumpQueued: false,
  });

  const store = useGameStore;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!keyStateRef.current.jump) {
          keyStateRef.current.jump = true;
          keyStateRef.current.jumpQueued = true;
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        keyStateRef.current.jump = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const mount = containerRef.current;
    mountRef.current = mount;

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const aspect = width / height;
    const viewSize = 12;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,
      (viewSize * aspect) / 2,
      viewSize / 2,
      -viewSize / 2,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 3, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(5, 10, 8);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    const groundGeo = new THREE.BoxGeometry(20, 0.3, 3);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    scene.add(ground);
    groundMeshRef.current = ground;

    const playerGeo = new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
    const playerMat = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      roughness: 0.5,
      metalness: 0.1,
    });
    const player = new THREE.Mesh(playerGeo, playerMat);
    player.position.set(0, 1, 0);
    player.castShadow = true;
    scene.add(player);
    playerMeshRef.current = player;

    const platformGeo = new THREE.BoxGeometry(
      PLATFORM_WIDTH,
      PLATFORM_HEIGHT,
      PLATFORM_DEPTH
    );
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x3498db,
      roughness: 0.4,
      metalness: 0.3,
    });
    platformMeshesRef.current = [];
    for (let i = 0; i < PLATFORM_COUNT; i++) {
      const plat = new THREE.Mesh(platformGeo, platformMat.clone());
      plat.position.copy(new THREE.Vector3(
        platformStateRef.current[i].x,
        platformStateRef.current[i].y,
        platformStateRef.current[i].z
      ));
      plat.castShadow = true;
      plat.receiveShadow = true;
      scene.add(plat);
      platformMeshesRef.current.push(plat);
    }

    const gridHelper = new THREE.GridHelper(20, 20, 0x3a3a5e, 0x2d2d44);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    const handleResize = () => {
      if (!mount || !rendererRef.current || !cameraRef.current) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      const a = w / h;
      cameraRef.current.left = (-viewSize * a) / 2;
      cameraRef.current.right = (viewSize * a) / 2;
      cameraRef.current.top = viewSize / 2;
      cameraRef.current.bottom = -viewSize / 2;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    startTimeRef.current = performance.now();
    lastFrameTimeRef.current = performance.now();

    const initialPlatforms = platformStateRef.current.map((p) => ({ ...p }));
    store.getState().addSnapshot({
      timestamp: 0,
      player: {
        x: playerStateRef.current.x,
        y: playerStateRef.current.y,
        z: playerStateRef.current.z,
      },
      platforms: initialPlatforms,
      playerVelocityY: playerStateRef.current.velocityY,
      playerOnPlatform: playerStateRef.current.onPlatform,
    });
    timeEngineRef.current.markSnapshotTaken(0);

    const animate = () => {
      const now = performance.now();
      const deltaMs = Math.min(now - lastFrameTimeRef.current, 50);
      lastFrameTimeRef.current = now;
      const deltaSec = deltaMs / 1000;

      fpsFramesRef.current++;
      if (now - fpsLastCheckRef.current >= 500) {
        const fps = (fpsFramesRef.current * 1000) / (now - fpsLastCheckRef.current);
        store.getState().setFps(Math.round(fps));
        fpsFramesRef.current = 0;
        fpsLastCheckRef.current = now;
      }

      const timeState = store.getState().timeState;

      if (timeState === 'normal') {
        updateNormalMode(deltaSec, now - startTimeRef.current);
      } else {
        updateRewindMode(deltaMs);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(
            rendererRef.current.domElement
          );
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  useEffect(() => {
    if (isRewinding) {
      timeEngineRef.current.startRewind(performance.now());
    }
  }, [isRewinding]);

  const updateNormalMode = (deltaSec: number, gameTimeMs: number) => {
    const player = playerStateRef.current;
    const platforms = platformStateRef.current;

    for (let i = 0; i < PLATFORM_COUNT; i++) {
      const phase = (gameTimeMs % PLATFORM_PERIOD) / PLATFORM_PERIOD;
      const baseX = i === 0 ? -3 : 3;
      platforms[i].x = baseX + Math.sin(phase * Math.PI * 2) * PLATFORM_AMPLITUDE;
      if (platformMeshesRef.current[i]) {
        platformMeshesRef.current[i].position.x = platforms[i].x;
        platformMeshesRef.current[i].position.y = platforms[i].y;
        platformMeshesRef.current[i].position.z = platforms[i].z;
      }
    }

    if (player.onPlatform !== null) {
      const platIdx = player.onPlatform;
      player.x = platforms[platIdx].x;
      player.y = platforms[platIdx].y + PLATFORM_HEIGHT / 2 + PLAYER_SIZE / 2;
    }

    if (keyStateRef.current.jumpQueued && (player.onGround || player.onPlatform !== null)) {
      player.velocityY = JUMP_VELOCITY;
      player.onGround = false;
      player.onPlatform = null;
      keyStateRef.current.jumpQueued = false;
    } else if (!keyStateRef.current.jump) {
      keyStateRef.current.jumpQueued = false;
    }

    if (!player.onGround && player.onPlatform === null) {
      player.velocityY -= GRAVITY * deltaSec;
      player.y += player.velocityY * deltaSec;
    }

    if (!player.onGround && player.onPlatform === null) {
      if (player.velocityY <= 0) {
        for (let i = 0; i < PLATFORM_COUNT; i++) {
          const plat = platforms[i];
          const playerBottom = player.y - PLAYER_SIZE / 2;
          const platTop = plat.y + PLATFORM_HEIGHT / 2;
          const horizDist = Math.abs(player.x - plat.x);
          if (
            horizDist < PLATFORM_WIDTH / 2 + PLAYER_SIZE / 2 - 0.05 &&
            playerBottom <= platTop + 0.05 &&
            playerBottom >= platTop - 0.3
          ) {
            player.y = platTop + PLAYER_SIZE / 2;
            player.velocityY = 0;
            player.onPlatform = i;
            break;
          }
        }
      }
    }

    if (player.y - PLAYER_SIZE / 2 <= GROUND_Y) {
      player.y = GROUND_Y + PLAYER_SIZE / 2;
      player.velocityY = 0;
      player.onGround = true;
      player.onPlatform = null;
    } else if (!player.onGround && player.onPlatform === null) {
      // no-op
    }

    if (player.onPlatform !== null && player.velocityY < 0) {
      player.onPlatform = null;
    }

    if (player.y < BOTTOM_BOUNDARY) {
      const snapshots = store.getState().snapshots;
      if (snapshots.length > 0) {
        const restore = snapshots[Math.floor(snapshots.length / 2)] || snapshots[0];
        player.x = restore.player.x;
        player.y = restore.player.y;
        player.z = restore.player.z;
        player.velocityY = restore.playerVelocityY;
        player.onPlatform = restore.playerOnPlatform;
        if (restore.player.y <= GROUND_Y + PLAYER_SIZE / 2 + 0.1) {
          player.onGround = true;
        }
      } else {
        player.x = 0;
        player.y = 1;
        player.velocityY = 0;
        player.onGround = true;
        player.onPlatform = null;
      }
    }

    if (playerMeshRef.current) {
      playerMeshRef.current.position.set(player.x, player.y, player.z);
    }

    store.getState().setElapsedGameTime(gameTimeMs);

    if (timeEngineRef.current.shouldTakeSnapshot(gameTimeMs)) {
      const snapshot: SnapshotData = {
        timestamp: gameTimeMs,
        player: { x: player.x, y: player.y, z: player.z },
        platforms: platforms.map((p) => ({ ...p })),
        playerVelocityY: player.velocityY,
        playerOnPlatform: player.onPlatform,
      };
      store.getState().addSnapshot(snapshot);
      timeEngineRef.current.markSnapshotTaken(gameTimeMs);
    }
  };

  const updateRewindMode = (deltaMs: number) => {
    const state = store.getState();
    const result = timeEngineRef.current.updateRewind(
      deltaMs,
      state.snapshots
    );

    if (result.interpolatedData) {
      const data = result.interpolatedData;
      playerStateRef.current.x = data.player.x;
      playerStateRef.current.y = data.player.y;
      playerStateRef.current.z = data.player.z;
      playerStateRef.current.velocityY = data.playerVelocityY;
      playerStateRef.current.onPlatform = data.playerOnPlatform;
      if (data.player.y <= GROUND_Y + PLAYER_SIZE / 2 + 0.1 && data.playerOnPlatform === null) {
        playerStateRef.current.onGround = true;
      } else {
        playerStateRef.current.onGround = false;
      }

      if (playerMeshRef.current) {
        playerMeshRef.current.position.set(data.player.x, data.player.y, data.player.z);
      }

      for (let i = 0; i < PLATFORM_COUNT; i++) {
        if (data.platforms[i] && platformMeshesRef.current[i]) {
          platformStateRef.current[i] = { ...data.platforms[i] };
          platformMeshesRef.current[i].position.set(
            data.platforms[i].x,
            data.platforms[i].y,
            data.platforms[i].z
          );
        }
      }

      store.getState().setInterpolatedData(data);
    } else {
      store.getState().incrementDroppedFrames();
    }

    store.getState().setRewindProgress(result.progress);

    if (result.finished) {
      const finalSnap = state.snapshots[0] || null;
      if (finalSnap) {
        playerStateRef.current.x = finalSnap.player.x;
        playerStateRef.current.y = finalSnap.player.y;
        playerStateRef.current.z = finalSnap.player.z;
        playerStateRef.current.velocityY = finalSnap.playerVelocityY;
        playerStateRef.current.onPlatform = finalSnap.playerOnPlatform;
        if (finalSnap.player.y <= GROUND_Y + PLAYER_SIZE / 2 + 0.1 && finalSnap.playerOnPlatform === null) {
          playerStateRef.current.onGround = true;
        } else {
          playerStateRef.current.onGround = false;
        }

        if (playerMeshRef.current) {
          playerMeshRef.current.position.set(
            finalSnap.player.x,
            finalSnap.player.y,
            finalSnap.player.z
          );
        }

        for (let i = 0; i < PLATFORM_COUNT; i++) {
          if (finalSnap.platforms[i] && platformMeshesRef.current[i]) {
            platformStateRef.current[i] = { ...finalSnap.platforms[i] };
            platformMeshesRef.current[i].position.set(
              finalSnap.platforms[i].x,
              finalSnap.platforms[i].y,
              finalSnap.platforms[i].z
            );
          }
        }
      }

      if (playerStateRef.current.onPlatform !== null) {
        const idx = playerStateRef.current.onPlatform;
        if (platformStateRef.current[idx]) {
          playerStateRef.current.y =
            platformStateRef.current[idx].y + PLATFORM_HEIGHT / 2 + PLAYER_SIZE / 2;
        }
      }

      startTimeRef.current = performance.now() - (finalSnap?.timestamp || 0);
      timeEngineRef.current.markSnapshotTaken(finalSnap?.timestamp || 0);

      store.getState().finishRewind();
      store.getState().triggerButtonFlash();
      setTimeout(() => store.getState().resetButtonFlash(), 300);
    }

    const totalFrames = Math.ceil(
      (REWIND_DURATION_MS / REWIND_SPEED) / (1000 / 60)
    );
    store.getState().setTotalRewindFrames(totalFrames);
  };

  return null;
}
