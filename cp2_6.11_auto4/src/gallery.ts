import '../style.css';
import { Photo, Category } from './types';
import { Renderer } from './renderer';
import { Animator } from './animator';

function imageUrl(prompt: string): string {
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=landscape_4_3`;
}

const PHOTOS: Photo[] = [
  { id: 1, url: imageUrl('Breathtaking snowy mountain peaks at golden hour with dramatic clouds, professional landscape photography, 8k quality'), title: '雪域金辉', category: 'landscape' },
  { id: 2, url: imageUrl('Serene ocean waves crashing on rocky shore at sunset with warm golden light, fine art seascape photography'), title: '海岸暮色', category: 'landscape' },
  { id: 3, url: imageUrl('Misty forest path with ancient trees and sun rays filtering through green canopy, atmospheric landscape photography'), title: '林间晨光', category: 'landscape' },
  { id: 4, url: imageUrl('Rolling green hills covered in wildflowers under pastel pink sky at dawn, pastoral landscape photography'), title: '花野牧歌', category: 'landscape' },
  { id: 5, url: imageUrl('Elegant woman portrait in soft natural window light with warm bokeh background, professional portrait photography'), title: '柔光丽影', category: 'portrait' },
  { id: 6, url: imageUrl('Thoughtful man looking away in dramatic side lighting, artistic black and white portrait photography studio'), title: '沉思者', category: 'portrait' },
  { id: 7, url: imageUrl('Joyful young woman laughing in a field of daisies with golden hour backlight, candid portrait photography'), title: '雏菊少女', category: 'portrait' },
  { id: 8, url: imageUrl('Artistic double exposure portrait merging face silhouette with blooming cherry blossoms, creative photography'), title: '花间叠影', category: 'portrait' },
  { id: 9, url: imageUrl('Busy Tokyo street at night with neon signs reflecting on wet rain pavement, urban street photography moody'), title: '霓虹雨夜', category: 'street' },
  { id: 10, url: imageUrl('Charming Parisian cafe terrace with warm afternoon light and people, classic street photography style'), title: '午后巴黎', category: 'street' },
  { id: 11, url: imageUrl('Vibrant spice market stall with colorful pyramids of spices and vendor, travel documentary street photography'), title: '香料市集', category: 'street' },
  { id: 12, url: imageUrl('Empty subway station with lone figure and geometric architectural lines, minimalist urban street photography'), title: '几何归途', category: 'street' },
];

const animator = new Animator();
const renderer = new Renderer('app');

let currentCategory: Category = 'all';

function getFilteredPhotos(): Photo[] {
  if (currentCategory === 'all') return PHOTOS;
  return PHOTOS.filter(p => p.category === currentCategory);
}

function handleCategoryChange(category: Category): void {
  currentCategory = category;
  renderer.updateFilterActive(category);
  const filtered = getFilteredPhotos();
  renderer.updateGrid(filtered);
  const cards = renderer.getGridCards();
  animator.staggerFlyIn(cards);
}

function handlePhotoClick(index: number): void {
  renderer.openLightbox(index);
}

function handleLightboxClose(): void {
  renderer.closeLightbox();
}

function handleLightboxPrev(): void {
  renderer.navigateLightbox(-1);
}

function handleLightboxNext(): void {
  renderer.navigateLightbox(1);
}

function handleFavoriteToggle(photoId: number): void {
  const { isFav } = renderer.toggleFavorite(photoId);
  const heartBtn = renderer.getHeartButton(photoId);
  if (heartBtn && isFav) {
    animator.heartPop(heartBtn);
    const rect = heartBtn.getBoundingClientRect();
    animator.createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowLeft') handleLightboxPrev();
  if (e.key === 'ArrowRight') handleLightboxNext();
  if (e.key === 'Escape') handleLightboxClose();
}

function init(): void {
  renderer.setCallbacks({
    onCategoryChange: handleCategoryChange,
    onPhotoClick: handlePhotoClick,
    onLightboxClose: handleLightboxClose,
    onLightboxPrev: handleLightboxPrev,
    onLightboxNext: handleLightboxNext,
    onFavoriteToggle: handleFavoriteToggle,
  });

  const filtered = getFilteredPhotos();
  renderer.render(filtered);

  const cards = renderer.getGridCards();
  animator.staggerFlyIn(cards, 80);

  document.addEventListener('keydown', handleKeydown);
}

init();
