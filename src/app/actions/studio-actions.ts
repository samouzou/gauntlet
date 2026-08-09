'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateWithOmni } from '@/lib/studio/omni';
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

async function spendCredit(userId: string) {
  const userRef = adminDb.collection('users').doc(userId);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error('User profile not found. Sign in again.');
    const credits = snap.data()?.credits ?? 0;
    if (credits < 1) {
      throw new Error('You’re out of credits. Buy a pack to keep generating.');
    }
    tx.update(userRef, {
      credits: FieldValue.increment(-1),
      total_generations: FieldValue.increment(1),
    });
  });
}

function humanizeServerError(error: unknown, stage: 'credits' | 'omni' | 'save'): Error {
  const anyErr = error as any;
  const message = String(anyErr?.message || 'Generation failed');
  const code = anyErr?.code;

  // Firebase Admin gRPC often surfaces as "5 NOT_FOUND:" with little detail.
  if (
    message.trim() === '5 NOT_FOUND:' ||
    message.trim() === '5 NOT_FOUND' ||
    code === 5 ||
    code === 'not-found'
  ) {
    if (stage === 'credits' || stage === 'save') {
      return new Error(
        `Firestore NOT_FOUND while handling ${stage}. Confirm App Hosting is linked to project studio-7012397261-f7ef4 and that your user profile exists.`
      );
    }
    return new Error(
      'Omni returned NOT_FOUND. Confirm GEMINI_API_KEY is bound in apphosting.yaml and that the key can use gemini-omni-flash-preview in AI Studio.'
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
    // Refs only when the caller attached uploaded assets. Otherwise text_to_video.
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
    // Refund on hard failure after spend
    try {
      await adminDb.collection('users').doc(data.userId).update({
        credits: FieldValue.increment(1),
        total_generations: FieldValue.increment(-1),
      });
    } catch {
      // ignore refund failure
    }
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
