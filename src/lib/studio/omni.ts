/**
 * Gemini Omni Flash via Interactions API (REST).
 * Keep the request close to the public curl examples — extra fields have been
 * observed to surface opaque `5 NOT_FOUND` responses.
 * Docs: https://ai.google.dev/gemini-api/docs/omni
 */

import { readFile } from 'fs/promises';
import path from 'path';

const OMNI_MODEL = 'gemini-omni-flash-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const REQUEST_TIMEOUT_MS = 280_000;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 48;

type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

export interface OmniGenerateInput {
  prompt: string;
  /** Optional image URLs / local /samples paths used as character refs */
  referenceImageUrls?: string[];
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
    throw new Error(
      'GEMINI_API_KEY is not available. Set it as an App Hosting secret and bind it in apphosting.yaml.'
    );
  }
  return key;
}

function buildReferencePrompt(prompt: string, imageCount: number) {
  if (imageCount === 0) return prompt;
  const refs = Array.from({ length: imageCount }, (_, i) => `@Image${i + 1}`).join(' ');
  return [
    `[# References ${refs}]`,
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
    if (!part) return;
    const type = part.type || part.media_type;
    if (type && type !== 'video') return;
    if (!part.data && !part.uri) return;
    mimeType = part.mime_type || mimeType || 'video/mp4';
    if (part.data) videoBase64 = part.data;
    if (part.uri) videoUri = part.uri;
  };

  for (const step of Array.isArray(raw?.steps) ? raw.steps : []) {
    for (const part of step?.content || []) consider(part);
  }
  for (const part of Array.isArray(raw?.outputs) ? raw.outputs : []) consider(part);
  if (raw?.output_video) consider({ type: 'video', ...raw.output_video });

  // Deep scan — some payloads nest video oddly.
  if (!videoUri && !videoBase64) {
    const stack = [raw];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== 'object') continue;
      if (
        (node.type === 'video' || node.mime_type === 'video/mp4') &&
        (node.data || node.uri)
      ) {
        consider({ type: 'video', ...node });
        break;
      }
      for (const value of Object.values(node)) {
        if (value && typeof value === 'object') stack.push(value);
      }
    }
  }

  return { videoUri, videoBase64, mimeType };
}

function formatApiError(status: number, raw: any): Error {
  const err = raw?.error || raw;
  const message =
    err?.message ||
    raw?.message ||
    (typeof raw === 'string' ? raw : null) ||
    `Omni request failed (HTTP ${status})`;

  const details = Array.isArray(err?.details)
    ? err.details
        .map((d: any) => d?.message || d?.reason || JSON.stringify(d))
        .filter(Boolean)
        .join(' · ')
    : '';

  const composed = [message, details].filter(Boolean).join(' — ');
  const lower = composed.toLowerCase();

  console.error('[omni] API error', {
    status,
    body: typeof raw === 'object' ? JSON.stringify(raw).slice(0, 2000) : String(raw),
  });

  if (status === 404 || lower.includes('not_found') || lower.includes('not found')) {
    return new Error(
      `Omni NOT_FOUND (HTTP ${status}): ${composed || 'no message'}. ` +
        `Request used model "${OMNI_MODEL}" via ${API_BASE}/interactions. ` +
        `Confirm this API key can call Gemini Omni Flash in AI Studio.`
    );
  }

  if (
    lower.includes('celebrity') ||
    lower.includes('recognizable people') ||
    lower.includes('likeness') ||
    lower.includes('minors')
  ) {
    return new Error(
      'Omni blocked this reference image (recognizable people / policy). ' +
        'Remove the still and generate from the description, or upload a non-photoreal asset you own.'
    );
  }

  return new Error(`Omni error (HTTP ${status}): ${composed}`);
}

async function postInteraction(apiKey: string, body: Record<string, unknown>) {
  // Docs use ?key=; header alone is also supported — send both for compatibility.
  const response = await fetch(`${API_BASE}/interactions?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await response.text();
  let raw: any = {};
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    raw = { message: text.slice(0, 500) };
  }

  if (!response.ok) {
    throw formatApiError(response.status, raw);
  }
  return raw;
}

async function getInteraction(apiKey: string, id: string) {
  const response = await fetch(
    `${API_BASE}/interactions/${encodeURIComponent(id)}?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(60_000),
    }
  );
  const text = await response.text();
  let raw: any = {};
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    raw = { message: text.slice(0, 500) };
  }
  if (!response.ok) {
    throw formatApiError(response.status, raw);
  }
  return raw;
}

async function waitForVideo(apiKey: string, initial: any) {
  let raw = initial;
  let polls = 0;

  while (polls < MAX_POLLS) {
    const status = raw?.status;
    const extracted = extractVideo(raw);
    if (extracted.videoUri || extracted.videoBase64) {
      return { raw, ...extracted };
    }

    if (status === 'failed' || status === 'cancelled') {
      throw new Error(
        raw?.error?.message || raw?.status_message || `Omni interaction ${status}`
      );
    }

    if (status === 'completed') {
      console.error('[omni] completed without video payload', JSON.stringify(raw).slice(0, 2000));
      throw new Error(
        'Omni finished without a video payload. Try a shorter prompt or regenerate without a reference still.'
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

function buildMinimalBody(input: {
  promptText: string;
  contentParts: OmniContentPart[];
  previousInteractionId?: string | null;
  aspectRatio?: '16:9' | '9:16';
}) {
  // Match the working public curl examples as closely as possible.
  const body: Record<string, unknown> = {
    model: OMNI_MODEL,
    input:
      input.contentParts.length === 1 && input.contentParts[0].type === 'text'
        ? input.promptText
        : input.contentParts,
    store: true,
  };

  if (input.previousInteractionId) {
    body.previous_interaction_id = input.previousInteractionId;
  }

  // Only add response_format when we need aspect ratio — keep shape doc-identical.
  if (input.aspectRatio && input.aspectRatio !== '16:9') {
    body.response_format = {
      type: 'video',
      aspect_ratio: input.aspectRatio,
    };
  }

  return body;
}

export async function generateWithOmni(input: OmniGenerateInput): Promise<OmniGenerateResult> {
  const apiKey = getApiKey();
  const requestedUrls = input.referenceImageUrls || [];

  const images: Array<{ data: string; mime_type: ImageMime }> = [];
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

  const primaryBody = buildMinimalBody({
    promptText,
    contentParts,
    previousInteractionId: input.previousInteractionId,
  });

  console.info('[omni] create interaction', {
    model: OMNI_MODEL,
    attachedImages: attachedCount,
    promptChars: promptText.length,
    hasPrevious: Boolean(input.previousInteractionId),
    bodyKeys: Object.keys(primaryBody),
  });

  let raw: any;
  try {
    raw = await postInteraction(apiKey, primaryBody);
  } catch (error: any) {
    const message = String(error?.message || '');
    const canRetryTextOnly =
      attachedCount > 0 &&
      !input.previousInteractionId &&
      (message.includes('NOT_FOUND') ||
        message.includes('not found') ||
        message.includes('blocked') ||
        message.includes('likeness') ||
        message.includes('reference'));

    if (!canRetryTextOnly) throw error;

    console.warn('[omni] image path failed; retrying text-only', message.slice(0, 300));
    raw = await postInteraction(
      apiKey,
      buildMinimalBody({
        promptText: input.prompt,
        contentParts: [{ type: 'text', text: input.prompt }],
      })
    );
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
