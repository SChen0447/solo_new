import { AtomInstance, getElementData } from '../models/Molecule';

export class InfoPanel {
  private atomInfoEl: HTMLElement;
  private moleculeNameEl: HTMLElement;

  constructor() {
    this.atomInfoEl = document.getElementById('atom-info')!;
    this.moleculeNameEl = document.getElementById('molecule-name')!;
  }

  showAtomInfo(atom: AtomInstance): void {
    const elem = getElementData(atom.symbol);
    this.atomInfoEl.innerHTML =
      `<span class="label">元素</span><span class="value">${elem.name}</span>` +
      `<span class="separator">|</span>` +
      `<span class="label">符号</span><span class="value">${elem.symbol}</span>` +
      `<span class="separator">|</span>` +
      `<span class="label">原子序数</span><span class="value">${elem.atomicNumber}</span>` +
      `<span class="separator">|</span>` +
      `<span class="label">原子质量</span><span class="value">${elem.mass.toFixed(3)} u</span>`;
  }

  clearAtomInfo(): void {
    this.atomInfoEl.innerHTML = '';
  }

  setMoleculeName(name: string, formula: string): void {
    this.moleculeNameEl.textContent = `${name} (${formula})`;
  }
}
