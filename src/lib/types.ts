export interface Product {
  name: string;
  stripe_price_id: string;
  credit_amount: number;
  price_usd: number;
  display_tag: string | null;
  description?: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  style: string;
  /** Optional uploaded reference still. When missing, Omni uses the text description. */
  imageUrl?: string | null;
  isSample?: boolean;
  userId?: string | null;
}

export type VideoAspectRatio = '16:9' | '9:16';

export interface Scene {
  id: string;
  title: string;
  prompt: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  /** Original uploaded clip the user asked Arc to reshape (if any). */
  sourceVideoUrl?: string | null;
  /** Output frame: landscape 16:9 or portrait 9:16. */
  aspectRatio?: VideoAspectRatio | null;
  characterIds: string[];
  interactionId?: string | null;
  /** Length of the current cut; scenes grow 10s at a time up to 40s. */
  durationSeconds?: number | null;
  isSample?: boolean;
  userId?: string | null;
  status?: 'draft' | 'generating' | 'ready' | 'error';
  /** Firestore Timestamp or millis — used for history sorting. */
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ImageAspectRatio = '1:1' | '3:4' | '4:3' | '16:9' | '9:16';

export interface StudioImage {
  id: string;
  title: string;
  prompt: string;
  imageUrl?: string | null;
  sourceImageUrl?: string | null;
  aspectRatio?: ImageAspectRatio | null;
  mode?: 'text_to_image' | 'image_to_image' | null;
  userId?: string | null;
  status?: 'draft' | 'generating' | 'ready' | 'error';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BrandAdIdea {
  id: string;
  title: string;
  concept: string;
  why: string;
  format: 'video' | 'image';
  aspectRatio: VideoAspectRatio;
  length: 10 | 20 | 30 | 40;
  prompt: string;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

/** User-editable brand fields; analysis fills them from the website. */
export interface BrandProfileFields {
  name: string;
  summary: string;
  offerings: string[];
  audience: string;
  tone: string;
  visualStyle: string;
  offers: string[];
  colors: BrandColors;
  logoUrl: string | null;
  applyToAds: boolean;
}

export interface BrandProfile extends BrandProfileFields {
  websiteUrl: string | null;
  ideas: BrandAdIdea[];
  analysesToday?: number;
  analysesPerDay?: number;
}

/** Left-rail studio panels. */
export type StudioPanel =
  | 'brand'
  | 'video'
  | 'image'
  | 'restyle'
  | 'animate'
  | 'cast'
  | 'reels';

export type StudioMode = 'explore' | 'create';
