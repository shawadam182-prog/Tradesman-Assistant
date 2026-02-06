import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Quote Follow-Up — Daily cron edge function.
 * Finds quotes with status = 'sent' that haven't been responded to
 * within the user's configured follow-up window, and sends a follow-up
 * email with the shareable quote link.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get all users with quote follow-up enabled
    const { data: prefs, error: prefsError } = await supabase
      .from("communication_preferences")
      .select("user_id, quote_follow_up_days")
      .eq("quote_follow_up_enabled", true);

    if (prefsError) {
      console.error("Failed to fetch preferences:", prefsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch preferences" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with quote follow-up enabled", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;

    for (const pref of prefs) {
      const followUpDays: number = pref.quote_follow_up_days || 3;

      // 2. Find quotes that are still 'sent' and were last updated > X days ago
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - followUpDays);

      const { data: pendingQuotes, error: quotesError } = await supabase
        .from("quotes")
        .select("id, title, reference_number, type, customer_id, share_token, updated_at")
        .eq("user_id", pref.user_id)
        .eq("status", "sent")
        .in("type", ["estimate", "quotation"])
        .not("share_token", "is", null)
        .lt("updated_at", cutoffDate.toISOString());

      if (quotesError) {
        console.error(`Failed to fetch quotes for user ${pref.user_id}:`, quotesError);
        continue;
      }

      if (!pendingQuotes || pendingQuotes.length === 0) continue;

      // 3. Get user settings for company name and app URL
      const { data: userSettings } = await supabase
        .from("user_settings")
        .select("company_name, phone, email")
        .eq("user_id", pref.user_id)
        .single();

      const companyName = userSettings?.company_name || "TradeSync";
      const companyPhone = userSettings?.phone || "";
      const companyEmail = userSettings?.email || "";

      // 4. Get or build the user's follow-up template
      const { data: template } = await supabase
        .from("email_templates")
        .select("subject, body")
        .eq("user_id", pref.user_id)
        .eq("template_type", "quote_followup")
        .eq("is_default", true)
        .maybeSingle();

      for (const quote of pendingQuotes) {
        // 5. Check if a follow-up was already sent for this quote
        const { data: existingLog } = await supabase
          .from("email_log")
          .select("id")
          .eq("quote_id", quote.id)
          .eq("template_type", "quote_followup")
          .limit(1);

        if (existingLog && existingLog.length > 0) continue;

        // 6. Get customer email
        const { data: customer } = await supabase
          .from("customers")
          .select("name, email")
          .eq("id", quote.customer_id)
          .single();

        if (!customer?.email) continue;

        // 7. Build the quote link
        // Use SITE_URL env var if available, otherwise fall back to Supabase project URL
        const siteUrl = Deno.env.get("SITE_URL") || supabaseUrl.replace(".supabase.co", ".vercel.app");
        const quoteLink = `${siteUrl}/quote/view/${quote.share_token}`;

        const refStr = quote.reference_number
          ? `#${quote.reference_number.toString().padStart(4, "0")}`
          : "";

        const docType = quote.type === "invoice" ? "invoice" : quote.type === "estimate" ? "estimate" : "quotation";

        // 8. Build email — use template if available, otherwise use default HTML
        let subject: string;
        let emailHtml: string;

        if (template) {
          // Render template variables
          const vars: Record<string, string> = {
            customer_name: customer.name,
            company_name: companyName,
            company_phone: companyPhone,
            company_email: companyEmail,
            project_title: quote.title,
            reference: refStr,
            doc_type: docType,
            quote_link: quoteLink,
            days: followUpDays.toString(),
          };

          subject = template.subject;
          let body = template.body;
          for (const [key, value] of Object.entries(vars)) {
            subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
            body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
          }

          // Wrap plain text body in HTML
          emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1e293b; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">${companyName}</h1>
                <p style="margin: 4px 0 0; opacity: 0.7; font-size: 14px;">Quote Follow-Up</p>
              </div>
              <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                ${body.split("\n").map((line: string) => `<p style="color: #334155; margin: 0 0 12px;">${line}</p>`).join("")}
              </div>
            </div>
          `;
        } else {
          // Default follow-up email
          subject = `Following up: ${docType.charAt(0).toUpperCase() + docType.slice(1)} ${refStr} for ${quote.title}`;

          emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1e293b; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">${companyName}</h1>
                <p style="margin: 4px 0 0; opacity: 0.7; font-size: 14px;">Quote Follow-Up</p>
              </div>
              <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #334155;">Hi ${customer.name},</p>
                <p style="color: #334155;">
                  I'm just following up on the ${docType} ${refStr ? `<strong>${refStr}</strong> ` : ""}I sent over for
                  <strong>${quote.title}</strong>. I wanted to check whether you've had a chance to review it.
                </p>
                <p style="color: #334155;">
                  You can view and respond to it here:
                </p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${quoteLink}"
                     style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                    View ${docType.charAt(0).toUpperCase() + docType.slice(1)}
                  </a>
                </div>
                <p style="color: #334155;">
                  If you have any questions or would like to discuss anything, please don't hesitate to get in touch.
                </p>
                <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
                  Kind regards,<br/>${companyName}
                  ${companyPhone ? `<br/>${companyPhone}` : ""}
                  ${companyEmail ? `<br/>${companyEmail}` : ""}
                </p>
              </div>
            </div>
          `;
        }

        // 9. Send via send-email function
        try {
          const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              to: customer.email,
              subject,
              html: emailHtml,
              from_name: companyName,
              tags: ["quote-followup", "automated"],
            }),
          });

          if (sendResponse.ok) {
            const sendResult = await sendResponse.json();

            // Log the sent email
            await supabase.from("email_log").insert({
              user_id: pref.user_id,
              quote_id: quote.id,
              recipient_email: customer.email,
              template_type: "quote_followup",
              subject,
              status: "sent",
              resend_message_id: sendResult.message_id || null,
              sent_at: new Date().toISOString(),
            });
            totalSent++;
          } else {
            console.error(`Send failed for quote ${quote.id}:`, await sendResponse.text());
          }
        } catch (sendErr) {
          console.error(`Failed to send follow-up for quote ${quote.id}:`, sendErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("quote-followup error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
