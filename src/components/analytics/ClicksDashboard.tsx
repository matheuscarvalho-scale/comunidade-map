import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MousePointerClick, BarChart3, TrendingUp, TrendingDown, Layers, Clock,
  CalendarDays, Grid3X3, Users, Eye, Activity, Filter, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";

// ── Page name mapping ──────────────────────────────────────────────────
const PAGE_NAME_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/formacoes": "Formações",
  "/mentorias": "Mentorias",
  "/webinars": "Webinars",
  "/comunidade": "Comunidade",
  "/networking": "Networking",
  "/conquistas": "Conquistas",
  "/recursos": "Recursos",
  "/parceiros": "Parceiros e Benefícios",
  "/noticias": "Notícias",
  "/trilha-conteudo": "Trilha de Conteúdo",
  "/perfil": "Perfil",
  "/meu-cashback": "Meu Cashback",
  "/certificados": "Certificados",
  "/sugestoes": "Sugestões",
  "/gestao-equipe": "Gestão de Equipe",
  "/meus-beneficios": "Parceiros e Benefícios",
  "/onboarding": "Onboarding",
  "/planos": "Planos",
};

function createGetPageLabel(formationsMap: Map<string, string>, tracksMap: Map<string, string>) {
  return function getPageLabel(path: string): string {
    if (PAGE_NAME_MAP[path]) return PAGE_NAME_MAP[path];
    const formationMatch = path.match(/^\/formacoes\/([^/]+)/);
    if (formationMatch) {
      const name = formationsMap.get(formationMatch[1]);
      return name ? `Formação: ${name}` : `Formação (${formationMatch[1].slice(0, 8)})`;
    }
    const trackMatch = path.match(/^\/trilha-conteudo\/([^/]+)/);
    if (trackMatch) {
      const name = tracksMap.get(trackMatch[1]);
      return name ? `Trilha: ${name}` : "Trilha de Conteúdo";
    }
    for (const [key, value] of Object.entries(PAGE_NAME_MAP)) {
      if (path.startsWith(key) && key !== "/") return value;
    }
    return path;
  };
}

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  botao: "Botão", link: "Link", card: "Card", elemento: "Elemento",
  input: "Input", tab: "Aba", aba: "Aba", checkbox: "Checkbox",
  switch: "Switch", radio: "Radio", select: "Select", slider: "Slider",
  accordion: "Accordion", menu_item: "Menu",
};

const ELEMENT_TYPES_ALL = "todos";

