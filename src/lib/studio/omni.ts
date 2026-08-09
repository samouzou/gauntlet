/**
 * Gemini Omni Flash via Interactions API (REST).
 * Field names are snake_case — do not send camelCase.
 * Docs: https://ai.google.dev/gemini-api/docs/omni
 */

const OMNI_MODEL = 'gemini-omni-flash-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

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
  | { type: 'image'; data: string; mime_type: string }
  | { type: 'document'; uri: string };

function getApiKey() {
  // Prefer GEMINI_API_KEY; fall back only if another Google AI key is already wired.
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not available in this environment.');
  }
  return key;
}

function buildPromptWithRefs(prompt: string, refCount: number) {
  if (refCount === 0) return prompt;
  const tags = Array.from({ length: refCount }, (_, i) => `<IMAGE_REF_${i}>`).join(' ');
  return `${tags}\n\nKeep the referenced character(s) visually consistent.\n\n${prompt}`;
}

async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; mime_type: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const mime_type = contentType.split(';')[0].trim() || 'image/jpeg';
    if (!mime_type.startsWith('image/')) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return { data: buffer.toString('base64'), mime_type };
  } catch {
    return null;
  }
}

function extractVideoFromSteps(raw: any): {
  videoUri: string | null;
  videoBase64: string | null;
  mimeType: string | null;
} {
  let videoUri: string | null = null;
  let videoBase64: string | null = null;
  let mimeType: string | null = null;

  const steps = Array.isArray(raw?.steps) ? raw.steps : [];
  for (const step of steps) {
    if (step?.type && step.type !== 'model_output') continue;
    const contents = step?.content || [];
    for (const part of contents) {
      if (part?.type !== 'video') continue;
      mimeType = part.mime_type || 'video/mp4';
      if (part.data) videoBase64 = part.data;
      if (part.uri) videoUri = part.uri;
    }
  }

  // SDK convenience field may appear in some proxies; prefer snake_case.
  if (!videoUri && !videoBase64 && raw?.output_video) {
    videoBase64 = raw.output_video.data || null;
    videoUri = raw.output_video.uri || null;
    mimeType = raw.output_video.mime_type || mimeType || 'video/mp4';
  }

  return { videoUri, videoBase64, mimeType };
}

export async function generateWithOmni(input: OmniGenerateInput): Promise<OmniGenerateResult> {
  const apiKey = getApiKey();
  const refs = input.referenceImageUrls || [];
  const promptText = buildPromptWithRefs(input.prompt, refs.length);

  const contentParts: OmniContentPart[] = [];

  for (const url of refs) {
    const image = await fetchImageAsBase64(url);
    if (image) {
      contentParts.push({
        type: 'image',
        data: image.data,
        mime_type: image.mime_type,
      });
    }
  }

  contentParts.push({ type: 'text', text: promptText });

  const task =
    input.task ||
    (input.previousInteractionId
      ? 'edit'
      : refs.length > 0
        ? 'reference_to_video'
        : 'text_to_video');

  // REST body: snake_case only. `input` is a string or content-part array (not role-wrapped).
  const body: Record<string, unknown> = {
    model: OMNI_MODEL,
    input: contentParts.length === 1 && contentParts[0].type === 'text'
      ? promptText
      : contentParts,
    store: true,
    response_format: {
      type: 'video',
      aspect_ratio: '16:9',
      delivery: 'uri',
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

  const response = await fetch(`${API_BASE}/interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const raw = await response.json();
  if (!response.ok) {
    const message =
      raw?.error?.message ||
      raw?.message ||
      `Omni request failed (${response.status})`;
    throw new Error(message);
  }

  const interactionId = raw.id || '';
  const { videoUri, videoBase64, mimeType } = extractVideoFromSteps(raw);

  return {
    interactionId,
    videoUri,
    videoBase64,
    mimeType,
    raw,
  };
}
