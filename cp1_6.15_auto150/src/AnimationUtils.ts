export interface TypewriterOptions {
  text: string;
  speed?: number;
  onChar: (char: string, fullText: string) => void;
  onComplete?: () => void;
}

export interface TypewriterController {
  cancel: () => void;
  isRunning: () => boolean;
}

export function typewriterEffect(options: TypewriterOptions): TypewriterController {
  const { text, speed = 80, onChar, onComplete } = options;
  let currentIndex = 0;
  let lastTime = 0;
  let animationId: number | null = null;
  let running = false;
  let accumulatedTime = 0;

  function animate(timestamp: number) {
    if (!running) return;

    if (lastTime === 0) {
      lastTime = timestamp;
    }

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    accumulatedTime += deltaTime;

    while (accumulatedTime >= speed && currentIndex < text.length) {
      currentIndex++;
      accumulatedTime -= speed;
      onChar(text[currentIndex - 1], text.substring(0, currentIndex));
    }

    if (currentIndex < text.length) {
      animationId = requestAnimationFrame(animate);
    } else {
      running = false;
      onComplete?.();
    }
  }

  function start() {
    running = true;
    lastTime = 0;
    animationId = requestAnimationFrame(animate);
  }

  function cancel() {
    running = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  start();

  return {
    cancel,
    isRunning: () => running
  };
}

export interface FadeInOptions {
  element: HTMLElement;
  duration?: number;
  delay?: number;
  from?: number;
  to?: number;
  onComplete?: () => void;
}

export function fadeInAnimation(options: FadeInOptions): () => void {
  const {
    element,
    duration = 300,
    delay = 0,
    from = 0,
    to = 1,
    onComplete
  } = options;

  let animationId: number | null = null;
  let startTime: number | null = null;
  let cancelled = false;

  function start() {
    element.style.opacity = String(from);

    setTimeout(() => {
      if (cancelled) return;

      function animate(timestamp: number) {
        if (cancelled) return;

        if (startTime === null) {
          startTime = timestamp;
        }

        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentOpacity = from + (to - from) * easeProgress;

        element.style.opacity = String(currentOpacity);

        if (progress < 1) {
          animationId = requestAnimationFrame(animate);
        } else {
          element.style.opacity = String(to);
          onComplete?.();
        }
      }

      animationId = requestAnimationFrame(animate);
    }, delay);
  }

  start();

  return () => {
    cancelled = true;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
}

export interface ButtonFadeInOptions {
  buttons: HTMLElement[];
  staggerDelay?: number;
  duration?: number;
}

export function buttonFadeInAnimation(options: ButtonFadeInOptions): () => void {
  const { buttons, staggerDelay = 100, duration = 300 } = options;
  const cancelFns: (() => void)[] = [];

  buttons.forEach((button, index) => {
    const cancel = fadeInAnimation({
      element: button,
      duration,
      delay: index * staggerDelay,
      from: 0,
      to: 1
    });
    cancelFns.push(cancel);
  });

  return () => {
    cancelFns.forEach(cancel => cancel());
  };
}

export interface SlideInOptions {
  element: HTMLElement;
  duration?: number;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  distance?: number;
  onComplete?: () => void;
}

export function slideInAnimation(options: SlideInOptions): () => void {
  const {
    element,
    duration = 300,
    direction = 'right',
    distance = 50,
    onComplete
  } = options;

  let animationId: number | null = null;
  let startTime: number | null = null;
  let cancelled = false;

  const getTransform = (progress: number) => {
    const moveDistance = distance * (1 - progress);
    switch (direction) {
      case 'left':
        return `translateX(-${moveDistance}px)`;
      case 'right':
        return `translateX(${moveDistance}px)`;
      case 'top':
        return `translateY(-${moveDistance}px)`;
      case 'bottom':
        return `translateY(${moveDistance}px)`;
      default:
        return '';
    }
  };

  function animate(timestamp: number) {
    if (cancelled) return;

    if (startTime === null) {
      startTime = timestamp;
      element.style.opacity = '0';
      element.style.transform = getTransform(0);
    }

    const progress = Math.min((timestamp - startTime) / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    element.style.opacity = String(easeProgress);
    element.style.transform = getTransform(1 - easeProgress);

    if (progress < 1) {
      animationId = requestAnimationFrame(animate);
    } else {
      element.style.opacity = '1';
      element.style.transform = 'translateX(0) translateY(0)';
      onComplete?.();
    }
  }

  animationId = requestAnimationFrame(animate);

  return () => {
    cancelled = true;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
}

export interface BounceInOptions {
  element: HTMLElement;
  duration?: number;
  onComplete?: () => void;
}

export function bounceInAnimation(options: BounceInOptions): () => void {
  const { element, duration = 500, onComplete } = options;

  let animationId: number | null = null;
  let startTime: number | null = null;
  let cancelled = false;

  function easeOutBounce(x: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (x < 1 / d1) {
      return n1 * x * x;
    } else if (x < 2 / d1) {
      return n1 * (x -= 1.5 / d1) * x + 0.75;
    } else if (x < 2.5 / d1) {
      return n1 * (x -= 2.25 / d1) * x + 0.9375;
    } else {
      return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }
  }

  function animate(timestamp: number) {
    if (cancelled) return;

    if (startTime === null) {
      startTime = timestamp;
      element.style.opacity = '0';
      element.style.transform = 'scale(0)';
    }

    const progress = Math.min((timestamp - startTime) / duration, 1);
    const scale = easeOutBounce(progress);

    element.style.opacity = String(progress);
    element.style.transform = `scale(${scale})`;

    if (progress < 1) {
      animationId = requestAnimationFrame(animate);
    } else {
      element.style.opacity = '1';
      element.style.transform = 'scale(1)';
      onComplete?.();
    }
  }

  animationId = requestAnimationFrame(animate);

  return () => {
    cancelled = true;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
}
