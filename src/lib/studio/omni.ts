/**
 * Gemini Omni Flash via Interactions API.
 * Docs: gemini-omni-flash-preview + POST /v1beta/interactions
 */

const OMNI_MODEL = 'gemini-omni-flash-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface OmniGenerateInput {
  prompt: string;
  /** Optional public image URLs used as character / style references */
  referenceImageUrls?: string[];
  /** Continue an existing Omni conversation for edits */
  previousInteractionId?: string | null;
  task?: 'text_to_video' | 'edit' | 'image_to_video';
}

export interface OmniGenerateResult {
  interactionId: string;
  videoUri?: string | null;
  videoBase64?: string | null;
  mimeType?: string | null;
  raw: unknown;
}

function getApiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('Missing GEMINI_API_KEY (or GOOGLE_GENAI_API_KEY) for Gemini Omni.');
  }
  return key;
}

function buildPromptWithRefs(prompt: string, refCount: number) {
  if (refCount === 0) return prompt;
  const tags = Array.from({ length: refCount }, (_, i) => `<IMAGE_REF_${i}>`).join(' ');
  return `${tags}\n\nKeep the referenced character(s) visually consistent.\n\n${prompt}`;
}

export async function generateWithOmni(input: OmniGenerateInput): Promise<OmniGenerateResult> {
  const apiKey = getApiKey();
  const refs = input.referenceImageUrls || [];
  const promptText = buildPromptWithRefs(input.prompt, refs.length);

  const contentParts: Array<Record<string, unknown>> = [
    { type: 'text', text: promptText },
  ];

  for (const url of refs) {
    contentParts.push({
      type: 'image',
      uri: url,
    });
  }

  const body: Record<string, unknown> = {
    model: OMNI_MODEL,
    input: [
      {
        role: 'user',
        content: contentParts,
      },
    ],
    store: true,
    response_modalities: ['video'],
  };

  if (input.previousInteractionId) {
    body.previous_interaction_id = input.previousInteractionId;
  }

  // Preview APIs evolve — keep generation hints soft.
  body.generation_config = {
    video: {
      aspect_ratio: '16:9',
    },
  };

  const response = await fetch(`${API_BASE}/interactions?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  const interactionId = raw.id || raw.interaction_id || raw.name || '';
  let videoUri: string | null = null;
  let videoBase64: string | null = null;
  let mimeType: string | null = null;

  const steps = raw.steps || raw.output || [];
  for (const step of steps) {
    const contents = step.content || step.contents || [];
    for (const part of contents) {
      if (part.type === 'video' || part.video || part.output_video) {
        const video = part.video || part.output_video || part;
        videoUri = video.uri || video.url || part.uri || null;
        videoBase64 = video.data || part.data || null;
        mimeType = video.mime_type || video.mimeType || part.mime_type || 'video/mp4';
      }
      if (part.inlineData?.mimeType?.startsWith('video/')) {
        videoBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType;
      }
    }
  }

  // Some responses nest outputs differently
  if (!videoUri && !videoBase64 && raw.output_video?.uri) {
    videoUri = raw.output_video.uri;
    mimeType = raw.output_video.mime_type || 'video/mp4';
  }

  return {
    interactionId,
    videoUri,
    videoBase64,
    mimeType,
    raw,
  };
}
