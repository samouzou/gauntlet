import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/** Starter credits granted when a profile is first created server-side. */
export const STARTER_CREDITS = 5;

/**
 * Spend 1 credit for a generation.
 * If the user profile is missing (common when client create failed or rules
 * blocked it), seed starter credits and spend one so generate isn't blocked
 * by a bare Firestore `5 NOT_FOUND` on update.
 */
export async function spendCredit(userId: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(userId);

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);

      if (!snap.exists) {
        if (STARTER_CREDITS < 1) {
          throw new Error('You’re out of credits. Grab a pack to keep shooting.');
        }
        tx.set(userRef, {
          email: null,
          credits: STARTER_CREDITS - 1,
          total_generations: 1,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      const data = snap.data() || {};
      const credits = Number(data.credits ?? 0);
      if (!Number.isFinite(credits) || credits < 1) {
        throw new Error('You’re out of credits. Grab a pack to keep shooting.');
      }

      // Prefer set+merge over update so a partial/legacy profile can't 404.
      tx.set(
        userRef,
        {
          credits: credits - 1,
          total_generations: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message.includes('out of credits')) throw error;
    if (
      message.includes('NOT_FOUND') ||
      message.includes('not found') ||
      error?.code === 5 ||
      error?.code === 'not-found'
    ) {
      throw new Error(
        'We couldn’t update your credit balance. Sign out and back in, then try again.'
      );
    }
    throw error;
  }
}

/** Refund 1 credit after a failed generation. Never throws. */
export async function refundCredit(userId: string): Promise<void> {
  try {
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.set(
      {
        credits: FieldValue.increment(1),
        total_generations: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('[credits] refund failed', userId, error);
  }
}
