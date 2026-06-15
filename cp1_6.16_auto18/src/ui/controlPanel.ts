import * as dat from 'dat.gui';
import { GraphModel } from '../models/graphModel';
import { SceneManager } from '../renderer/sceneManager';

export class ControlPanel {
  private model: GraphModel;
  private sceneManager: SceneManager;
  private nodeListEl: HTMLElement;
  private packetRateSlider: HTMLInputElement;
  private packetRateValue: HTMLElement;
  private gui!: dat.GUI;

  constructor(model: GraphModel, sceneManager: SceneManager) {
    this.model = model;
    this.sceneManager = sceneManager;
    this.nodeListEl = document.getElementById('node-list')!;
    this.packetRateSlider = document.getElementById('packet-rate') as HTMLInputElement;
    this.packetRateValue = document.getElementById('packet-rate-value')!;
    this.setupButtons();
    this.setupSlider();
    this.setupGui();
    this.model.addListener(() => this.refreshNodeList());
  }

  private setupButtons(): void {
    const addBtn = document.getElementById('btn-add-node')!;
    addBtn.addEventListener('click', (e) => {
      this.addRippleEffect(addBtn, e);
      this.addNode();
    });
    const deleteBtn = document.getElementById('btn-delete-node')!;
    deleteBtn.addEventListener('click', (e) => {
      this.addRippleEffect(deleteBtn, e);
      this.deleteSelectedNode();
    });
    const resetBtn = document.getElementById('btn-reset-view')!;
    resetBtn.addEventListener('click', (e) => {
      this.addRippleEffect(resetBtn, e);
      this.sceneManager.resetView();
    });
  }

  private addRippleEffect(btn: HTMLElement, e: Event): void {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    const rect = btn.getBoundingClientRect();
    const mouseEvent = e as MouseEvent;
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${mouseEvent.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${mouseEvent.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  private setupSlider(): void {
    this.packetRateSlider.addEventListener('input', () => {
      const val = parseInt(this.packetRateSlider.value, 10);
      this.model.setPacketRate(val);
      this.packetRateValue.textContent = `${val} 包/秒`;
    });
  }

  private setupGui(): void {
    this.gui = new dat.GUI({ autoPlace: false });
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '8px';
    this.gui.domElement.style.right = '8px';
    this.gui.domElement.style.zIndex = '100';
    const sceneContainer = document.getElementById('scene-container')!;
    sceneContainer.appendChild(this.gui.domElement);
    const params = {
      addNode: () => this.addNode(),
      packetRate: this.model.getPacketRate(),
      resetView: () => this.sceneManager.resetView(),
    };
    this.gui.add(params, 'addNode').name('添加节点');
    this.gui
      .add(params, 'packetRate', 1, 10, 1)
      .name('包速率')
      .onChange((v: number) => {
        this.model.setPacketRate(v);
        this.packetRateSlider.value = String(v);
        this.packetRateValue.textContent = `${v} 包/秒`;
      });
    this.gui.add(params, 'resetView').name('重置视图');
  }

  private addNode(): void {
    const node = this.model.addNode();
    if (node) {
      this.sceneManager.addNodeVisual(node);
    }
  }

  private deleteSelectedNode(): void {
    const selectedId = this.model.getSelectedNodeId();
    if (selectedId) {
      const conns = this.model.getConnectionsForNode(selectedId);
      conns.forEach((c) => {
        this.sceneManager.removeConnectionVisual(c.id);
      });
      this.model.removeNode(selectedId);
      this.sceneManager.removeNodeVisual(selectedId);
      this.model.setSelectedNodeId(null);
    }
  }

  refreshNodeList(): void {
    this.nodeListEl.innerHTML = '';
    const nodes = this.model.getAllNodes();
    const selectedId = this.model.getSelectedNodeId();
    nodes.forEach((node) => {
      const item = document.createElement('div');
      item.classList.add('node-item');
      if (node.id === selectedId) item.classList.add('selected');
      const colorDot = document.createElement('span');
      colorDot.classList.add('node-color');
      colorDot.style.backgroundColor = node.color;
      item.appendChild(colorDot);
      const nameSpan = document.createElement('span');
      nameSpan.classList.add('node-name');
      nameSpan.textContent = node.name;
      item.appendChild(nameSpan);
      const deleteBtn = document.createElement('button');
      deleteBtn.classList.add('delete-btn');
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        item.classList.add('fade-out');
        setTimeout(() => {
          const conns = this.model.getConnectionsForNode(node.id);
          conns.forEach((c) => {
            this.sceneManager.removeConnectionVisual(c.id);
          });
          this.model.removeNode(node.id);
          this.sceneManager.removeNodeVisual(node.id);
        }, 300);
      });
      item.appendChild(deleteBtn);
      item.addEventListener('click', () => {
        this.model.setSelectedNodeId(node.id);
      });
      this.nodeListEl.appendChild(item);
    });
  }
}
