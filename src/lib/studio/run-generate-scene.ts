import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateWithOmni } from '@/lib/studio/omni';
import { fetchRemoteVideoBuffer, uploadVideoToFilesApi } from '@/lib/studio/files-api';
import { refundCredits, spendCredits } from '@/lib/studio/credits';
import { creditCost } from '@/lib/studio/pricing';
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

const httpsUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith('https://') || value.startsWith('http://'),
    'Source video must be an http(s) URL'
  );

export const generateSceneSchema = z
  .object({
    userId: z.string().min(1),
    prompt: z.string().min(8).max(4000),
    title: z.string().min(2).max(120).optional(),
    characterIds: z.array(z.string()).max(6).optional().default([]),
    referenceImageUrls: z.array(imageRefSchema).max(6).optional().default([]),
    previousInteractionId: z.string().optional().nullable(),
    sceneId: z.string().optional().nullable(),
    sourceVideoUrl: httpsUrlSchema.optional().nullable(),
    aspectRatio: z.enum(['16:9', '9:16']).optional().default('16:9'),
    mode: z.enum(['generate', 'edit', 'edit_upload']).default('generate'),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'edit_upload' && !data.sourceVideoUrl && !data.previousInteractionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Upload a short clip before asking Arc to reshape it.',
        path: ['sourceVideoUrl'],
      });
    }
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

  if (message.includes('REGION_BLOCKED_UPLOAD_EDIT') || lower.includes('region_blocked')) {
    return 'This kind of cut isn’t available in your region yet.';
  }

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
    lower.includes('source clip') ||
    lower.includes('files api') ||
    lower.includes('10 second')
  ) {
    return message.length > 280 ? `${message.slice(0, 280)}…` : message;
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
 * - generate: text (+ optional character stills)
 * - edit: instruction-only via previous_interaction_id
 * - edit_upload: first-turn reshape of a user-uploaded source clip
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

  const isFollowUpEdit =
    data.mode === 'edit' ||
    (Boolean(data.previousInteractionId) && data.mode !== 'edit_upload');
  const isUploadEdit =
    data.mode === 'edit_upload' ||
    (Boolean(data.sourceVideoUrl) && !data.previousInteractionId && data.mode !== 'generate');

  const referenceImageUrls =
    isFollowUpEdit || isUploadEdit ? [] : data.referenceImageUrls || [];

  const pricedMode =
    isUploadEdit || data.mode === 'edit_upload'
      ? 'edit_upload'
      : isFollowUpEdit || data.mode === 'edit'
        ? 'video_edit'
        : referenceImageUrls.length > 0
          ? 'image_to_video'
          : 'text_to_video';
  const cost = creditCost(pricedMode);

  try {
    await spendCredits(data.userId, cost);
  } catch (error) {
    return { ok: false, error: humanizeServerError(error, 'credits') };
  }

  try {
    let sourceVideoUri: string | null = null;
    let sourceVideoMimeType: string | null = null;

    // First uploaded-video edit: push Storage clip into Gemini Files API.
    // Follow-ups use previous_interaction_id only.
    if (isUploadEdit && data.sourceVideoUrl && !data.previousInteractionId) {
      const remote = await fetchRemoteVideoBuffer(data.sourceVideoUrl);
      const uploaded = await uploadVideoToFilesApi({
        buffer: remote.buffer,
        mimeType: remote.mimeType,
        displayName: `scene-${data.sceneId || 'new'}`,
      });
      sourceVideoUri = uploaded.uri;
      sourceVideoMimeType = uploaded.mimeType;
    }

    const aspectRatio = data.aspectRatio === '9:16' ? '9:16' : '16:9';

    const result = await generateWithOmni({
      prompt: data.prompt,
      referenceImageUrls,
      previousInteractionId: data.previousInteractionId,
      sourceVideoUri,
      sourceVideoMimeType,
      aspectRatio,
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
      sourceVideoUrl: data.sourceVideoUrl || null,
      aspectRatio,
      mimeType: result.mimeType || null,
      status: videoUrl ? 'ready' : 'error',
      updatedAt: FieldValue.serverTimestamp(),
      ...(data.sceneId ? {} : { createdAt: FieldValue.serverTimestamp() }),
    };

    await sceneRef.set(payload, { merge: true });

    if (!videoUrl) {
      await refundCredits(data.userId, cost);
      return {
        ok: false,
        error: 'The scene didn’t come back playable. Your credits were returned.',
      };
    }

    return {
      ok: true,
      sceneId: sceneRef.id,
      interactionId: result.interactionId || '',
      videoUrl,
    };
  } catch (error: any) {
    await refundCredits(data.userId, cost);
    console.error('[runGenerateScene] failed', {
      mode: data.mode,
      isFollowUpEdit,
      isUploadEdit,
      message: String(error?.message || error).slice(0, 500),
    });
    return { ok: false, error: humanizeServerError(error, 'omni') };
  }
}
