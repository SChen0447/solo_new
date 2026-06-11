export interface FilmCardData {
  id: string;
  title: string;
  titleEn: string;
  year: number;
  director: string;
  rating: number;
  posterUrl: string;
  stills: string[];
  synopsis: string;
  cast: string[];
  genres: string[];
}

export interface FilterCriteria {
  director: string | null;
  genres: string[];
  ratingMin: number;
  ratingMax: number;
}

export interface CardSelectEventDetail {
  cardId: string;
  cardData: FilmCardData;
}

export interface FilterAppliedEventDetail extends FilterCriteria {}

export interface FilterChangeEventDetail {
  filteredCards: FilmCardData[];
}

export interface CloseDetailEventDetail {
  cardId: string;
}

declare global {
  interface HTMLElementEventMap {
    'card-select': CustomEvent<CardSelectEventDetail>;
    'filter-applied': CustomEvent<FilterAppliedEventDetail>;
    'filter-change': CustomEvent<FilterChangeEventDetail>;
    'close-detail': CustomEvent<CloseDetailEventDetail>;
    'open-filter': CustomEvent;
    'close-filter': CustomEvent;
  }
}
