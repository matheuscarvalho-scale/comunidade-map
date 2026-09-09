import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Emails internos extras (fora do domínio @mapeducacao.com)
const EXCLUDED_EMAILS = [
  "brunomesquita@mapmarketplaces.com",
];

const INTERNAL_ROLES = [
  "admin", "admin_geral", "admin_financeiro", "admin_conteudo",
  "cx", "comercial", "marketing", "automacao",
];


const MEMBER_ROLES = ["basic", "starter", "pro", "business", "enterprise"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require either CRON_SECRET (for scheduled invocations) or admin JWT
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedCronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    let authorized = false;
    if (cronSecret && providedCronSecret && providedCronSecret === cronSecret) {
      authorized = true;
    } else if (authHeader?.startsWith("Bearer ")) {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
      const { data: claims } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (claims?.claims?.sub) {
        const adminCheck = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: roles } = await adminCheck.from("user_roles").select("role").eq("user_id", claims.claims.sub);
        authorized = (roles || []).some((r: any) => ["admin","admin_geral"].includes(r.role));
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rawBody = req.method === "POST" ? await req.text() : "";
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const sendEmail = payload?.sendEmail === true;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all profiles
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id, name, subscription_plan, subscription_status, created_at")
      .not("user_id", "is", null);

    if (profErr) throw profErr;

    // Fetch all roles
    const { data: allRoles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rolesErr) throw rolesErr;

    const rolesByUser = new Map<string, string[]>();
    for (const r of allRoles || []) {
      if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, []);
      rolesByUser.get(r.user_id)!.push(r.role);
    }

    // Get emails
    const { data: authUsers, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (authErr) throw authErr;

    const emailMap = new Map<string, string>();
    for (const u of authUsers.users) {
      emailMap.set(u.id, u.email || "");
    }

    // Fetch secondary logins to exclude (partner accounts, not real subscribers)
    const { data: secondaryLogins, error: secErr } = await supabaseAdmin
      .from("secondary_logins")
      .select("secondary_user_id");
    if (secErr) throw secErr;
    const secondaryUserIds = new Set((secondaryLogins || []).map((s: any) => s.secondary_user_id));

    // Filter: only active paying real subscribers, excluding internal team & secondary logins
    const members = (profiles || []).filter((p) => {
      const email = (emailMap.get(p.user_id) || "").toLowerCase();
      if (!email) return false;
      if (EXCLUDED_EMAILS.includes(email)) return false;
      // Exclude any internal MAP email
      if (email.endsWith("@mapeducacao.com")) return false;
      // Exclude secondary logins (partner accounts)
      if (secondaryUserIds.has(p.user_id)) return false;

      const userRoles = rolesByUser.get(p.user_id) || [];
      // Exclude if has any internal role
      if (userRoles.some((r) => INTERNAL_ROLES.includes(r))) return false;
      // Must have a member role
      if (!userRoles.some((r) => MEMBER_ROLES.includes(r))) return false;
      // Must be active
      if (p.subscription_status !== "active") return false;

      return true;
    });

    // Build user stats per member directly (avoids 1000-row pagination cap)
    const userStats = new Map<string, { totalSeconds: number; sessions: number; lastAccess: string }>();
    const memberIds = members.map((m) => m.user_id);
    console.log(`Fetching analytics for ${memberIds.length} members`);

    const CHUNK = 50;
    for (let i = 0; i < memberIds.length; i += CHUNK) {
      const chunk = memberIds.slice(i, i + CHUNK);
      let pageFrom = 0;
      while (true) {
        const { data: page, error: aErr } = await supabaseAdmin
          .from("member_analytics")
          .select("user_id, event_type, duration_seconds, created_at")
          .in("user_id", chunk)
          .order("created_at", { ascending: false })
          .range(pageFrom, pageFrom + 999);
        if (aErr) {
          console.error("analytics chunk error:", aErr);
          throw aErr;
        }
        if (!page || page.length === 0) break;

        for (const evt of page) {
          if (!userStats.has(evt.user_id)) {
            userStats.set(evt.user_id, { totalSeconds: 0, sessions: 0, lastAccess: "" });
          }
          const s = userStats.get(evt.user_id)!;
          if (evt.event_type === "page_duration" && evt.duration_seconds) {
            s.totalSeconds += Math.min(evt.duration_seconds, 1800);
          }
          if (evt.event_type === "page_view") {
            s.sessions++;
          }
          if (!s.lastAccess || evt.created_at > s.lastAccess) {
            s.lastAccess = evt.created_at;
          }
        }
        if (page.length < 1000) break;
        pageFrom += 1000;
      }
    }
    console.log(`Stats built for ${userStats.size} users with activity`);

    // Build HTML table
    const rows = members
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => {
        const email = emailMap.get(m.user_id) || "—";
        const stats = userStats.get(m.user_id);
        const accessed = stats && stats.lastAccess ? "✅ Sim" : "❌ Não";
        const totalMin = stats ? Math.round(stats.totalSeconds / 60) : 0;
        const hours = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        const timeStr = totalMin > 0 ? `${hours}h ${mins}min` : "0min";
        const sessionsCount = stats?.sessions || 0;
        const lastAccess = stats?.lastAccess
          ? new Date(stats.lastAccess).toLocaleDateString("pt-BR")
          : "—";
        const plan = (m.subscription_plan || "—").toUpperCase();

        return `<tr>
          <td style="padding:8px;border:1px solid #ddd">${m.name}</td>
          <td style="padding:8px;border:1px solid #ddd">${email}</td>
          <td style="padding:8px;border:1px solid #ddd">${plan}</td>
          <td style="padding:8px;border:1px solid #ddd">${accessed}</td>
          <td style="padding:8px;border:1px solid #ddd">${sessionsCount}</td>
          <td style="padding:8px;border:1px solid #ddd">${timeStr}</td>
          <td style="padding:8px;border:1px solid #ddd">${lastAccess}</td>
        </tr>`;
      })
      .join("");

    const totalMembers = members.length;
    const activeMembers = members.filter((m) => {
      const s = userStats.get(m.user_id);
      return s && s.lastAccess;
    }).length;

    const today = new Date().toLocaleDateString("pt-BR");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto">
        <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" height="48" alt="MAP Acelera" />
        <h2 style="color:#333">📊 Relatório Semanal de Acesso — ${today}</h2>
        <p style="color:#666">Total de membros pagantes ativos: <b>${totalMembers}</b> | Já acessaram: <b>${activeMembers}</b> | Nunca acessaram: <b>${totalMembers - activeMembers}</b></p>
        <table style="border-collapse:collapse;width:100%;font-size:13px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Nome</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Email</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Plano</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Acessou?</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Sessões</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Tempo Total</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Último Acesso</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#999;font-size:11px;margin-top:16px">* Apenas membros pagantes ativos (basic/starter/pro/business/enterprise). Equipe interna excluída. Tempo com cap de 30min por sessão.</p>
      </div>
    `;

    let emailResult: Record<string, unknown> | null = null;
    if (sendEmail) {
      const resendKey = Deno.env.get("RESEND_API_KEY")!;
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MAP Acelera <onboarding@mapeducacao.com>",
          to: ["brunomesquita@mapeducacao.com", "sucesso@mapeducacao.com"],
          subject: `📊 Relatório Semanal de Acesso — ${today}`,
          html,
        }),
      });

      emailResult = await emailRes.json();
    }

    return new Response(JSON.stringify({ success: true, totalMembers, activeMembers, emailSent: sendEmail, email: emailResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
