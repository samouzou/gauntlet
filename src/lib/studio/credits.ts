import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/** Starter credits when a profile is first created server-side. */
export const STARTER_CREDITS = 15;

/**
 * Spend `amount` credits for a generation.
 * If the user profile is missing, seed starter credits and spend so generate
 * isn't blocked by a bare Firestore `5 NOT_FOUND` on update.
 */
export async function spendCredits(userId: string, amount: number): Promise<void> {
  const cost = Math.max(1, Math.floor(amount));
  const userRef = adminDb.collection('users').doc(userId);

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);

      if (!snap.exists) {
        if (STARTER_CREDITS < cost) {
          throw new Error('You’re out of credits. Grab a pack to keep creating.');
        }
        tx.set(userRef, {
          email: null,
          credits: STARTER_CREDITS - cost,
          total_generations: 1,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      const data = snap.data() || {};
      const credits = Number(data.credits ?? 0);
      if (!Number.isFinite(credits) || credits < cost) {
        throw new Error('You’re out of credits. Grab a pack to keep creating.');
      }

      tx.set(
        userRef,
        {
          credits: credits - cost,
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

/** @deprecated Prefer spendCredits(userId, amount). */
export async function spendCredit(userId: string): Promise<void> {
  return spendCredits(userId, 1);
}

/** Refund `amount` credits after a failed generation. Never throws. */
export async function refundCredits(userId: string, amount: number): Promise<void> {
  const cost = Math.max(1, Math.floor(amount));
  try {
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.set(
      {
        credits: FieldValue.increment(cost),
        total_generations: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('[credits] refund failed', userId, amount, error);
  }
}

/** @deprecated Prefer refundCredits(userId, amount). */
export async function refundCredit(userId: string): Promise<void> {
  return refundCredits(userId, 1);
}
