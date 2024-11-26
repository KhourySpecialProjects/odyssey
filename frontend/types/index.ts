export interface Playlist {
  id: number;
  name: string;
  slug: string;
  description?: string;
  droplets?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  duration: 'short' | 'medium' | 'long';
  isPublic: boolean;
} 