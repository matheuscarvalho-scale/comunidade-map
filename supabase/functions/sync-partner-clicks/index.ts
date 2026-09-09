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
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("SHEETS_API_KEY");

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Plan price mapping
    const PLAN_PRICES: Record<string, number> = {
      basic: 197,
      starter: 197,
      pro: 397,
      business: 997,
      enterprise: 997,
    };

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "500");
    const status = url.searchParams.get("status"); // optional filter

    let query = supabase
      .from("partner_clicks")
      .select("*")
      .order("clicked_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out internal MAP team members (admin/staff roles) so they don't pollute the cashback sheet
    const INTERNAL_ROLES = [
      "admin",
      "admin_geral",
      "admin_financeiro",
      "admin_conteudo",
      "cx",
      "comercial",
      "marketing",
      "automacao",
    ];
    const allUserIds = [...new Set((data || []).map((c) => c.user_id))];
    let internalUserIds = new Set<string>();
    if (allUserIds.length > 0) {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("user_id", allUserIds)
        .in("role", INTERNAL_ROLES);
      internalUserIds = new Set((rolesData || []).map((r: any) => r.user_id));
    }
    const filteredData = (data || []).filter((c) => !internalUserIds.has(c.user_id));

    // Fetch whatsapp numbers from user_onboarding and profiles.phone as fallback
    const userIds = [...new Set(filteredData.map((c) => c.user_id))];
    let whatsappMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const [onboardingRes, profilesRes] = await Promise.all([
        supabase.from("user_onboarding").select("user_id, whatsapp").in("user_id", userIds),
        supabase.from("profiles").select("user_id, phone").in("user_id", userIds),
      ]);
      const phoneMap: Record<string, string | null> = {};
      (profilesRes.data || []).forEach((p: any) => {
        if (p.phone) phoneMap[p.user_id] = p.phone;
      });
      (onboardingRes.data || []).forEach((o: any) => {
        whatsappMap[o.user_id] = o.whatsapp || phoneMap[o.user_id] || null;
      });
      // For users with profile phone but no onboarding record
      userIds.forEach((uid) => {
        if (!whatsappMap[uid] && phoneMap[uid]) {
          whatsappMap[uid] = phoneMap[uid];
        }
      });
    }

    // Enrich clicks with plan price and whatsapp
    const enrichedData = filteredData.map((click) => {
      const planKey = (click.user_plan || "").toLowerCase();
      return {
        ...click,
        plan_price: PLAN_PRICES[planKey] || null,
        whatsapp: whatsappMap[click.user_id] || null,
      };
    });

    return new Response(
      JSON.stringify({ clicks: enrichedData, count: enrichedData.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
