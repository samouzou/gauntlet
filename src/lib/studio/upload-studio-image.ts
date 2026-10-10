'use client';

import { FirebaseApp } from 'firebase/app';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Upload a source still for Restyle / Animate (client → Storage). */
export async function uploadStudioImage(opts: {
  app: FirebaseApp;
  userId: string;
  file: File;
}): Promise<string> {
  const { app, userId, file } = opts;

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Upload a JPEG, PNG, WebP, or GIF image.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Keep source images under 8MB.');
  }

  const storage = getStorage(app);
  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/gif'
          ? 'gif'
          : 'jpg';
  const objectPath = `users/${userId}/images/sources/${crypto.randomUUID()}.${ext}`;
  const storageRef = ref(storage, objectPath);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name.slice(0, 120),
    },
  });

  return getDownloadURL(storageRef);
}
