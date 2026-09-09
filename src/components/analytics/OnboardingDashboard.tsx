import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardList, Users, CheckCircle2, Percent, Loader2, Search, Star, Target,
  Store, ShoppingCart, Clock, TrendingUp, Briefcase, Wrench, Download, Filter,
} from "lucide-react";

interface OnboardingResponse {
  user_id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  subscription_plan: string | null;
  completed_at: string | null;
  current_step: number | null;
  created_at: string;
  city_state: string | null;
  experience_level: string | null;
  business_models: string[] | null;
  main_goal: string | null;
  weekly_hours: string | null;
  revenue_goal: string | null;
  sales_channels: string[] | null;
  business_niche: string | null;
  business_niche_other: string | null;
  employee_range: string | null;
  average_ticket: string | null;
  company: string | null;
  job_title: string | null;
  uses_erp: boolean | null;
  erp_tools: string[] | null;
  erp_other: string | null;
  uses_ai: boolean | null;
  ai_tools: string | null;
  uses_accounting: boolean | null;
  accounting_service: string | null;
  has_supplier_difficulty: boolean | null;
  supplier_needs: string | null;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  iniciante: "🌱 Iniciante",
  basico: "📦 Básico",
  intermediario: "📈 Intermediário",
  avancado: "🚀 Avançado",
};

const GOAL_LABELS: Record<string, string> = {
  "criar-renda": "💰 Criar uma fonte de renda",
  escalar: "📈 Escalar o negócio atual",
  transicao: "🔄 Transição de carreira",
  aprender: "📚 Aprender e se desenvolver",
  networking: "🤝 Networking e conexões",
};

const BUSINESS_MODEL_LABELS: Record<string, string> = {
  "loja-propria": "🏪 Loja própria",
  "dropshipping-nacional": "🇧🇷 Dropshipping Nacional",
  "dropshipping-internacional": "🌍 Dropshipping Internacional",
  marketplaces: "🛒 Marketplaces",
  "social-commerce": "📱 Social Commerce",
  "marca-propria": "✨ Marca própria",
};

const CHANNEL_LABELS: Record<string, string> = {
  "site-proprio": "🌐 Site Próprio",
  amazon: "📦 Amazon",
  shein: "👗 Shein",
  shopee: "🟠 Shopee",
  temu: "🛒 Temu",
  "tiktok-shop": "🎵 TikTok Shop",
  "mercado-livre": "🟡 Mercado Livre",
  "kwai-shop": "🎬 Kwai Shop",
  "magalu-netshoes": "🏬 Magalu/Netshoes",
  outros: "➕ Outros",
};

const HOURS_LABELS: Record<string, string> = {
  "menos-5h": "⏰ Menos de 5 horas",
  "5-10h": "🕐 5 a 10 horas",
  "10-20h": "🕕 10 a 20 horas",
  "mais-20h": "🔥 Mais de 20 horas",
};

const REVENUE_LABELS: Record<string, string> = {
  "ate-5k": "Até R$ 5.000",
  "5k-20k": "R$ 5.000 - R$ 20.000",
  "20k-50k": "R$ 20.000 - R$ 50.000",
  "mais-50k": "Mais de R$ 50.000",
};

const ERP_LABELS: Record<string, string> = {
  bling: "Bling",
  tiny: "Olist/Tiny",
  anymarket: "Anymarket",
  upseller: "Upseller",
  base: "Base",
  outros: "Outros",
};

function label(map: Record<string, string>, value: string): string {
  return map[value] || value;
}

interface DistItem {
  label: string;
  count: number;
  pct: number;
}

