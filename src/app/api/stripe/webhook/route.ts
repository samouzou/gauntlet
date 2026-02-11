
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      if (!userId) {
        console.error('Webhook Error: No userId in checkout session metadata');
        break;
      }
      
      console.log(`Checkout session completed for user: ${userId}`);

      try {
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({
          credits: FieldValue.increment(5),
        });
        console.log(`Successfully added 5 credits to user ${userId}`);
        
      } catch (error) {
        console.error('Failed to update user credits:', error);
        // Return a 500 status if the database update fails
        return NextResponse.json({ error: 'Failed to update user credits in database.' }, { status: 500 });
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
