'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';

interface CreateCheckoutSessionProps {
    userId: string;
    priceId: string;
}

export async function createCheckoutSession(props: CreateCheckoutSessionProps) {
    const { userId, priceId } = props;

    if (!userId) {
        throw new Error('User is not authenticated.');
    }

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error('Stripe is not configured.');
    }

    const stripe = new Stripe(key, {
        apiVersion: '2026-01-28.clover',
    });

    const appUrl = (await headers()).get('origin')!;

    const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        allow_promotion_codes: true,
        mode: 'payment',
        success_url: `${appUrl}/studio?checkout=success`,
        cancel_url: `${appUrl}/studio?checkout=cancel`,
        metadata: {
            userId: userId,
        },
    });

    if (!checkoutSession.url) {
        throw new Error('Could not create checkout session');
    }

    redirect(checkoutSession.url);
}
