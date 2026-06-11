import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { FilmCardData } from './types';

@customElement('card-viewer')
export class CardViewer extends LitElement {
  @property({ type: Object })
  card?: FilmCardData;

  @property({ type: Boolean, reflect: true })
  visible = true;

  @property({ type: Number })
  index = 0;

  static styles = css`
    :host {
      display: block;
      width: 200px;
      height: 280px;
      flex-shrink: 0;
      cursor: pointer;
      transition: opacity 0.6s ease, transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      opacity: 1;
      transform: scale(1);
      will-change: transform, opacity;
    }

    :host([visible="false"]) {
      opacity: 0;
      transform: scale(0.8);
      pointer-events: none;
    }

    .ticket-card {
      position: relative;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #f5e6d3 0%, #e8d4b8 50%, #dcc8a8 100%);
      border-radius: 4px;
      box-shadow: 
        0 4px 15px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .ticket-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 30%, rgba(139, 69, 19, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(139, 69, 19, 0.06) 0%, transparent 40%);
      pointer-events: none;
    }

    .ticket-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        linear-gradient(90deg, transparent 0%, rgba(139, 69, 19, 0.03) 50%, transparent 100%);
      background-size: 4px 100%;
      pointer-events: none;
    }

    :host(:hover) .ticket-card {
      transform: translateY(-6px) scale(1.02);
      box-shadow: 
        0 12px 30px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }

    .ticket-top {
      position: relative;
      height: 130px;
      background: linear-gradient(180deg, #8b0000 0%, #6b0000 100%);
      border-bottom: 2px dashed #d4af37;
      overflow: hidden;
    }

    .ticket-top::before {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 0;
      right: 0;
      height: 16px;
      background: repeating-linear-gradient(
        90deg,
        #f5e6d3 0px,
        #f5e6d3 12px,
        transparent 12px,
        transparent 24px
      );
      mask-image: radial-gradient(circle, transparent 6px, #000 6px);
      -webkit-mask-image: radial-gradient(circle, transparent 6px, #000 6px);
      mask-size: 24px 16px;
      -webkit-mask-size: 24px 16px;
    }

    .poster-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.85;
      mix-blend-mode: luminosity;
      transition: opacity 0.3s ease, transform 0.5s ease;
    }

    :host(:hover) .poster-img {
      opacity: 1;
      transform: scale(1.05);
    }

    .year-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(212, 175, 55, 0.95);
      color: #1a1a1a;
      padding: 2px 8px;
      border-radius: 2px;
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.5px;
    }

    .rating-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(26, 26, 26, 0.9);
      color: #d4af37;
      padding: 2px 8px;
      border-radius: 2px;
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 600;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .rating-star {
      color: #d4af37;
      font-size: 10px;
    }

    .ticket-body {
      padding: 12px 14px;
      position: relative;
      z-index: 1;
    }

    .film-title {
      font-family: 'Noto Serif SC', 'Playfair Display', Georgia, serif;
      font-size: 15px;
      font-weight: 700;
      color: #2c1810;
      margin-bottom: 4px;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .film-title-en {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11px;
      color: #6b5344;
      font-style: italic;
      margin-bottom: 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .film-director {
      font-size: 12px;
      color: #4a3728;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .director-label {
      color: #8b6914;
      font-weight: 600;
    }

    .genres-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .genre-tag {
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(139, 0, 0, 0.1);
      color: #8b0000;
      border-radius: 2px;
      font-weight: 500;
      border: 1px solid rgba(139, 0, 0, 0.2);
    }

    .ticket-bottom {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 12px;
      background: repeating-linear-gradient(
        90deg,
        #dcc8a8 0px,
        #dcc8a8 12px,
        #c4b090 12px,
        #c4b090 24px
      );
      border-top: 1px solid #b8a080;
    }

    .ticket-bottom::before,
    .ticket-bottom::after {
      content: '';
      position: absolute;
      top: -8px;
      width: 16px;
      height: 16px;
      background: #1a1a1a;
      border-radius: 50%;
    }

    .ticket-bottom::before {
      left: -8px;
    }

    .ticket-bottom::after {
      right: -8px;
    }

    @media (max-width: 768px) {
      :host {
        width: 160px;
        height: 230px;
      }

      .ticket-top {
        height: 100px;
      }

      .film-title {
        font-size: 13px;
      }

      .film-title-en {
        font-size: 10px;
      }
    }
  `;

  render() {
    if (!this.card) return html``;

    const delay = this.index * 0.05;

    return html`
      <div 
        class="ticket-card" 
        @click=${this._handleClick}
        style="animation-delay: ${delay}s"
      >
        <div class="ticket-top">
          <img 
            class="poster-img" 
            src=${this.card.posterUrl} 
            alt=${this.card.title}
            loading="lazy"
          />
          <span class="rating-badge">
            <span class="rating-star">★</span>
            ${this.card.rating.toFixed(1)}
          </span>
          <span class="year-badge">${this.card.year}</span>
        </div>
        <div class="ticket-body">
          <div class="film-title">${this.card.title}</div>
          <div class="film-title-en">${this.card.titleEn}</div>
          <div class="film-director">
            <span class="director-label">导演</span>
            <span>${this.card.director}</span>
          </div>
          <div class="genres-row">
            ${this.card.genres.slice(0, 2).map(g => 
              html`<span class="genre-tag">${g}</span>`
            )}
          </div>
        </div>
        <div class="ticket-bottom"></div>
      </div>
    `;
  }

  private _handleClick() {
    if (!this.card) return;
    this.dispatchEvent(new CustomEvent('card-select', {
      detail: {
        cardId: this.card.id,
        cardData: this.card
      },
      bubbles: true,
      composed: true
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'card-viewer': CardViewer;
  }
}
