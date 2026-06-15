import { uiManager } from './ui';
import { sceneManager } from './scene';
import { recognitionService } from './recognition';
import { eventBus, Events } from './eventBus';

function bootstrap(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('Cannot find #app element');
    return;
  }

  void recognitionService;

  uiManager.init(app);

  eventBus.on(Events.SCENE_READY, () => {
    console.log('[App] 3D场景初始化完成');
  });

  const sceneContainer = uiManager.getSceneContainer();
  if (sceneContainer) {
    sceneManager.init(sceneContainer);
  } else {
    console.error('Cannot find scene container');
  }

  console.log('[App] 家具3D摆放预览系统已启动');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
