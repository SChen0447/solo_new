export type ElementType = 'fire' | 'water' | 'earth' | 'air' | 'derived';

export type MaterialCategory = 'metal' | 'plant' | 'magic' | 'stone' | 'liquid' | 'gas' | 'basic';

export interface Element {
  id: string;
  name: string;
  type: ElementType;
  icon: string;
  color: string;
  glowColor: string;
  category: MaterialCategory;
  description: string;
  isBasic: boolean;
}

export interface Recipe {
  id: string;
  element1Id: string;
  element2Id: string;
  resultId: string;
  particleColor: string;
}

export interface Substance {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: MaterialCategory;
  description: string;
  recipeTree: string[];
  hint: string;
  discovered: boolean;
}

export interface Note {
  id: string;
  timestamp: Date;
  element1Id: string;
  element2Id: string;
  resultId: string;
  comment: string;
  rating: number;
}

export interface FusionState {
  isFusing: boolean;
  success: boolean | null;
  resultId: string | null;
  particleColor: string;
  draggedElement: Element | null;
  secondElement: Element | null;
}

export interface StoreState {
  elements: Element[];
  substances: Substance[];
  recipes: Recipe[];
  notes: Note[];
  fusionState: FusionState;
  selectedSubstance: Substance | null;
  searchQuery: string;
  ratingFilter: number | null;
  draggedElement: Element | null;
  setDraggedElement: (element: Element | null) => void;
  startFusion: (element1: Element, element2: Element) => void;
  completeFusion: () => void;
  failFusion: () => void;
  resetFusion: () => void;
  discoverSubstance: (substanceId: string) => void;
  addNote: (element1Id: string, element2Id: string, resultId: string) => void;
  updateNoteComment: (noteId: string, comment: string) => void;
  updateNoteRating: (noteId: string, rating: number) => void;
  setSelectedSubstance: (substance: Substance | null) => void;
  setSearchQuery: (query: string) => void;
  setRatingFilter: (rating: number | null) => void;
}
