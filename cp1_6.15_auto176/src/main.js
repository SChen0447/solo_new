import './styles.css';
import { RoomScene } from './roomScene';
import { UIControls } from './uiControls';
class App {
    constructor() {
        Object.defineProperty(this, "roomScene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "uiControls", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.roomScene = new RoomScene('scene-container');
        this.uiControls = new UIControls('ui-panel', 'snapshots-bar');
    }
    dispose() {
        this.roomScene.dispose();
        this.uiControls.dispose();
    }
}
let app = null;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});
window.addEventListener('beforeunload', () => {
    if (app) {
        app.dispose();
    }
});
