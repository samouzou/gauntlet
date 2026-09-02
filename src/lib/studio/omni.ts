/**
 * Gemini Omni Flash via Interactions API (REST).
 * Prefer URI delivery so edit/generate responses stay small; polling GET
 * /interactions/{id} returns multi-MB base64 and breaks long Server Actions.
 * Docs: https://ai.google.dev/gemini-api/docs/omni
 */

import { readFile } from 'fs/promises';
import path from 'path';

const OMNI_MODEL = 'gemini-omni-flash-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const REQUEST_TIMEOUT_MS = 280_000;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 54; // ~4.5 min after create returns in-progress

type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

export type OmniAspectRatio = '16:9' | '9:16';

export interface OmniGenerateInput {
  prompt: string;
  /** Optional image URLs / local /samples paths used as character refs */
  referenceImageUrls?: string[];
  previousInteractionId?: string | null;
  /** Prefer Files API URIs over inline base64 (important for edits). */
  preferUriDelivery?: boolean;
  /** Landscape (16:9) or portrait (9:16). Defaults to 16:9. */
  aspectRatio?: OmniAspectRatio | null;
  /**
   * Active Gemini Files API URI for an uploaded source clip.
   * Used only when there is no previousInteractionId (first uploaded-video edit).
   */
  sourceVideoUri?: string | null;
  sourceVideoMimeType?: string | null;
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

function extractFileId(uri: string): string | null {
  const match = uri.match(/files\/([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
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

  if (
    lower.includes('not available in') ||
    lower.includes('not supported in') ||
    lower.includes('european economic area') ||
    lower.includes('eea') ||
    lower.includes('united kingdom') ||
    lower.includes('switzerland') ||
    (lower.includes('region') && lower.includes('upload'))
  ) {
    return new Error('REGION_BLOCKED_UPLOAD_EDIT');
  }

  return new Error(`Omni error (HTTP ${status}): ${composed}`);
}

async function postInteraction(apiKey: string, body: Record<string, unknown>) {
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

async function getFileState(apiKey: string, fileId: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/files/${encodeURIComponent(fileId)}?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(30_000),
    }
  );
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw formatApiError(response.status, raw);
  }
  return String(raw?.state || raw?.state?.name || '');
}

async function downloadFileMedia(apiKey: string, fileUri: string): Promise<Buffer> {
  const fileId = extractFileId(fileUri);
  if (!fileId) {
    throw new Error('Omni returned a video URI we could not parse.');
  }

  const url = `${API_BASE}/files/${encodeURIComponent(fileId)}:download?alt=media&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Omni file download failed (HTTP ${response.status}): ${text.slice(0, 200)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function waitForUriFile(
  apiKey: string,
  videoUri: string,
  mimeType: string | null
): Promise<{ videoUri: string; videoBase64: string; mimeType: string | null }> {
  const fileId = extractFileId(videoUri);
  if (!fileId) {
    throw new Error('Omni returned a video URI we could not parse.');
  }

  for (let i = 0; i < MAX_POLLS; i += 1) {
    const state = (await getFileState(apiKey, fileId)).toUpperCase();
    if (state === 'ACTIVE' || state.includes('ACTIVE')) {
      const buffer = await downloadFileMedia(apiKey, videoUri);
      return {
        videoUri,
        videoBase64: buffer.toString('base64'),
        mimeType: mimeType || 'video/mp4',
      };
    }
    if (state === 'FAILED' || state.includes('FAILED')) {
      throw new Error('Omni finished preparing the video file but marked it failed.');
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error('Timed out waiting for Omni video file to become ready.');
}

async function waitForVideo(apiKey: string, initial: any) {
  let raw = initial;
  let polls = 0;

  while (polls < MAX_POLLS) {
    const status = raw?.status;
    const extracted = extractVideo(raw);

    // Prefer URI path — avoids keeping multi-MB base64 interaction bodies around.
    if (extracted.videoUri) {
      const settled = await waitForUriFile(apiKey, extracted.videoUri, extracted.mimeType);
      return {
        raw: { id: raw?.id, status: 'completed' },
        videoUri: settled.videoUri,
        videoBase64: settled.videoBase64,
        mimeType: settled.mimeType,
      };
    }

    if (extracted.videoBase64) {
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
    // Warning: GET may inline base64 — only do this when create did not yield a URI.
    raw = await getInteraction(apiKey, id);
    polls += 1;
  }

  throw new Error('Timed out waiting for Omni video. Try again in a moment.');
}

type InteractionInputPart =
  | OmniContentPart
  | { type: 'document'; uri: string }
  | { type: 'video'; uri: string; mime_type?: string };

function buildMinimalBody(input: {
  promptText: string;
  contentParts: InteractionInputPart[];
  previousInteractionId?: string | null;
  preferUriDelivery?: boolean;
  aspectRatio?: OmniAspectRatio | null;
}) {
  const aspectRatio: OmniAspectRatio = input.aspectRatio === '9:16' ? '9:16' : '16:9';
  const body: Record<string, unknown> = {
    model: OMNI_MODEL,
    input:
      input.contentParts.length === 1 && input.contentParts[0].type === 'text'
        ? input.promptText
        : input.contentParts,
    store: true,
    // Keep the unary call on the request so we get URI/base64 without a useless GET.
    background: false,
  };

  if (input.previousInteractionId) {
    body.previous_interaction_id = input.previousInteractionId;
  }

  // Always send response_format when we need URI delivery and/or a non-default frame.
  if (input.preferUriDelivery || aspectRatio !== '16:9') {
    body.response_format = {
      type: 'video',
      aspect_ratio: aspectRatio,
      ...(input.preferUriDelivery ? { delivery: 'uri' } : {}),
    };
  }

  return body;
}

export async function generateWithOmni(input: OmniGenerateInput): Promise<OmniGenerateResult> {
  const apiKey = getApiKey();
  const isFollowUpEdit = Boolean(input.previousInteractionId);
  const isUploadEdit = Boolean(input.sourceVideoUri) && !isFollowUpEdit;
  // Follow-up edits are instruction-only; the prior interaction holds video state.
  // First-turn upload edits use the source clip + directive (no character stills).
  const requestedUrls = isFollowUpEdit || isUploadEdit ? [] : input.referenceImageUrls || [];
  const preferUriDelivery = input.preferUriDelivery !== false;

  const images: Array<{ data: string; mime_type: ImageMime }> = [];
  for (const url of requestedUrls) {
    const image = await fetchImageAsBase64(url);
    if (image) images.push(image);
  }

  const attachedCount = images.length;
  const promptText =
    isFollowUpEdit || isUploadEdit
      ? input.prompt
      : buildReferencePrompt(input.prompt, attachedCount);

  let contentParts: InteractionInputPart[];
  if (isUploadEdit && input.sourceVideoUri) {
    // Omni "Edit your own videos" uses document + text (Files API URI).
    contentParts = [
      { type: 'document', uri: input.sourceVideoUri },
      {
        type: 'text',
        text: promptText.includes('Keep everything else the same')
          ? promptText
          : `${promptText}\n\nKeep everything else the same.`,
      },
    ];
  } else {
    contentParts = [
      ...images.map((image) => ({
        type: 'image' as const,
        data: image.data,
        mime_type: image.mime_type,
      })),
      { type: 'text', text: promptText },
    ];
  }

  const aspectRatio: OmniAspectRatio = input.aspectRatio === '9:16' ? '9:16' : '16:9';

  const primaryBody = buildMinimalBody({
    promptText,
    contentParts,
    previousInteractionId: input.previousInteractionId,
    preferUriDelivery,
    aspectRatio,
  });

  console.info('[omni] create interaction', {
    model: OMNI_MODEL,
    attachedImages: attachedCount,
    promptChars: promptText.length,
    hasPrevious: Boolean(input.previousInteractionId),
    hasSourceVideo: Boolean(input.sourceVideoUri),
    preferUriDelivery,
    aspectRatio,
    bodyKeys: Object.keys(primaryBody),
  });

  let raw: any;
  try {
    raw = await postInteraction(apiKey, primaryBody);
  } catch (error: any) {
    const message = String(error?.message || '');

    // Retry upload-edit with video part shape if document is rejected.
    if (
      isUploadEdit &&
      input.sourceVideoUri &&
      (message.includes('INVALID') ||
        message.includes('document') ||
        message.includes('unsupported') ||
        message.includes('NOT_FOUND'))
    ) {
      console.warn('[omni] document input failed; retrying video uri part', message.slice(0, 300));
      try {
        raw = await postInteraction(
          apiKey,
          buildMinimalBody({
            promptText,
            contentParts: [
              {
                type: 'video',
                uri: input.sourceVideoUri,
                mime_type: input.sourceVideoMimeType || 'video/mp4',
              },
              { type: 'text', text: promptText },
            ],
            preferUriDelivery,
            aspectRatio,
          })
        );
      } catch (retryError) {
        throw retryError;
      }
    } else {
      const canRetryWithoutUri =
        preferUriDelivery &&
        (message.includes('NOT_FOUND') ||
          message.includes('not found') ||
          message.includes('INVALID') ||
          message.includes('delivery'));

      if (canRetryWithoutUri) {
        console.warn('[omni] URI delivery failed; retrying inline delivery', message.slice(0, 300));
        raw = await postInteraction(
          apiKey,
          buildMinimalBody({
            promptText,
            contentParts,
            previousInteractionId: input.previousInteractionId,
            preferUriDelivery: false,
            aspectRatio,
          })
        );
      } else {
        const canRetryTextOnly =
          attachedCount > 0 &&
          !input.previousInteractionId &&
          !isUploadEdit &&
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
            preferUriDelivery,
            aspectRatio,
          })
        );
      }
    }
  }

  const settled = await waitForVideo(apiKey, raw);

  return {
    interactionId: settled.raw?.id || raw?.id || '',
    videoUri: settled.videoUri,
    videoBase64: settled.videoBase64,
    mimeType: settled.mimeType,
    raw: { id: settled.raw?.id || raw?.id, status: settled.raw?.status || raw?.status },
  };
}
