export class Animator {
  staggerFlyIn(items: HTMLElement[], baseDelay: number = 60): void {
    items.forEach((item, index) => {
      item.style.opacity = '0';
      item.classList.remove('fly-in');
      void item.offsetWidth;
      item.style.animationDelay = `${index * baseDelay}ms`;
      requestAnimationFrame(() => {
        item.classList.add('fly-in');
      });
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

  createParticles(x: number, y: number): void {
    const count = 14;
    const colors = ['#E74C3C', '#C4956A', '#FF6B6B', '#D4A574', '#FF8E8E', '#FFB199'];
    const sizes = [4, 5, 6, 7];

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const distance = 26 + Math.random() * 34;
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      const duration = 0.5 + Math.random() * 0.35;

      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.setProperty('--px', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--py', `${Math.sin(angle) * distance}px`);
      particle.style.animationDuration = `${duration}s`;
      particle.style.setProperty('--start-scale', '1');
      particle.style.setProperty('--end-scale', '0');

      document.body.appendChild(particle);

      const onEnd = (): void => {
        particle.remove();
        particle.removeEventListener('animationend', onEnd);
      };
      particle.addEventListener('animationend', onEnd);
    }
  }
}
