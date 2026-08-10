import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateWithOmni } from '@/lib/studio/omni';
import { refundCredit, spendCredit } from '@/lib/studio/credits';
import { persistGeneratedVideo } from '@/lib/studio/upload-generated-video';
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

export const generateSceneSchema = z.object({
  userId: z.string().min(1),
  prompt: z.string().min(8).max(4000),
  title: z.string().min(2).max(120).optional(),
  characterIds: z.array(z.string()).max(6).optional().default([]),
  referenceImageUrls: z.array(imageRefSchema).max(6).optional().default([]),
  previousInteractionId: z.string().optional().nullable(),
  sceneId: z.string().optional().nullable(),
  mode: z.enum(['generate', 'edit']).default('generate'),
});

export type GenerateSceneInput = z.infer<typeof generateSceneSchema>;

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

export function humanizeServerError(
  error: unknown,
  stage: 'credits' | 'omni' | 'save'
): string {
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

  if (/omni|gemini|firestore|firebase|api[_ ]?key|http \d+/i.test(message)) {
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

/**
 * Shared generate/edit pipeline used by the API route (preferred) and Server Action.
 * Edits are intentionally text-only + previous_interaction_id — no image re-upload.
 */
export async function runGenerateScene(
  input: GenerateSceneInput
): Promise<GenerateSceneResult> {
  let data: GenerateSceneInput;
  try {
    data = generateSceneSchema.parse(input);
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Invalid generate request.' };
  }

  const isEdit = data.mode === 'edit' || Boolean(data.previousInteractionId);
  const referenceImageUrls = isEdit ? [] : data.referenceImageUrls || [];

  try {
    await spendCredit(data.userId);
  } catch (error) {
    return { ok: false, error: humanizeServerError(error, 'credits') };
  }

  try {
    const result = await generateWithOmni({
      prompt: data.prompt,
      referenceImageUrls,
      previousInteractionId: data.previousInteractionId,
      preferUriDelivery: true,
    });

    const sceneRef = data.sceneId
      ? adminDb.collection('scenes').doc(data.sceneId)
      : adminDb.collection('scenes').doc();

    const videoUrl = await persistGeneratedVideo({
      userId: data.userId,
      sceneId: sceneRef.id,
      videoBase64: result.videoBase64,
      videoUri: result.videoUri,
      mimeType: result.mimeType,
      // Unique object per cut so browsers don't keep an edited reel cached.
      revision: result.interactionId || Date.now().toString(36),
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
    console.error('[runGenerateScene] failed', {
      mode: data.mode,
      isEdit,
      message: String(error?.message || error).slice(0, 500),
    });
    return { ok: false, error: humanizeServerError(error, 'omni') };
  }
}
