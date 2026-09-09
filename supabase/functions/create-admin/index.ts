// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://acelera.mapeducacao.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // C5: Require ADMIN_CREATION_SECRET - fail if not set
    const adminCreationSecret = Deno.env.get("ADMIN_CREATION_SECRET");
    if (!adminCreationSecret) {
      console.error("ADMIN_CREATION_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error: missing required secret" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${adminCreationSecret}`) {
      console.warn("Unauthorized create-admin attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    const adminName = "Admin MAP";

    if (!adminEmail || !adminPassword) {
      console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking if admin user exists:", adminEmail);

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === adminEmail);

    let userId: string;

    if (existingUser) {
      console.log("Admin user already exists:", existingUser.id);
      userId = existingUser.id;

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: adminPassword,
      });
      if (updateError) {
        console.warn("Could not update password:", updateError.message);
      }
    } else {
      console.log("Creating new admin user...");
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { name: adminName },
      });

      if (authError) {
        console.error("Error creating admin user:", authError);
        return new Response(
          JSON.stringify({ error: "Failed to create admin user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = authData.user!.id;
      console.log("Admin user created:", userId);
    }

    // Check if admin role already exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      if (roleError) {
        console.error("Error assigning admin role:", roleError);
        return new Response(
          JSON.stringify({ error: "Failed to assign admin role" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Admin role assigned");
    } else {
      console.log("Admin role already exists");
    }

    // Ensure profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingProfile) {
      await supabaseAdmin.from("profiles").insert({ user_id: userId, name: adminName });
    }

    // Mark onboarding as complete
    const { data: existingOnboarding } = await supabaseAdmin
      .from("user_onboarding")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingOnboarding) {
      await supabaseAdmin.from("user_onboarding").insert({
        user_id: userId,
        current_step: 10,
        completed_at: new Date().toISOString(),
        full_name: adminName,
        terms_accepted_at: new Date().toISOString(),
        terms_version: "2.0",
      });
    } else {
      await supabaseAdmin
        .from("user_onboarding")
        .update({ 
          current_step: 10, 
          completed_at: new Date().toISOString(),
          terms_accepted_at: new Date().toISOString(),
          terms_version: "2.0",
        })
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user configured successfully",
        data: { user_id: userId, role: "admin" },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
