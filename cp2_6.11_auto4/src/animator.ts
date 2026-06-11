export class Animator {
  private flyInTimers: number[] = [];

  staggerFlyIn(items: HTMLElement[], baseDelay: number = 100): void {
    this.flyInTimers.forEach(t => clearTimeout(t));
    this.flyInTimers = [];

    items.forEach((item, index) => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(36px) scale(0.94)';
      item.classList.remove('fly-in');

      const timer = window.setTimeout(() => {
        item.classList.add('fly-in');
        item.style.opacity = '';
        item.style.transform = '';
      }, index * baseDelay);

      this.flyInTimers.push(timer);
    });
  }

  triggerHeartAnimation(heartBtn: HTMLElement): void {
    heartBtn.classList.remove('heart-pop');
    void heartBtn.offsetWidth;
    heartBtn.classList.add('heart-pop');
    const onEnd = (): void => {
      heartBtn.classList.remove('heart-pop');
      heartBtn.removeEventListener('animationend', onEnd);
    };
    heartBtn.addEventListener('animationend', onEnd);
  }

  createParticles(x: number, y: number, heartRect?: DOMRect): void {
    const count = 20 + Math.floor(Math.random() * 11);
    const colors = [
      '#E74C3C', '#C4956A', '#FF6B6B', '#D4A574',
      '#FF8E8E', '#FFB199', '#FF5252', '#D4503B',
    ];

    for (let i = 0; i < count; i++) {
      const isHeart = Math.random() < 0.3;
      const particle = isHeart
        ? this.createHeartParticle(x, y, heartRect, colors)
        : this.createCircleParticle(x, y, heartRect, colors);
      document.body.appendChild(particle);

      const onEnd = (): void => {
        particle.remove();
        particle.removeEventListener('animationend', onEnd);
      };
      particle.addEventListener('animationend', onEnd);
    }
  }

  private deflectFromHeart(
    angle: number,
    distance: number,
    originX: number,
    originY: number,
    heartRect?: DOMRect,
  ): { px: number; py: number } {
    let px = Math.cos(angle) * distance;
    let py = Math.sin(angle) * distance;

    if (heartRect) {
      const targetX = originX + px;
      const targetY = originY + py;
      const hx = heartRect.left + heartRect.width / 2;
      const hy = heartRect.top + heartRect.height / 2;
      const hr = Math.max(heartRect.width, heartRect.height) / 2 + 4;

      const dx = targetX - hx;
      const dy = targetY - hy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < hr) {
        const pushFactor = hr / Math.max(dist, 1);
        px = (hx + dx * pushFactor) - originX;
        py = (hy + dy * pushFactor) - originY;
      }
    }

    return { px, py };
  }

  private createCircleParticle(
    x: number,
    y: number,
    heartRect: DOMRect | undefined,
    colors: string[],
  ): HTMLElement {
    const particle = document.createElement('div');
    particle.classList.add('particle', 'particle-circle');

    const angle = Math.random() * Math.PI * 2;
    const distance = 28 + Math.random() * 42;
    const size = 4 + Math.random() * 5;
    const duration = 0.55 + Math.random() * 0.4;

    const { px, py } = this.deflectFromHeart(angle, distance, x, y, heartRect);

    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.setProperty('--px', `${px}px`);
    particle.style.setProperty('--py', `${py}px`);
    particle.style.animationDuration = `${duration}s`;

    return particle;
  }

  private createHeartParticle(
    x: number,
    y: number,
    heartRect: DOMRect | undefined,
    colors: string[],
  ): HTMLElement {
    const particle = document.createElement('div');
    particle.classList.add('particle', 'particle-heart');

    const angle = Math.random() * Math.PI * 2;
    const distance = 32 + Math.random() * 38;
    const size = 8 + Math.random() * 6;
    const duration = 0.6 + Math.random() * 0.35;

    const { px, py } = this.deflectFromHeart(angle, distance, x, y, heartRect);

    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.setProperty('--px', `${px}px`);
    particle.style.setProperty('--py', `${py}px`);
    particle.style.animationDuration = `${duration}s`;
    particle.style.color = colors[Math.floor(Math.random() * colors.length)];

    return particle;
  }

  fadeIn(element: HTMLElement): void {
    element.classList.remove('fade-active');
    void element.offsetWidth;
    element.classList.add('fade-active');
  }

  fadeOut(element: HTMLElement): void {
    element.classList.remove('fade-active');
  }

  slideUnderline(underline: HTMLElement, targetButton: HTMLElement): void {
    const parent = targetButton.parentElement;
    if (!parent) return;
    const rect = targetButton.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    underline.style.left = `${rect.left - parentRect.left}px`;
    underline.style.width = `${rect.width}px`;
  }
}
