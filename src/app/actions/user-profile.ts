'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { STARTER_CREDITS } from '@/lib/studio/credits';
import { z } from 'zod';

const profileSchema = z.object({
  userId: z.string().min(1),
  email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  displayName: z.string().optional().nullable(),
  photoURL: z.string().optional().nullable(),
});

/**
 * Ensure a Firestore users/{uid} profile exists.
 * Uses Admin SDK so client security-rule mismatches can't block signup writes.
 */
export async function ensureUserProfile(input: z.infer<typeof profileSchema>) {
  const data = profileSchema.parse(input);
  const userRef = adminDb.collection('users').doc(data.userId);
  const snap = await userRef.get();

  if (!snap.exists) {
    await userRef.set({
      email: data.email || '',
      displayName: data.displayName || null,
      photoURL: data.photoURL || null,
      credits: STARTER_CREDITS,
      total_generations: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { created: true, credits: STARTER_CREDITS };
  }

  const existing = snap.data() || {};
  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (typeof existing.credits !== 'number') {
    patch.credits = STARTER_CREDITS;
  }
  if (data.email && !existing.email) {
    patch.email = data.email;
  }
  if (data.displayName && !existing.displayName) {
    patch.displayName = data.displayName;
  }
  if (data.photoURL && !existing.photoURL) {
    patch.photoURL = data.photoURL;
  }

  if (Object.keys(patch).length > 1) {
    await userRef.set(patch, { merge: true });
  }

  return {
    created: false,
    credits: typeof existing.credits === 'number' ? existing.credits : STARTER_CREDITS,
  };
}
