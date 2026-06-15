import { SceneManager } from './scene';
import { LightController } from './lights';
import { AudienceManager } from './audience';
import { UIController } from './controls';

const container = document.getElementById('scene')!;
const panelContent = document.getElementById('panel-content')!;
const panelHeader = document.getElementById('panel-header')!;
const controlsContainer = document.getElementById('controls-container')!;
const fpsCounter = document.getElementById('fps-counter')!;

let panelCollapsed = false;
let isMobile = window.innerWidth <= 768;

panelHeader.addEventListener('click', () => {
  panelCollapsed = !panelCollapsed;
  panelHeader.classList.toggle('collapsed', panelCollapsed);
  (document.getElementById('panel-content')!).classList.toggle('collapsed', panelCollapsed);
  if (isMobile) {
    controlsContainer.classList.toggle('expanded', !panelCollapsed);
  }
});

window.addEventListener('resize', () => {
  isMobile = window.innerWidth <= 768;
});

const sceneManager = new SceneManager(container);
const lightController = new LightController(sceneManager.scene);
const audienceManager = new AudienceManager(sceneManager.scene);

sceneManager.setLightController(lightController);
sceneManager.setAudienceManager(audienceManager);

const uiController = new UIController(
  panelContent,
  lightController,
  audienceManager,
  sceneManager
);

let lastTime = performance.now();
let frameCount = 0;
let fpsTime = 0;

function animate(currentTime: number) {
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  frameCount++;
  fpsTime += deltaTime;
  if (fpsTime >= 0.5) {
    const fps = Math.round(frameCount / fpsTime);
    fpsCounter.textContent = `FPS: ${fps}`;
    frameCount = 0;
    fpsTime = 0;
  }

  sceneManager.update(deltaTime, currentTime / 1000);
  lightController.update(deltaTime, currentTime / 1000);
  audienceManager.update(deltaTime, currentTime / 1000, sceneManager.camera);

  sceneManager.render();
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
