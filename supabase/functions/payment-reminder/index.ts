import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Payment Reminder — Daily cron edge function.
 * Finds overdue invoices with payment milestones, checks user preferences,
 * and sends reminder emails via the send-email edge function.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get all users with payment reminders enabled
    const { data: prefs, error: prefsError } = await supabase
      .from("communication_preferences")
      .select("user_id, payment_reminder_days")
      .eq("payment_reminder_enabled", true);

    if (prefsError) {
      console.error("Failed to fetch preferences:", prefsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch preferences" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with payment reminders enabled", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;

    for (const pref of prefs) {
      const reminderDays: number[] = pref.payment_reminder_days || [7, 14, 30];

      // 2. Find overdue invoices for this user
      // An invoice is "overdue" if status = 'sent' and due_date < today
      const { data: overdueInvoices, error: invError } = await supabase
        .from("quotes")
        .select("id, title, reference_number, due_date, customer_id")
        .eq("user_id", pref.user_id)
        .eq("type", "invoice")
        .eq("status", "sent")
        .not("due_date", "is", null)
        .lt("due_date", new Date().toISOString().split("T")[0]);

      if (invError) {
        console.error(`Failed to fetch invoices for user ${pref.user_id}:`, invError);
        continue;
      }

      if (!overdueInvoices || overdueInvoices.length === 0) continue;

      // 3. Get user settings for from name
      const { data: userSettings } = await supabase
        .from("user_settings")
        .select("company_name")
        .eq("user_id", pref.user_id)
        .single();

      const companyName = userSettings?.company_name || "TradeSync";

      for (const invoice of overdueInvoices) {
        const dueDate = new Date(invoice.due_date);
        const today = new Date();
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if today matches one of the reminder days
        if (!reminderDays.includes(daysOverdue)) continue;

        // 4. Check if we already sent a reminder for this invoice at this interval
        const { data: existingLog } = await supabase
          .from("email_log")
          .select("id")
          .eq("quote_id", invoice.id)
          .eq("template_type", "payment_reminder")
          .eq("status", "sent")
          .gte("sent_at", new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existingLog && existingLog.length > 0) continue;

        // 5. Get customer email
        const { data: customer } = await supabase
          .from("customers")
          .select("name, email")
          .eq("id", invoice.customer_id)
          .single();

        if (!customer?.email) continue;

        // 6. Send reminder via send-email function
        const refStr = invoice.reference_number
          ? `#${invoice.reference_number.toString().padStart(4, "0")}`
          : invoice.title;

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e293b; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">${companyName}</h1>
              <p style="margin: 4px 0 0; opacity: 0.7; font-size: 14px;">Payment Reminder</p>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #334155;">Hi ${customer.name},</p>
              <p style="color: #334155;">
                This is a friendly reminder that invoice <strong>${refStr}</strong> for
                <strong>${invoice.title}</strong> is now <strong>${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue</strong>.
              </p>
              <p style="color: #334155;">
                Please arrange payment at your earliest convenience. If you have already made payment, please disregard this reminder.
              </p>
              <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
                Kind regards,<br/>${companyName}
              </p>
            </div>
          </div>
        `;

        try {
          const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              to: customer.email,
              subject: `Payment Reminder: Invoice ${refStr} is ${daysOverdue} days overdue`,
              html: emailHtml,
              from_name: companyName,
              tags: ["payment-reminder", "automated"],
            }),
          });

          if (sendResponse.ok) {
            // Log the sent email
            await supabase.from("email_log").insert({
              user_id: pref.user_id,
              quote_id: invoice.id,
              recipient_email: customer.email,
              template_type: "payment_reminder",
              subject: `Payment Reminder: Invoice ${refStr} is ${daysOverdue} days overdue`,
              status: "sent",
              sent_at: new Date().toISOString(),
            });
            totalSent++;
          }
        } catch (sendErr) {
          console.error(`Failed to send reminder for invoice ${invoice.id}:`, sendErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("payment-reminder error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
