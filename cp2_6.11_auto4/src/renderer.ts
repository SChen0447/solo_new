import { Photo, Category, CategoryInfo } from './types';

const CATEGORIES: CategoryInfo[] = [
  { key: 'all', label: '全部' },
  { key: 'landscape', label: '风景' },
  { key: 'portrait', label: '人像' },
  { key: 'street', label: '街拍' },
];

interface Callbacks {
  onCategoryChange?: (category: Category) => void;
  onPhotoClick?: (index: number) => void;
  onLightboxClose?: () => void;
  onLightboxPrev?: () => void;
  onLightboxNext?: () => void;
  onFavoriteToggle?: (photoId: number, heartRect: DOMRect) => void;
}

interface UIState {
  activeCategory: Category;
  currentLightboxIndex: number;
  favorites: Set<number>;
  favCount: number;
}

interface DOMElements {
  navbar: HTMLElement | null;
  favCounter: HTMLElement | null;
  filterBar: HTMLElement | null;
  filterUnderline: HTMLElement | null;
  grid: HTMLElement | null;
  lightbox: HTMLElement | null;
  lightboxImg: HTMLImageElement | null;
  lightboxTitle: HTMLElement | null;
}

export class Renderer {
  private app: HTMLElement;
  private allPhotos: Photo[] = [];
  private displayedPhotos: Photo[] = [];
  private state: UIState;
  private dom: DOMElements;
  private callbacks: Callbacks;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(appId: string) {
    this.app = document.getElementById(appId)!;
    this.state = {
      activeCategory: 'all',
      currentLightboxIndex: -1,
      favorites: new Set<number>(),
      favCount: 0,
    };
    this.dom = {
      navbar: null,
      favCounter: null,
      filterBar: null,
      filterUnderline: null,
      grid: null,
      lightbox: null,
      lightboxImg: null,
      lightboxTitle: null,
    };
    this.callbacks = {};
  }

  setPhotos(photos: Photo[]): void {
    this.allPhotos = photos;
  }

  setCallbacks(callbacks: Callbacks): void {
    this.callbacks = { ...callbacks };
  }

  setActiveCategory(category: Category): void {
    this.state.activeCategory = category;
    this.updateFilterUI();
  }

  render(photos: Photo[]): void {
    this.displayedPhotos = photos;
    this.allPhotos = photos;
    this.app.innerHTML = '';
    this.renderNavbar();
    this.renderFilterBar();
    this.renderGrid(photos);
    this.renderLightbox();
    this.bindResizeHandler();
  }

  private renderNavbar(): void {
    const navbar = document.createElement('nav');
    navbar.classList.add('navbar');
    navbar.innerHTML = `
      <div class="navbar-inner">
        <div class="fav-counter">
          <svg class="fav-heart-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="var(--color-accent)" stroke="var(--color-accent)" stroke-width="1"/>
          </svg>
          <span class="fav-count-text">0</span>
        </div>
        <h1 class="navbar-title">摄影作品集</h1>
        <div class="navbar-spacer"></div>
      </div>
    `;
    this.dom.navbar = navbar;
    this.dom.favCounter = navbar.querySelector('.fav-count-text');
    this.app.appendChild(navbar);
  }

  private renderFilterBar(): void {
    const filterBar = document.createElement('div');
    filterBar.classList.add('filter-bar');
    const inner = document.createElement('div');
    inner.classList.add('filter-inner');

    CATEGORIES.forEach((cat, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.classList.add('filter-btn');
      if (idx === 0) btn.classList.add('active');
      btn.dataset.category = cat.key;
      btn.textContent = cat.label;
      btn.addEventListener('click', () => {
        this.callbacks.onCategoryChange?.(cat.key);
      });
      inner.appendChild(btn);
    });

    const underline = document.createElement('div');
    underline.classList.add('filter-underline');
    inner.appendChild(underline);

    filterBar.appendChild(inner);
    this.dom.filterBar = filterBar;
    this.dom.filterUnderline = underline;
    this.app.appendChild(filterBar);

    requestAnimationFrame(() => this.updateUnderlinePosition());
  }

