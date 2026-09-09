// Notifica Make.com webhook sobre webinars/mentorias.
// Modos:
//   - default: eventos de "hoje" (BRT)
//   - ?days_ahead=N : eventos do dia (hoje + N) em BRT (ex: segunda dispara quinta com N=3)
//   - ?imminent=true : eventos que começam entre +50min e +70min a partir de agora (lembrete 1h antes)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-token",
};

const WEBHOOK_URL = Deno.env.get("MAKE_WEBHOOK_URL")!;
// Hardcoded: Z-API novo formato para o grupo MAP Acelera
const GROUP_JID = "120363426700487684-group";
const API_KEY = Deno.env.get("MAKE_WEBHOOK_APIKEY")!;

const PALESTRANTE_INDEX: Record<string, number> = {
  "bruno leite": 1,
  "bruno mesquita": 2,
  "fabiana kaiuca": 3,
  "fernanda stussi": 4,
  "fernanda stüssi": 4,
  "larissa iraha": 5,
  "pablo ribeiro": 6,
  "pedro molina": 7,
  "phillipe lontra": 8,
  "raphael girardi": 9,
  "renan oliveira": 10,
  "rodrigo bitencourt": 11,
  "vinicius couto": 12,
  "vinicius do couto sousa": 12,
  "vinicius couto sousa": 12,
};

const NAME_BY_INDEX: Record<number, string> = {
  1: "Bruno Leite",
  2: "Bruno Mesquita",
  3: "Fabiana Kaiuca",
  4: "Fernanda Stüssi",
  5: "Larissa Iraha",
  6: "Pablo Ribeiro",
  7: "Pedro Molina",
  8: "Phillipe Lontra",
  9: "Raphael Girardi",
  10: "Renan Oliveira",
  11: "Rodrigo Bitencourt",
  12: "Vinicius do Couto Sousa",
};

function normalize(name?: string | null): string {
  if (!name) return "";
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function findIndex(name?: string | null): number | null {
  const n = normalize(name);
  if (!n) return null;
  if (PALESTRANTE_INDEX[n]) return PALESTRANTE_INDEX[n];
  for (const [k, v] of Object.entries(PALESTRANTE_INDEX)) {
    const nk = normalize(k);
    if (nk === n || n.includes(nk) || nk.includes(n)) return v;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- Auth: x-internal-token required (cron-only endpoint) ---
    const internalToken = req.headers.get("x-internal-token") || "";
    const { data: ok } = await supabase.rpc("verify_internal_token", { _name: "make_notify", _token: internalToken });
    if (ok !== true) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const url = new URL(req.url);
    const daysAhead = Math.max(0, parseInt(url.searchParams.get("days_ahead") ?? "0", 10) || 0);
    const imminent = url.searchParams.get("imminent") === "true";
    const nextThursday = url.searchParams.get("next_thursday") === "true";
    const source = url.searchParams.get("source") ?? "default";

    let startUTC: Date;
    let endUTC: Date;
    let label: string;

    // Helper: pega "hoje" em BRT como YYYY-MM-DD e converte pra base UTC (00h BRT)
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric", month: "2-digit", day: "2-digit",
    });
    const todayBR = fmt.format(new Date());
    const baseUTC = new Date(`${todayBR}T03:00:00.000Z`); // 00:00 BRT em UTC

    if (imminent) {
      const now = Date.now();
      startUTC = new Date(now + 50 * 60 * 1000);
      endUTC = new Date(now + 70 * 60 * 1000);
      label = "imminent_1h";
    } else if (nextThursday) {
      // Próxima quinta (BRT). Se hoje já é quinta, pega hoje mesmo.
      // getUTCDay no baseUTC retorna o dia da semana correto pra "hoje BRT"
      const dow = baseUTC.getUTCDay(); // 0=dom, 4=qui
      const daysToThu = (4 - dow + 7) % 7; // 0 se hoje for quinta
      startUTC = new Date(baseUTC.getTime() + daysToThu * 24 * 60 * 60 * 1000);
      endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
      label = `next_thursday(+${daysToThu}d)`;
    } else {
      startUTC = new Date(baseUTC.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
      label = `day+${daysAhead}`;
    }

    const [{ data: webinars }, { data: sessions }] = await Promise.all([
      supabase
        .from("webinars")
        .select("id,title,presenter_name,scheduled_at")
        .eq("is_active", true)
        .gte("scheduled_at", startUTC.toISOString())
        .lt("scheduled_at", endUTC.toISOString()),
      supabase
        .from("mentoring_sessions")
        .select("id,title,mentor_name,scheduled_at")
        .eq("is_active", true)
        .gte("scheduled_at", startUTC.toISOString())
        .lt("scheduled_at", endUTC.toISOString()),
    ]);

    const events: { type: string; name: string; title: string }[] = [];
    (webinars ?? []).forEach((w: any) => events.push({ type: "webinar", name: w.presenter_name, title: w.title }));
    const hasWebinar = (webinars ?? []).length > 0;
    if (!hasWebinar) {
      (sessions ?? []).forEach((s: any) => events.push({ type: "mentoring", name: s.mentor_name, title: s.title }));
    }

    const results: any[] = [];
    const sentIdx = new Set<number>();
    let sentCount = 0;

    for (const e of events) {
      const idx = findIndex(e.name);
      if (!idx) {
        results.push({ ...e, skipped: "no_index_mapping" });
        continue;
      }
      if (sentIdx.has(idx)) {
        results.push({ ...e, idx, skipped: "duplicate" });
        continue;
      }
      sentIdx.add(idx);

      // Pausa de 30s entre envios para facilitar tracking (não antes do primeiro)
      if (sentCount > 0) {
        await new Promise((r) => setTimeout(r, 30_000));
      }

      const nome = NAME_BY_INDEX[idx] ?? e.name;
      const payload = { groupJid: GROUP_JID, nome, apikey: API_KEY, source };
      const resp = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      results.push({ ...e, idx, status: resp.status, source, order: sentCount + 1 });
      sentCount++;
    }

    console.log("notify-make-daily-event", { source, label, window: { startUTC, endUTC }, count: events.length, results });

    return new Response(
      JSON.stringify({ success: true, source, label, events: events.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("notify-make-daily-event error", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
