import { create } from 'zustand';

export interface AvatarComponents {
  headShape: number;
  eyes: number;
  brows: number;
  nose: number;
  mouth: number;
  hair: number;
  top: number;
  bottom: number;
  accessory: number;
  headColor: string;
  eyeColor: string;
  browColor: string;
  noseColor: string;
  mouthColor: string;
  hairColor: string;
  topColor: string;
  bottomColor: string;
  accColor: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

export interface Avatar {
  id: string;
  components: AvatarComponents;
  author: string;
  userId: string;
  thumbnailUrl: string;
  likes: number | string[];
  comments: number | Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  nickname: string;
}

interface AvatarState {
  currentComponents: AvatarComponents;
  setCurrentComponents: (components: AvatarComponents) => void;
  updateComponent: (key: keyof AvatarComponents, value: number | string) => void;

  galleryAvatars: Avatar[];
  galleryTotal: number;
  galleryPage: number;
  galleryLoading: boolean;
  setGalleryAvatars: (avatars: Avatar[]) => void;
  appendGalleryAvatars: (avatars: Avatar[]) => void;
  setGalleryTotal: (total: number) => void;
  setGalleryPage: (page: number) => void;
  setGalleryLoading: (loading: boolean) => void;

  selectedAvatar: Avatar | null;
  setSelectedAvatar: (avatar: Avatar | null) => void;

  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  previewBg: 'gray' | 'transparent';
  setPreviewBg: (bg: 'gray' | 'transparent') => void;

  rotation: number;
  setRotation: (r: number) => void;

  notification: { message: string; type: 'success' | 'error' } | null;
  setNotification: (n: { message: string; type: 'success' | 'error' } | null) => void;
}

const defaultComponents: AvatarComponents = {
  headShape: 0,
  eyes: 0,
  brows: 0,
  nose: 0,
  mouth: 0,
  hair: 0,
  top: 0,
  bottom: 0,
  accessory: 0,
  headColor: '#fdbcb4',
  eyeColor: '#2c3e50',
  browColor: '#5d4037',
  noseColor: '#e8a88a',
  mouthColor: '#e74c3c',
  hairColor: '#3e2723',
  topColor: '#4a90d9',
  bottomColor: '#2c3e50',
  accColor: '#f1c40f',
};

const savedToken = typeof window !== 'undefined' ? localStorage.getItem('avatar_token') : null;
const savedUser = typeof window !== 'undefined' ? localStorage.getItem('avatar_user') : null;

export const useAvatarStore = create<AvatarState>((set) => ({
  currentComponents: defaultComponents,
  setCurrentComponents: (components) => set({ currentComponents: components }),
  updateComponent: (key, value) =>
    set((state) => ({
      currentComponents: { ...state.currentComponents, [key]: value },
    })),

  galleryAvatars: [],
  galleryTotal: 0,
  galleryPage: 1,
  galleryLoading: false,
  setGalleryAvatars: (avatars) => set({ galleryAvatars: avatars }),
  appendGalleryAvatars: (avatars) =>
    set((state) => ({ galleryAvatars: [...state.galleryAvatars, ...avatars] })),
  setGalleryTotal: (total) => set({ galleryTotal: total }),
  setGalleryPage: (page) => set({ galleryPage: page }),
  setGalleryLoading: (loading) => set({ galleryLoading: loading }),

  selectedAvatar: null,
  setSelectedAvatar: (avatar) => set({ selectedAvatar: avatar }),

  user: savedUser ? JSON.parse(savedUser) : null,
  token: savedToken,
  setUser: (user) => {
    if (user) localStorage.setItem('avatar_user', JSON.stringify(user));
    else localStorage.removeItem('avatar_user');
    set({ user });
  },
  setToken: (token) => {
    if (token) localStorage.setItem('avatar_token', token);
    else localStorage.removeItem('avatar_token');
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('avatar_token');
    localStorage.removeItem('avatar_user');
    set({ user: null, token: null });
  },

  previewBg: 'gray',
  setPreviewBg: (bg) => set({ previewBg: bg }),

  rotation: 0,
  setRotation: (r) => set({ rotation: r }),

  notification: null,
  setNotification: (n) => set({ notification: n }),
}));
