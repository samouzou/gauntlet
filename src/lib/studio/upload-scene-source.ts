'use client';

import { FirebaseApp } from 'firebase/app';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';

/** Soft caps for Omni uploaded-video edits (~10s clips). */
export const SCENE_SOURCE_MAX_BYTES = 200 * 1024 * 1024;
export const SCENE_SOURCE_MAX_DURATION_SEC = 10;

const ALLOWED_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number(video.duration);
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Could not read that clip’s length. Try another file.'));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that clip. Try an mp4 or webm.'));
    };
    video.src = url;
  });
}

export async function uploadSceneSource(opts: {
  app: FirebaseApp;
  userId: string;
  file: File;
}): Promise<{ url: string; durationSec: number; mimeType: string }> {
  const { app, userId, file } = opts;

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Upload an mp4, webm, or QuickTime clip.');
  }
  if (file.size > SCENE_SOURCE_MAX_BYTES) {
    throw new Error('Keep source clips under 200MB.');
  }

  const durationSec = await readVideoDurationSeconds(file);
  if (durationSec > SCENE_SOURCE_MAX_DURATION_SEC + 0.35) {
    throw new Error('Keep source clips around 10 seconds or less.');
  }

  const storage = getStorage(app);
  const ext =
    file.type === 'video/webm'
      ? 'webm'
      : file.type === 'video/quicktime'
        ? 'mov'
        : 'mp4';
  const objectPath = `users/${userId}/scene-sources/${crypto.randomUUID()}.${ext}`;
  const storageRef = ref(storage, objectPath);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name.slice(0, 120),
      durationSec: String(Math.round(durationSec * 10) / 10),
    },
  });

  const url = await getDownloadURL(storageRef);
  return { url, durationSec, mimeType: file.type };
}
