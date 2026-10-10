'use server';
import { headers } from 'next/headers';
import {
  CREDIT_PACKS,
  CREDIT_PURCHASE_PURPOSE,
  getStripe,
  listCreditPacks,
} from '@/lib/studio/credit-packs';

export async function getCreditPacks(): Promise<{ credits: number; cents: number }[]> {
  try {
    const packs = await listCreditPacks();
    return packs.map(({ credits, cents }) => ({ credits, cents }));
  } catch (error: any) {
    console.warn('[checkout] could not load credit packs', String(error?.message || error));
    return [];
  }
}

export async function createCheckoutSession(props: {
  userId: string;
  credits: number;
}): Promise<{ url: string }> {
  const { userId, credits } = props;
  if (!userId) {
    throw new Error('User is not authenticated.');
  }
  if (!CREDIT_PACKS[credits]) {
    throw new Error('Pick a credit pack.');
  }

  const stripe = getStripe();
  const pack = (await listCreditPacks(stripe)).find((p) => p.credits === credits);
  if (!pack) {
    throw new Error('Credit packs aren’t available right now.');
  }

  const appUrl = (await headers()).get('origin')!;
  const metadata = {
    app: 'reelwright',
    purpose: CREDIT_PURCHASE_PURPOSE,
    userId,
    credits: String(credits),
  };

  const checkoutSession = await stripe.checkout.sessions.create({
    line_items: [{ price: pack.priceId, quantity: 1 }],
    allow_promotion_codes: true,
    mode: 'payment',
    success_url: `${appUrl}/studio?checkout=success`,
    cancel_url: `${appUrl}/studio?checkout=cancel`,
    metadata,
    payment_intent_data: {
      metadata,
      description: `Reelwright credits: ${credits}`,
    },
  });

  if (!checkoutSession.url) {
    throw new Error('Could not create checkout session');
  }
  return { url: checkoutSession.url };
}
