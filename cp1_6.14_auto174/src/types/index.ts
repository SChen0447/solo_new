export interface Location {
  lat: number;
  lng: number;
  name: string;
}

export interface Weather {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  icon: string;
}

export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  createdAt: string;
}

export interface Postcard {
  id: string;
  userId: string;
  userNickname: string;
  location: Location;
  weather: Weather;
  message: string;
  messageColor: string;
  background: string;
  filter: string;
  imageData: string;
  isPublic: boolean;
  createdAt: string;
  favoritedBy: string[];
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Friendship {
  userId: string;
  friendId: string;
  createdAt: string;
}

export interface DraggableText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
}
