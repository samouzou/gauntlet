/**
 * Gemini Files API (resumable upload) for source clips used in Arc edits.
 * Docs: https://ai.google.dev/gemini-api/docs/files
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const UPLOAD_BASE = 'https://generativelanguage.googleapis.com/upload/v1beta';
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 36; // ~3 min for file processing

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

function extractFileId(nameOrUri: string): string | null {
  const match = nameOrUri.match(/files\/([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
}

async function getFile(apiKey: string, fileId: string): Promise<any> {
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
    throw new Error(
      `Files API get failed (HTTP ${response.status}): ${raw?.error?.message || 'unknown'}`
    );
  }
  return raw;
}

async function waitUntilActive(apiKey: string, fileId: string, initial?: any): Promise<any> {
  let file = initial;
  for (let i = 0; i < MAX_POLLS; i += 1) {
    if (!file) file = await getFile(apiKey, fileId);
    const state = String(file?.state || file?.file?.state || '').toUpperCase();
    if (state === 'ACTIVE' || state.includes('ACTIVE')) {
      return file?.file || file;
    }
    if (state === 'FAILED' || state.includes('FAILED')) {
      throw new Error('Source clip processing failed. Try a shorter mp4/webm under 10 seconds.');
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    file = await getFile(apiKey, fileId);
  }
  throw new Error('Timed out waiting for the source clip to become ready.');
}

/**
 * Upload bytes to the Gemini Files API and wait until the file is ACTIVE.
 * Returns the file URI used as a document/video reference in Interactions.
 */
export async function uploadVideoToFilesApi(opts: {
  buffer: Buffer;
  mimeType: string;
  displayName?: string;
}): Promise<{ uri: string; name: string; mimeType: string }> {
  const apiKey = getApiKey();
  const mimeType = opts.mimeType || 'video/mp4';
  const numBytes = opts.buffer.byteLength;
  const displayName = (opts.displayName || 'reelwright-source').slice(0, 80);

  const startResponse = await fetch(`${UPLOAD_BASE}/files?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(numBytes),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!startResponse.ok) {
    const text = await startResponse.text().catch(() => '');
    throw new Error(
      `Files API start failed (HTTP ${startResponse.status}): ${text.slice(0, 300)}`
    );
  }

  const uploadUrl =
    startResponse.headers.get('x-goog-upload-url') ||
    startResponse.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    throw new Error('Files API did not return an upload URL.');
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(numBytes),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: new Uint8Array(opts.buffer),
    signal: AbortSignal.timeout(180_000),
  });

  const fileInfo = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok) {
    throw new Error(
      `Files API upload failed (HTTP ${uploadResponse.status}): ${
        fileInfo?.error?.message || 'unknown'
      }`
    );
  }

  const file = fileInfo?.file || fileInfo;
  const name = String(file?.name || '');
  const uri = String(file?.uri || '');
  const fileId = extractFileId(name || uri);
  if (!fileId) {
    throw new Error('Files API upload succeeded but returned no file id.');
  }

  const active = await waitUntilActive(apiKey, fileId, fileInfo);
  const activeUri = String(active?.uri || uri);
  const activeName = String(active?.name || name || `files/${fileId}`);
  if (!activeUri) {
    throw new Error('Files API file became active without a URI.');
  }

  console.info('[files-api] source clip ready', {
    name: activeName,
    mimeType: active?.mimeType || mimeType,
    sizeBytes: active?.sizeBytes || numBytes,
  });

  return {
    uri: activeUri,
    name: activeName,
    mimeType: String(active?.mimeType || mimeType),
  };
}

/** Fetch a publicly reachable https URL (e.g. Firebase download URL) as a Buffer. */
export async function fetchRemoteVideoBuffer(url: string): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new Error(`Could not download the source clip (HTTP ${response.status}).`);
  }
  const contentType = (response.headers.get('content-type') || 'video/mp4')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const mimeType = contentType.startsWith('video/') ? contentType : 'video/mp4';
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error('Source clip download was empty.');
  }
  if (buffer.byteLength > 80 * 1024 * 1024) {
    throw new Error('Source clip is too large. Keep uploads under 80MB.');
  }
  return { buffer, mimeType };
}
