import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2026-01-28.clover' });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
  }

  let event: Stripe.Event;
  const stripe = getStripe();

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      if (!userId) {
        console.error('Webhook Error: No userId in checkout session metadata');
        break;
      }

      try {
        const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items'],
        });

        const priceId = sessionWithLineItems.line_items?.data[0]?.price?.id;
        if (!priceId) {
          return NextResponse.json(
            { error: 'Could not determine purchased product.' },
            { status: 400 }
          );
        }

        const productQuery = await adminDb
          .collection('products')
          .where('stripe_price_id', '==', priceId)
          .limit(1)
          .get();

        if (productQuery.empty) {
          return NextResponse.json(
            { error: 'Purchased product not found in our system.' },
            { status: 400 }
          );
        }

        const creditAmount = productQuery.docs[0].data().credit_amount;
        if (typeof creditAmount !== 'number' || creditAmount <= 0) {
          return NextResponse.json({ error: 'Invalid product configuration.' }, { status: 500 });
        }

        await adminDb.collection('users').doc(userId).update({
          credits: FieldValue.increment(creditAmount),
        });
      } catch (error) {
        console.error('Failed to update user credits:', error);
        return NextResponse.json(
          { error: 'Failed to update user credits in database.' },
          { status: 500 }
        );
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
