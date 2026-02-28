import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  tags?: string[];
  attachment_base64?: string;
  attachment_filename?: string;
  attachment_type?: string;
  company_document_ids?: string[];
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

    const body: SendEmailRequest = await req.json();

    // Validate required fields
    if (!body.to || !body.subject || !body.html) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, subject, html",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fromName = body.from_name || "TradeSync";
    const fromEmail =
      body.from_email || Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@tradesync.info";

    // Build recipients array
    const toArray = Array.isArray(body.to) ? body.to : [body.to];
    const personalizations = [
      {
        to: toArray.map((email: string) => ({ email })),
      },
    ];

    // Build SendGrid payload
    const payload: Record<string, unknown> = {
      personalizations,
      from: { email: fromEmail, name: fromName },
      subject: body.subject,
      content: [{ type: "text/html", value: body.html }],
    };

    // Reply-to
    if (body.reply_to) {
      payload.reply_to = { email: body.reply_to };
    }

    // Tags for tracking
    if (body.tags && body.tags.length > 0) {
      payload.categories = body.tags.slice(0, 10); // SendGrid max 10 categories
    }

    // Attachments array
    const attachments: Array<{ content: string; filename: string; type: string; disposition: string }> = [];

    // Primary PDF attachment
    if (body.attachment_base64 && body.attachment_filename) {
      attachments.push({
        content: body.attachment_base64,
        filename: body.attachment_filename,
        type: body.attachment_type || "application/pdf",
        disposition: "attachment",
      });
    }

    // Company documents from storage
    if (body.company_document_ids && body.company_document_ids.length > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      // Fetch document records
      const { data: docs } = await supabaseAdmin
        .from("company_documents")
        .select("id, name, storage_path, file_type")
        .in("id", body.company_document_ids);

      if (docs) {
        for (const doc of docs) {
          const { data: fileData } = await supabaseAdmin.storage
            .from("documents")
            .download(doc.storage_path);
          if (fileData) {
            const buffer = await fileData.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), "")
            );
            attachments.push({
              content: base64,
              filename: doc.name,
              type: doc.file_type || "application/octet-stream",
              disposition: "attachment",
            });
          }
        }
      }
    }

    if (attachments.length > 0) {
      payload.attachments = attachments;
    }

    // Send via SendGrid v3 API
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // SendGrid returns 202 on success with empty body
    if (response.status === 202) {
      const messageId = response.headers.get("x-message-id");
      return new Response(
        JSON.stringify({
          success: true,
          message_id: messageId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Error handling
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }

    console.error("SendGrid error:", response.status, errorBody);

    return new Response(
      JSON.stringify({
        error: "SendGrid API error",
        status: response.status,
        details: errorBody,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
