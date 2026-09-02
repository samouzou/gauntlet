import type { Character, Scene } from '@/lib/types';

/** Curated samples so visitors can dive in before creating an account. */
export const SAMPLE_CHARACTERS: Character[] = [
  {
    id: 'sample-char-mira',
    name: 'Mira Vale',
    description: 'A sharp-eyed courier in a rain-slick neon city. Soft armor, silver hair, calm defiance.',
    style: 'Cinematic neo-noir, anamorphic lens',
    // Display-only Unsplash portraits. Samples are never sent as generation refs.
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=640&h=800&fit=crop&q=80',
    isSample: true,
  },
  {
    id: 'sample-char-orin',
    name: 'Orin Ash',
    description: 'Desert cartographer with sun-faded coat and ink-stained hands. Quiet, mythic presence.',
    style: 'Warm desert epic, golden hour',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640&h=800&fit=crop&q=80',
    isSample: true,
  },
  {
    id: 'sample-char-kade',
    name: 'Kade Lin',
    description: 'Street magician who treats reality like a deck of cards. Playful eyes, tailored black suit.',
    style: 'Stylized urban fantasy',
    imageUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=640&h=800&fit=crop&q=80',
    isSample: true,
  },
  {
    id: 'sample-char-nyx',
    name: 'Nyx Calder',
    description: 'Orbital mechanic between shifts — grease on cheek, soft smile, stars in the viewport.',
    style: 'Hard sci-fi, soft lighting',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=640&h=800&fit=crop&q=80',
    isSample: true,
  },
];

export const SAMPLE_SCENES: Scene[] = [
  {
    id: 'sample-scene-rooftop',
    title: 'Rooftop Signal',
    prompt:
      'Mira Vale stands on a rainy rooftop at night, neon reflecting in puddles, a red beacon flaring behind her as drones skim the skyline.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=960&h=540&fit=crop&q=80',
    characterIds: ['sample-char-mira'],
    isSample: true,
    status: 'ready',
  },
  {
    id: 'sample-scene-dune',
    title: 'Map of Dust',
    prompt:
      'Orin Ash kneels in windblown sand, unrolling a parchment map as a distant storm wall rises over sandstone cliffs.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=960&h=540&fit=crop&q=80',
    characterIds: ['sample-char-orin'],
    isSample: true,
    status: 'ready',
  },
  {
    id: 'sample-scene-alley',
    title: 'Card Trick Alley',
    prompt:
      'Kade Lin flips a glowing card that freezes rain mid-air in a narrow alley while onlookers freeze in astonishment.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=960&h=540&fit=crop&q=80',
    characterIds: ['sample-char-kade'],
    isSample: true,
    status: 'ready',
  },
  {
    id: 'sample-scene-orbit',
    title: 'Between Shifts',
    prompt:
      'Nyx Calder floats beside a cracked viewport, Earth glowing below, sparks drifting from a tool as she smiles at the camera.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=960&h=540&fit=crop&q=80',
    characterIds: ['sample-char-nyx'],
    isSample: true,
    status: 'ready',
  },
];

export function getSampleCharacter(id: string) {
  return SAMPLE_CHARACTERS.find((c) => c.id === id);
}

export function getSampleScene(id: string) {
  return SAMPLE_SCENES.find((s) => s.id === id);
}
