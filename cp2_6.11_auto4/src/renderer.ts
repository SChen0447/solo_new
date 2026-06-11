import { Photo, Category, CategoryInfo } from './types';

const CATEGORIES: CategoryInfo[] = [
  { key: 'all', label: '全部' },
  { key: 'landscape', label: '风景' },
  { key: 'portrait', label: '人像' },
  { key: 'street', label: '街拍' },
];

export class Renderer {
  private app: HTMLElement;
  private navbar!: HTMLElement;
  private filterBar!: HTMLElement;
  private filterUnderline!: HTMLElement;
  private grid!: HTMLElement;
  private lightbox!: HTMLElement;
  private lightboxImg!: HTMLImageElement;
  private lightboxTitle!: HTMLElement;
  private favCounter!: HTMLElement;

  private filteredPhotos: Photo[] = [];
  private favorites: Set<number> = new Set();
  private favCount: number = 0;
  private currentLightboxIndex: number = -1;

  private onCategoryChange?: (category: Category) => void;
  private onPhotoClick?: (index: number) => void;
  private onLightboxClose?: () => void;
  private onLightboxPrev?: () => void;
  private onLightboxNext?: () => void;
  private onFavoriteToggle?: (photoId: number) => void;

  constructor(appId: string) {
    this.app = document.getElementById(appId)!;
  }

  setCallbacks(callbacks: {
    onCategoryChange?: (category: Category) => void;
    onPhotoClick?: (index: number) => void;
    onLightboxClose?: () => void;
    onLightboxPrev?: () => void;
    onLightboxNext?: () => void;
    onFavoriteToggle?: (photoId: number) => void;
  }): void {
    this.onCategoryChange = callbacks.onCategoryChange;
    this.onPhotoClick = callbacks.onPhotoClick;
    this.onLightboxClose = callbacks.onLightboxClose;
    this.onLightboxPrev = callbacks.onLightboxPrev;
    this.onLightboxNext = callbacks.onLightboxNext;
    this.onFavoriteToggle = callbacks.onFavoriteToggle;
  }

  render(photos: Photo[]): void {
    this.filteredPhotos = photos;
    this.app.innerHTML = '';
    this.renderNavbar();
    this.renderFilterBar();
    this.renderGrid(photos);
    this.renderLightbox();
  }

  private renderNavbar(): void {
    this.navbar = document.createElement('nav');
    this.navbar.classList.add('navbar');
    this.navbar.innerHTML = `
      <div class="navbar-inner">
        <div class="fav-counter">
          <svg class="fav-heart-icon" viewBox="0 0 24 24" width="18" height="18">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="var(--color-accent)" stroke="var(--color-accent)" stroke-width="1"/>
          </svg>
          <span class="fav-count-text">0</span>
        </div>
        <h1 class="navbar-title">摄影作品集</h1>
        <div class="navbar-spacer"></div>
      </div>
    `;
    this.app.appendChild(this.navbar);
    this.favCounter = this.navbar.querySelector('.fav-count-text')!;
  }

