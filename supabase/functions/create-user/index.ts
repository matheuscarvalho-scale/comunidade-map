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
    // C1: Authentication - require admin or super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller's identity using getUser (server-side validation)
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user?.id) {
      console.warn("Invalid token provided to create-user");
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = userData.user.id;

    // Check caller has admin or super_admin role using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["admin", "admin_geral"])
      .maybeSingle();

    if (!callerRole) {
      console.warn("Unauthorized create-user attempt by:", callerId);
      return new Response(
        JSON.stringify({ error: "Forbidden: admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 20) : "";

    // Validate required fields
    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Missing email or role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 320) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role against allowed values
    const allowedRoles = ["basic", "pro", "business", "starter", "enterprise", "admin", "admin_geral", "admin_financeiro", "admin_conteudo", "cx", "comercial", "marketing", "automacao"];
    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length if provided
    if (password && (password.length < 8 || password.length > 128)) {
      return new Response(
        JSON.stringify({ error: "Password must be between 8 and 128 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate provisional 12-char password if none provided
    const provChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    const provArray = new Uint8Array(12);
    crypto.getRandomValues(provArray);
    const provisionalPassword = password || Array.from(provArray).map(b => provChars[b % provChars.length]).join("");

    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;
    const userName = name || email.split("@")[0];

    if (existingUser) {
      userId = existingUser.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: provisionalPassword });
      console.log("User already exists, updated password:", userId);
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: provisionalPassword,
        email_confirm: true,
        user_metadata: { name: userName },
      });

      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = authData.user!.id;
      console.log("User created:", userId);
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

    if (roleError) console.warn("Role error:", roleError.message);

    // Ensure profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      await supabaseAdmin.from("profiles").insert({ user_id: userId, name: userName });
    }

    // Create onboarding record
    const { data: onb } = await supabaseAdmin
      .from("user_onboarding")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!onb) {
      await supabaseAdmin.from("user_onboarding").insert({
        user_id: userId,
        current_step: 0,
        full_name: userName,
      });
    }

    // Send welcome email with provisional password
    // Internal members (@mapeducacao.com) don't trigger Bruno notification
    const isInternalMember = email.endsWith("@mapeducacao.com");
    try {
      const welcomeRes = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          email,
          name: userName,
          plan: role || "basic",
          platform_url: "https://acelera.mapeducacao.com",
          provisional_password: provisionalPassword,
          notify_bruno: !isInternalMember,
          phone,
        }),
      });
      const welcomeData = await welcomeRes.json();
      console.log("Welcome email result:", welcomeRes.status, welcomeData);
    } catch (emailErr) {
      console.warn("Failed to send welcome email:", emailErr);
      // Non-blocking: user is still created even if email fails
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, email, role }),
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
