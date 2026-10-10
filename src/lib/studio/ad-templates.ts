import type { VideoLength } from '@/lib/studio/pricing';

export type AdTemplatePanel = 'video' | 'image' | 'animate';

export interface AdTemplate {
  id: string;
  panel: AdTemplatePanel;
  label: string;
  blurb: string;
  title: string;
  /** Bracketed parts are placeholders the user must replace before generating. */
  prompt: string;
  aspectRatio: '9:16' | '16:9';
  imageAspectRatio?: '1:1' | '3:4' | '16:9';
  length?: VideoLength;
}

export const AD_TEMPLATES: AdTemplate[] = [
  {
    id: 'product-showcase',
    panel: 'video',
    label: 'Product showcase',
    blurb: 'Hero shots, details, then the product in use.',
    title: 'Product showcase',
    aspectRatio: '9:16',
    length: 10,
    prompt:
      'Vertical product ad for [your product: what it is, its color and packaging]. Hero shot on a clean surface with a slow rotating reveal, close-ups of the texture and details, then someone using it [where and how it is used]. Bright, premium commercial lighting, upbeat modern music. No text on screen. No dialogue.',
  },
  {
    id: 'ugc-testimonial',
    panel: 'video',
    label: 'UGC testimonial',
    blurb: 'A real-feeling customer talking to their phone.',
    title: 'UGC testimonial',
    aspectRatio: '9:16',
    length: 10,
    prompt:
      'Vertical selfie-style UGC ad filmed on a phone. A friendly person in their [age range] talks straight to the camera in their [home, car or kitchen], holding [your product], and says: "[one-sentence review, e.g. I have tried everything and this is the only one that worked]". Natural window light, casual handheld feel, authentic and unpolished.',
  },
  {
    id: 'limited-offer',
    panel: 'video',
    label: 'Limited-time offer',
    blurb: 'Fast, punchy promo for a sale or deal.',
    title: 'Limited-time offer',
    aspectRatio: '9:16',
    length: 10,
    prompt:
      'Vertical promo ad for [your business] announcing [the offer, e.g. 20% off this weekend]. Fast, energetic cuts of [your best products or services], ending on a happy customer smiling at the camera. Punchy upbeat music, bright saturated colors. No text on screen. No dialogue.',
  },
  {
    id: 'before-after',
    panel: 'video',
    label: 'Before & after',
    blurb: 'Show the problem, then the result.',
    title: 'Before & after',
    aspectRatio: '9:16',
    length: 10,
    prompt:
      'Vertical before-and-after ad for [your product or service]. First half: [the problem, e.g. a cluttered garage, dull skin, a leaky faucet] in flat, muted light. A quick satisfying transition. Second half: [the result], bright and clean, with [who] reacting happily. Upbeat music. No text on screen. No dialogue.',
  },
  {
    id: 'product-launch',
    panel: 'video',
    label: 'New launch',
    blurb: 'Cinematic reveal for something new.',
    title: 'Launch ad',
    aspectRatio: '9:16',
    length: 20,
    prompt:
      'Cinematic launch ad for [your new product or service]. A dramatic reveal from darkness into light, close-ups of [its key features], then people enjoying it in [the setting]. Building, energetic music. Premium commercial style. No text on screen. No dialogue.',
  },
  {
    id: 'behind-the-scenes',
    panel: 'video',
    label: 'Behind the scenes',
    blurb: 'The people and craft behind your brand.',
    title: 'Behind the scenes',
    aspectRatio: '9:16',
    length: 10,
    prompt:
      'Vertical behind-the-scenes video at [your business]. [Who, e.g. the owner] carefully makes [what you make or do], close-ups of hands at work, warm candid moments with the team. Natural light, handheld documentary feel, soft acoustic music. No text on screen. No dialogue.',
  },
  {
    id: 'event-promo',
    panel: 'video',
    label: 'Event promo',
    blurb: 'Build excitement for an event or opening.',
    title: 'Event promo',
    aspectRatio: '9:16',
    length: 10,
    prompt:
      'Vertical promo for [your event: name and type] at [the venue]. Guests arriving, [the main attraction], people laughing and having a great time, warm evening lighting. Energetic music. No text on screen. No dialogue.',
  },
  {
    id: 'app-problem-solution',
    panel: 'video',
    label: 'App or service demo',
    blurb: 'Problem, product, relief. Great for apps and SaaS.',
    title: 'Problem to solution',
    aspectRatio: '16:9',
    length: 10,
    prompt:
      'Widescreen ad for [your app or service]. A [type of person] in [the setting] is frustrated by [the problem], opens [your app or service] on their phone, and is visibly relieved as [the outcome]. Clean modern lighting, friendly upbeat music. No legible text on screens. No dialogue.',
  },
  {
    id: 'image-product-hero',
    panel: 'image',
    label: 'Product hero image',
    blurb: 'Clean studio shot for feeds and stores.',
    title: 'Product hero',
    aspectRatio: '9:16',
    imageAspectRatio: '1:1',
    prompt:
      'Studio product photo of [your product] on [a surface, e.g. pink stone or light oak], soft directional light, gentle shadows, [props, e.g. fresh flowers or citrus slices] arranged around it. Premium e-commerce advertising style, sharp focus, no text.',
  },
  {
    id: 'image-lifestyle',
    panel: 'image',
    label: 'Lifestyle image',
    blurb: 'Your product in a real moment.',
    title: 'Lifestyle ad',
    aspectRatio: '9:16',
    imageAspectRatio: '3:4',
    prompt:
      'Lifestyle advertising photo: a [type of person] enjoying [your product] in [the setting], candid and natural, golden-hour light, shallow depth of field. Warm, aspirational social media ad style, no text.',
  },
  {
    id: 'animate-product-spin',
    panel: 'animate',
    label: 'Product in motion',
    blurb: 'Bring a product photo to life.',
    title: 'Product in motion',
    aspectRatio: '9:16',
    length: 10,
    prompt:
      'Slow cinematic orbit around the product as light glides across it, [a motion detail, e.g. condensation forming, steam rising or petals drifting], ending on a clean hero frame. Premium commercial look, upbeat music. Keep the product exactly as it appears. No text on screen.',
  },
];

const PLACEHOLDER = /\[[^\]]+\]/;

export function hasTemplatePlaceholders(text: string) {
  return PLACEHOLDER.test(text);
}
