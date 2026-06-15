import { getElementPath } from './dom';

export class ReflowDetector {
  private observer: MutationObserver | null = null;
  private reflowElements: Set<string> = new Set();
  private reflowStartTimes: Map<string, number> = new Map();
  private onReflowCallback: ((elementPath: string, duration: number) => void) | null = null;

  constructor(onReflow: (elementPath: string, duration: number) => void) {
    this.onReflowCallback = onReflow;
  }

  start(): void {
    this.observer = new MutationObserver((mutations) => {
      const startTime = performance.now();

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (target.nodeType === Node.ELEMENT_NODE) {
            const path = getElementPath(target);
            if (!this.reflowStartTimes.has(path)) {
              this.reflowStartTimes.set(path, startTime);
            }

            try {
              const rect = target.getBoundingClientRect();
              if (rect.width > 0 || rect.height > 0) {
                this.reflowElements.add(path);
                const duration = performance.now() - (this.reflowStartTimes.get(path) || startTime);
                if (this.onReflowCallback) {
                  this.onReflowCallback(path, duration);
                }
                this.reflowStartTimes.delete(path);
              }
            } catch (e) {
              // Ignore elements that can't be measured
            }
          }
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeOldValue: true,
      characterDataOldValue: true,
    });
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.reflowElements.clear();
    this.reflowStartTimes.clear();
  }

  getReflowElements(): string[] {
    return Array.from(this.reflowElements);
  }

  clear(): void {
    this.reflowElements.clear();
  }
}
