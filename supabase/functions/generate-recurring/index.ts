import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Generate Recurring Invoices — Daily cron edge function.
 * Finds recurring invoice templates where recurringNextDate <= today,
 * deep-clones them into new standalone invoices, and optionally auto-sends.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];

    // 1. Find all recurring invoice templates that are due
    const { data: templates, error: templatesError } = await supabase
      .from("quotes")
      .select("*")
      .eq("type", "invoice")
      .eq("is_recurring", true)
      .not("recurring_next_date", "is", null)
      .lte("recurring_next_date", today);

    if (templatesError) {
      console.error("Failed to fetch recurring templates:", templatesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch templates" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recurring invoices due", generated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalGenerated = 0;

    for (const template of templates) {
      try {
        // 2. Get next reference number for this user
        const { data: refNum } = await supabase.rpc("get_next_reference_number", {
          p_user_id: template.user_id,
          p_type: "invoice",
        });

        // Calculate due date preserving the original offset
        let dueDate: string | null = null;
        if (template.due_date && template.date) {
          const origDate = new Date(template.date);
          const origDue = new Date(template.due_date);
          const diffDays = Math.ceil(
            (origDue.getTime() - origDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const newDue = new Date();
          newDue.setDate(newDue.getDate() + diffDays);
          dueDate = newDue.toISOString().split("T")[0];
        }

        // 3. Deep clone — snapshot ALL values at generation time
        const { error: insertError } = await supabase
          .from("quotes")
          .insert({
            user_id: template.user_id,
            customer_id: template.customer_id,
            job_pack_id: template.job_pack_id,
            title: template.title,
            type: "invoice",
            status: "draft",
            date: today,
            sections: template.sections,
            labour_rate: template.labour_rate,
            markup_percent: template.markup_percent,
            tax_percent: template.tax_percent,
            cis_percent: template.cis_percent,
            notes: template.notes,
            display_options: template.display_options,
            reference_number: refNum,
            due_date: dueDate,
            discount_type: template.discount_type,
            discount_value: template.discount_value,
            discount_description: template.discount_description,
            part_payment_enabled: template.part_payment_enabled,
            part_payment_type: template.part_payment_type,
            part_payment_value: template.part_payment_value,
            part_payment_label: template.part_payment_label,
            job_address: template.job_address,
            recurring_parent_id: template.id,
          });

        if (insertError) {
          console.error(`Failed to generate invoice from template ${template.id}:`, insertError);
          continue;
        }

        // 4. Calculate next date based on frequency
        const currentNext = template.recurring_next_date || today;
        const nextDate = getNextDate(currentNext, template.recurring_frequency);

        // Check if past end date
        const shouldContinue = !template.recurring_end_date ||
          new Date(nextDate) <= new Date(template.recurring_end_date);

        // 5. Update template's next date (or disable if past end)
        await supabase
          .from("quotes")
          .update({
            recurring_next_date: shouldContinue ? nextDate : null,
            is_recurring: shouldContinue,
          })
          .eq("id", template.id);

        totalGenerated++;
        console.log(`Generated invoice from template ${template.id}, next: ${shouldContinue ? nextDate : "disabled"}`);
      } catch (err) {
        console.error(`Error processing template ${template.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, generated: totalGenerated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-recurring error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getNextDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "fortnightly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "annually":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().split("T")[0];
}