// ── Color helpers ──────────────────────────────────────────────────────
const getHeatColor = (value: number, max: number): string => {
  if (max === 0 || value === 0) return "hsl(var(--muted))";
  const intensity = value / max;
  if (intensity > 0.75) return "hsl(var(--primary))";
  if (intensity > 0.5) return "hsl(var(--primary) / 0.65)";
  if (intensity > 0.25) return "hsl(var(--primary) / 0.35)";
  return "hsl(var(--primary) / 0.12)";
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins < 60 ? `${mins}m ${secs}s` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ── Main component ─────────────────────────────────────────────────────
export function ClicksDashboard() {
  const [daysAgo, setDaysAgo] = useState(30);
  const [elementTypeFilter, setElementTypeFilter] = useState(ELEMENT_TYPES_ALL);

  // ── Reference data ──
  const { data: formations } = useQuery({
    queryKey: ["formations-names"],
    queryFn: async () => {
      const { data } = await supabase.from("formations").select("id, title");
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });
  const { data: contentTracks } = useQuery({
    queryKey: ["content-tracks-names"],
    queryFn: async () => {
      const { data } = await supabase.from("content_tracks").select("id, title, slug");
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });
  const getPageLabel = useMemo(() => {
    const fm = new Map<string, string>();
    (formations || []).forEach((f) => fm.set(f.id, f.title));
    const tm = new Map<string, string>();
    (contentTracks || []).forEach((t) => { if (t.slug) tm.set(t.slug, t.title); tm.set(t.id, t.title); });
    return createGetPageLabel(fm, tm);
  }, [formations, contentTracks]);

  // ── KPIs ──
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["analytics-kpis", daysAgo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_analytics_kpis" as any, { _days_ago: daysAgo });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as {
        total_events: number; unique_users: number; total_sessions: number;
        total_page_views: number; peak_hour: number; peak_hour_views: number;
        peak_day_name: string; peak_day_views: number; top_page: string;
        top_page_views: number; prev_total_events: number; prev_unique_users: number;
        prev_page_views: number;
      };
    },
  });

  // ── Page views over time ──
  const { data: pageViewsTime, isLoading: pvTimeLoading } = useQuery({
    queryKey: ["page-views-over-time", daysAgo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_page_views_over_time" as any, { _days_ago: daysAgo });
      if (error) throw error;
      return data as { day: string; page_views: number; unique_users: number }[];
    },
  });

  // ── Weekday summary ──
  const { data: weekdayData, isLoading: weekdayLoading } = useQuery({
    queryKey: ["weekday-access", daysAgo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_weekday_access_summary" as any, { _days_ago: daysAgo });
      if (error) throw error;
      return data as { day_of_week: number; day_name: string; page_views: number; unique_users: number }[];
    },
  });

  // ── Heatmap ──
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ["access-heatmap", daysAgo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_access_heatmap" as any, { _days_ago: daysAgo });
      if (error) throw error;
      return data as { day_of_week: number; day_name: string; hour_of_day: number; page_views: number; unique_users: number }[];
    },
  });

  // ── Top pages ──
  const { data: topPagesRaw, isLoading: pagesLoading } = useQuery({
    queryKey: ["top-pages-views", daysAgo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_pages_by_views" as any, { _days_ago: daysAgo, _limit: 15 });
      if (error) throw error;
      return data as { page_path: string; page_views: number; unique_users: number; avg_duration_seconds: number }[];
    },
  });

  // ── Top elements ──
  const { data: topElements, isLoading: elementsLoading } = useQuery({
    queryKey: ["top-clicked-elements", daysAgo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_clicked_elements", { _days_ago: daysAgo, _limit: 50 });
      if (error) throw error;
      return data as { label: string; element_type: string; page_path: string; click_count: number }[];
    },
  });

  // ── Derived data ──
  const chartData = useMemo(() =>
    (pageViewsTime || []).map((d) => ({
      day: new Date(d.day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      acessos: Number(d.page_views),
      usuarios: Number(d.unique_users),
    })),
    [pageViewsTime]
  );

  const weekdayChart = useMemo(() => {
    const ordered = [1, 2, 3, 4, 5, 6, 0];
    const labels: Record<number, string> = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };
    const map = new Map<number, number>();
    (weekdayData || []).forEach((d) => map.set(d.day_of_week, Number(d.page_views)));
    const maxVal = Math.max(...Array.from(map.values()), 0);
    return ordered.map((dow) => ({
      day: labels[dow],
      acessos: map.get(dow) || 0,
      isMax: (map.get(dow) || 0) === maxVal && maxVal > 0,
    }));
  }, [weekdayData]);

  const heatmapGrid = useMemo(() => {
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const map = new Map<string, number>();
    let maxViews = 0;
    (heatmapData || []).forEach((d) => {
      const v = Number(d.page_views);
      map.set(`${d.day_of_week}-${d.hour_of_day}`, v);
      if (v > maxViews) maxViews = v;
    });
    const grid = dayOrder.map((dow, di) => {
      const row = [];
      for (let h = 0; h < 24; h++) {
        row.push({ dow, dayLabel: dayLabels[di], hour: h, views: map.get(`${dow}-${h}`) || 0 });
      }
      return row;
    });
    return { grid, maxViews };
  }, [heatmapData]);

  // Aggregate pages with friendly names
  const aggregatedPages = useMemo(() => {
    if (!topPagesRaw) return [];
    const map = new Map<string, { name: string; page_views: number; unique_users: number; avg_duration: number }>();
    for (const p of topPagesRaw) {
      const name = getPageLabel(p.page_path);
      const existing = map.get(name);
      if (existing) {
        existing.page_views += Number(p.page_views);
        existing.unique_users = Math.max(existing.unique_users, Number(p.unique_users));
        existing.avg_duration = Math.max(existing.avg_duration, Number(p.avg_duration_seconds));
      } else {
        map.set(name, { name, page_views: Number(p.page_views), unique_users: Number(p.unique_users), avg_duration: Number(p.avg_duration_seconds) });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.page_views - a.page_views);
  }, [topPagesRaw, getPageLabel]);

  const totalPageViews = aggregatedPages.reduce((s, p) => s + p.page_views, 0);

  // Filtered elements
  const availableTypes = useMemo(() => {
    if (!topElements) return [];
    const types = new Set(topElements.map((e) => e.element_type));
    return Array.from(types).sort();
  }, [topElements]);

  const filteredElements = useMemo(() => {
    if (!topElements) return [];
    const filtered = elementTypeFilter === ELEMENT_TYPES_ALL
      ? topElements
      : topElements.filter((e) => e.element_type === elementTypeFilter);
    return filtered.slice(0, 20);
  }, [topElements, elementTypeFilter]);

  const totalElementClicks = useMemo(() =>
    (topElements || []).reduce((s, e) => s + Number(e.click_count), 0),
    [topElements]
  );

  // ── Helpers ──
  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header + period filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Analytics de Uso
          </h2>
          <p className="text-muted-foreground text-sm">Comportamento e interações dos membros na plataforma</p>
        </div>
        <Select value={String(daysAgo)} onValueChange={(v) => setDaysAgo(Number(v))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="14">Últimos 14 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 3 meses</SelectItem>
            <SelectItem value="180">Últimos 6 meses</SelectItem>
            <SelectItem value="270">Últimos 9 meses</SelectItem>
            <SelectItem value="365">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ━━━ KPI CARDS ━━━ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={Eye} label="Page Views" loading={kpisLoading}
          value={kpis?.total_page_views} prev={kpis?.prev_page_views}
          pctChange={kpis ? pctChange(Number(kpis.total_page_views), Number(kpis.prev_page_views)) : undefined}
        />
        <KpiCard
          icon={Users} label="Usuários Únicos" loading={kpisLoading}
          value={kpis?.unique_users} prev={kpis?.prev_unique_users}
          pctChange={kpis ? pctChange(Number(kpis.unique_users), Number(kpis.prev_unique_users)) : undefined}
        />
        <KpiCard
          icon={Activity} label="Sessões" loading={kpisLoading}
          value={kpis?.total_sessions}
        />
        <KpiCard
          icon={Clock} label="Horário de Pico" loading={kpisLoading}
          value={kpis ? `${String(kpis.peak_hour).padStart(2, "0")}h` : undefined}
          subtitle={kpis ? `${Number(kpis.peak_hour_views)} acessos` : undefined}
        />
        <KpiCard
          icon={CalendarDays} label="Dia de Pico" loading={kpisLoading}
          value={kpis?.peak_day_name}
          subtitle={kpis ? `${Number(kpis.peak_day_views)} acessos` : undefined}
        />
        <KpiCard
          icon={TrendingUp} label="Página Top" loading={kpisLoading}
          value={kpis ? getPageLabel(kpis.top_page) : undefined}
          subtitle={kpis ? `${Number(kpis.top_page_views)} views` : undefined}
          small
        />
      </div>

      {/* ━━━ TABS: Sections ━━━ */}
      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="comportamento">Comportamento</TabsTrigger>
          <TabsTrigger value="interacoes">Interações</TabsTrigger>
          <TabsTrigger value="paginas">Páginas</TabsTrigger>
        </TabsList>

        {/* ── Visão Geral ── */}
        <TabsContent value="visao-geral" className="space-y-6">
          {/* Main area chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Acessos ao Longo do Tempo
              </CardTitle>
              <CardDescription>Page views e usuários únicos por dia</CardDescription>
            </CardHeader>
            <CardContent>
              {pvTimeLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                    <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Area type="monotone" dataKey="acessos" name="Page Views" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.12} strokeWidth={2} />
                    <Area type="monotone" dataKey="usuarios" name="Usuários Únicos" stroke="hsl(var(--chart-2, 142 71% 45%))" fill="hsl(var(--chart-2, 142 71% 45%))" fillOpacity={0.08} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState />}
            </CardContent>
          </Card>

          {/* Weekday bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Acessos por Dia da Semana
              </CardTitle>
              <CardDescription>Soma de todas as ocorrências de cada dia no período selecionado (ex: todas as segundas somadas) — destaque para o dia da semana com maior volume acumulado</CardDescription>
            </CardHeader>
            <CardContent>
              {weekdayLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weekdayChart} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const value = payload[0].value as number;
                        return (
                          <div className="rounded-lg border bg-card px-4 py-3 shadow-lg">
                            <p className="text-base font-bold text-foreground">{label}</p>
                            <p className="text-lg font-extrabold text-primary mt-1">{value.toLocaleString("pt-BR")} views</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="acessos" name="Page Views" radius={[4, 4, 0, 0]}>
                      {weekdayChart.map((entry, i) => (
                        <Cell key={i} fill={entry.isMax ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.35)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Comportamento ── */}
        <TabsContent value="comportamento" className="space-y-6">
          {/* Day×Hour Heatmap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-primary" />
                Heatmap: Dia da Semana × Horário
              </CardTitle>
              <CardDescription>Em quais dias e horários os usuários mais acessam? (Horário de Brasília)</CardDescription>
            </CardHeader>
            <CardContent>
              {heatmapLoading ? (
                <Skeleton className="h-[240px] w-full" />
              ) : heatmapGrid.maxViews > 0 ? (
                <TooltipProvider delayDuration={0}>
                  <div className="overflow-x-auto">
                    <div className="min-w-[680px]">
                      {/* Hour labels */}
                      <div className="flex items-center mb-1.5">
                        <div className="w-10 shrink-0" />
                        {Array.from({ length: 24 }, (_, h) => (
                          <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground font-medium">
                            {h % 2 === 0 ? `${String(h).padStart(2, "0")}` : ""}
                          </div>
                        ))}
                      </div>
                      {/* Grid rows */}
                      {heatmapGrid.grid.map((row, ri) => (
                        <div key={ri} className="flex items-center gap-[3px] mb-[3px]">
                          <div className="w-10 shrink-0 text-xs text-muted-foreground font-medium text-right pr-2">
                            {row[0]?.dayLabel}
                          </div>
                          {row.map((cell) => (
                            <UITooltip key={`${cell.dow}-${cell.hour}`}>
                              <TooltipTrigger asChild>
                                <div
                                  className="flex-1 aspect-square rounded-[3px] cursor-default transition-colors min-h-[22px]"
                                  style={{ backgroundColor: getHeatColor(cell.views, heatmapGrid.maxViews) }}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p className="font-semibold">{cell.dayLabel} às {String(cell.hour).padStart(2, "0")}h</p>
                                <p className="text-muted-foreground">{cell.views.toLocaleString("pt-BR")} acessos</p>
                              </TooltipContent>
                            </UITooltip>
                          ))}
                        </div>
                      ))}
                      {/* Legend */}
                      <div className="flex items-center justify-end gap-1.5 mt-4 text-xs text-muted-foreground">
                        <span>Menos</span>
                        {[0, 0.12, 0.35, 0.65, 1].map((intensity, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-[3px]"
                            style={{ backgroundColor: intensity === 0 ? "hsl(var(--muted))" : `hsl(var(--primary) / ${intensity})` }}
                          />
                        ))}
                        <span>Mais</span>
                      </div>
                    </div>
                  </div>
                </TooltipProvider>
              ) : <EmptyState />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Interações ── */}
        <TabsContent value="interacoes" className="space-y-6">
          {/* Filter by element type */}
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrar por tipo:</span>
            <Select value={elementTypeFilter} onValueChange={setElementTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ELEMENT_TYPES_ALL}>Todos os tipos</SelectItem>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>{ELEMENT_TYPE_LABELS[t] || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Elements table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-primary" />
                Elementos Mais Clicados
              </CardTitle>
              <CardDescription>Top 20 elementos interativos com maior volume de cliques</CardDescription>
            </CardHeader>
            <CardContent>
              {elementsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : filteredElements.length > 0 ? (
                <div className="space-y-2">
                  {filteredElements.map((el, i) => {
                    const clicks = Number(el.click_count);
                    const pct = totalElementClicks > 0 ? ((clicks / totalElementClicks) * 100).toFixed(1) : "0";
                    const maxBarClicks = Number(filteredElements[0].click_count);
                    return (
                      <div key={`${el.label}-${el.page_path}-${i}`} className="group">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground text-xs w-5 text-right shrink-0">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{el.label}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                {ELEMENT_TYPE_LABELS[el.element_type] || el.element_type}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {getPageLabel(el.page_path || "/")}
                            </p>
                          </div>
                          <div className="text-right shrink-0 w-24">
                            <span className="font-semibold text-sm">{clicks.toLocaleString("pt-BR")}</span>
                            <span className="text-muted-foreground text-xs ml-1">({pct}%)</span>
                          </div>
                        </div>
                        <div className="ml-8 mt-1">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${(clicks / maxBarClicks) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <EmptyState />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Páginas ── */}
        <TabsContent value="paginas" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Ranking de Páginas
              </CardTitle>
              <CardDescription>Páginas mais acessadas com tempo médio de permanência</CardDescription>
            </CardHeader>
            <CardContent>
              {pagesLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : aggregatedPages.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs">
                        <th className="text-left py-2 pl-1 pr-3 font-medium">#</th>
                        <th className="text-left py-2 pr-3 font-medium">Página</th>
                        <th className="text-right py-2 px-3 font-medium">Views</th>
                        <th className="text-right py-2 px-3 font-medium">Usuários</th>
                        <th className="text-right py-2 px-3 font-medium">% Total</th>
                        <th className="text-right py-2 px-3 font-medium">Tempo Médio</th>
                        <th className="py-2 pl-3 w-32"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedPages.map((page, i) => {
                        const pct = totalPageViews > 0 ? ((page.page_views / totalPageViews) * 100).toFixed(1) : "0";
                        return (
                          <tr key={page.name} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 pl-1 pr-3 text-muted-foreground text-xs">{i + 1}</td>
                            <td className="py-2.5 pr-3 font-medium">{page.name}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums">{page.page_views.toLocaleString("pt-BR")}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">{page.unique_users.toLocaleString("pt-BR")}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">{pct}%</td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">{page.avg_duration > 0 ? formatDuration(page.avg_duration) : "—"}</td>
                            <td className="py-2.5 pl-3">
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden w-full">
                                <div
                                  className="h-full rounded-full bg-primary/60 transition-all"
                                  style={{ width: `${(page.page_views / (aggregatedPages[0]?.page_views || 1)) * 100}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, loading, prev, pctChange: pct, subtitle, small }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | number;
  loading?: boolean;
  prev?: number;
  pctChange?: number;
  subtitle?: string;
  small?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide leading-tight">{label}</p>
            {loading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <>
                <p className={`font-bold mt-0.5 truncate ${small ? "text-sm" : "text-lg"}`}>
                  {typeof value === "number" ? Number(value).toLocaleString("pt-BR") : value ?? "—"}
                </p>
                {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
                {pct !== undefined && (
                  <div className={`flex items-center gap-0.5 mt-0.5 text-[11px] font-medium ${
                    pct > 0 ? "text-green-500" : pct < 0 ? "text-red-400" : "text-muted-foreground"
                  }`}>
                    {pct > 0 ? <ArrowUpRight className="h-3 w-3" /> : pct < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {Math.abs(pct)}% vs período anterior
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return <p className="text-muted-foreground text-sm text-center py-12">Sem dados para o período selecionado</p>;
}
