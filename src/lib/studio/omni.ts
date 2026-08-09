/**
 * Gemini Omni Flash via Interactions API (REST).
 * Field names are snake_case — do not send camelCase.
 * Docs: https://ai.google.dev/gemini-api/docs/omni
 */

import { readFile } from 'fs/promises';
import path from 'path';

const OMNI_MODEL = 'gemini-omni-flash-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const REQUEST_TIMEOUT_MS = 280_000;
const POLL_INTERVAL_MS = 4_000;
const MAX_POLLS = 60;

type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

export interface OmniGenerateInput {
  prompt: string;
  /** Optional public image URLs used as character / style references */
  referenceImageUrls?: string[];
  /** Continue an existing Omni conversation for edits */
  previousInteractionId?: string | null;
  task?: 'text_to_video' | 'edit' | 'image_to_video' | 'reference_to_video';
}

export interface OmniGenerateResult {
  interactionId: string;
  videoUri?: string | null;
  videoBase64?: string | null;
  mimeType?: string | null;
  raw: unknown;
}

type OmniContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mime_type: ImageMime };

function getApiKey() {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not available in this environment.');
  }
  return key;
}

function buildReferencePrompt(prompt: string, imageCount: number) {
  if (imageCount === 0) return prompt;

  const refs = Array.from({ length: imageCount }, (_, i) => `@Image${i + 1}`).join(' ');
  const inlineTags = Array.from({ length: imageCount }, (_, i) => `<IMAGE_REF_${i}>`).join(' ');

  return [
    `[# References ${refs}]`,
    `${inlineTags}`,
    prompt,
    'Use the given image(s) as references for video generation. The images should not be used as literal initial frames. Keep the referenced character(s) visually consistent.',
  ].join('\n\n');
}

function mimeFromPath(filePath: string): ImageMime | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return null;
}

async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; mime_type: ImageMime } | null> {
  try {
    // Local public sample assets — read from disk on the server.
    if (url.startsWith('/samples/')) {
      const relative = url.slice(1);
      const publicRoot = path.join(process.cwd(), 'public');
      const filePath = path.resolve(publicRoot, relative);
      if (!filePath.startsWith(publicRoot + path.sep)) return null;
      const mime_type = mimeFromPath(filePath);
      if (!mime_type) return null;
      const buffer = await readFile(filePath);
      if (buffer.byteLength > 8_000_000) return null;
      return { data: buffer.toString('base64'), mime_type };
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const rawMime = contentType.split(';')[0].trim().toLowerCase() || 'image/jpeg';
    const mime_type: ImageMime | null =
      rawMime === 'image/png' ||
      rawMime === 'image/webp' ||
      rawMime === 'image/gif' ||
      rawMime === 'image/jpeg'
        ? rawMime
        : rawMime === 'image/jpg'
          ? 'image/jpeg'
          : null;
    if (!mime_type) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    // Keep payloads reasonable for App Hosting request limits.
    if (buffer.byteLength > 8_000_000) return null;
    return { data: buffer.toString('base64'), mime_type };
  } catch {
    return null;
  }
}

function extractVideo(raw: any): {
  videoUri: string | null;
  videoBase64: string | null;
  mimeType: string | null;
} {
  let videoUri: string | null = null;
  let videoBase64: string | null = null;
  let mimeType: string | null = null;

  const consider = (part: any) => {
    if (!part || part.type !== 'video') return;
    mimeType = part.mime_type || mimeType || 'video/mp4';
    if (part.data) videoBase64 = part.data;
    if (part.uri) videoUri = part.uri;
  };

  // REST docs: video lives under steps[].content[]
  const steps = Array.isArray(raw?.steps) ? raw.steps : [];
  for (const step of steps) {
    if (step?.type && step.type !== 'model_output') continue;
    for (const part of step?.content || []) consider(part);
  }

  // Newer Interactions shape: outputs[]
  for (const part of Array.isArray(raw?.outputs) ? raw.outputs : []) consider(part);

  // SDK convenience field (when present)
  if (!videoUri && !videoBase64 && raw?.output_video) {
    videoBase64 = raw.output_video.data || null;
    videoUri = raw.output_video.uri || null;
    mimeType = raw.output_video.mime_type || mimeType || 'video/mp4';
  }

  return { videoUri, videoBase64, mimeType };
}

function formatApiError(status: number, raw: any): string {
  const err = raw?.error || raw;
  const message =
    err?.message ||
    raw?.message ||
    (typeof raw === 'string' ? raw : null) ||
    `Omni request failed (${status})`;

  const details = Array.isArray(err?.details)
    ? err.details
        .map((d: any) => d?.message || d?.reason || JSON.stringify(d))
        .filter(Boolean)
        .join(' · ')
    : '';

  const statusName = err?.status || err?.statusMessage || '';
  const composed = [message, statusName && message.includes(statusName) ? '' : statusName, details]
    .filter(Boolean)
    .join(' — ');

  const lower = composed.toLowerCase();
  if (
    status === 404 ||
    lower.includes('not_found') ||
    lower.includes('not found')
  ) {
    if (lower.includes('model') || lower.includes(OMNI_MODEL) || message.trim() === '5 NOT_FOUND:') {
      return (
        `Gemini Omni model "${OMNI_MODEL}" was not found for this API key. ` +
        `Confirm the key has Gemini API access and Omni Flash preview enabled in Google AI Studio.`
      );
    }
  }

  if (
    lower.includes('celebrity') ||
    lower.includes('recognizable people') ||
    lower.includes('likeness') ||
    lower.includes('minors')
  ) {
    return (
      'Omni blocked this reference image (recognizable people / policy). ' +
      'Try a non-photoreal character image you own, or generate from text only.'
    );
  }

  return composed;
}

async function postInteraction(apiKey: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatApiError(response.status, raw));
  }
  return raw;
}

