
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
// To enable the database update, you would need to use the Firebase Admin SDK.
// 1. Add 'firebase-admin' to your package.json
// 2. Initialize the admin app with your service account credentials.
// import { initializeApp, cert } from 'firebase-admin/app';
// import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);

// if (!admin.apps.length) {
//   initializeApp({
//     credential: cert(serviceAccount),
//   });
// }

// const adminDb = getFirestore();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
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
        // --- DATABASE UPDATE LOGIC (NEEDS ADMIN SDK) ---
        // This is the part that requires the Firebase Admin SDK.
        // Once the Admin SDK is configured (see comments at top of file),
        // you can uncomment this block to automatically update user credits.

        /*
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({
          credits: FieldValue.increment(5),
        });
        console.log(`Successfully added 5 credits to user ${userId}`);
        */
        
        console.log(`[SKIPPED] Would add 5 credits to user ${userId}. Enable Admin SDK to automate.`);

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
