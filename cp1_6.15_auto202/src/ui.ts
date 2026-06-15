import * as THREE from 'three';
import { CrystalTower } from './crystalTower';
import { getSnapshot, pauseUpdates, resumeUpdates, getBufferSize } from './dataManager';

interface UIContext {
  camera: THREE.PerspectiveCamera;
  towers: CrystalTower[];
  container: HTMLElement;
}

interface CameraAnimation {
  active: boolean;
  startTime: number;
  duration: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startLook: THREE.Vector3;
  endLook: THREE.Vector3;
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredTower: CrystalTower | null = null;
let selectedTower: CrystalTower | null = null;
let cameraAnimation: CameraAnimation | null = null;

const fpsDisplay = document.getElementById('fps-display') as HTMLElement;
const hoverLabel = document.getElementById('hover-label') as HTMLElement;
const hoverLabelName = hoverLabel.querySelector('.metric-name') as HTMLElement;
const hoverLabelValue = hoverLabel.querySelector('.metric-value') as HTMLElement;
const waveformContainer = document.getElementById('waveform-container') as HTMLElement;
const waveformCanvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
const timelineSlider = document.getElementById('timeline-slider') as HTMLInputElement;
const timelineScale = document.getElementById('timeline-scale') as HTMLElement;

const waveformCtx = waveformCanvas.getContext('2d') as CanvasRenderingContext2D;
const backBuffer = document.createElement('canvas');
backBuffer.width = 240;
backBuffer.height = 60;
const backCtx = backBuffer.getContext('2d') as CanvasRenderingContext2D;

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function createTimelineTicks(): void {
  for (let i = 0; i <= 6; i++) {
    const tick = document.createElement('div');
    tick.className = 'timeline-tick';
    tick.style.left = `${i * (100 / 6)}%`;
    tick.textContent = `${60 - i * 10}s`;
    timelineScale.appendChild(tick);
  }
}

function updateFPSDisplay(fps: number): void {
  fpsDisplay.textContent = Math.round(fps).toString();
}

function worldToScreen(position: THREE.Vector3, camera: THREE.PerspectiveCamera, container: HTMLElement): { x: number; y: number } {
  const vector = position.clone();
  vector.project(camera);
  
  const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
  const y = (-vector.y * 0.5 + 0.5) * container.clientHeight;
  
  return { x, y };
}

function updateHoverLabel(tower: CrystalTower, camera: THREE.PerspectiveCamera, container: HTMLElement): void {
  const config = tower.getConfig();
  const worldPos = new THREE.Vector3();
  tower.mesh.getWorldPosition(worldPos);
  worldPos.y += 5;
  
  const screen = worldToScreen(worldPos, camera, container);
  
  hoverLabel.style.left = `${screen.x}px`;
  hoverLabel.style.top = `${screen.y}px`;
  hoverLabel.style.opacity = '1';
  
  hoverLabelName.textContent = config.name;
  const value = tower.getCurrentValue();
  const decimals = config.unit === 'ms' ? 1 : 0;
  hoverLabelValue.textContent = `${value.toFixed(decimals)} ${config.unit}`;
}

function hideHoverLabel(): void {
  hoverLabel.style.opacity = '0';
}

function drawWaveform(tower: CrystalTower): void {
  const history = tower.getHistory();
  const config = tower.getConfig();
  const color = tower.getCurrentColor();
  const hexColor = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
  
  const width = backBuffer.width;
  const height = backBuffer.height;
  
  backCtx.fillStyle = '#11111b';
  backCtx.fillRect(0, 0, width, height);
  
  if (history.length < 2) return;
  
  const minVal = config.min;
  const maxVal = config.max;
  const range = maxVal - minVal;
  
  backCtx.beginPath();
  backCtx.strokeStyle = hexColor;
  backCtx.lineWidth = 2;
  backCtx.lineCap = 'round';
  backCtx.lineJoin = 'round';
  
  for (let i = 0; i < history.length; i++) {
    const x = (i / (history.length - 1)) * width;
    const normalized = (history[i] - minVal) / range;
    const y = height - normalized * (height - 8) - 4;
    
    if (i === 0) {
      backCtx.moveTo(x, y);
    } else {
      backCtx.lineTo(x, y);
    }
  }
  
  backCtx.stroke();
  
  backCtx.beginPath();
  backCtx.fillStyle = hexColor + '20';
  backCtx.moveTo(0, height);
  for (let i = 0; i < history.length; i++) {
    const x = (i / (history.length - 1)) * width;
    const normalized = (history[i] - minVal) / range;
    const y = height - normalized * (height - 8) - 4;
    backCtx.lineTo(x, y);
  }
  backCtx.lineTo(width, height);
  backCtx.closePath();
  backCtx.fill();
  
  waveformCtx.drawImage(backBuffer, 0, 0);
}

function showWaveform(tower: CrystalTower, camera: THREE.PerspectiveCamera, container: HTMLElement): void {
  selectedTower = tower;
  
  const worldPos = new THREE.Vector3();
  tower.mesh.getWorldPosition(worldPos);
  worldPos.y += 1;
  
  const screen = worldToScreen(worldPos, camera, container);
  
  waveformContainer.style.left = `${screen.x - 120}px`;
  waveformContainer.style.top = `${screen.y - 30}px`;
  waveformContainer.classList.add('visible');
  
  drawWaveform(tower);
}

function hideWaveform(): void {
  selectedTower = null;
  waveformContainer.classList.remove('visible');
}

function flyToTower(tower: CrystalTower, camera: THREE.PerspectiveCamera): void {
  const worldPos = new THREE.Vector3();
  tower.mesh.getWorldPosition(worldPos);
  
  const cameraOffset = new THREE.Vector3(0, 2, 4);
  const targetPos = worldPos.clone().add(cameraOffset);
  const lookTarget = worldPos.clone().add(new THREE.Vector3(0, 2, 0));
  
  cameraAnimation = {
    active: true,
    startTime: performance.now(),
    duration: 800,
    startPos: camera.position.clone(),
    endPos: targetPos,
    startLook: new THREE.Vector3(0, 2, 0),
    endLook: lookTarget
  };
}

function updateCameraAnimation(camera: THREE.PerspectiveCamera): boolean {
  if (!cameraAnimation || !cameraAnimation.active) return false;
  
  const elapsed = performance.now() - cameraAnimation.startTime;
  const t = Math.min(1, elapsed / cameraAnimation.duration);
  const easedT = easeOutQuad(t);
  
  camera.position.lerpVectors(
    cameraAnimation.startPos,
    cameraAnimation.endPos,
    easedT
  );
  
  const lookTarget = new THREE.Vector3().lerpVectors(
    cameraAnimation.startLook,
    cameraAnimation.endLook,
    easedT
  );
  
  camera.lookAt(lookTarget);
  
  if (t >= 1) {
    cameraAnimation.active = false;
  }
  
  return true;
}

function onMouseMove(event: MouseEvent, context: UIContext): void {
  const rect = context.container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, context.camera);
  
