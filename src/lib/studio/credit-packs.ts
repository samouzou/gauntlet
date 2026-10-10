import Stripe from 'stripe';

/**
 * Credit packs reuse Prism's Stripe prices (same Verza Stripe account), looked up by
 * lookup key so test and live keys both resolve without hardcoded price ids.
 * 1 credit = 1 second of video, same as Prism.
 */
export const CREDIT_PACKS: Record<number, string> = {
  60: 'prism_video_credits_60',
  200: 'prism_video_credits_200',
  600: 'prism_video_credits_600',
};

/** Checkout metadata purpose, so the shared Stripe account's other webhooks ignore these sessions. */
export const CREDIT_PURCHASE_PURPOSE = 'reelwright_credits';

export interface CreditPack {
  credits: number;
  cents: number;
  priceId: string;
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured.');
  return new Stripe(key, { apiVersion: '2026-01-28.clover' });
}

/** Active packs from Stripe, smallest first. */
export async function listCreditPacks(stripe = getStripe()): Promise<CreditPack[]> {
  const { data } = await stripe.prices.list({
    lookup_keys: Object.values(CREDIT_PACKS),
    active: true,
    limit: 10,
  });
  return Object.entries(CREDIT_PACKS)
    .map(([credits, key]) => {
      const price = data.find((p) => p.lookup_key === key);
      return price?.unit_amount
        ? { credits: Number(credits), cents: price.unit_amount, priceId: price.id }
        : null;
    })
    .filter((p): p is CreditPack => p !== null);
}
