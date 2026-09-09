// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("SHEETS_API_KEY");

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, partner_click_id, purchase_value, cashback_value, discount_decimal } = await req.json();

    if (!partner_click_id || !purchase_value || !cashback_value) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: partner_click_id, purchase_value, cashback_value" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update partner_clicks record
    const { data: clickData, error: clickError } = await supabase
      .from("partner_clicks")
      .update({
        status: "confirmado",
        purchase_value: Number(purchase_value),
        cashback_value: Number(cashback_value),
        cashback_applied: true,
      })
      .eq("id", partner_click_id)
      .select("user_id, partner_name")
      .single();

    if (clickError) {
      console.error("Error updating partner_clicks:", clickError);
      return new Response(
        JSON.stringify({ error: "Failed to update partner click", details: clickError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUserId = user_id || clickData.user_id;
    const realPartnerName = clickData.partner_name || "Via Planilha";

    // Insert cashback_usage record for balance tracking
    const { error: usageError } = await supabase
      .from("cashback_usage")
      .insert({
        user_id: targetUserId,
        partner_name: realPartnerName,
        discount_percentage: discount_decimal ? Number(discount_decimal) * 100 : (Number(purchase_value) > 0 ? (Number(cashback_value) / Number(purchase_value)) * 100 : 0),
        purchase_amount: Number(purchase_value),
        cashback_amount: Number(cashback_value),
        status: "approved",
        approved_at: new Date().toISOString(),
        notes: `Conversão automática - click_id: ${partner_click_id}`,
      });

    if (usageError) {
      console.error("Error inserting cashback_usage:", usageError);
    }

    // Get updated balance info
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan")
      .eq("user_id", targetUserId)
      .single();

    const planBenefits: Record<string, number> = {
      basic: 2364,
      starter: 2364,
      pro: 4764,
      business: 7164,
      enterprise: 7164,
    };
    const plan = (profile?.subscription_plan || "basic").toLowerCase();
    const maxBalance = planBenefits[plan] || 2364;

    // Calculate total used
    const { data: usageData } = await supabase
      .from("cashback_usage")
      .select("cashback_amount")
      .eq("user_id", targetUserId)
      .in("status", ["approved", "paid", "confirmed"]);

    const totalUsed = usageData?.reduce((sum, row) => sum + Number(row.cashback_amount || 0), 0) || 0;
    const newBalance = Math.max(maxBalance - totalUsed, 0);

    return new Response(
      JSON.stringify({ success: true, new_balance: newBalance }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
