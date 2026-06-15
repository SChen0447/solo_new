export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  tags: string;
  avg_rating: number;
  rating_count: number;
}

export interface BookList {
  id: string;
  title: string;
  description: string;
  cover: string;
  created_at: string;
  books?: Book[];
  avg_rating: number;
  book_count: number;
}

export interface Rating {
  id: string;
  user_id: string;
  book_id: string;
  score: number;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  book_id: string;
  content: string;
  score: number;
  created_at: string;
  book_title?: string;
  book_cover?: string;
  book_author?: string;
}

export interface UserStats {
  totalRatings: number;
  avgRating: number;
  topAuthors: { name: string; count: number }[];
}
