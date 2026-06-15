export interface Artwork {
  id: string;
  title: string;
  artist: string;
  description: string;
  imageUrl: string;
  category: string;
  voteCount: number;
}

export interface Vote {
  id: string;
  artworkId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  artworkId: string;
  username: string;
  content: string;
  avatarColor: string;
  createdAt: string;
}

export interface ArtworksResponse {
  artworks: Artwork[];
}

export interface VoteResponse {
  success: boolean;
  voteCount: number;
}

export interface CommentResponse {
  success: boolean;
  comment: Comment;
}

export interface CommentsResponse {
  comments: Comment[];
}
