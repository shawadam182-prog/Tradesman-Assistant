import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform fee: 1% (optional - set to 0 if you don't want to take a cut)
const PLATFORM_FEE_PERCENT = 1;

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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      invoiceId,
      amount,
      customerEmail,
      customerName,
      description,
      invoiceReference,
      successUrl,
      cancelUrl,
    } = await req.json();

    // Get user's Connect account
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('stripe_connect_account_id, stripe_connect_charges_enabled, company_name')
      .eq('user_id', user.id)
      .single();

    if (!settings?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ error: 'Payment account not set up. Please connect your bank account in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings?.stripe_connect_charges_enabled) {
      return new Response(
        JSON.stringify({ error: 'Payment account setup incomplete. Please complete onboarding in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate amounts in pence
    const amountInPence = Math.round(amount * 100);
    const platformFee = Math.round(amountInPence * (PLATFORM_FEE_PERCENT / 100));

    // Create Checkout Session with Connect
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `Invoice ${invoiceReference}`,
            description: description || `Payment for services - ${settings.company_name}`,
          },
          unit_amount: amountInPence,
        },
        quantity: 1,
      }],
      customer_email: customerEmail || undefined,
      payment_intent_data: {
        // Send payment to tradesperson's Connect account
        application_fee_amount: platformFee, // Your platform fee (optional)
        transfer_data: {
          destination: settings.stripe_connect_account_id,
        },
        metadata: {
          invoice_id: invoiceId,
          tradesync_user_id: user.id,
          invoice_reference: invoiceReference,
        },
      },
      metadata: {
        invoice_id: invoiceId,
        tradesync_user_id: user.id,
        invoice_reference: invoiceReference,
        type: 'invoice_payment', // Distinguishes from subscription payments
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    });

    // Save payment link to invoice
    await supabaseAdmin
      .from('quotes')
      .update({
        stripe_checkout_session_id: session.id,
        payment_link_url: session.url,
        payment_link_created_at: new Date().toISOString(),
        payment_link_expires_at: new Date(session.expires_at! * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        expiresAt: session.expires_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment link creation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create payment link' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
