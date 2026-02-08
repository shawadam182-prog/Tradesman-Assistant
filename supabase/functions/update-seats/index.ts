import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Admin User Seat price ID — £10/mo per admin user
const SEAT_PRICE_ID = 'price_1SyUrfGiHvsip9mTXoJ3riNO';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { seatCount } = await req.json();

    if (typeof seatCount !== 'number' || seatCount < 0 || !Number.isInteger(seatCount)) {
      return new Response(
        JSON.stringify({ error: 'seatCount must be a non-negative integer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's subscription info
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('stripe_customer_id, stripe_subscription_id, admin_seat_count, subscription_status, subscription_tier')
      .eq('user_id', user.id)
      .single();

    // Check subscription status
    const subscriptionStatus = settings?.subscription_status;
    const hasActiveOrTrialing = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

    if (!hasActiveOrTrialing) {
      return new Response(
        JSON.stringify({ error: 'You must have an active subscription or be in trial to manage admin seats' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If user has a Stripe subscription, update via Stripe API
    if (settings?.stripe_subscription_id) {
      // Retrieve current subscription
      const subscription = await stripe.subscriptions.retrieve(settings.stripe_subscription_id);

      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        return new Response(
          JSON.stringify({ error: 'Your Stripe subscription must be active to manage admin seats' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find existing seat line item
      const seatItem = subscription.items.data.find(
        (item: any) => item.price.id === SEAT_PRICE_ID
      );

      if (seatCount === 0 && seatItem) {
        // Remove seat line item entirely
        await stripe.subscriptions.update(subscription.id, {
          items: [{ id: seatItem.id, deleted: true }],
          proration_behavior: 'create_prorations',
        });
      } else if (seatCount > 0 && seatItem) {
        // Update existing seat quantity
        await stripe.subscriptions.update(subscription.id, {
          items: [{ id: seatItem.id, quantity: seatCount }],
          proration_behavior: 'create_prorations',
        });
      } else if (seatCount > 0 && !seatItem) {
        // Add new seat line item
        await stripe.subscriptions.update(subscription.id, {
          items: [{ price: SEAT_PRICE_ID, quantity: seatCount }],
          proration_behavior: 'create_prorations',
        });
      }
      // seatCount === 0 && !seatItem → nothing to do
    }
    // If no Stripe subscription (e.g., trialing or owner), just update the local count

    // Update local admin seat count
    await supabaseAdmin
      .from('user_settings')
      .update({
        admin_seat_count: seatCount,
        team_seat_count: seatCount, // Keep in sync
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ success: true, seatCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update seats error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
