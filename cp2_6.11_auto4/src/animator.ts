export class Animator {
  staggerFlyIn(items: HTMLElement[], baseDelay: number = 60): void {
    items.forEach((item, index) => {
      item.classList.remove('fly-in');
      void item.offsetHeight;
      item.style.animationDelay = `${index * baseDelay}ms`;
      item.classList.add('fly-in');
    });
  }

  fadeIn(element: HTMLElement): void {
    element.classList.remove('fade-active');
    void element.offsetHeight;
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

  heartPop(heartBtn: HTMLElement): void {
    heartBtn.classList.remove('heart-pop');
    void heartBtn.offsetHeight;
    heartBtn.classList.add('heart-pop');
    heartBtn.addEventListener('animationend', () => {
      heartBtn.classList.remove('heart-pop');
    }, { once: true });
  }

  createParticles(x: number, y: number): void {
    const count = 10;
    const colors = ['#E74C3C', '#C4956A', '#FF6B6B', '#D4A574', '#FF8E8E'];
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const distance = 22 + Math.random() * 28;
      particle.style.position = 'fixed';
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty('--px', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--py', `${Math.sin(angle) * distance}px`);
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.width = `${4 + Math.random() * 4}px`;
      particle.style.height = particle.style.width;
      document.body.appendChild(particle);
      particle.addEventListener('animationend', () => particle.remove());
    }
  }
}
