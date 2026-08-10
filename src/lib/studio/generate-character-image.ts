/**
 * Character stills via Gemini image generation (Interactions API).
 * Model: gemini-3.1-flash-image (Nano Banana 2)
 * Docs: https://ai.google.dev/gemini-api/docs/interactions/image-generation
 */

const IMAGE_MODEL = 'gemini-3.1-flash-image';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface CharacterImageInput {
  name: string;
  description: string;
  style: string;
}

export interface CharacterImageResult {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

function getApiKey() {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not available.');
  }
  return key;
}

function buildPortraitPrompt(input: CharacterImageInput) {
  return [
    `Cinematic character portrait of ${input.name}.`,
    input.description,
    `Visual style: ${input.style}.`,
    'Single subject, upper body / head-and-shoulders, clear face, soft key light, shallow depth of field.',
    'Illustrated or stylized cinematic look — not a photograph of a real celebrity.',
    'No text, logos, watermarks, or UI chrome in the frame.',
  ].join(' ');
}

function extractImage(raw: any): CharacterImageResult | null {
  const consider = (part: any): CharacterImageResult | null => {
    if (!part) return null;
    if (part.type && part.type !== 'image') return null;
    const data = part.data || part.inline_data?.data;
    if (!data || typeof data !== 'string') return null;
    const mime =
      part.mime_type ||
      part.inline_data?.mime_type ||
      'image/png';
    const mimeType =
      mime === 'image/jpeg' || mime === 'image/webp' || mime === 'image/png'
        ? mime
        : 'image/png';
    return { imageBase64: data, mimeType };
  };

  if (raw?.output_image) {
    const fromConvenience = consider({ type: 'image', ...raw.output_image });
    if (fromConvenience) return fromConvenience;
  }

  for (const part of Array.isArray(raw?.outputs) ? raw.outputs : []) {
    const hit = consider(part);
    if (hit) return hit;
  }

  for (const step of Array.isArray(raw?.steps) ? raw.steps : []) {
    for (const part of step?.content || []) {
      const hit = consider(part);
      if (hit) return hit;
    }
  }

  // Deep scan fallback
  const stack = [raw];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    const hit = consider(node);
    if (hit) return hit;
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') stack.push(value);
    }
  }

  return null;
}

export async function generateCharacterImage(
  input: CharacterImageInput
): Promise<CharacterImageResult> {
  const apiKey = getApiKey();
  const prompt = buildPortraitPrompt(input);

  const body = {
    model: IMAGE_MODEL,
    input: prompt,
    response_format: {
      type: 'image',
      mime_type: 'image/jpeg',
      aspect_ratio: '3:4',
    },
  };

  const response = await fetch(
    `${API_BASE}/interactions?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    }
  );

  const text = await response.text();
  let raw: any = {};
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    raw = { message: text.slice(0, 400) };
  }

  if (!response.ok) {
    const message =
      raw?.error?.message || raw?.message || `Image generation failed (HTTP ${response.status})`;
    throw new Error(message);
  }

  const image = extractImage(raw);
  if (!image) {
    throw new Error('Image model finished without a portrait payload. Try a clearer description.');
  }
  return image;
}
