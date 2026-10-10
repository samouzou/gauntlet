import type { Character } from '@/lib/types';

/** Starter presenters so visitors can cast an ad before creating their own. */
export const SAMPLE_CHARACTERS: Character[] = [
  {
    id: 'sample-presenter-maya',
    name: 'Maya',
    description:
      'UGC creator in her late 20s, warm and upbeat, natural makeup, casual knit sweater. Talks to the camera like she is telling a friend.',
    style: 'Selfie-style phone video, natural light',
    // Display-only Unsplash portraits. Samples are never sent as generation refs.
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=640&h=800&fit=crop&q=80',
    isSample: true,
  },
  {
    id: 'sample-presenter-marcus',
    name: 'Marcus',
    description:
      'Friendly business owner in his 40s, short beard, rolled-sleeve button-down. Confident and trustworthy, speaks plainly about what he makes.',
    style: 'Bright commercial, photoreal',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640&h=800&fit=crop&q=80',
    isSample: true,
  },
  {
    id: 'sample-presenter-sofia',
    name: 'Sofia',
    description:
      'Energetic lifestyle creator in her early 20s, big smile, trendy streetwear. Fast, playful energy made for TikTok and Reels.',
    style: 'Handheld social video, vibrant colors',
    imageUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=640&h=800&fit=crop&q=80',
    isSample: true,
  },
  {
    id: 'sample-presenter-lena',
    name: 'Lena',
    description:
      'Calm professional in her 30s in a crisp blazer. A reassuring expert who explains things simply, ideal for clinics, finance and services.',
    style: 'Clean, well-lit, photoreal',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=640&h=800&fit=crop&q=80',
    isSample: true,
  },
];

export function getSampleCharacter(id: string) {
  return SAMPLE_CHARACTERS.find((c) => c.id === id);
}
