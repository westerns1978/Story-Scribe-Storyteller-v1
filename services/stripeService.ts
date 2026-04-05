// services/stripeService.ts
// ============================================
// Stripe Checkout integration for Wissums
// Routes through Supabase edge function (wissums-checkout)
// ============================================

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';
const CHECKOUT_URL = `${SUPABASE_URL}/functions/v1/wissums-checkout`;

export const PRICES = {
  basic: { amount: 19, label: 'Basic Story', description: 'Cinematic story + shareable link' },
  premium: { amount: 49, label: 'Full Memory Book', description: 'Everything + MP4 movie + PDF memory book' },
} as const;

export type Tier = 'basic' | 'premium';

/**
 * Creates a Stripe Checkout session via edge function.
 * Returns the checkout URL to redirect the user to.
 */
export async function createCheckoutSession(
  tier: Tier,
  petName?: string,
): Promise<{ checkoutUrl: string; sessionId: string }> {
  const origin = window.location.origin;

  const res = await fetch(CHECKOUT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: 'create_checkout',
      tier,
      pet_name: petName || '',
      success_url: `${origin}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}?payment=cancelled`,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Checkout failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    checkoutUrl: data.checkout_url,
    sessionId: data.session_id,
  };
}

/**
 * Verifies payment was successful by checking with Stripe via edge function.
 */
export async function verifyPayment(stripeSessionId: string): Promise<{
  paid: boolean;
  tier: Tier | null;
  petName?: string;
}> {
  const res = await fetch(CHECKOUT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: 'verify_payment',
      stripe_session_id: stripeSessionId,
    }),
  });

  if (!res.ok) {
    console.warn('[stripeService] Verify failed:', res.status);
    return { paid: false, tier: null };
  }

  const data = await res.json();
  return {
    paid: data.paid || false,
    tier: data.tier || null,
    petName: data.pet_name || undefined,
  };
}