/** Distribui um campo simples (uma resposta por membro) */
function distSingle(rows: OnboardingResponse[], pick: (r: OnboardingResponse) => string | null, map?: Record<string, string>): DistItem[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    const v = pick(r);
    if (!v) continue;
    total++;
    const key = map ? label(map, v) : v;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([l, count]) => ({ label: l, count, pct: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

/** Distribui um campo array (múltiplas respostas por membro); % sobre membros que responderam */
function distMulti(rows: OnboardingResponse[], pick: (r: OnboardingResponse) => string[] | null, map?: Record<string, string>): DistItem[] {
  const counts = new Map<string, number>();
  let respondents = 0;
  for (const r of rows) {
    const values = pick(r);
    if (!values?.length) continue;
    respondents++;
    for (const v of values) {
      const key = map ? label(map, v) : v;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([l, count]) => ({ label: l, count, pct: respondents ? Math.round((count / respondents) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

/** Distribui um campo booleano como Sim/Não */
function distBool(rows: OnboardingResponse[], pick: (r: OnboardingResponse) => boolean | null): DistItem[] {
  let yes = 0, no = 0;
  for (const r of rows) {
    const v = pick(r);
    if (v === true) yes++;
    else if (v === false) no++;
  }
  const total = yes + no;
  if (!total) return [];
  return [
    { label: "Sim", count: yes, pct: Math.round((yes / total) * 100) },
    { label: "Não", count: no, pct: Math.round((no / total) * 100) },
  ].sort((a, b) => b.count - a.count);
}

/** Escapa um valor para CSV (aspas duplas, separador ;) */
function csvCell(value: string | null | undefined): string {
  const v = (value ?? "").replace(/"/g, '""');
  return `"${v}"`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR");
}

function boolText(value: boolean | null | undefined): string {
  if (value == null) return "";
  return value ? "Sim" : "Não";
}

/** Gera e baixa um CSV com todas as respostas do onboarding (Excel BR: UTF-8 BOM + separador ;) */
function exportOnboardingCsv(rows: OnboardingResponse[]) {
  const headers = [
    "Nome", "E-mail", "Plano", "Status", "Etapa atual", "Cidade/Estado",
    "Empresa", "Cargo", "Experiência", "Objetivo principal", "Modelos de negócio",
    "Canais de venda", "Dedicação semanal", "Meta de faturamento", "Setor de atuação",
    "Nº de funcionários", "Faturamento mensal", "Usa ERP", "ERPs utilizados",
    "Usa IA", "Ferramentas de IA", "Tem contabilidade", "Serviço contábil",
    "Dificuldade com fornecedores", "Necessidades de fornecedor",
    "Respondido em", "Concluído em",
  ];

  const nicheText = (r: OnboardingResponse) =>
    r.business_niche === "Outros" && r.business_niche_other
      ? `Outros (${r.business_niche_other})`
      : r.business_niche || "";

  const lines = rows.map((r) => [
    r.name || "",
    r.email || "",
    r.subscription_plan || "",
    r.completed_at ? "Concluído" : `Em andamento (etapa ${r.current_step ?? 0})`,
    String(r.current_step ?? 0),
    r.city_state || "",
    r.company || "",
    r.job_title || "",
    r.experience_level ? label(EXPERIENCE_LABELS, r.experience_level) : "",
    r.main_goal ? label(GOAL_LABELS, r.main_goal) : "",
    (r.business_models || []).map((m) => label(BUSINESS_MODEL_LABELS, m)).join(", "),
    (r.sales_channels || []).map((c) => label(CHANNEL_LABELS, c)).join(", "),
    r.weekly_hours ? label(HOURS_LABELS, r.weekly_hours) : "",
    r.revenue_goal ? label(REVENUE_LABELS, r.revenue_goal) : "",
    nicheText(r),
    r.employee_range || "",
    r.average_ticket || "",
    boolText(r.uses_erp),
    (r.erp_tools || []).map((t) => label(ERP_LABELS, t)).join(", ") + (r.erp_other ? ` (${r.erp_other})` : ""),
    boolText(r.uses_ai),
    r.ai_tools || "",
    boolText(r.uses_accounting),
    r.accounting_service || "",
    boolText(r.has_supplier_difficulty),
    r.supplier_needs || "",
    formatDate(r.created_at),
    formatDate(r.completed_at),
  ]);

  const csv = [headers, ...lines]
    .map((row) => row.map(csvCell).join(";"))
    .join("\r\n");

  // BOM UTF-8 para o Excel abrir acentos corretamente
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `onboarding-${new Date().toISOString().slice(0, 10)}.csv`;
  a.setAttribute("data-ga-ignore", "true");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DistributionCard({ icon: Icon, title, description, items, loading }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  items: DistItem[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)
        ) : items.length ? (
          items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{item.label}</span>
                <span className="text-muted-foreground ml-2 whitespace-nowrap text-xs">
                  {item.count} · {item.pct}%
                </span>
              </div>
              <Progress value={item.pct} className="h-1.5" />
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm text-center py-2">Sem respostas ainda</p>
        )}
      </CardContent>
    </Card>
  );
}

function DetailRow({ label: rowLabel, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{rowLabel}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

type BoolDrill = {
  title: string;
  pick: (r: OnboardingResponse) => boolean | null;
  extra: (r: OnboardingResponse) => string | null;
};

export function OnboardingDashboard() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OnboardingResponse | null>(null);
  const [drill, setDrill] = useState<BoolDrill | null>(null);
  const [drillTab, setDrillTab] = useState<"sim" | "nao">("sim");
  const [erpFilter, setErpFilter] = useState<string>("todos");


  const { data: responses, isLoading } = useQuery({
    queryKey: ["admin-onboarding-responses"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_onboarding_responses" as any);
      if (error) throw error;
      return (data || []) as OnboardingResponse[];
    },
  });

  // Contas excluídas fora do app deixam a linha de onboarding órfã (sem e-mail) — fora do dashboard
  const rows = useMemo(() => (responses || []).filter((r) => r.email), [responses]);
  const completed = rows.filter((r) => r.completed_at);
  const inProgress = rows.filter((r) => !r.completed_at);
  const completionRate = rows.length ? Math.round((completed.length / rows.length) * 100) : 0;

  const dists = useMemo(() => ({
    experience: distSingle(rows, (r) => r.experience_level, EXPERIENCE_LABELS),
    goal: distSingle(rows, (r) => r.main_goal, GOAL_LABELS),
    models: distMulti(rows, (r) => r.business_models, BUSINESS_MODEL_LABELS),
    channels: distMulti(rows, (r) => r.sales_channels, CHANNEL_LABELS),
    hours: distSingle(rows, (r) => r.weekly_hours, HOURS_LABELS),
    revenue: distSingle(rows, (r) => r.revenue_goal, REVENUE_LABELS),
    niche: distSingle(rows, (r) => r.business_niche),
    employees: distSingle(rows, (r) => r.employee_range),
    ticket: distSingle(rows, (r) => r.average_ticket),
    erpTools: distMulti(rows, (r) => r.erp_tools, ERP_LABELS),
    usesErp: distBool(rows, (r) => r.uses_erp),
    usesAi: distBool(rows, (r) => r.uses_ai),
    usesAccounting: distBool(rows, (r) => r.uses_accounting),
    supplierDifficulty: distBool(rows, (r) => r.has_supplier_difficulty),
  }), [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      (r.name || "").toLowerCase().includes(term) ||
      (r.email || "").toLowerCase().includes(term) ||
      (r.company || "").toLowerCase().includes(term) ||
      (r.business_niche || "").toLowerCase().includes(term)
    );
  }, [rows, search]);

  const boolSummary = (items: DistItem[]) => items.find((i) => i.label === "Sim");

  const openDrill = (d: BoolDrill) => {
    setDrillTab("sim");
    setErpFilter("todos");
    setDrill(d);
  };

  const drillRows = useMemo(() => {
    if (!drill) return { sim: [] as OnboardingResponse[], nao: [] as OnboardingResponse[] };
    return {
      sim: rows.filter((r) => drill.pick(r) === true),
      nao: rows.filter((r) => drill.pick(r) === false),
    };
  }, [drill, rows]);

  const isErpDrill = drill?.title === "Usam ERP";

  const erpOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of drillRows.sim) {
      const tools = (r.erp_tools || []).filter(Boolean);
      if (r.erp_other) tools.push("outros");
      for (const t of new Set(tools)) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, label: `${label(ERP_LABELS, value)} (${count})`, count }))
      .sort((a, b) => b.count - a.count);
  }, [drillRows.sim]);

  const displayedDrillRows = useMemo(() => {
    if (!drill) return [] as OnboardingResponse[];
    const base = drillTab === "sim" ? drillRows.sim : drillRows.nao;
    if (!isErpDrill || drillTab !== "sim" || erpFilter === "todos") return base;
    return base.filter((r) => {
      const tools = r.erp_tools || [];
      if (erpFilter === "outros") return r.erp_other ? true : tools.includes("outros");
      return tools.includes(erpFilter);
    });
  }, [drill, drillTab, drillRows, isErpDrill, erpFilter]);


  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OnboardingStatsCard icon={Users} label="Total de Respostas" value={rows.length} loading={isLoading} />
        <OnboardingStatsCard icon={CheckCircle2} label="Concluíram" value={completed.length} loading={isLoading} variant="success" />
        <OnboardingStatsCard icon={Loader2} label="Em Andamento" value={inProgress.length} loading={isLoading} />
        <OnboardingStatsCard icon={Percent} label="Taxa de Conclusão" value={`${completionRate}%`} loading={isLoading} />
      </div>

      {/* Uso de ferramentas — resumo rápido (clique para ver as respostas) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniBoolCard
          label="Usam ERP"
          item={boolSummary(dists.usesErp)}
          loading={isLoading}
          onClick={() => openDrill({
            title: "Usam ERP",
            pick: (r) => r.uses_erp,
            extra: (r) => [(r.erp_tools || []).map((t) => label(ERP_LABELS, t)).join(", "), r.erp_other].filter(Boolean).join(" — ") || null,
          })}
        />
        <MiniBoolCard
          label="Usam IA"
          item={boolSummary(dists.usesAi)}
          loading={isLoading}
          onClick={() => openDrill({ title: "Usam IA", pick: (r) => r.uses_ai, extra: (r) => r.ai_tools })}
        />
        <MiniBoolCard
          label="Têm Contabilidade"
          item={boolSummary(dists.usesAccounting)}
          loading={isLoading}
          onClick={() => openDrill({ title: "Têm Contabilidade", pick: (r) => r.uses_accounting, extra: (r) => r.accounting_service })}
        />
        <MiniBoolCard
          label="Dificuldade c/ Fornecedores"
          item={boolSummary(dists.supplierDifficulty)}
          loading={isLoading}
          onClick={() => openDrill({ title: "Dificuldade c/ Fornecedores", pick: (r) => r.has_supplier_difficulty, extra: (r) => r.supplier_needs })}
        />
      </div>


      {/* Distribuições */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <DistributionCard icon={Star} title="Nível de Experiência" items={dists.experience} loading={isLoading} />
        <DistributionCard icon={Target} title="Objetivo Principal" items={dists.goal} loading={isLoading} />
        <DistributionCard icon={Store} title="Modelos de Negócio" description="Múltipla escolha · % sobre quem respondeu" items={dists.models} loading={isLoading} />
        <DistributionCard icon={ShoppingCart} title="Canais de Venda" description="Múltipla escolha · % sobre quem respondeu" items={dists.channels} loading={isLoading} />
        <DistributionCard icon={Clock} title="Dedicação Semanal" items={dists.hours} loading={isLoading} />
        <DistributionCard icon={TrendingUp} title="Meta de Faturamento" items={dists.revenue} loading={isLoading} />
        <DistributionCard icon={Briefcase} title="Setor de Atuação" items={dists.niche} loading={isLoading} />
        <DistributionCard icon={Users} title="Número de Funcionários" items={dists.employees} loading={isLoading} />
        <DistributionCard icon={TrendingUp} title="Faturamento Mensal" items={dists.ticket} loading={isLoading} />
        <DistributionCard icon={Wrench} title="ERPs Utilizados" description="Entre quem usa ERP" items={dists.erpTools} loading={isLoading} />
      </div>

      {/* Respostas individuais */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              Respostas Individuais
            </CardTitle>
            <CardDescription>Clique em um membro para ver todas as respostas do onboarding</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            disabled={isLoading || !rows.length}
            onClick={() => exportOnboardingCsv(rows)}
            data-ga="admin-onboarding-export-csv"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, empresa ou nicho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : filteredRows.length ? (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>Experiência</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Nicho</TableHead>
                    <TableHead>Faturamento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => (
                    <TableRow
                      key={r.user_id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelected(r)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={r.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(r.name || "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{r.name || "Sem nome"}</span>
                            <span className="text-[11px] text-muted-foreground">{r.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.experience_level ? label(EXPERIENCE_LABELS, r.experience_level) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.main_goal ? label(GOAL_LABELS, r.main_goal) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{r.business_niche || "—"}</TableCell>
                      <TableCell className="text-sm">{r.average_ticket || "—"}</TableCell>
                      <TableCell>
                        {r.completed_at ? (
                          <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">Concluído</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Etapa {r.current_step ?? 0}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-6">
              {rows.length ? "Nenhum membro encontrado para essa busca" : "Nenhuma resposta de onboarding ainda"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detalhe do membro */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selected?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {(selected?.name || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {selected?.name || "Sem nome"}
            </DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-0.5">
              <DetailRow label="Status" value={selected.completed_at
                ? `Concluído em ${new Date(selected.completed_at).toLocaleDateString("pt-BR")}`
                : `Em andamento (etapa ${selected.current_step ?? 0})`} />
              <DetailRow label="Plano" value={selected.subscription_plan} />
              <DetailRow label="Cidade/Estado" value={selected.city_state} />
              <DetailRow label="Empresa" value={selected.company} />
              <DetailRow label="Cargo" value={selected.job_title} />
              <DetailRow label="Nível de experiência" value={selected.experience_level ? label(EXPERIENCE_LABELS, selected.experience_level) : null} />
              <DetailRow label="Objetivo principal" value={selected.main_goal ? label(GOAL_LABELS, selected.main_goal) : null} />
              <DetailRow label="Modelos de negócio" value={selected.business_models?.map((m) => label(BUSINESS_MODEL_LABELS, m)).join(", ")} />
              <DetailRow label="Canais de venda" value={selected.sales_channels?.map((c) => label(CHANNEL_LABELS, c)).join(", ")} />
              <DetailRow label="Dedicação semanal" value={selected.weekly_hours ? label(HOURS_LABELS, selected.weekly_hours) : null} />
              <DetailRow label="Meta de faturamento" value={selected.revenue_goal ? label(REVENUE_LABELS, selected.revenue_goal) : null} />
              <DetailRow label="Setor de atuação" value={selected.business_niche === "Outros" && selected.business_niche_other
                ? `Outros (${selected.business_niche_other})`
                : selected.business_niche} />
              <DetailRow label="Número de funcionários" value={selected.employee_range} />
              <DetailRow label="Faturamento mensal" value={selected.average_ticket} />
              <DetailRow label="Usa ERP" value={selected.uses_erp == null ? null : selected.uses_erp
                ? `Sim${selected.erp_tools?.length ? ` (${selected.erp_tools.map((t) => label(ERP_LABELS, t)).join(", ")}${selected.erp_other ? ` — ${selected.erp_other}` : ""})` : ""}`
                : "Não"} />
              <DetailRow label="Usa IA" value={selected.uses_ai == null ? null : selected.uses_ai
                ? `Sim${selected.ai_tools ? ` (${selected.ai_tools})` : ""}`
                : "Não"} />
              <DetailRow label="Tem contabilidade" value={selected.uses_accounting == null ? null : selected.uses_accounting
                ? `Sim${selected.accounting_service ? ` (${selected.accounting_service})` : ""}`
                : "Não"} />
              <DetailRow label="Dificuldade com fornecedores" value={selected.has_supplier_difficulty == null ? null : selected.has_supplier_difficulty
                ? `Sim${selected.supplier_needs ? ` — ${selected.supplier_needs}` : ""}`
                : "Não"} />
              <DetailRow label="Respondido em" value={new Date(selected.created_at).toLocaleDateString("pt-BR")} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Drill-down de resposta Sim/Não */}
      <Dialog open={!!drill} onOpenChange={(open) => !open && setDrill(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{drill?.title}</DialogTitle>
            <DialogDescription>
              {drillRows.sim.length} responderam Sim · {drillRows.nao.length} responderam Não
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={drillTab === "sim" ? "default" : "outline"}
                onClick={() => setDrillTab("sim")}
              >
                Sim ({drillRows.sim.length})
              </Button>
              <Button
                size="sm"
                variant={drillTab === "nao" ? "default" : "outline"}
                onClick={() => setDrillTab("nao")}
              >
                Não ({drillRows.nao.length})
              </Button>
            </div>
            {isErpDrill && drillTab === "sim" && erpOptions.length > 0 && (
              <div className="flex items-center gap-2 min-w-[180px]">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={erpFilter} onValueChange={setErpFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Filtrar por ERP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os ERPs ({drillRows.sim.length})</SelectItem>
                    {erpOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {displayedDrillRows.map((r) => {
              const extra = drillTab === "sim" && drill ? drill.extra(r) : null;
              return (
                <button
                  key={r.user_id}
                  type="button"
                  onClick={() => {
                    setDrill(null);
                    setSelected(r);
                  }}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted/40"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{(r.name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{r.name || "Sem nome"}</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {extra || r.email}
                    </span>
                  </div>
                </button>
              );
            })}
            {!displayedDrillRows.length && (
              <p className="text-muted-foreground text-sm text-center py-6">
                {drillTab === "sim" && isErpDrill && erpFilter !== "todos"
                  ? "Nenhum membro usando esse ERP"
                  : "Nenhum membro nessa resposta"}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

}

function OnboardingStatsCard({ icon: Icon, label: cardLabel, value, loading, variant }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | number;
  loading?: boolean;
  variant?: "success";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${variant === "success" ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{cardLabel}</p>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value ?? "—"}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniBoolCard({ label: cardLabel, item, loading, onClick }: {
  label: string;
  item?: DistItem;
  loading: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? `Ver respostas: ${cardLabel}` : undefined}
      data-ga={onClick ? `admin-onboarding-bool-${cardLabel}` : undefined}
      className={onClick ? "cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30" : undefined}
    >
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground mb-1">{cardLabel}</p>
        {loading ? (
          <Skeleton className="h-6 w-14" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">{item ? `${item.pct}%` : "—"}</span>
            {item && <span className="text-xs text-muted-foreground">{item.count} membros</span>}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
