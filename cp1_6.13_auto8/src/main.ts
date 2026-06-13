import { createCircuitState, propagateSignals, updateAnimations } from './core/logicGate';
import { CanvasRenderer } from './core/canvasRenderer';
import { DragDropController } from './ui/dragDrop';

function main(): void {
  const canvas = document.getElementById('circuitCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const state = createCircuitState();
  const renderer = new CanvasRenderer(canvas, state);
  const controller = new DragDropController(canvas, state, renderer);
  controller.bindSidebarDrag();

  let lastTime = performance.now();
  let frameCount = 0;
  let fpsUpdateTime = 0;
  let currentFps = 60;

  const statusBar = document.getElementById('statusBar');

  function gameLoop(currentTime: number): void {
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    frameCount++;
    fpsUpdateTime += deltaTime;
    if (fpsUpdateTime >= 0.5) {
      currentFps = Math.round(frameCount / fpsUpdateTime);
      frameCount = 0;
      fpsUpdateTime = 0;
      if (statusBar) {
        statusBar.textContent = `元件: ${state.gates.size} | 连线: ${state.wires.size} | FPS: ${currentFps}`;
      }
    }

    if (state.dirty) {
      propagateSignals(state);
    }

    updateAnimations(state, deltaTime);
    renderer.render(deltaTime);

    requestAnimationFrame(gameLoop);
  }

  function handleResize(): void {
    renderer.resize();
  }

  window.addEventListener('resize', handleResize);

  requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', main);
