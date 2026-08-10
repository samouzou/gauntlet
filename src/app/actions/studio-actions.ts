'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateWithOmni } from '@/lib/studio/omni';
import { refundCredit, spendCredit } from '@/lib/studio/credits';
import { persistGeneratedVideo } from '@/lib/studio/upload-generated-video';
import { generateCharacterImage } from '@/lib/studio/generate-character-image';
import { persistCharacterImage } from '@/lib/studio/persist-character-image';
import { z } from 'zod';

const imageRefSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith('/samples/') ||
      value.startsWith('https://') ||
      value.startsWith('http://'),
    'Reference image must be a public /samples path or http(s) URL'
  );

const generateSchema = z.object({
  userId: z.string().min(1),
  prompt: z.string().min(8).max(4000),
  title: z.string().min(2).max(120).optional(),
  characterIds: z.array(z.string()).max(6).optional().default([]),
  referenceImageUrls: z.array(imageRefSchema).max(6).optional().default([]),
  previousInteractionId: z.string().optional().nullable(),
  sceneId: z.string().optional().nullable(),
  mode: z.enum(['generate', 'edit']).default('generate'),
});

export type GenerateSceneInput = z.infer<typeof generateSchema>;

export type GenerateSceneResult =
  | {
      ok: true;
      sceneId: string;
      interactionId: string;
      videoUrl: string | null;
    }
  | {
      ok: false;
      error: string;
    };

function humanizeServerError(error: unknown, stage: 'credits' | 'omni' | 'save'): string {
  const anyErr = error as any;
  const message = String(anyErr?.message || 'Something went wrong');
  const lower = message.toLowerCase();
  const code = anyErr?.code;

  if (lower.includes('out of credits')) {
    return 'You’re out of credits. Grab a pack to keep shooting.';
  }

  if (
    lower.includes('couldn’t update your credits') ||
    lower.includes("couldn't update your credits")
  ) {
    return 'We couldn’t update your balance. Sign out and back in, then try again.';
  }

  if (lower.includes('recognizable people') || lower.includes('blocked this reference')) {
    return 'That still couldn’t be used. Try a different image, or go from the description alone.';
  }

  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'That took too long. Try a shorter scene, or give it another go in a moment.';
  }

  if (lower.includes('no video') || lower.includes('without a video')) {
    return 'The scene didn’t come back playable. Try a simpler beat.';
  }

  if (
    lower.includes('gemini_api_key') ||
    lower.includes('api key') ||
    (lower.includes('not available') && lower.includes('key'))
  ) {
    return 'The studio isn’t available right now. Please try again shortly.';
  }

  if (
    message.trim() === '5 NOT_FOUND:' ||
    message.trim() === '5 NOT_FOUND' ||
    message.includes('NOT_FOUND') ||
    code === 5 ||
    code === 'not-found'
  ) {
    if (stage === 'credits') {
      return 'We couldn’t update your balance. Sign out and back in, then try again.';
    }
    if (stage === 'save') {
      return 'We couldn’t save your scene. Please try again in a moment.';
    }
    return 'Couldn’t start that scene. Please try again in a moment.';
  }

  // Never leak vendor / infra wording to the UI.
  if (
    /omni|gemini|firestore|firebase|api[_ ]?key|http \d+/i.test(message)
  ) {
    if (stage === 'credits') {
      return 'We couldn’t update your balance. Sign out and back in, then try again.';
    }
    if (stage === 'save') {
      return 'We couldn’t save your work. Please try again in a moment.';
    }
    return 'Something went wrong with that scene. Please try again.';
  }

  return message.length > 280 ? `${message.slice(0, 280)}…` : message;
}

export async function generateScene(input: GenerateSceneInput): Promise<GenerateSceneResult> {
  let data: GenerateSceneInput;
  try {
    data = generateSchema.parse(input);
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Invalid generate request.' };
  }

  try {
    await spendCredit(data.userId);
  } catch (error) {
    return { ok: false, error: humanizeServerError(error, 'credits') };
  }

  try {
    const result = await generateWithOmni({
      prompt: data.prompt,
      referenceImageUrls: data.referenceImageUrls,
      previousInteractionId: data.previousInteractionId,
    });

    const sceneRef = data.sceneId
      ? adminDb.collection('scenes').doc(data.sceneId)
      : adminDb.collection('scenes').doc();

    // Never return base64 through the Server Action — it breaks the RSC response
    // ("An unexpected response was received from the server").
    const videoUrl = await persistGeneratedVideo({
      userId: data.userId,
      sceneId: sceneRef.id,
      videoBase64: result.videoBase64,
      videoUri: result.videoUri,
      mimeType: result.mimeType,
    });

    const payload = {
      title: data.title || data.prompt.slice(0, 60),
      prompt: data.prompt,
      characterIds: data.characterIds || [],
      userId: data.userId,
      interactionId: result.interactionId || null,
      videoUrl: videoUrl || null,
      thumbnailUrl: videoUrl || null,
      mimeType: result.mimeType || null,
      status: videoUrl ? 'ready' : 'error',
      updatedAt: FieldValue.serverTimestamp(),
      ...(data.sceneId ? {} : { createdAt: FieldValue.serverTimestamp() }),
    };

    await sceneRef.set(payload, { merge: true });

    if (!videoUrl) {
      await refundCredit(data.userId);
      return {
        ok: false,
        error: 'The scene didn’t come back playable. Your credit was returned.',
      };
    }

    return {
      ok: true,
      sceneId: sceneRef.id,
      interactionId: result.interactionId || '',
      videoUrl,
    };
  } catch (error: any) {
    await refundCredit(data.userId);
    console.error('[generateScene] failed', error);
    return { ok: false, error: humanizeServerError(error, 'omni') };
  }
}

const characterSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(2000),
  style: z.string().min(2).max(200),
  imageUrl: imageRefSchema.optional().nullable(),
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
 * Generate a character portrait with Arc, store it, and add to cast.
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
