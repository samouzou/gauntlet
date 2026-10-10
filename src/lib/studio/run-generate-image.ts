import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { refundCredits, spendCredits } from '@/lib/studio/credits';
import {
  generateStudioImage,
  type StudioImageAspect,
} from '@/lib/studio/generate-studio-image';
import { persistStudioImage } from '@/lib/studio/persist-studio-image';
import { creditCost } from '@/lib/studio/pricing';
import { humanizeServerError } from '@/lib/studio/run-generate-scene';
import { z } from 'zod';

const imageRefSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith('/samples/') ||
      value.startsWith('https://') ||
      value.startsWith('http://'),
    'Source image must be a public /samples path or http(s) URL'
  );

export const generateImageSchema = z
  .object({
    userId: z.string().min(1),
    prompt: z.string().min(8).max(4000),
    title: z.string().min(2).max(120).optional(),
    sourceImageUrl: imageRefSchema.optional().nullable(),
    aspectRatio: z
      .enum(['1:1', '3:4', '4:3', '16:9', '9:16'])
      .optional()
      .default('1:1'),
    mode: z.enum(['text_to_image', 'image_to_image']).default('text_to_image'),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'image_to_image' && !data.sourceImageUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add a source still before restyling.',
        path: ['sourceImageUrl'],
      });
    }
  });

export type GenerateImageInput = z.infer<typeof generateImageSchema>;

export type GenerateImageResult =
  | {
      ok: true;
      imageId: string;
      imageUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function runGenerateImage(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  let data: GenerateImageInput;
  try {
    data = generateImageSchema.parse(input);
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Invalid image request.' };
  }

  const mode = data.mode === 'image_to_image' || data.sourceImageUrl
    ? 'image_to_image'
    : 'text_to_image';
  const cost = creditCost(mode);

  try {
    await spendCredits(data.userId, cost);
  } catch (error) {
    return { ok: false, error: humanizeServerError(error, 'credits') };
  }

  const imageRef = adminDb.collection('images').doc();

  try {
    const result = await generateStudioImage({
      prompt: data.prompt,
      sourceImageUrl: mode === 'image_to_image' ? data.sourceImageUrl : null,
      aspectRatio: data.aspectRatio as StudioImageAspect,
    });

    const imageUrl = await persistStudioImage({
      userId: data.userId,
      imageId: imageRef.id,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
    });

    await imageRef.set({
      userId: data.userId,
      title: data.title || data.prompt.slice(0, 60),
      prompt: data.prompt,
      imageUrl,
      sourceImageUrl: data.sourceImageUrl || null,
      aspectRatio: data.aspectRatio,
      mode,
      status: 'ready',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      ok: true,
      imageId: imageRef.id,
      imageUrl,
    };
  } catch (error: any) {
    await refundCredits(data.userId, cost);
    console.error('[runGenerateImage] failed', {
      mode,
      message: String(error?.message || error).slice(0, 500),
    });
    return { ok: false, error: humanizeServerError(error, 'omni') };
  }
}
