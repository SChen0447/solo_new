export class ColorLegend {
  private container: HTMLElement;
  private element: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.element = this.createLegend();
    this.container.appendChild(this.element);
  }

  private createLegend(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.id = 'color-legend';

    const bar = document.createElement('div');
    bar.className = 'legend-bar';

    const labels = document.createElement('div');
    labels.className = 'legend-labels';
    labels.innerHTML = `
      <span>30 dB</span>
      <span>80 dB</span>
    `;

    wrapper.appendChild(bar);
    wrapper.appendChild(labels);
    return wrapper;
  }

  public show(): void {
    this.element.style.display = 'block';
  }

  public hide(): void {
    this.element.style.display = 'none';
  }
}
