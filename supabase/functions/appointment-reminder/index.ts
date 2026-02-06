import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Appointment Reminder — Daily cron edge function.
 * Finds upcoming appointments within the user's configured reminder window,
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

    // 1. Get all users with appointment reminders enabled
    const { data: prefs, error: prefsError } = await supabase
      .from("communication_preferences")
      .select("user_id, appointment_reminder_hours")
      .eq("appointment_reminder_enabled", true);

    if (prefsError) {
      console.error("Failed to fetch preferences:", prefsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch preferences" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with appointment reminders enabled", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;

    for (const pref of prefs) {
      const reminderHours: number = pref.appointment_reminder_hours || 24;

      // 2. Find upcoming appointments for this user within the reminder window
      const now = new Date();
      const windowStart = new Date(now.getTime() + (reminderHours - 1) * 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + (reminderHours + 1) * 60 * 60 * 1000);

      const { data: entries, error: entryError } = await supabase
        .from("schedule_entries")
        .select("id, title, start_time, end_time, location, description, customer_id, reminder_sent_at")
        .eq("user_id", pref.user_id)
        .gte("start_time", windowStart.toISOString())
        .lte("start_time", windowEnd.toISOString())
        .is("reminder_sent_at", null); // Only send once

      if (entryError) {
        console.error(`Failed to fetch entries for user ${pref.user_id}:`, entryError);
        continue;
      }

      if (!entries || entries.length === 0) continue;

      // 3. Get user settings for company name
      const { data: userSettings } = await supabase
        .from("user_settings")
        .select("company_name")
        .eq("user_id", pref.user_id)
        .single();

      const companyName = userSettings?.company_name || "TradeSync";

      for (const entry of entries) {
        if (!entry.customer_id) continue;

        // 4. Get customer email
        const { data: customer } = await supabase
          .from("customers")
          .select("name, email")
          .eq("id", entry.customer_id)
          .single();

        if (!customer?.email) continue;

        // 5. Format dates
        const startDate = new Date(entry.start_time);
        const endDate = new Date(entry.end_time);
        const formattedDate = startDate.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const formattedTime = startDate.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const endTime = endDate.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // 6. Build email
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e293b; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">${companyName}</h1>
              <p style="margin: 4px 0 0; opacity: 0.7; font-size: 14px;">Appointment Reminder</p>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #334155;">Hi ${customer.name},</p>
              <p style="color: #334155;">Just a friendly reminder about your upcoming appointment:</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px; color: #1e293b; font-weight: bold; font-size: 16px;">${entry.title}</p>
                <p style="margin: 0 0 4px; color: #475569; font-size: 14px;">📅 ${formattedDate}</p>
                <p style="margin: 0 0 4px; color: #475569; font-size: 14px;">🕐 ${formattedTime} — ${endTime}</p>
                ${entry.location ? `<p style="margin: 0; color: #475569; font-size: 14px;">📍 ${entry.location}</p>` : ""}
              </div>
              ${entry.description ? `<p style="color: #64748b; font-size: 13px; font-style: italic;">${entry.description}</p>` : ""}
              <p style="color: #334155;">
                If you need to reschedule or have any questions, please don't hesitate to get in touch.
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
              subject: `Reminder: ${entry.title} — ${formattedDate} at ${formattedTime}`,
              html: emailHtml,
              from_name: companyName,
              tags: ["appointment-reminder", "automated"],
            }),
          });

          if (sendResponse.ok) {
            // Mark reminder as sent
            await supabase
              .from("schedule_entries")
              .update({ reminder_sent_at: new Date().toISOString() })
              .eq("id", entry.id);

            totalSent++;
          }
        } catch (sendErr) {
          console.error(`Failed to send reminder for entry ${entry.id}:`, sendErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("appointment-reminder error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