  private renderFilterBar(): void {
    this.filterBar = document.createElement('div');
    this.filterBar.classList.add('filter-bar');
    const inner = document.createElement('div');
    inner.classList.add('filter-inner');

    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.classList.add('filter-btn');
      if (cat.key === 'all') btn.classList.add('active');
      btn.dataset.category = cat.key;
      btn.textContent = cat.label;
      btn.addEventListener('click', () => {
        this.onCategoryChange?.(cat.key);
      });
      inner.appendChild(btn);
    });

    this.filterUnderline = document.createElement('div');
    this.filterUnderline.classList.add('filter-underline');
    inner.appendChild(this.filterUnderline);
    this.filterBar.appendChild(inner);
    this.app.appendChild(this.filterBar);

    requestAnimationFrame(() => {
      const activeBtn = this.filterBar.querySelector('.filter-btn.active') as HTMLElement;
      if (activeBtn) {
        this.slideUnderlineTo(activeBtn);
      }
    });

    window.addEventListener('resize', () => {
      const activeBtn = this.filterBar.querySelector('.filter-btn.active') as HTMLElement;
      if (activeBtn) {
        this.slideUnderlineTo(activeBtn);
      }
    });
  }

  private slideUnderlineTo(btn: HTMLElement): void {
    const parent = btn.parentElement;
    if (!parent) return;
    const rect = btn.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    this.filterUnderline.style.left = `${rect.left - parentRect.left}px`;
    this.filterUnderline.style.width = `${rect.width}px`;
  }

  private renderGrid(photos: Photo[]): void {
    this.grid = document.createElement('div');
    this.grid.classList.add('gallery-grid');
    photos.forEach((photo, index) => {
      const card = this.createPhotoCard(photo, index);
      this.grid.appendChild(card);
    });
    this.app.appendChild(this.grid);
  }

  private createPhotoCard(photo: Photo, index: number): HTMLElement {
    const card = document.createElement('div');
    card.classList.add('photo-card');
    card.dataset.index = String(index);
    card.dataset.id = String(photo.id);

    const imgWrapper = document.createElement('div');
    imgWrapper.classList.add('photo-img-wrapper');

    const img = document.createElement('img');
    img.classList.add('photo-img');
    img.src = photo.url;
    img.alt = photo.title;
    img.loading = 'lazy';
    imgWrapper.appendChild(img);

    const titleOverlay = document.createElement('div');
    titleOverlay.classList.add('photo-title-overlay');
    titleOverlay.textContent = photo.title;
    imgWrapper.appendChild(titleOverlay);

    const heartBtn = document.createElement('button');
    heartBtn.classList.add('heart-btn');
    heartBtn.dataset.photoId = String(photo.id);
    heartBtn.setAttribute('aria-label', '收藏');
    heartBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" stroke-width="1.8"/>
      </svg>
    `;
    heartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onFavoriteToggle?.(photo.id);
    });

    card.appendChild(imgWrapper);
    card.appendChild(heartBtn);

    card.addEventListener('click', () => {
      this.onPhotoClick?.(index);
    });

    return card;
  }

  private renderLightbox(): void {
    this.lightbox = document.createElement('div');
    this.lightbox.classList.add('lightbox');
    this.lightbox.innerHTML = `
      <button class="lightbox-close" aria-label="关闭">
        <svg viewBox="0 0 24 24" width="28" height="28">
          <line x1="18" y1="6" x2="6" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="lightbox-arrow lightbox-prev" aria-label="上一张">
        <svg viewBox="0 0 24 24" width="36" height="36">
          <polyline points="15 18 9 12 15 6" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="lightbox-content">
        <img class="lightbox-img" src="" alt="">
        <div class="lightbox-title"></div>
      </div>
      <button class="lightbox-arrow lightbox-next" aria-label="下一张">
        <svg viewBox="0 0 24 24" width="36" height="36">
          <polyline points="9 18 15 12 9 6" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `;
    this.lightboxImg = this.lightbox.querySelector('.lightbox-img')!;
    this.lightboxTitle = this.lightbox.querySelector('.lightbox-title')!;

    this.lightbox.querySelector('.lightbox-close')!.addEventListener('click', () => {
      this.onLightboxClose?.();
    });
    this.lightbox.querySelector('.lightbox-prev')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onLightboxPrev?.();
    });
    this.lightbox.querySelector('.lightbox-next')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onLightboxNext?.();
    });
    this.lightbox.querySelector('.lightbox-content')!.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    this.lightbox.addEventListener('click', () => {
      this.onLightboxClose?.();
    });

    this.app.appendChild(this.lightbox);
  }

  updateGrid(photos: Photo[]): void {
    this.filteredPhotos = photos;
    this.grid.innerHTML = '';
    photos.forEach((photo, index) => {
      const card = this.createPhotoCard(photo, index);
      this.grid.appendChild(card);
    });
  }

  updateFilterActive(category: Category): void {
    const buttons = this.filterBar.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
      const isActive = (btn as HTMLElement).dataset.category === category;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        this.slideUnderlineTo(btn as HTMLElement);
      }
    });
  }

  openLightbox(index: number): void {
    if (index < 0 || index >= this.filteredPhotos.length) return;
    this.currentLightboxIndex = index;
    const photo = this.filteredPhotos[index];
    this.lightboxImg.src = photo.url;
    this.lightboxImg.alt = photo.title;
    this.lightboxTitle.textContent = photo.title;
    this.lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightbox.classList.remove('open');
    document.body.style.overflow = '';
    this.currentLightboxIndex = -1;
  }

  navigateLightbox(direction: -1 | 1): void {
    const newIndex = this.currentLightboxIndex + direction;
    if (newIndex < 0 || newIndex >= this.filteredPhotos.length) return;
    this.currentLightboxIndex = newIndex;
    const photo = this.filteredPhotos[newIndex];
    this.lightboxImg.classList.remove('img-fade');
    void this.lightboxImg.offsetHeight;
    this.lightboxImg.src = photo.url;
    this.lightboxImg.alt = photo.title;
    this.lightboxTitle.textContent = photo.title;
    this.lightboxImg.classList.add('img-fade');
  }

  toggleFavorite(photoId: number): { isFav: boolean; newCount: number } {
    if (this.favorites.has(photoId)) {
      this.favorites.delete(photoId);
      this.favCount--;
    } else {
      this.favorites.add(photoId);
      this.favCount++;
    }

    const isFav = this.favorites.has(photoId);
    const heartBtn = this.grid.querySelector(`.heart-btn[data-photo-id="${photoId}"]`) as HTMLElement;
    if (heartBtn) {
      heartBtn.classList.toggle('favorited', isFav);
      const svgPath = heartBtn.querySelector('svg path')!;
      svgPath.setAttribute('fill', isFav ? 'var(--color-heart)' : 'none');
      svgPath.setAttribute('stroke', isFav ? 'var(--color-heart)' : 'currentColor');
    }

    this.favCounter.textContent = String(this.favCount);
    return { isFav, newCount: this.favCount };
  }

  getGridCards(): HTMLElement[] {
    return Array.from(this.grid.querySelectorAll('.photo-card'));
  }

  getHeartButton(photoId: number): HTMLElement | null {
    return this.grid.querySelector(`.heart-btn[data-photo-id="${photoId}"]`);
  }
}
