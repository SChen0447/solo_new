export function getElementPath(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let part = current.tagName.toLowerCase();

    if (current.id) {
      part += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2);
      if (classes.length > 0) {
        part += `.${classes.join('.')}`;
      }
    }

    parts.unshift(part);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

export function getAnimatedElements(): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const allElements = document.querySelectorAll<HTMLElement>('*');

  allElements.forEach((el) => {
    const style = getComputedStyle(el);
    const animationName = style.animationName;
    const transitionProperty = style.transitionProperty;
    const transform = style.transform;

    if (
      animationName !== 'none' ||
      transitionProperty !== 'all' ||
      (transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)')
    ) {
      elements.push(el);
    }
  });

  return elements;
}

export function captureStyleSnapshot(element: HTMLElement): Record<string, string> {
  const computed = getComputedStyle(element);
  const properties = [
    'transform',
    'opacity',
    'width',
    'height',
    'top',
    'left',
    'right',
    'bottom',
    'margin',
    'padding',
    'border',
    'display',
    'position',
    'animation',
    'animationDuration',
    'animationDelay',
    'transition',
    'transitionDuration',
    'transitionDelay',
  ];

  const snapshot: Record<string, string> = {};
  properties.forEach((prop) => {
    const value = computed.getPropertyValue(prop);
    if (value) {
      snapshot[prop] = value;
    }
  });

  return snapshot;
}