  const meshes = context.towers.map(t => t.mesh);
  const intersects = raycaster.intersectObjects(meshes, true);
  
  if (intersects.length > 0) {
    const hitObject = intersects[0].object;
    let tower: CrystalTower | null = null;
    
    for (const t of context.towers) {
      if (t.mesh === hitObject || t.mesh.children.includes(hitObject as THREE.Mesh)) {
        tower = t;
        break;
      }
      if (hitObject.parent) {
        let parent: THREE.Object3D | null = hitObject.parent;
        while (parent) {
          if (t.mesh === parent) {
            tower = t;
            break;
          }
          parent = parent.parent;
        }
        if (tower) break;
      }
    }
    
    if (tower && tower !== hoveredTower) {
      if (hoveredTower && hoveredTower !== selectedTower) {
        hoveredTower.mesh.scale.set(1, 1, 1);
      }
      hoveredTower = tower;
      if (tower !== selectedTower) {
        tower.mesh.scale.set(1.3, 1.3, 1.3);
      }
    }
    
    if (tower) {
      updateHoverLabel(tower, context.camera, context.container);
    }
  } else {
    if (hoveredTower && hoveredTower !== selectedTower) {
      hoveredTower.mesh.scale.set(1, 1, 1);
    }
    hoveredTower = null;
    hideHoverLabel();
  }
}

