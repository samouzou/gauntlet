import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/firebase/admin';
import { getCodeSecret, isValidCode, normalizeCode } from '@/lib/appsumo/codes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLAN = 'appsumo_lifetime';

class RedeemError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Sign in to redeem your code.' }, { status: 401 });
  }

  let uid: string;
  let email: string | null = null;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email || null;
  } catch {
    return NextResponse.json({ ok: false, error: 'Sign in again, then redeem your code.' }, { status: 401 });
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const code = normalizeCode(String(body.code || ''));
  let secret: string;
  try {
    secret = getCodeSecret();
  } catch (error) {
    console.error('[appsumo/redeem] missing secret', error);
    return NextResponse.json(
      { ok: false, error: 'Redemption is temporarily unavailable. Try again shortly.' },
      { status: 503 }
    );
  }

  if (!isValidCode(code, secret)) {
    return NextResponse.json(
      { ok: false, error: 'That code isn’t valid. Check it and try again.' },
      { status: 400 }
    );
  }

  const redemptionRef = adminDb.collection('appsumo_redemptions').doc(code);
  const userRef = adminDb.collection('users').doc(uid);

  try {
    await adminDb.runTransaction(async (tx) => {
      const [redemption, user] = await Promise.all([tx.get(redemptionRef), tx.get(userRef)]);

      if (redemption.exists) {
        throw new RedeemError('That code has already been redeemed.', 409);
      }
      if (user.exists && user.data()?.unlimited === true) {
        throw new RedeemError('Your account already has lifetime access.', 409);
      }

      tx.set(redemptionRef, {
        userId: uid,
        email,
        plan: PLAN,
        redeemedAt: FieldValue.serverTimestamp(),
      });
      tx.set(
        userRef,
        {
          plan: PLAN,
          unlimited: true,
          appsumoCode: code,
          planActivatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          ...(user.exists
            ? {}
            : { email: email || '', credits: 0, total_generations: 0, createdAt: FieldValue.serverTimestamp() }),
        },
        { merge: true }
      );
    });
  } catch (error) {
    if (error instanceof RedeemError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[appsumo/redeem] failed', error);
    return NextResponse.json(
      { ok: false, error: 'We couldn’t redeem that code. Try again in a moment.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, plan: PLAN });
}
