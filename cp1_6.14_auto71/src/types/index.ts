export interface SocialLink {
  platform: string;
  url: string;
}

export interface Card {
  id: string;
  name: string;
  occupation: string;
  phone: string;
  email: string;
  website: string;
  socialLinks: SocialLink[];
  bio: string;
  theme: string;
  avatarUrl: string;
  createdAt: string;
  receivedAt?: string;
}

export type ThemeKey = 'minimalWhite' | 'neonBlack' | 'retroYellow' | 'natureGreen' | 'oceanBlue';

export interface ThemeConfig {
  name: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  buttonGradient: string;
  borderColor: string;
  fontFamily: string;
}
