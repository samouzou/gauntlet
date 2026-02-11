'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface CreateCheckoutSessionProps {
    userId: string;
}

export async function createCheckoutSession(props: CreateCheckoutSessionProps) {
    const { userId } = props;

    if (!userId) {
        throw new Error('User is not authenticated.');
    }

    const appUrl = headers().get('origin')!;

    const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: '5 Gauntlet Credits',
                        description: 'Test 5 more video hooks',
                    },
                    unit_amount: 199, // $1.99
                },
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
