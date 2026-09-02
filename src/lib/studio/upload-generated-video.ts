import { randomUUID } from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { firebaseConfig } from '@/firebase/config';
// Ensure Admin app is initialized before Storage access.
import '@/firebase/admin';

/**
 * Persist an Omni video (base64 or remote URI) to Firebase Storage and return
 * a downloadable URL. Keeps huge payloads out of Server Action responses.
 */
export async function persistGeneratedVideo(opts: {
  userId: string;
  sceneId: string;
  videoBase64?: string | null;
  videoUri?: string | null;
  mimeType?: string | null;
  /** Optional suffix so edits don't overwrite/cache-bust the previous cut. */
  revision?: string | null;
}): Promise<string | null> {
  const mimeType = opts.mimeType || 'video/mp4';
  const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
  let buffer: Buffer | null = null;

  if (opts.videoBase64) {
    buffer = Buffer.from(opts.videoBase64, 'base64');
  } else if (opts.videoUri) {
    // Prefer mirroring into our bucket. Google file URIs usually need an API key;
    // if the unauthenticated fetch fails, fall back to the remote URI.
    if (
      opts.videoUri.startsWith('https://generativelanguage.googleapis.com/') ||
      opts.videoUri.startsWith('https://')
    ) {
      try {
        const res = await fetch(opts.videoUri, { signal: AbortSignal.timeout(120_000) });
        if (res.ok) {
          buffer = Buffer.from(await res.arrayBuffer());
        } else {
          return opts.videoUri;
        }
      } catch {
        return opts.videoUri;
      }
    }
  }

  if (!buffer || buffer.byteLength === 0) {
    return opts.videoUri || null;
  }

  const bucket = getStorage().bucket(firebaseConfig.storageBucket);
  const safeRevision = (opts.revision || 'latest').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const objectPath = `users/${opts.userId}/scenes/${opts.sceneId}-${safeRevision || 'latest'}.${ext}`;
  const file = bucket.file(objectPath);
  const downloadToken = randomUUID();

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: mimeType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  return (
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
    `${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`
  );
}
