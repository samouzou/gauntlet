
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
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
        // Retrieve the session with line items to get the price ID
        const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
          session.id,
          { expand: ['line_items'] }
        );

        const priceId = sessionWithLineItems.line_items?.data[0]?.price?.id;

        if (!priceId) {
          console.error(`Webhook Error: Could not find price ID for session ${session.id}`);
          return NextResponse.json({ error: 'Could not determine purchased product.' }, { status: 400 });
        }

        // Look up the product in our Firestore 'products' collection
        const productsRef = adminDb.collection('products');
        const productQuery = await productsRef.where('stripe_price_id', '==', priceId).limit(1).get();

        if (productQuery.empty) {
          console.error(`Webhook Error: No product found in Firestore with stripe_price_id ${priceId}`);
          return NextResponse.json({ error: 'Purchased product not found in our system.' }, { status: 400 });
        }
        
        const productData = productQuery.docs[0].data();
        const creditAmount = productData.credit_amount;

        if (typeof creditAmount !== 'number' || creditAmount <= 0) {
            console.error(`Webhook Error: Invalid credit_amount for product with price_id ${priceId}`);
            return NextResponse.json({ error: 'Invalid product configuration.' }, { status: 500 });
        }

        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({
          credits: FieldValue.increment(creditAmount),
        });
        console.log(`Successfully added ${creditAmount} credits to user ${userId}`);
        
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
