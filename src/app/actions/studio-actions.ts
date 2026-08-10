'use server';

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
  const message = String(anyErr?.message || 'Generation failed');
  const code = anyErr?.code;

  if (message.includes('out of credits') || message.includes('Couldn’t update your credits')) {
    return message;
  }

  if (
    message.trim() === '5 NOT_FOUND:' ||
    message.trim() === '5 NOT_FOUND' ||
    message.includes('NOT_FOUND') ||
    code === 5 ||
    code === 'not-found'
  ) {
    if (stage === 'credits') {
      return 'Couldn’t update your credits (Firestore profile not found). Sign out/in, then try again.';
    }
    if (stage === 'save') {
      return 'Couldn’t save the scene to Firestore. Confirm App Hosting is linked to studio-7012397261-f7ef4.';
    }
    return 'Omni returned NOT_FOUND. Confirm GEMINI_API_KEY and Omni Flash preview access.';
  }

  // Strip huge payloads / stacks from client-facing errors.
  return message.length > 400 ? `${message.slice(0, 400)}…` : message;
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
        error: 'Omni finished but no playable video URL was returned. Your credit was refunded.',
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
