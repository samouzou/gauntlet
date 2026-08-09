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
  imageUrl: string;
  isSample?: boolean;
  userId?: string | null;
}

export interface Scene {
  id: string;
  title: string;
  prompt: string;
  thumbnailUrl: string;
  videoUrl?: string | null;
  characterIds: string[];
  interactionId?: string | null;
  isSample?: boolean;
  userId?: string | null;
  status?: 'draft' | 'generating' | 'ready' | 'error';
}

export type StudioMode = 'explore' | 'create';
