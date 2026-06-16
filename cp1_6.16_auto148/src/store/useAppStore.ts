import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { artworks as allArtworks, initialComments, avatarColors, usernames } from '@/data/artworks';
import type { Artwork, Comment } from '@/data/artworks';

interface AppState {
  artworks: Artwork[];
  comments: Record<string, Comment[]>;
  likedArtworkIds: string[];
  activeFilter: string;
  sortMode: string;
  selectedArtworkId: string | null;
  mobileFilterOpen: boolean;
  toggleLike: (id: string) => void;
  addComment: (artworkId: string, content: string) => void;
  setFilter: (filter: string) => void;
  setSortMode: (mode: string) => void;
  selectArtwork: (id: string | null) => void;
  setMobileFilterOpen: (open: boolean) => void;
  getFilteredSortedArtworks: () => Artwork[];
  getSelectedArtwork: () => Artwork | undefined;
}

function loadLikedFromStorage(): string[] {
  try {
    const stored = localStorage.getItem('likedArtworks');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLikedToStorage(ids: string[]) {
  try {
    localStorage.setItem('likedArtworks', JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function loadLikesFromStorage(): Record<string, number> {
  try {
    const stored = localStorage.getItem('artworkLikes');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLikesToStorage(likesMap: Record<string, number>) {
  try {
    localStorage.setItem('artworkLikes', JSON.stringify(likesMap));
  } catch {
    // ignore
  }
}

function loadCommentsFromStorage(): Record<string, Comment[]> | null {
  try {
    const stored = localStorage.getItem('artworkComments');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveCommentsToStorage(comments: Record<string, Comment[]>) {
  try {
    localStorage.setItem('artworkComments', JSON.stringify(comments));
  } catch {
    // ignore
  }
}

const storedLikes = loadLikesFromStorage();
const artworksWithLikes = allArtworks.map(a => ({
  ...a,
  likes: storedLikes[a.id] !== undefined ? storedLikes[a.id] : a.likes,
}));

const storedComments = loadCommentsFromStorage();
const mergedComments = storedComments || initialComments;

export const useAppStore = create<AppState>((set, get) => ({
  artworks: artworksWithLikes,
  comments: mergedComments,
  likedArtworkIds: loadLikedFromStorage(),
  activeFilter: 'all',
  sortMode: 'date-desc',
  selectedArtworkId: null,
  mobileFilterOpen: false,

  toggleLike: (id: string) => {
    set(state => {
      const isLiked = state.likedArtworkIds.includes(id);
      const newLikedIds = isLiked
        ? state.likedArtworkIds.filter(i => i !== id)
        : [...state.likedArtworkIds, id];

      saveLikedToStorage(newLikedIds);

      const newArtworks = state.artworks.map(a =>
        a.id === id
          ? { ...a, likes: isLiked ? Math.max(0, a.likes - 1) : a.likes + 1 }
          : a
      );

      const likesMap: Record<string, number> = {};
      newArtworks.forEach(a => { likesMap[a.id] = a.likes; });
      saveLikesToStorage(likesMap);

      return { likedArtworkIds: newLikedIds, artworks: newArtworks };
    });
  },

  addComment: (artworkId: string, content: string) => {
    const comment: Comment = {
      id: uuidv4(),
      artworkId,
      username: usernames[Math.floor(Math.random() * usernames.length)],
      content,
      avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      createdAt: new Date().toISOString(),
    };

    set(state => {
      const existing = state.comments[artworkId] || [];
      const newComments = { ...state.comments, [artworkId]: [comment, ...existing] };
      saveCommentsToStorage(newComments);
      return { comments: newComments };
    });
  },

  setFilter: (filter: string) => set({ activeFilter: filter }),
  setSortMode: (mode: string) => set({ sortMode: mode }),
  selectArtwork: (id: string | null) => set({ selectedArtworkId: id }),
  setMobileFilterOpen: (open: boolean) => set({ mobileFilterOpen: open }),

  getFilteredSortedArtworks: () => {
    const state = get();
    let filtered = state.artworks;

    if (state.activeFilter !== 'all') {
      filtered = filtered.filter(a => a.tags.includes(state.activeFilter));
    }

    const sorted = [...filtered];
    switch (state.sortMode) {
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'likes-desc':
        sorted.sort((a, b) => b.likes - a.likes);
        break;
    }

    return sorted;
  },

  getSelectedArtwork: () => {
    const state = get();
    if (!state.selectedArtworkId) return undefined;
    return state.artworks.find(a => a.id === state.selectedArtworkId);
  },
}));
