import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TimesheetNotifyRequest {
  timesheet_id: string;
  action: "approved" | "rejected";
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "SENDGRID_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body: TimesheetNotifyRequest = await req.json();

    if (!body.timesheet_id || !body.action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: timesheet_id, action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up timesheet → team_member → user → email
    const { data: timesheet, error: tsError } = await supabase
      .from("timesheets")
      .select("*, team_member:team_members(id, display_name, user_id, team_id)")
      .eq("id", body.timesheet_id)
      .single();

    if (tsError || !timesheet?.team_member) {
      console.error("Timesheet lookup failed:", tsError);
      return new Response(
        JSON.stringify({ error: "Timesheet not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get worker's email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      timesheet.team_member.user_id
    );

    if (userError || !userData?.user?.email) {
      console.error("User lookup failed:", userError);
      return new Response(
        JSON.stringify({ error: "Worker email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get team name for context
    const { data: teamData } = await supabase
      .from("teams")
      .select("name")
      .eq("id", timesheet.team_member.team_id)
      .single();

    const workerEmail = userData.user.email;
    const workerName = timesheet.team_member.display_name || "there";
    const teamName = teamData?.name || "your team";
    const clockInDate = new Date(timesheet.clock_in).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const clockInTime = new Date(timesheet.clock_in).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const clockOutTime = timesheet.clock_out
      ? new Date(timesheet.clock_out).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

    const isApproved = body.action === "approved";
    const statusColor = isApproved ? "#14b8a6" : "#ef4444";
    const statusLabel = isApproved ? "Approved" : "Rejected";
    const statusEmoji = isApproved ? "&#10004;" : "&#10006;";
    const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@tradesync.info";

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; border-radius: 50%; background: ${statusColor}; color: white; font-size: 24px; line-height: 48px; text-align: center;">
            ${statusEmoji}
          </div>
          <h2 style="color: #0f172a; margin: 12px 0 0;">Timesheet ${statusLabel}</h2>
        </div>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          Hi <strong>${workerName}</strong>, your timesheet for <strong>${clockInDate}</strong> has been <strong style="color: ${statusColor}">${statusLabel.toLowerCase()}</strong>.
        </p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <table style="width: 100%; font-size: 14px; color: #334155;">
            <tr><td style="padding: 4px 0; color: #64748b;">Date</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${clockInDate}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Clock In</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${clockInTime}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Clock Out</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${clockOutTime}</td></tr>
            ${timesheet.break_minutes ? `<tr><td style="padding: 4px 0; color: #64748b;">Break</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${timesheet.break_minutes} mins</td></tr>` : ""}
          </table>
        </div>
        ${!isApproved && body.reason ? `
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="color: #dc2626; font-size: 14px; font-weight: 600; margin: 0 0 4px;">Reason for rejection:</p>
          <p style="color: #7f1d1d; font-size: 14px; margin: 0;">${body.reason}</p>
        </div>
        <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
          You can edit and resubmit this timesheet from the app.
        </p>
        ` : ""}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          ${teamName} via TradeSync
        </p>
      </div>
    `;

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: workerEmail }] }],
        from: { email: fromEmail, name: "TradeSync" },
        subject: `Timesheet ${statusLabel} — ${clockInDate}`,
        content: [{ type: "text/html", value: html }],
        categories: ["timesheet-notify"],
      }),
    });

    if (response.status === 202) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let errorBody: unknown;
    try { errorBody = await response.json(); } catch { errorBody = await response.text(); }
    console.error("SendGrid error:", response.status, errorBody);

    return new Response(
      JSON.stringify({ error: "Failed to send notification", status: response.status }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("timesheet-notify error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