  private updateFilterUI(): void {
    if (!this.dom.filterBar || !this.dom.filterUnderline) return;
    const buttons = this.dom.filterBar.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
      const catKey = (btn as HTMLElement).dataset.category as Category;
      const isActive = catKey === this.state.activeCategory;
      btn.classList.toggle('active', isActive);
    });
    this.updateUnderlinePosition();
  }

  private updateUnderlinePosition(): void {
    if (!this.dom.filterBar || !this.dom.filterUnderline) return;
    const activeBtn = this.dom.filterBar.querySelector('.filter-btn.active') as HTMLElement | null;
    if (!activeBtn) return;
    const parent = activeBtn.parentElement;
    if (!parent) return;
    const rect = activeBtn.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    this.dom.filterUnderline.style.left = `${rect.left - parentRect.left}px`;
    this.dom.filterUnderline.style.width = `${rect.width}px`;
  }

  private bindResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.updateUnderlinePosition();
    });
  }

  renderGrid(photos: Photo[]): void {
    this.displayedPhotos = photos;
    if (!this.dom.grid) {
      const grid = document.createElement('div');
      grid.classList.add('gallery-grid');
      this.dom.grid = grid;
      this.app.appendChild(grid);
    }
    this.dom.grid.innerHTML = '';
    photos.forEach((photo, index) => {
      const card = this.createPhotoCard(photo, index);
      this.dom.grid!.appendChild(card);
    });
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

    const heartBtn = this.createHeartButton(photo.id);

    card.appendChild(imgWrapper);
    card.appendChild(heartBtn);

    card.addEventListener('click', () => {
      this.callbacks.onPhotoClick?.(index);
    });

    return card;
  }

  private createHeartButton(photoId: number): HTMLElement {
    const heartBtn = document.createElement('button');
    heartBtn.type = 'button';
    heartBtn.classList.add('heart-btn');
    heartBtn.dataset.photoId = String(photoId);
    heartBtn.setAttribute('aria-label', '收藏');

    const isFav = this.state.favorites.has(photoId);
    if (isFav) {
      heartBtn.classList.add('favorited');
    }

    const fill = isFav ? 'var(--color-heart)' : 'none';
    const stroke = isFav ? 'var(--color-heart)' : 'currentColor';
    heartBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    `;

    heartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = heartBtn.getBoundingClientRect();
      this.callbacks.onFavoriteToggle?.(photoId, rect);
    });

    return heartBtn;
  }

  private renderLightbox(): void {
    const lightbox = document.createElement('div');
    lightbox.classList.add('lightbox');
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.innerHTML = `
      <button class="lightbox-close" aria-label="关闭">
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="lightbox-arrow lightbox-prev" aria-label="上一张">
        <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="lightbox-content">
        <img class="lightbox-img" src="" alt="">
        <div class="lightbox-title"></div>
      </div>
      <button class="lightbox-arrow lightbox-next" aria-label="下一张">
        <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `;

    this.dom.lightbox = lightbox;
    this.dom.lightboxImg = lightbox.querySelector('.lightbox-img');
    this.dom.lightboxTitle = lightbox.querySelector('.lightbox-title');

    lightbox.querySelector('.lightbox-close')!.addEventListener('click', () => {
      this.callbacks.onLightboxClose?.();
    });
    lightbox.querySelector('.lightbox-prev')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onLightboxPrev?.();
    });
    lightbox.querySelector('.lightbox-next')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onLightboxNext?.();
    });
    lightbox.querySelector('.lightbox-content')!.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    lightbox.addEventListener('click', () => {
      this.callbacks.onLightboxClose?.();
    });

    this.app.appendChild(lightbox);
  }

  openLightbox(index: number): void {
    if (index < 0 || index >= this.displayedPhotos.length) return;
    if (!this.dom.lightbox || !this.dom.lightboxImg || !this.dom.lightboxTitle) return;

    this.state.currentLightboxIndex = index;
    const photo = this.displayedPhotos[index];
    this.dom.lightboxImg.src = photo.url;
    this.dom.lightboxImg.alt = photo.title;
    this.dom.lightboxTitle.textContent = photo.title;
    this.dom.lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';

    this.bindKeydown();
  }

  closeLightbox(): void {
    if (!this.dom.lightbox) return;
    this.dom.lightbox.classList.remove('open');
    document.body.style.overflow = '';
    this.state.currentLightboxIndex = -1;

    this.unbindKeydown();
  }

  navigateLightbox(direction: -1 | 1): void {
    if (!this.dom.lightboxImg || !this.dom.lightboxTitle) return;
    const len = this.displayedPhotos.length;
    if (len === 0) return;

    let newIndex = this.state.currentLightboxIndex + direction;
    if (newIndex < 0) newIndex = len - 1;
    if (newIndex >= len) newIndex = 0;

    this.state.currentLightboxIndex = newIndex;
    const photo = this.displayedPhotos[newIndex];

    const img = this.dom.lightboxImg;
    img.classList.remove('img-fade');
    void img.offsetWidth;
    img.src = photo.url;
    img.alt = photo.title;
    this.dom.lightboxTitle.textContent = photo.title;
    img.classList.add('img-fade');
  }

  toggleFavorite(photoId: number): { isFav: boolean; newCount: number } {
    const currentlyFav = this.state.favorites.has(photoId);

    if (currentlyFav) {
      this.state.favorites.delete(photoId);
      this.state.favCount--;
    } else {
      this.state.favorites.add(photoId);
      this.state.favCount++;
    }

    const isFav = !currentlyFav;
    this.updateHeartButtonUI(photoId, isFav);
    this.updateFavCounter();

    return { isFav, newCount: this.state.favCount };
  }

  private updateHeartButtonUI(photoId: number, isFav: boolean): void {
    const heartBtn = this.getHeartButton(photoId);
    if (!heartBtn) return;

    heartBtn.classList.toggle('favorited', isFav);
    const svgPath = heartBtn.querySelector('svg path');
    if (svgPath) {
      svgPath.setAttribute('fill', isFav ? 'var(--color-heart)' : 'none');
      svgPath.setAttribute('stroke', isFav ? 'var(--color-heart)' : 'currentColor');
    }
  }

  private updateFavCounter(): void {
    if (this.dom.favCounter) {
      this.dom.favCounter.textContent = String(this.state.favCount);
    }
  }

  getGridCards(): HTMLElement[] {
    if (!this.dom.grid) return [];
    return Array.from(this.dom.grid.querySelectorAll('.photo-card'));
  }

  getHeartButton(photoId: number): HTMLElement | null {
    if (!this.dom.grid) return null;
    return this.dom.grid.querySelector(`.heart-btn[data-photo-id="${photoId}"]`);
  }

  private bindKeydown(): void {
    this.unbindKeydown();
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.callbacks.onLightboxPrev?.();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.callbacks.onLightboxNext?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.callbacks.onLightboxClose?.();
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  private unbindKeydown(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
  }
}
