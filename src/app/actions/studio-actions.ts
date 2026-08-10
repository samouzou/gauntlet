'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { refundCredit, spendCredit } from '@/lib/studio/credits';
import { generateCharacterImage } from '@/lib/studio/generate-character-image';
import { persistCharacterImage } from '@/lib/studio/persist-character-image';
import {
  humanizeServerError,
  runGenerateScene,
  type GenerateSceneInput,
  type GenerateSceneResult,
} from '@/lib/studio/run-generate-scene';
import { z } from 'zod';

export type { GenerateSceneInput, GenerateSceneResult };

/** Kept for compatibility — prefer POST /api/studio/generate for long Omni jobs. */
export async function generateScene(input: GenerateSceneInput): Promise<GenerateSceneResult> {
  return runGenerateScene(input);
}

const characterSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(2000),
  style: z.string().min(2).max(200),
  imageUrl: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith('/samples/') ||
        value.startsWith('https://') ||
        value.startsWith('http://'),
      'Reference image must be a public /samples path or http(s) URL'
    )
    .optional()
    .nullable(),
});

export async function saveCharacter(input: z.infer<typeof characterSchema>) {
  const data = characterSchema.parse(input);
  const ref = adminDb.collection('characters').doc();
  await ref.set({
    userId: data.userId,
    name: data.name,
    description: data.description,
    style: data.style,
    imageUrl: data.imageUrl || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { characterId: ref.id };
}

export type GenerateCharacterResult =
  | {
      ok: true;
      characterId: string;
      imageUrl: string;
      name: string;
      description: string;
      style: string;
    }
  | { ok: false; error: string };

/**
 * Generate a character portrait, store it, and add to cast.
 * Costs 1 credit (same as a scene generate).
 */
export async function generateCharacter(input: {
  userId: string;
  name: string;
  description: string;
  style?: string;
}): Promise<GenerateCharacterResult> {
  let data: z.infer<typeof characterSchema>;
  try {
    data = characterSchema.parse({
      userId: input.userId,
      name: input.name,
      description: input.description,
      style: input.style?.trim() || 'Cinematic portrait',
      imageUrl: null,
    });
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Invalid character details.' };
  }

  try {
    await spendCredit(data.userId);
  } catch (error) {
    return { ok: false, error: humanizeServerError(error, 'credits') };
  }

  const characterRef = adminDb.collection('characters').doc();

  try {
    const portrait = await generateCharacterImage({
      name: data.name,
      description: data.description,
      style: data.style,
    });

    const imageUrl = await persistCharacterImage({
      userId: data.userId,
      characterId: characterRef.id,
      imageBase64: portrait.imageBase64,
      mimeType: portrait.mimeType,
    });

    await characterRef.set({
      userId: data.userId,
      name: data.name,
      description: data.description,
      style: data.style,
      imageUrl,
      source: 'generated',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      ok: true,
      characterId: characterRef.id,
      imageUrl,
      name: data.name,
      description: data.description,
      style: data.style,
    };
  } catch (error: any) {
    await refundCredit(data.userId);
    console.error('[generateCharacter] failed', error);
    return {
      ok: false,
      error: humanizeServerError(error, 'omni'),
    };
  }
}
