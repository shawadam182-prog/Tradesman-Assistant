import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

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
      // Use a DIFFERENT webhook secret for Connect events
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received Connect event:', event.type);

    switch (event.type) {
      // Handle Connect account updates (onboarding completion)
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;

        // Update user's Connect status
        const { error } = await supabaseAdmin
          .from('user_settings')
          .update({
            stripe_connect_onboarding_complete: account.details_submitted,
            stripe_connect_charges_enabled: account.charges_enabled,
            stripe_connect_payouts_enabled: account.payouts_enabled,
            stripe_connect_onboarded_at: account.details_submitted
              ? new Date().toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_connect_account_id', account.id);

        if (error) {
          console.error('Error updating Connect status:', error);
        }
        break;
      }

      // Handle successful invoice payments
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only process invoice payments, not subscriptions
        if (session.metadata?.type !== 'invoice_payment') {
          console.log('Skipping non-invoice payment');
          break;
        }

        const invoiceId = session.metadata?.invoice_id;
        if (!invoiceId) {
          console.log('No invoice_id in metadata');
          break;
        }

        // Get payment details
        const paymentIntent = session.payment_intent
          ? await stripe.paymentIntents.retrieve(session.payment_intent as string)
          : null;

        const amountPaid = (session.amount_total || 0) / 100;
        const stripeFee = paymentIntent?.application_fee_amount
          ? paymentIntent.application_fee_amount / 100
          : 0;

        // Mark invoice as paid
        const { error } = await supabaseAdmin
          .from('quotes')
          .update({
            status: 'paid',
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'card',
            amount_paid: amountPaid,
            stripe_payment_intent_id: session.payment_intent as string,
            online_payment_amount: amountPaid,
            online_payment_fee: stripeFee,
            online_payment_net: amountPaid - stripeFee,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);

        if (error) {
          console.error('Error marking invoice as paid:', error);
        } else {
          console.log(`Invoice ${invoiceId} marked as paid`);
        }
        break;
      }

      default:
        console.log(`Unhandled Connect event: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Connect webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
