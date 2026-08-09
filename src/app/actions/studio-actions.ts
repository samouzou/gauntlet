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

export async function generateScene(input: GenerateSceneInput) {
  const data = generateSchema.parse(input);

  await spendCredit(data.userId);

  try {
    const hasRefs = (data.referenceImageUrls?.length ?? 0) > 0;
    const result = await generateWithOmni({
      prompt: data.prompt,
      referenceImageUrls: data.referenceImageUrls,
      previousInteractionId: data.previousInteractionId,
      task:
        data.mode === 'edit'
          ? 'edit'
          : hasRefs
            ? 'reference_to_video'
            : 'text_to_video',
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

    await sceneRef.set(payload, { merge: true });

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
    const message = error?.message || 'Generation failed';
    // Avoid leaking opaque gRPC status-only strings without guidance.
    if (message.trim() === '5 NOT_FOUND:' || message.trim() === '5 NOT_FOUND') {
      throw new Error(
        'Gemini Omni returned NOT_FOUND. The model may be unavailable for this API key, or a reference image was rejected. Try generating without a sample cast photo, or confirm Omni Flash preview access in AI Studio.'
      );
    }
    throw new Error(message);
  }
}

const characterSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(2000),
  style: z.string().min(2).max(200),
  imageUrl: imageRefSchema,
});

export async function saveCharacter(input: z.infer<typeof characterSchema>) {
  const data = characterSchema.parse(input);
  const ref = adminDb.collection('characters').doc();
  await ref.set({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { characterId: ref.id };
}
