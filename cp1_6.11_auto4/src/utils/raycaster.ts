import * as THREE from 'three';
import { SceneSetup } from '../renderer/SceneSetup';

export class RaycasterUtil {
  private raycaster: THREE.Raycaster;
  private container: HTMLElement;
  private sceneSetup: SceneSetup;

  constructor(sceneSetup: SceneSetup, container: HTMLElement) {
    this.raycaster = new THREE.Raycaster();
    this.container = container;
    this.sceneSetup = sceneSetup;
  }

  intersectAtoms(event: MouseEvent, targets: THREE.Object3D[]): THREE.Intersection | null {
    const ndc = this.sceneSetup.getMouseNDC(event, this.container);
    this.raycaster.setFromCamera(ndc, this.sceneSetup.camera);
    const hits = this.raycaster.intersectObjects(targets, false);
    return hits.length > 0 ? hits[0] : null;
  }
}
