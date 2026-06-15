export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Rotation3D {
  x: number;
  y: number;
  z: number;
}

export interface Artwork {
  id: string;
  title: string;
  author: string;
  year: number;
  description: string;
  colors: [string, string];
  position: Position3D;
  rotation: Rotation3D;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  avatarColor: string;
  content: string;
  timestamp: number;
}

export interface UserPosition {
  x: number;
  y: number;
  z: number;
}

export interface User {
  id: string;
  name: string;
  avatarColor: string;
  position: UserPosition;
}

export interface GalleryState {
  artworks: Artwork[];
  messages: Message[];
  onlineUsers: User[];
  selectedArtworkId: string | null;
  currentUser: User | null;
  userPosition: UserPosition;
  isPanelOpen: boolean;
}

export interface GalleryActions {
  setArtworks: (artworks: Artwork[]) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  addOnlineUser: (user: User) => void;
  removeOnlineUser: (userId: string) => void;
  setOnlineUsers: (users: User[]) => void;
  updateUserPosition: (userId: string, position: UserPosition) => void;
  selectArtwork: (artworkId: string | null) => void;
  setCurrentUser: (user: User) => void;
  setUserPosition: (position: UserPosition) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
}

export type GalleryStore = GalleryState & GalleryActions;
