'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateWithOmni } from '@/lib/studio/omni';
import { refundCredit, spendCredit } from '@/lib/studio/credits';
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

function humanizeServerError(error: unknown, stage: 'credits' | 'omni' | 'save'): Error {
  const anyErr = error as any;
  const message = String(anyErr?.message || 'Generation failed');
  const code = anyErr?.code;

  if (message.includes('out of credits') || message.includes('Couldn’t update your credits')) {
    return error instanceof Error ? error : new Error(message);
  }

  // Firebase Admin gRPC often surfaces as "5 NOT_FOUND:" with little detail.
  if (
    message.trim() === '5 NOT_FOUND:' ||
    message.trim() === '5 NOT_FOUND' ||
    message.includes('NOT_FOUND') ||
    code === 5 ||
    code === 'not-found'
  ) {
    if (stage === 'credits') {
      return new Error(
        'Couldn’t update your credits (Firestore profile not found). Sign out/in to recreate your balance, then try again.'
      );
    }
    if (stage === 'save') {
      return new Error(
        'Scene saved failed (Firestore NOT_FOUND). Confirm App Hosting is linked to studio-7012397261-f7ef4.'
      );
    }
    return new Error(
      'Omni returned NOT_FOUND. Confirm GEMINI_API_KEY is bound in apphosting.yaml and the key can use gemini-omni-flash-preview.'
    );
  }

  return error instanceof Error ? error : new Error(message);
}

export async function generateScene(input: GenerateSceneInput) {
  const data = generateSchema.parse(input);

  try {
    await spendCredit(data.userId);
  } catch (error) {
    throw humanizeServerError(error, 'credits');
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

    const payload = {
      title: data.title || data.prompt.slice(0, 60),
      prompt: data.prompt,
      characterIds: data.characterIds || [],
      userId: data.userId,
      interactionId: result.interactionId || null,
      videoUrl: result.videoUri || null,
      videoBase64: result.videoBase64 ? true : false,
      mimeType: result.mimeType || null,
      status: 'ready',
      updatedAt: FieldValue.serverTimestamp(),
      ...(data.sceneId ? {} : { createdAt: FieldValue.serverTimestamp() }),
    };

    try {
      await sceneRef.set(payload, { merge: true });
    } catch (error) {
      throw humanizeServerError(error, 'save');
    }

    return {
      sceneId: sceneRef.id,
      interactionId: result.interactionId,
      videoUrl: result.videoUri,
      videoDataUrl:
        result.videoBase64 && result.mimeType
          ? `data:${result.mimeType};base64,${result.videoBase64}`
          : null,
    };
  } catch (error: any) {
    await refundCredit(data.userId);
    throw humanizeServerError(error, 'omni');
  }
}

const characterSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(2000),
  style: z.string().min(2).max(200),
  /** Optional Firebase Storage download URL from an uploaded still. */
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
