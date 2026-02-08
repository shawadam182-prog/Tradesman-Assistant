import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Map price IDs to subscription tiers (Live Mode)
const PRICE_TO_TIER: Record<string, string> = {
  'price_1SqyvEK6gNizuAaGquTjgPXM': 'professional',
  'price_1SqywGK6gNizuAaGnTi0Pek8': 'business',
  'price_1SqywzK6gNizuAaGmBTYOfKl': 'enterprise',
};

// Field Worker Seat price ID — replace with actual price after creating in Stripe Dashboard
const SEAT_PRICE_ID = 'price_1SyUrfGiHvsip9mTXoJ3riNO';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify webhook signature
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received event:', event.type);

    // Helper to update user settings
    async function updateUserSettings(
      stripeCustomerId: string,
      updates: Record<string, any>
    ) {
      const { error } = await supabaseAdmin
        .from('user_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', stripeCustomerId);

      if (error) {
        console.error('Error updating user settings:', error);
        throw error;
      }
    }

    // Helper to parse subscription items — finds base plan tier and seat count
    function parseSubscription(subscription: Stripe.Subscription): { tier: string; seatCount: number } {
      let tier = 'professional';
      let seatCount = 0;

      for (const item of subscription.items.data) {
        const priceId = item.price?.id;
        if (priceId && PRICE_TO_TIER[priceId]) {
          tier = PRICE_TO_TIER[priceId];
        } else if (priceId === SEAT_PRICE_ID) {
          seatCount = item.quantity || 0;
        }
      }

      return { tier, seatCount };
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const { tier, seatCount } = parseSubscription(subscription);

          await updateUserSettings(customerId, {
            stripe_subscription_id: subscriptionId,
            subscription_tier: tier,
            subscription_status: subscription.status === 'trialing' ? 'trialing' : 'active',
            team_seat_count: seatCount,
            trial_end: subscription.trial_end && subscription.trial_end > 0
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            subscription_period_end: subscription.current_period_end && subscription.current_period_end > 0
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          });
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const { tier, seatCount } = parseSubscription(subscription);

        await updateUserSettings(customerId, {
          stripe_subscription_id: subscription.id,
          subscription_tier: tier,
          subscription_status: subscription.status === 'trialing' ? 'trialing' : 'active',
          team_seat_count: seatCount,
          trial_end: subscription.trial_end && subscription.trial_end > 0
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          subscription_period_end: subscription.current_period_end && subscription.current_period_end > 0
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const { tier, seatCount } = parseSubscription(subscription);

        // Map Stripe status to our status
        let status = 'active';
        if (subscription.status === 'trialing') {
          status = 'trialing';
        } else if (subscription.status === 'past_due') {
          status = 'past_due';
        } else if (subscription.status === 'canceled') {
          status = 'cancelled';
        } else if (subscription.status === 'unpaid') {
          status = 'expired';
        }

        await updateUserSettings(customerId, {
          subscription_tier: tier,
          subscription_status: status,
          team_seat_count: seatCount,
          trial_end: subscription.trial_end && subscription.trial_end > 0
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          subscription_period_end: subscription.current_period_end && subscription.current_period_end > 0
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Reset everything — deactivate team members
        await updateUserSettings(customerId, {
          subscription_status: 'cancelled',
          subscription_tier: 'free',
          team_seat_count: 0,
        });

        // Deactivate all team members for this owner
        const { data: ownerSettings } = await supabaseAdmin
          .from('user_settings')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (ownerSettings?.user_id) {
          const { data: team } = await supabaseAdmin
            .from('teams')
            .select('id')
            .eq('owner_id', ownerSettings.user_id)
            .maybeSingle();

          if (team) {
            await supabaseAdmin
              .from('team_members')
              .update({ status: 'deactivated' })
              .eq('team_id', team.id)
              .neq('role', 'owner');
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await updateUserSettings(customerId, {
          subscription_status: 'past_due',
        });
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
