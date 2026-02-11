import { Timestamp } from "firebase/firestore";

interface DeathPoint {
  timestamp: number;
  reason: string;
}

export interface GauntletRun {
  userId: string;
  timestamp: Timestamp;
  video_filename: string;
  survivability_score: number;
  death_points: DeathPoint[];
  visual_hook_score: number;
  audio_hook_score: number;
}

export interface Product {
  name: string;
  stripe_price_id: string;
  credit_amount: number;
  price_usd: number;
  display_tag: string | null;
  description?: string;
}
