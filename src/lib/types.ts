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

export type StudioMode = 'explore' | 'create';
