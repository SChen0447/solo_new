import './styles.css';
import { RoomScene } from './roomScene';
import { UIControls } from './uiControls';

class App {
  private roomScene: RoomScene;
  private uiControls: UIControls;

  constructor() {
    this.roomScene = new RoomScene('scene-container');
    this.uiControls = new UIControls('ui-panel', 'snapshots-bar');
  }

  public dispose(): void {
    this.roomScene.dispose();
    this.uiControls.dispose();
  }
}

let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