async function getInteraction(apiKey: string, id: string) {
  const response = await fetch(`${API_BASE}/interactions/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey,
    },
    signal: AbortSignal.timeout(60_000),
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatApiError(response.status, raw));
  }
  return raw;
}

async function waitForVideo(apiKey: string, initial: any) {
  let raw = initial;
  let polls = 0;

  while (polls < MAX_POLLS) {
    const status = raw?.status;
    const { videoUri, videoBase64, mimeType } = extractVideo(raw);

    if (videoUri || videoBase64) {
      return { raw, videoUri, videoBase64, mimeType };
    }

    if (status === 'failed' || status === 'cancelled') {
      const reason =
        raw?.error?.message ||
        raw?.status_message ||
        `Omni interaction ${status || 'failed'}`;
      throw new Error(reason);
    }

    if (status === 'completed') {
      // Completed but no video payload — surface a clear error.
      throw new Error(
        'Omni finished without a video payload. Try a shorter prompt or regenerate without reference images.'
      );
    }

    const id = raw?.id;
    if (!id) {
      throw new Error('Omni returned no interaction id while video was still processing.');
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    raw = await getInteraction(apiKey, id);
    polls += 1;
  }

  throw new Error('Timed out waiting for Omni video. Try again in a moment.');
}

export async function generateWithOmni(input: OmniGenerateInput): Promise<OmniGenerateResult> {
  const apiKey = getApiKey();
  const requestedUrls = input.referenceImageUrls || [];

  const images: Array<{ data: string; mime_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' }> =
    [];
  for (const url of requestedUrls) {
    const image = await fetchImageAsBase64(url);
    if (image) images.push(image);
  }

  const attachedCount = images.length;
  const promptText = buildReferencePrompt(input.prompt, attachedCount);

  const contentParts: OmniContentPart[] = [
    ...images.map((image) => ({
      type: 'image' as const,
      data: image.data,
      mime_type: image.mime_type,
    })),
    { type: 'text', text: promptText },
  ];

  const task =
    input.task ||
    (input.previousInteractionId
      ? 'edit'
      : attachedCount > 1
        ? 'reference_to_video'
        : attachedCount === 1
          ? 'image_to_video'
          : 'text_to_video');

  // Keep the body close to the public Omni REST examples.
  // Avoid delivery:"uri" here — it depends on Files API readiness and often
  // surfaces opaque NOT_FOUND errors when the file handle is not ready yet.
  const body: Record<string, unknown> = {
    model: OMNI_MODEL,
    input:
      contentParts.length === 1 && contentParts[0].type === 'text'
        ? promptText
        : contentParts,
    store: true,
    background: false,
    stream: false,
    response_modalities: ['video'],
    response_format: {
      type: 'video',
      aspect_ratio: '16:9',
    },
    generation_config: {
      video_config: {
        task,
      },
    },
  };

  if (input.previousInteractionId) {
    body.previous_interaction_id = input.previousInteractionId;
  }

  let raw: any;
  try {
    raw = await postInteraction(apiKey, body);
  } catch (error: any) {
    // If reference images caused a policy / not-found failure, retry text-only once.
    const message = String(error?.message || '');
    const canRetryTextOnly =
      attachedCount > 0 &&
      !input.previousInteractionId &&
      (message.includes('reference image') ||
        message.includes('NOT_FOUND') ||
        message.includes('not found') ||
        message.includes('blocked') ||
        message.includes('likeness'));

    if (!canRetryTextOnly) throw error;

    raw = await postInteraction(apiKey, {
      model: OMNI_MODEL,
      input: input.prompt,
      store: true,
      background: false,
      stream: false,
      response_modalities: ['video'],
      response_format: {
        type: 'video',
        aspect_ratio: '16:9',
      },
      generation_config: {
        video_config: {
          task: 'text_to_video',
        },
      },
    });
  }

  const settled = await waitForVideo(apiKey, raw);

  return {
    interactionId: settled.raw?.id || raw?.id || '',
    videoUri: settled.videoUri,
    videoBase64: settled.videoBase64,
    mimeType: settled.mimeType,
    raw: settled.raw,
  };
}
