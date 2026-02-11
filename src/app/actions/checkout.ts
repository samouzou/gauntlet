'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
});

interface CreateCheckoutSessionProps {
    userId: string;
    priceId: string; // Accept a dynamic price ID
}

export async function createCheckoutSession(props: CreateCheckoutSessionProps) {
    const { userId, priceId } = props;

    if (!userId) {
        throw new Error('User is not authenticated.');
    }

    const appUrl = headers().get('origin')!;

    const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price: priceId, // Use the dynamic price ID
                quantity: 1,
            },
        ],
        allow_promotion_codes: true,
        mode: 'payment',
        success_url: `${appUrl}/`,
        cancel_url: `${appUrl}/`,
        metadata: {
            userId: userId,
        },
    });

    if (!checkoutSession.url) {
        throw new Error('Could not create checkout session');
    }

    redirect(checkoutSession.url);
}
