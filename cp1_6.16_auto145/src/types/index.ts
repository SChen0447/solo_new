export interface RSVP {
  id: string;
  name: string;
  attending: boolean;
  guestsCount: number;
  mealPreference: 'vegetarian' | 'seafood' | 'beef';
  message: string;
  createdAt: string;
}

export interface Stats {
  totalInvited: number;
  responded: number;
  attending: number;
  notResponded: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