function onClick(event: MouseEvent, context: UIContext): void {
  const rect = context.container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, context.camera);
  
  const meshes = context.towers.map(t => t.mesh);
  const intersects = raycaster.intersectObjects(meshes, true);
  
  if (intersects.length > 0) {
    const hitObject = intersects[0].object;
    let tower: CrystalTower | null = null;
    
    for (const t of context.towers) {
      if (t.mesh === hitObject || t.mesh.children.includes(hitObject as THREE.Mesh)) {
        tower = t;
        break;
      }
      if (hitObject.parent) {
        let parent: THREE.Object3D | null = hitObject.parent;
        while (parent) {
          if (t.mesh === parent) {
            tower = t;
            break;
          }
          parent = parent.parent;
        }
        if (tower) break;
      }
    }
    
    if (tower) {
      if (selectedTower && selectedTower !== tower) {
        selectedTower.mesh.scale.set(1, 1, 1);
      }
      
      selectedTower = tower;
      tower.mesh.scale.set(1.3, 1.3, 1.3);
      flyToTower(tower, context.camera);
      
      setTimeout(() => {
        if (selectedTower === tower) {
          showWaveform(tower, context.camera, context.container);
        }
      }, 800);
    }
  } else {
    if (selectedTower) {
      selectedTower.mesh.scale.set(hoveredTower === selectedTower ? 1.3 : 1, hoveredTower === selectedTower ? 1.3 : 1, hoveredTower === selectedTower ? 1.3 : 1);
      selectedTower = null;
      hideWaveform();
    }
  }
}

function onTimelineInput(): void {
  const value = parseInt(timelineSlider.value, 10);
  const offset = Math.round((1 - value / 100) * (getBufferSize() - 1));
  
  if (value < 100) {
    pauseUpdates();
  } else {
    resumeUpdates();
  }
  
  const snapshot = getSnapshot(offset);
  if (snapshot) {
    const event = new CustomEvent('snapshotUpdate', { detail: { data: snapshot } });
    window.dispatchEvent(event);
  }
}

function onTimelineChange(): void {
  const value = parseInt(timelineSlider.value, 10);
  if (value >= 100) {
    resumeUpdates();
  }
}

function updateWaveformIfVisible(): void {
  if (selectedTower && waveformContainer.classList.contains('visible')) {
    drawWaveform(selectedTower);
  }
}

function resetCamera(context: UIContext): void {
  cameraAnimation = {
    active: true,
    startTime: performance.now(),
    duration: 800,
    startPos: context.camera.position.clone(),
    endPos: new THREE.Vector3(0, 5, 10),
    startLook: new THREE.Vector3(0, 2, 0),
    endLook: new THREE.Vector3(0, 2, 0)
  };
  
  if (selectedTower) {
    selectedTower.mesh.scale.set(hoveredTower === selectedTower ? 1.3 : 1, hoveredTower === selectedTower ? 1.3 : 1, hoveredTower === selectedTower ? 1.3 : 1);
    selectedTower = null;
    hideWaveform();
  }
}

export function createUI(context: UIContext): {
  updateFPS: (fps: number) => void;
  update: () => void;
  resetCamera: () => void;
} {
  createTimelineTicks();
  
  context.container.addEventListener('mousemove', (e) => onMouseMove(e, context));
  context.container.addEventListener('click', (e) => onClick(e, context));
  timelineSlider.addEventListener('input', onTimelineInput);
  timelineSlider.addEventListener('change', onTimelineChange);
  
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      resetCamera(context);
    }
  });
  
  window.addEventListener('resize', () => {
    if (hoveredTower) {
      updateHoverLabel(hoveredTower, context.camera, context.container);
    }
    if (selectedTower) {
      showWaveform(selectedTower, context.camera, context.container);
    }
  });
  
  return {
    updateFPS: updateFPSDisplay,
    update: () => {
      updateCameraAnimation(context.camera);
      updateWaveformIfVisible();
    },
    resetCamera: () => resetCamera(context)
  };
}
