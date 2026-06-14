import * as THREE from 'three';
import { Galaxy } from './galaxy';
import { Controls } from './controls';
import { useStore, type GalaxyParams } from './store';

function createSlider(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  onChange: (v: number) => void
): HTMLDivElement {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;';

  const lbl = document.createElement('label');
  lbl.textContent = label;
  lbl.style.cssText = 'font-size:14px;color:rgba(255,255,255,0.7);min-width:70px;flex-shrink:0;';

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.style.cssText = `
    flex:1;-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;outline:none;
    background:linear-gradient(to right,rgba(100,200,255,0.6),rgba(200,100,255,0.6));cursor:pointer;
  `;

  const thumbStyle = `
    -webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;
    background:#fff;cursor:pointer;box-shadow:0 0 6px rgba(100,200,255,0.5);
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .galaxy-slider::-webkit-slider-thumb{${thumbStyle}}
    .galaxy-slider::-moz-range-thumb{${thumbStyle.replace(/-webkit-appearance[^;]+;/,'appearance:none;')}}
  `;
  document.head.appendChild(styleEl);
  input.classList.add('galaxy-slider');

  const val = document.createElement('span');
  val.textContent = String(value);
  val.style.cssText = 'font-size:14px;color:#fff;font-family:monospace;min-width:45px;text-align:right;';

  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    val.textContent = step >= 1 ? String(Math.round(v)) : v.toFixed(3);
    onChange(v);
  });

  row.appendChild(lbl);
  row.appendChild(input);
  row.appendChild(val);
  return row;
}

function createPanel(): { container: HTMLDivElement; updateValues: (p: GalaxyParams) => void } {
  const container = document.createElement('div');
  container.style.cssText = `
    position:fixed;top:20px;right:20px;width:280px;
    background:rgba(20,20,30,0.85);border-radius:12px;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);padding:20px;
    z-index:100;transition:opacity 0.3s ease-out,transform 0.3s ease-out;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  `;

  const title = document.createElement('div');
  title.textContent = '星系参数';
  title.style.cssText = `
    font-size:16px;color:#fff;font-weight:600;
    padding-bottom:12px;margin-bottom:16px;
    border-bottom:1px solid rgba(255,255,255,0.1);
  `;
  container.appendChild(title);

  const state = useStore.getState();
  const sliders: HTMLInputElement[] = [];

  const addSlider = (
    label: string,
    min: number,
    max: number,
    step: number,
    key: keyof GalaxyParams,
    format?: (v: number) => string
  ) => {
    const row = createSlider(label, min, max, step, state.params[key], (v) => {
      useStore.getState().setParams({ [key]: v });
    });
    container.appendChild(row);
    sliders.push(row.querySelector('input')!);
  };

  addSlider('粒子总数', 10000, 80000, 1000, 'count', (v) => String(Math.round(v)));
  addSlider('粒子大小', 0.01, 0.5, 0.01, 'size');
  addSlider('旋转速度', 0, 0.02, 0.001, 'rotationSpeed');
  addSlider('扩散半径', 50, 300, 1, 'radius');
  addSlider('中心色相', 0, 60, 1, 'centerHue');
  addSlider('边缘色相', 180, 260, 1, 'edgeHue');

  document.body.appendChild(container);
  return {
    container,
    updateValues: (p) => {
      const inputs = container.querySelectorAll('input[type=range]');
      const vals = [p.count, p.size, p.rotationSpeed, p.radius, p.centerHue, p.edgeHue];
      inputs.forEach((inp, i) => {
        (inp as HTMLInputElement).value = String(vals[i]);
        const span = inp.parentElement!.querySelector('span')!;
        const step = parseFloat((inp as HTMLInputElement).step);
        span.textContent = step >= 1 ? String(Math.round(vals[i])) : vals[i].toFixed(3);
      });
    },
  };
}

function createHint(): HTMLDivElement {
  const hint = document.createElement('div');
  hint.style.cssText = `
    position:fixed;top:20px;left:20px;
    background:rgba(0,0,0,0.3);border-radius:8px;padding:10px;
    z-index:100;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-size:12px;color:#fff;line-height:1.5;
  `;
  hint.textContent = '拖拽旋转 · 滚轮缩放 · WASD移动 · H隐藏面板';
  document.body.appendChild(hint);
  return hint;
}

function createFPSCounter(): HTMLDivElement {
  const fps = document.createElement('div');
  fps.style.cssText = `
    position:fixed;bottom:20px;left:20px;
    background:rgba(0,0,0,0.3);border-radius:8px;padding:6px 10px;
    z-index:100;font-family:monospace;font-size:12px;color:rgba(255,255,255,0.6);
  `;
  document.body.appendChild(fps);
  return fps;
}

async function main(): Promise<void> {
  const app = document.getElementById('app')!;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020208);
  scene.fog = new THREE.FogExp2(0x020208, 0.0008);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  const state = useStore.getState();
  camera.position.set(state.camera.x, state.camera.y, state.camera.z);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  app.appendChild(renderer.domElement);

  const galaxy = new Galaxy(scene);
  galaxy.createGalaxy(useStore.getState().params);

  const controls = new Controls(camera, renderer.domElement);

  const panel = createPanel();
  const hint = createHint();
  const fpsEl = createFPSCounter();

  let prevParams = { ...useStore.getState().params };
  useStore.subscribe((s) => {
    const p = s.params;
    if (
      p.count !== prevParams.count ||
      p.size !== prevParams.size ||
      p.rotationSpeed !== prevParams.rotationSpeed ||
      p.radius !== prevParams.radius ||
      p.centerHue !== prevParams.centerHue ||
      p.edgeHue !== prevParams.edgeHue
    ) {
      galaxy.updateParams(p);
      panel.updateValues(p);
      prevParams = { ...p };
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  let frameCount = 0;
  let fpsTime = 0;

  function animate(): void {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    controls.updateCamera();

    const s = useStore.getState();
    galaxy.rotate(delta, s.params.rotationSpeed, s.paused);

    const mouseWorld = controls.getMouseWorldPosition();
    galaxy.updateFocus(mouseWorld, delta);

    if (s.panelOpen) {
      panel.container.style.opacity = '1';
      panel.container.style.transform = 'translateX(0)';
      panel.container.style.pointerEvents = 'auto';
    } else {
      panel.container.style.opacity = '0';
      panel.container.style.transform = 'translateX(20px)';
      panel.container.style.pointerEvents = 'none';
    }

    renderer.render(scene, camera);

    frameCount++;
    fpsTime += delta;
    if (fpsTime >= 1.0) {
      fpsEl.textContent = `FPS: ${Math.round(frameCount / fpsTime)}`;
      frameCount = 0;
      fpsTime = 0;
    }
  }

  animate();
}

main().catch(console.error);
