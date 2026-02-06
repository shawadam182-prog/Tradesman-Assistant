import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Handles SendGrid Event Webhook callbacks.
 * SendGrid posts an array of event objects for: processed, delivered, open, bounce, dropped, deferred, spamreport
 * Configure webhook URL in SendGrid Settings > Mail Settings > Event Webhook:
 *   https://<project>.supabase.co/functions/v1/email-webhook
 */

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: string;
  sg_message_id: string;
  reason?: string;
  response?: string;
  category?: string[];
  [key: string]: unknown;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // SendGrid posts an array of events
    const events: SendGridEvent[] = await req.json();

    if (!Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Expected array of events' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: { event: string; action: string }[] = [];

    for (const event of events) {
      // SendGrid sg_message_id includes a filter ID suffix after ".", strip it
      const rawId = event.sg_message_id || '';
      const messageId = rawId.split('.')[0];

      if (!messageId) {
        results.push({ event: event.event, action: 'skipped_no_message_id' });
        continue;
      }

      // Map SendGrid event types to our status
      const statusMap: Record<string, string> = {
        'processed': 'queued',
        'delivered': 'sent',
        'deferred': 'queued',
        'bounce': 'bounced',
        'dropped': 'failed',
        'spamreport': 'bounced',
      };

      if (event.event === 'open') {
        await supabaseAdmin
          .from('email_log')
          .update({ opened_at: new Date(event.timestamp * 1000).toISOString() })
          .eq('resend_message_id', messageId);

        results.push({ event: event.event, action: 'opened_at_updated' });
        continue;
      }

      const newStatus = statusMap[event.event];

      if (newStatus) {
        const updateData: Record<string, unknown> = { status: newStatus };

        if (newStatus === 'sent') {
          updateData.sent_at = new Date(event.timestamp * 1000).toISOString();
        }

        if (newStatus === 'bounced' || newStatus === 'failed') {
          updateData.error_message = event.reason || event.response || `Email ${event.event}`;
        }

        await supabaseAdmin
          .from('email_log')
          .update(updateData)
          .eq('resend_message_id', messageId);

        results.push({ event: event.event, action: `status_updated_to_${newStatus}` });
      } else {
        results.push({ event: event.event, action: 'ignored' });
      }
    }

    return new Response(
      JSON.stringify({ received: true, processed: results.length, results }),
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
