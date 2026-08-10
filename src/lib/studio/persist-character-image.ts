import { randomUUID } from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { firebaseConfig } from '@/firebase/config';
import '@/firebase/admin';

export async function persistCharacterImage(opts: {
  userId: string;
  characterId: string;
  imageBase64: string;
  mimeType: string;
}): Promise<string> {
  const ext =
    opts.mimeType === 'image/png'
      ? 'png'
      : opts.mimeType === 'image/webp'
        ? 'webp'
        : 'jpg';
  const buffer = Buffer.from(opts.imageBase64, 'base64');
  if (!buffer.byteLength) {
    throw new Error('Generated character image was empty.');
  }

  const bucket = getStorage().bucket(firebaseConfig.storageBucket);
  const objectPath = `users/${opts.userId}/characters/${opts.characterId}.${ext}`;
  const file = bucket.file(objectPath);
  const downloadToken = randomUUID();

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: opts.mimeType || 'image/jpeg',
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
