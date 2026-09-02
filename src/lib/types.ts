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

/** Left-rail studio panels. */
export type StudioPanel =
  | 'video'
  | 'image'
  | 'restyle'
  | 'animate'
  | 'cast'
  | 'reels';

export type StudioMode = 'explore' | 'create';
