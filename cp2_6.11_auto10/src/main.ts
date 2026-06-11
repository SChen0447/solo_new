import { dataManager } from './dataModule/dataManager';
import { MainScene } from './visualizationModule/mainScene';
import { UIController } from './uiModule/uicontroller';

class App {
  private mainScene: MainScene | null = null;
  private uiController: UIController | null = null;

  async init(): Promise<void> {
    try {
      dataManager.init();

      this.mainScene = new MainScene('scene-container');
      this.mainScene.init();

      this.uiController = new UIController(
        this.mainScene.getTimeController(),
        this.mainScene.getBubbleRenderer()
      );
      this.uiController.init();

      this.mainScene.setOnBubbleClick((data) => {
        this.uiController?.showBubbleDetail(data);
      });

      this.mainScene.start();

      console.log('三维气象数据可视化仪表盘启动成功');
      console.log(`城市数量: ${dataManager.getCities().length}`);
      console.log(`月份数量: ${dataManager.getMonthCount()}`);
      console.log(`数据点总数: ${dataManager.getRawData().length}`);

    } catch (error) {
      console.error('应用初始化失败:', error);
      this.showError(error as Error);
    }
  }

  private showError(error: Error): void {
    const container = document.getElementById('scene-container');
    if (container) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #e94560; padding: 20px; text-align: center;">
          <h2 style="margin-bottom: 16px;">应用启动失败</h2>
          <p style="color: #a0a0c0;">${error.message}</p>
          <p style="margin-top: 16px; font-size: 14px; color: #6b6b8b;">请检查控制台获取详细错误信息</p>
        </div>
      `;
    }
  }

  dispose(): void {
    if (this.mainScene) {
      this.mainScene.dispose();
      this.mainScene = null;
    }
    this.uiController = null;
  }
}

const app = new App();

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});

window.addEventListener('beforeunload', () => {
  app.dispose();
});

if ((import.meta as any).hot) {
  (import.meta as any).hot.dispose(() => {
    app.dispose();
  });
}
