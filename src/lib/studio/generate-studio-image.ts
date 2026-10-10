/**
 * Studio stills via Gemini image generation (Interactions API).
 * Model: gemini-3.1-flash-image
 * Supports text→image and image→image (restyle).
 */

import { readFile } from 'fs/promises';
import path from 'path';

const IMAGE_MODEL = 'gemini-3.1-flash-image';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export type StudioImageAspect = '1:1' | '3:4' | '4:3' | '16:9' | '9:16';

export interface StudioImageInput {
  prompt: string;
  /** Optional source still for restyle / image→image. */
  sourceImageUrl?: string | null;
  aspectRatio?: StudioImageAspect;
}

export interface StudioImageResult {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

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

function extractImage(raw: any): StudioImageResult | null {
  const consider = (part: any): StudioImageResult | null => {
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

export async function generateStudioImage(
  input: StudioImageInput
): Promise<StudioImageResult> {
  const apiKey = getApiKey();
  const aspectRatio = input.aspectRatio || '1:1';
  const sourceUrl = input.sourceImageUrl?.trim() || null;

  let inputPayload: string | Array<Record<string, unknown>>;

  if (sourceUrl) {
    const source = await fetchImageAsBase64(sourceUrl);
    if (!source) {
      throw new Error('Couldn’t read the source image. Try another still.');
    }
    inputPayload = [
      {
        type: 'text',
        text: [
          'Restyle / transform the attached image according to this direction:',
          input.prompt,
          'Keep the subject recognizable unless the prompt asks otherwise.',
          'No text, logos, watermarks, or UI chrome in the frame.',
        ].join('\n'),
      },
      {
        type: 'image',
        data: source.data,
        mime_type: source.mime_type,
      },
    ];
  } else {
    inputPayload = [
      input.prompt,
      'Cinematic still. No text, logos, watermarks, or UI chrome in the frame.',
    ].join('\n\n');
  }

  const body = {
    model: IMAGE_MODEL,
    input: inputPayload,
    response_format: {
      type: 'image',
      mime_type: 'image/jpeg',
      aspect_ratio: aspectRatio,
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
    throw new Error('Image model finished without a still. Try a clearer prompt.');
  }
  return image;
}
