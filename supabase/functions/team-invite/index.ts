import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TeamInviteRequest {
  email: string;
  role: string;
  display_name?: string;
  team_name: string;
  inviter_name: string;
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
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: TeamInviteRequest = await req.json();

    if (!body.email || !body.team_name || !body.inviter_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, team_name, inviter_name" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@tradesync.info";
    const appUrl = Deno.env.get("APP_URL") || "https://tradesync.info";
    const roleLabel = body.role === "field_worker" ? "Field Worker" : body.role === "admin" ? "Admin" : body.role;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0;">You've been invited to join a team</h2>
        </div>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          <strong>${body.inviter_name}</strong> has invited you to join
          <strong>${body.team_name}</strong> on TradeSync as a <strong>${roleLabel}</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${appUrl}"
             style="background: #14b8a6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Open TradeSync
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
          If you don't have an account yet, sign up with this email address
          (<strong>${body.email}</strong>) and you'll see the invitation when you log in.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          TradeSync — The smart app for tradespeople
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
        personalizations: [{ to: [{ email: body.email }] }],
        from: { email: fromEmail, name: "TradeSync" },
        subject: `${body.inviter_name} invited you to join ${body.team_name} on TradeSync`,
        content: [{ type: "text/html", value: html }],
        categories: ["team-invite"],
      }),
    });

    if (response.status === 202) {
      const messageId = response.headers.get("x-message-id");
      return new Response(
        JSON.stringify({ success: true, message_id: messageId }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }

    console.error("SendGrid error:", response.status, errorBody);

    return new Response(
      JSON.stringify({ error: "Failed to send invitation email", status: response.status }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("team-invite error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
