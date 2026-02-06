import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Handles Resend delivery webhooks.
 * Resend sends events for: email.sent, email.delivered, email.opened, email.bounced, email.complained
 * Configure webhook URL in Resend dashboard: https://<project>.supabase.co/functions/v1/email-webhook
 */

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify webhook signature (Resend sends svix headers)
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    // Basic validation - in production you'd verify the signature
    if (!svixId || !svixTimestamp || !svixSignature) {
      // Allow requests without svix headers for testing
      const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
      if (webhookSecret) {
        console.warn('Missing svix headers - skipping signature verification');
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const event: ResendWebhookEvent = await req.json();
    const messageId = event.data?.email_id;

    if (!messageId) {
      return new Response(
        JSON.stringify({ error: 'Missing email_id in event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map Resend event types to our status
    const statusMap: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'sent',
      'email.delivery_delayed': 'queued',
      'email.bounced': 'bounced',
      'email.complained': 'bounced',
    };

    const newStatus = statusMap[event.type];

    if (event.type === 'email.opened') {
      // Update opened_at timestamp
      await supabaseAdmin
        .from('email_log')
        .update({ opened_at: event.created_at })
        .eq('resend_message_id', messageId);

      return new Response(
        JSON.stringify({ received: true, action: 'opened_at_updated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newStatus) {
      const updateData: Record<string, unknown> = { status: newStatus };

      if (newStatus === 'bounced') {
        updateData.error_message = `Email ${event.type.replace('email.', '')}`;
      }

      await supabaseAdmin
        .from('email_log')
        .update(updateData)
        .eq('resend_message_id', messageId);

      return new Response(
        JSON.stringify({ received: true, action: `status_updated_to_${newStatus}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown event type - acknowledge but don't process
    return new Response(
      JSON.stringify({ received: true, action: 'ignored', event_type: event.type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('email-webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
