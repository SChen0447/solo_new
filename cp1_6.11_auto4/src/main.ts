import * as THREE from 'three';
import { Molecule } from './models/Molecule';
import { SceneSetup } from './renderer/SceneSetup';
import { MoleculeRenderer } from './renderer/MoleculeRenderer';
import { RaycasterUtil } from './utils/raycaster';
import { InfoPanel } from './ui/InfoPanel';

const container = document.getElementById('scene-container')!;
const sceneSetup = new SceneSetup(container);
const moleculeRenderer = new MoleculeRenderer();
const raycasterUtil = new RaycasterUtil(sceneSetup, container);
const infoPanel = new InfoPanel();

sceneSetup.addObject(moleculeRenderer.group);

let currentMoleculeKey = 'h2o';
let isTransitioning = false;
let hoveredMesh: THREE.Mesh | null = null;

function loadMolecule(key: string): void {
  const molecule = Molecule.builtin(key);
  moleculeRenderer.build(molecule);
  moleculeRenderer.setOpacity(1);
  infoPanel.setMoleculeName(molecule.data.name, molecule.data.formula);
  infoPanel.clearAtomInfo();
  currentMoleculeKey = key;
}

function switchMolecule(key: string): void {
  if (key === currentMoleculeKey || isTransitioning) return;
  isTransitioning = true;
  moleculeRenderer.unhighlightAtom();
  hoveredMesh = null;
  infoPanel.clearAtomInfo();

  const fadeOutDuration = 500;
  const fadeInDuration = 500;
  const startTime = performance.now();

  function fadeOut(now: number): boolean {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / fadeOutDuration, 1);
    moleculeRenderer.setOpacity(1 - t);
    return t >= 1;
  }

  function fadeIn(now: number, refTime: number): boolean {
    const elapsed = now - refTime;
    const t = Math.min(elapsed / fadeInDuration, 1);
    moleculeRenderer.setOpacity(t);
    return t >= 1;
  }

  let phase: 'out' | 'in' = 'out';
  let fadeInStart = 0;

  function tick(): void {
    const now = performance.now();
    if (phase === 'out') {
      if (fadeOut(now)) {
        loadMolecule(key);
        moleculeRenderer.setOpacity(0);
        phase = 'in';
        fadeInStart = now;
        updateButtons();
      }
    } else if (phase === 'in') {
      if (fadeIn(now, fadeInStart)) {
        moleculeRenderer.setOpacity(1);
        isTransitioning = false;
        return;
      }
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
  updateButtons();
}

function updateButtons(): void {
  const buttons = document.querySelectorAll('.mol-btn');
  buttons.forEach((btn) => {
    const el = btn as HTMLElement;
    if (el.dataset.molecule === currentMoleculeKey) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

const buttons = document.querySelectorAll('.mol-btn');
buttons.forEach((btn) => {
  const el = btn as HTMLElement;
  el.addEventListener('click', () => {
    const key = el.dataset.molecule;
    if (key) switchMolecule(key);
  });
});

container.addEventListener('mousemove', (event: MouseEvent) => {
  if (isTransitioning) return;
  const meshes = moleculeRenderer.getAtomMeshes();
  if (meshes.length === 0) return;

  const hit = raycasterUtil.intersectAtoms(event, meshes);
  if (hit && hit.object instanceof THREE.Mesh) {
    const mesh = hit.object as THREE.Mesh;
    if (hoveredMesh !== mesh) {
      if (hoveredMesh) moleculeRenderer.unhighlightAtom();
      hoveredMesh = mesh;
      moleculeRenderer.highlightAtom(mesh);
      const atomData = moleculeRenderer.getAtomData(mesh);
      if (atomData) infoPanel.showAtomInfo(atomData);
    }
  } else {
    if (hoveredMesh) {
      moleculeRenderer.unhighlightAtom();
      hoveredMesh = null;
      infoPanel.clearAtomInfo();
    }
  }
});

container.addEventListener('mouseleave', () => {
  if (hoveredMesh) {
    moleculeRenderer.unhighlightAtom();
    hoveredMesh = null;
    infoPanel.clearAtomInfo();
  }
});

loadMolecule('h2o');

function animate(): void {
  requestAnimationFrame(animate);
  sceneSetup.update();

  if (!isTransitioning && moleculeRenderer.group.visible) {
    moleculeRenderer.group.rotation.y += 0.003;
  }

  sceneSetup.renderer.render(sceneSetup.scene, sceneSetup.camera);
}

animate();
