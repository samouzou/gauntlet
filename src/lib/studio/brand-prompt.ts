import type { BrandProfile } from '@/lib/types';

const MAX_PROMPT = 4000;

export function brandContext(brand: BrandProfile) {
  const lines = [
    `Brand: ${brand.name}${brand.summary ? ` — ${brand.summary}` : ''}`,
    brand.visualStyle && `Look and feel: ${brand.visualStyle}`,
    brand.tone && `Tone: ${brand.tone}`,
    `Brand colors ${brand.colors.primary}, ${brand.colors.secondary} and ${brand.colors.accent}; use them in wardrobe, props and set design, never as on-screen text.`,
  ].filter(Boolean);
  return `Brand guidelines:\n${lines.join('\n')}`;
}

/** Appends brand guidelines when the user has them switched on, staying under the API prompt cap. */
export function withBrand(prompt: string, brand: BrandProfile | null) {
  if (!brand?.applyToAds) return prompt;
  const context = brandContext(brand);
  const room = MAX_PROMPT - prompt.length - 2;
  if (room < 120) return prompt;
  return `${prompt}\n\n${context.slice(0, room)}`;
}
