import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { CREDIT_PACKS, CREDIT_PURCHASE_PURPOSE, getStripe } from '@/lib/studio/credit-packs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded'
  ) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  // The Stripe account is shared with other Verza apps; only act on our own sessions.
  if (session.mode !== 'payment' || session.metadata?.purpose !== CREDIT_PURCHASE_PURPOSE) {
    return NextResponse.json({ received: true });
  }
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true });
  }

  const userId = String(session.metadata?.userId || '');
  const credits = Number(session.metadata?.credits);
  if (!userId || !CREDIT_PACKS[credits]) {
    console.error('[stripe webhook] credit purchase without a user or pack', { sessionId: session.id });
    return NextResponse.json({ received: true });
  }

  try {
    const userRef = adminDb.collection('users').doc(userId);
    const grantRef = adminDb.collection('credit_purchases').doc(session.id);
    const granted = await adminDb.runTransaction(async (tx) => {
      if ((await tx.get(grantRef)).exists) return false;
      // set+merge so a missing profile doesn't fail the grant.
      tx.set(
        userRef,
        { credits: FieldValue.increment(credits), updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      tx.set(grantRef, {
        userId,
        credits,
        amountCents: session.amount_total ?? null,
        paymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    console.info('[stripe webhook] credit pack', { userId, credits, sessionId: session.id, granted });
  } catch (error) {
    console.error('Failed to update user credits:', error);
    return NextResponse.json({ error: 'Failed to update user credits.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
