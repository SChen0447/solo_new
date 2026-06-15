import type { SvgLayerId, ColorMapping } from './types';
import { SVG_LAYERS } from './utils/colorUtils';
import { CHARACTER_SVG, LAYER_WARNING_POSITIONS } from './assets/lineartSvg';

export class SvgManager {
  private svgElement: SVGSVGElement | null = null;
  private layerElements: Map<SvgLayerId, SVGElement> = new Map();
  private container: HTMLElement | null = null;
  private onLayerClickCallback: ((layerId: SvgLayerId) => void) | null = null;
  private warningElements: Map<SvgLayerId, SVGGElement> = new Map();

  constructor() {}

  public mount(container: HTMLElement): void {
    this.container = container;
    this.parseAndRender();
  }

  private parseAndRender(): void {
    if (!this.container) return;

    this.container.innerHTML = CHARACTER_SVG;
    this.svgElement = this.container.querySelector('svg');

    if (!this.svgElement) return;

    SVG_LAYERS.forEach((layer) => {
      const element = this.svgElement!.getElementById(
        `layer-${layer.id}`
      ) as SVGElement | null;
      if (element) {
        this.layerElements.set(layer.id, element);
        element.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleLayerClick(layer.id);
        });
      }
    });

    if (this.svgElement) {
      this.svgElement.addEventListener('click', () => {
        this.handleLayerClick('background');
      });
    }
  }

  public setOnLayerClick(callback: (layerId: SvgLayerId) => void): void {
    this.onLayerClickCallback = callback;
  }

  private handleLayerClick(layerId: SvgLayerId): void {
    if (this.onLayerClickCallback) {
      this.onLayerClickCallback(layerId);
    }
  }

  public applyColorMapping(colorMapping: ColorMapping): void {
    SVG_LAYERS.forEach((layer) => {
      const color = colorMapping[layer.id];
      if (color) {
        this.updateLayerColor(layer.id, color, layer.fillType);
      }
    });
  }

  private updateLayerColor(
    layerId: SvgLayerId,
    color: string,
    fillType: 'fill' | 'stroke'
  ): void {
    const element = this.layerElements.get(layerId);
    if (!element) return;

    const paths = element.querySelectorAll<SVGElement>('path, rect, ellipse, circle, line, polygon');
    paths.forEach((el) => {
      const currentStroke = el.getAttribute('stroke');
      const isOutline =
        currentStroke &&
        (currentStroke === '#212121' || currentStroke === '#2b2b2b');

      if (isOutline) {
        if (fillType === 'fill') {
          const fillAttr = el.getAttribute('fill');
          if (fillAttr !== 'none') {
            el.setAttribute('fill', color);
          }
        } else {
          el.setAttribute('stroke', color);
        }
      } else {
        el.setAttribute(fillType, color);
      }
    });
  }

  public setSelectedLayer(layerId: SvgLayerId | null): void {
    this.layerElements.forEach((element, id) => {
      if (id === layerId) {
        element.classList.add('selected');
      } else {
        element.classList.remove('selected');
      }
    });
  }

  public updateContrastWarnings(
    warnings: Map<SvgLayerId, SvgLayerId[]>
  ): void {
    this.warningElements.forEach((el) => el.remove());
    this.warningElements.clear();

    if (!this.svgElement) return;

    warnings.forEach((_, layerId) => {
      const position = LAYER_WARNING_POSITIONS[layerId];
      if (!position) return;

      const warningG = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'g'
      );
      warningG.setAttribute('class', 'contrast-warning-icon');
      warningG.setAttribute('data-warning-layer', layerId);
      warningG.setAttribute('transform', `translate(${position.x}, ${position.y})`);

      const triangle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'polygon'
      );
      triangle.setAttribute('points', '0,16 16,16 8,0');
      triangle.setAttribute('fill', '#FFC107');
      triangle.setAttribute('stroke', '#FFA000');
      triangle.setAttribute('stroke-width', '1');

      const exclamation = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );
      exclamation.setAttribute('x', '8');
      exclamation.setAttribute('y', '13');
      exclamation.setAttribute('text-anchor', 'middle');
      exclamation.setAttribute('font-size', '11');
      exclamation.setAttribute('font-weight', 'bold');
      exclamation.setAttribute('fill', '#333');
      exclamation.textContent = '!';

      warningG.appendChild(triangle);
      warningG.appendChild(exclamation);

      warningG.addEventListener('click', (e) => {
        e.stopPropagation();
        const tooltip = document.createElement('div');
        tooltip.className = 'contrast-tooltip';
        tooltip.textContent = '对比度不足，建议调整';
        const rect = this.container!.getBoundingClientRect();
        const svgRect = this.svgElement!.getBoundingClientRect();
        tooltip.style.left = `${position.x + svgRect.left - rect.left + 20}px`;
        tooltip.style.top = `${position.y + svgRect.top - rect.top}px`;
        this.container!.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2000);
      });

      this.svgElement!.appendChild(warningG);
      this.warningElements.set(layerId, warningG);
    });
  }

  public getLayerName(layerId: SvgLayerId): string {
    const layer = SVG_LAYERS.find((l) => l.id === layerId);
    return layer?.name || layerId;
  }

  public unmount(): void {
    this.layerElements.clear();
    this.warningElements.clear();
    this.svgElement = null;
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }
}
