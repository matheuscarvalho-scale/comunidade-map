import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Users, Activity, UserX, Clock, TrendingUp, BookOpen, Eye, AlertTriangle, DollarSign, MousePointerClick, Receipt, Percent, ChevronRight, ChevronDown, Bell, List, Search, PlayCircle, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { SEOHead } from "@/components/SEOHead";
import { PageClicksModal } from "@/components/analytics/PageClicksModal";
import { ClicksDashboard } from "@/components/analytics/ClicksDashboard";
import { OnboardingDashboard } from "@/components/analytics/OnboardingDashboard";
import { ContentItemStatsModal } from "@/components/analytics/ContentItemStatsModal";

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

function getPageName(path: string, formationMap?: Map<string, string>, trackMap?: Map<string, string>): string {
  if (PAGE_NAME_MAP[path]) return PAGE_NAME_MAP[path];

  // Check if it's a formation detail page /formacoes/:id
  const formationMatch = path.match(/^\/formacoes\/([a-f0-9-]+)/);
  if (formationMatch && formationMap) {
    const title = formationMap.get(formationMatch[1]);
    if (title) return `Formação: ${title}`;
  }

  // Check if it's a content track detail page /trilha-conteudo/:slugOrId
  const trackMatch = path.match(/^\/trilha-conteudo\/([^/]+)/);
  if (trackMatch) {
    const title = trackMap?.get(trackMatch[1]);
    if (title) return `Trilha: ${title}`;
    return "Trilha de Conteúdo";
  }

  for (const [key, value] of Object.entries(PAGE_NAME_MAP)) {
    if (path.startsWith(key) && key !== "/") return value;
  }
  if (path.startsWith("/admin")) return "Admin";
  return path;
}

/** Aggregate rows that resolve to the same friendly page name */
function aggregatePages(pages: { page_path: string; view_count: number; unique_users: number }[], formationMap?: Map<string, string>, trackMap?: Map<string, string>) {
  const map = new Map<string, { name: string; view_count: number; unique_users: number; paths: string[] }>();
  for (const p of pages) {
    const name = getPageName(p.page_path, formationMap, trackMap);
    const existing = map.get(name);
    if (existing) {
      existing.view_count += Number(p.view_count);
      existing.unique_users = Math.max(existing.unique_users, Number(p.unique_users));
      if (!existing.paths.includes(p.page_path)) existing.paths.push(p.page_path);
    } else {
      map.set(name, { name, view_count: Number(p.view_count), unique_users: Number(p.unique_users), paths: [p.page_path] });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.view_count - a.view_count);
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export default function AdminAnalytics() {
  const [selectedPage, setSelectedPage] = useState<{ name: string; paths: string[] } | null>(null);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [allMembersSearch, setAllMembersSearch] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<{ id: string; title: string } | null>(null);

  // All members (lazy)
  const { data: allMembers, isLoading: allMembersLoading } = useQuery({
    queryKey: ["admin-all-members-list"],
    enabled: showAllMembers,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_inactive_members", { inactive_days: 0, limit_count: 1000 });
      if (error) throw error;
      return data as { user_id: string; name: string; email: string; avatar_url: string | null; last_activity: string | null; days_inactive: number | null; subscription_plan: string | null }[];
    },
  });
  // Engagement stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-engagement-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_engagement_stats");
      if (error) throw error;
      return data as { total_members: number; active_7d: number; inactive_20d: number; avg_session_seconds: number };
    },
  });

  // Top pages
  const { data: topPages, isLoading: pagesLoading } = useQuery({
    queryKey: ["admin-top-pages"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_pages", { days_back: 30, limit_count: 10 });
      if (error) throw error;
      return data as { page_path: string; view_count: number; unique_users: number }[];
    },
  });

  // All formations for name lookup
  const { data: allFormations } = useQuery({
    queryKey: ["admin-all-formations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("formations").select("id, title");
      if (error) throw error;
      return data;
    },
  });

  const formationMap = new Map<string, string>();
  allFormations?.forEach((f) => formationMap.set(f.id, f.title));

  // Formation completion rates
  const { data: formations, isLoading: formationsLoading } = useQuery({
    queryKey: ["admin-formation-rates"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_formation_completion_rates");
      if (error) throw error;
      return data as { formation_id: string; formation_title: string; total_lessons: number; users_started: number; users_completed: number; completion_rate: number }[];
    },
  });

  // All content tracks for name lookup (trilhas de conteúdo + mentorias gravadas/webinars)
  const { data: allContentTracks } = useQuery({
    queryKey: ["admin-all-content-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_tracks").select("id, title, slug");
      if (error) throw error;
      return data as { id: string; title: string; slug: string | null }[];
    },
  });

  const trackMap = new Map<string, string>();
  allContentTracks?.forEach((t) => {
    trackMap.set(t.id, t.title);
    if (t.slug) trackMap.set(t.slug, t.title);
  });

  // Content track completion rates (trilhas de conteúdo, incl. mentorias gravadas/webinars)
  const { data: contentTracks, isLoading: contentTracksLoading } = useQuery({
    queryKey: ["admin-content-track-rates"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_content_track_completion_rates");
      if (error) throw error;
      return data as { track_id: string; track_title: string; track_slug: string | null; total_items: number; users_started: number; users_completed: number; completion_rate: number }[];
    },
  });

  // Inactive members
  const { data: inactiveMembers, isLoading: inactiveLoading } = useQuery({
    queryKey: ["admin-inactive-members"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_inactive_members", { inactive_days: 0, limit_count: 20 });
      if (error) throw error;
      return data as { user_id: string; name: string; email: string; avatar_url: string | null; last_activity: string | null; days_inactive: number | null; subscription_plan: string | null }[];
    },
  });

  const inactiveIds = (inactiveMembers || []).map((m) => m.user_id);

  // Secondary logins for inactive members + their last activity
  const { data: secondaryByPrimary } = useQuery({
    queryKey: ["admin-inactive-secondary-logins", inactiveIds.join(",")],
    enabled: inactiveIds.length > 0,
    queryFn: async () => {
      const { data: secs, error } = await supabase
        .from("secondary_logins")
        .select("primary_user_id, secondary_user_id, secondary_email, secondary_name, relationship, is_active")
        .in("primary_user_id", inactiveIds)
        .eq("is_active", true);
      if (error) throw error;

      const secondaryUserIds = (secs || [])
        .map((s) => s.secondary_user_id)
        .filter((v): v is string => !!v);

      const lastActivityMap = new Map<string, string>();
      if (secondaryUserIds.length) {
        const { data: events } = await supabase
          .from("member_analytics")
          .select("user_id, created_at")
          .in("user_id", secondaryUserIds)
          .order("created_at", { ascending: false })
          .limit(500);
        for (const ev of events || []) {
          if (!lastActivityMap.has(ev.user_id)) {
            lastActivityMap.set(ev.user_id, ev.created_at);
          }
        }
      }

      const byPrimary = new Map<string, Array<typeof secs[number] & { last_activity: string | null; days_inactive: number | null }>>();
      for (const s of secs || []) {
        const last = s.secondary_user_id ? lastActivityMap.get(s.secondary_user_id) || null : null;
        const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
        const arr = byPrimary.get(s.primary_user_id) || [];
        arr.push({ ...s, last_activity: last, days_inactive: days });
        byPrimary.set(s.primary_user_id, arr);
      }
      return byPrimary;
    },
  });

  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const toggleMember = (id: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const aggregatedPages = topPages ? aggregatePages(topPages, formationMap, trackMap) : [];
  const maxViews = aggregatedPages[0]?.view_count || 1;

  return (
    <PermissionGate permission="analytics.manage">
      <MainLayout>
        <SEOHead title="Analytics de Engajamento" description="Métricas de engajamento dos membros" />
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Analytics de Engajamento</h1>
              <p className="text-muted-foreground">Visão geral do comportamento e engajamento dos membros</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                data-ga="admin-test-push"
                aria-label="Enviar push de teste"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke("test-send-push", { body: {} });
                    if (error) {
                      toast.error(`Falha ao enviar push: ${error.message}`);
                      return;
                    }
                    const sent = (data as { sent?: number } | null)?.sent ?? 0;
                    const errMsg = (data as { error?: string } | null)?.error;
                    if (errMsg) toast.error(errMsg);
                    else if (sent > 0) toast.success(`Push enviado para ${sent} dispositivo(s)`);
                    else toast.message("Nenhum dispositivo registrado para o seu usuário");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Erro inesperado");
                  }
                }}
              >
                <Bell className="h-4 w-4 mr-2" />
                Enviar push de teste
              </Button>
              <Button
                variant="default"
                size="sm"
                data-ga="admin-bootstrap-push"
                aria-label="Ativar push automático"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke("bootstrap-push-secret", { body: {} });
                    if (error) {
                      toast.error(`Falha ao ativar push automático: ${error.message}`);
                      return;
                    }
                    const errMsg = (data as { error?: string } | null)?.error;
                    if (errMsg) {
                      toast.error(errMsg);
                      return;
                    }
                    toast.success("Push automático ativado com sucesso");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Erro inesperado");
                  }
                }}
              >
                <Bell className="h-4 w-4 mr-2" />
                Ativar push automático
              </Button>
            </div>
          </div>

          <Tabs defaultValue="engajamento" className="space-y-6">
            <TabsList>
              <TabsTrigger value="engajamento" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Engajamento
              </TabsTrigger>
              <TabsTrigger value="cliques" className="flex items-center gap-2">
                <MousePointerClick className="h-4 w-4" />
                Cliques Internos
              </TabsTrigger>
              <TabsTrigger value="onboarding" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Onboarding
              </TabsTrigger>
            </TabsList>

            <TabsContent value="engajamento" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard icon={Users} label="Membros Ativos" value={stats?.total_members} loading={statsLoading} />
                <StatsCard icon={Activity} label="Ativos (7 dias)" value={stats?.active_7d} loading={statsLoading} variant="success" />
                <StatsCard icon={UserX} label="Inativos (30+ dias)" value={stats?.inactive_20d} loading={statsLoading} variant="destructive" />
                <StatsCard icon={Clock} label="Sessão Média" value={stats ? formatDuration(stats.avg_session_seconds) : undefined} loading={statsLoading} />
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowAllMembers(true)} className="gap-2">
                  <List className="h-4 w-4" />
                  Ver lista completa de membros
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Pages */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Eye className="h-5 w-5 text-primary" />
                      Páginas Mais Acessadas
                    </CardTitle>
                    <CardDescription>Últimos 30 dias</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pagesLoading ? (
                      Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
                    ) : aggregatedPages.length ? (
                      aggregatedPages.map((page) => (
                        <div
                          key={page.name}
                          className="space-y-1 cursor-pointer rounded-md p-2 -mx-2 transition-colors hover:bg-muted/50"
                          onClick={() => setSelectedPage({ name: page.name, paths: page.paths })}
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate flex-1 text-primary hover:underline">{page.name}</span>
                            <span className="text-muted-foreground ml-2 whitespace-nowrap">
                              {page.view_count} views · {page.unique_users} usuários
                            </span>
                          </div>
                          <Progress value={(page.view_count / maxViews) * 100} className="h-2" />
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">Sem dados disponíveis</p>
                    )}
                  </CardContent>
                </Card>

                {/* Formation Completion Rates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Taxa de Conclusão - Formações
                    </CardTitle>
                    <CardDescription>Usuários que iniciaram vs. concluíram</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formationsLoading ? (
                      Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                    ) : formations?.length ? (
                      formations.map((f) => (
                        <div key={f.formation_id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate flex-1">{f.formation_title}</span>
                            <Badge variant={f.completion_rate >= 50 ? "default" : f.completion_rate >= 20 ? "secondary" : "outline"}>
                              {f.completion_rate}%
                            </Badge>
                          </div>
                          <Progress value={f.completion_rate} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {f.users_started} iniciaram · {f.users_completed} concluíram · {f.total_lessons} aulas
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">Sem formações publicadas</p>
                    )}
                  </CardContent>
                </Card>

                {/* Content Track Completion Rates (Trilhas + Mentorias Gravadas/Webinars) */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <PlayCircle className="h-5 w-5 text-primary" />
                      Taxa de Conclusão - Trilhas de Conteúdo
                    </CardTitle>
                    <CardDescription>Trilhas, mentorias gravadas e webinars · usuários que iniciaram vs. concluíram</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {contentTracksLoading ? (
                      Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                    ) : contentTracks?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {contentTracks.map((t) => (
                          <div
                            key={t.track_id}
                            className="space-y-1.5 cursor-pointer rounded-md p-2 -mx-2 transition-colors hover:bg-muted/50"
                            onClick={() => setSelectedTrack({ id: t.track_id, title: t.track_title })}
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium truncate flex-1 text-primary hover:underline">{t.track_title}</span>
                              <Badge variant={t.completion_rate >= 50 ? "default" : t.completion_rate >= 20 ? "secondary" : "outline"}>
                                {t.completion_rate}%
                              </Badge>
                            </div>
                            <Progress value={t.completion_rate} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {t.users_started} iniciaram · {t.users_completed} concluíram · {t.total_items} conteúdos
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">Sem trilhas ativas</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Inactive Members */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Top 20 Membros Mais Inativos
                  </CardTitle>
                  <CardDescription>
                    Membros com assinatura ativa ordenados pelo maior tempo sem acessar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inactiveLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
                  ) : inactiveMembers?.length ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Membro</TableHead>
                            <TableHead>E-mail</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Último Acesso</TableHead>
                            <TableHead>Dias Inativo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inactiveMembers.map((member) => {
                            const secondaries = secondaryByPrimary?.get(member.user_id) || [];
                            const isExpanded = expandedMembers.has(member.user_id);
                            const hasSecondaries = secondaries.length > 0;
                            return (
                              <Fragment key={member.user_id}>
                                <TableRow
                                  className={hasSecondaries ? "cursor-pointer hover:bg-muted/40" : ""}
                                  onClick={() => hasSecondaries && toggleMember(member.user_id)}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {hasSecondaries ? (
                                        isExpanded ? (
                                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        )
                                      ) : (
                                        <span className="w-3.5" />
                                      )}
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">
                                          {member.name?.slice(0, 2).toUpperCase() || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium text-sm">{member.name}</span>
                                      {hasSecondaries && (
                                        <Badge variant="outline" className="text-[10px] ml-1">
                                          +{secondaries.length} login{secondaries.length > 1 ? "s" : ""}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {member.subscription_plan || "N/A"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {member.last_activity
                                      ? new Date(member.last_activity).toLocaleDateString("pt-BR")
                                      : "Nunca acessou"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={(member.days_inactive || 999) >= 60 ? "destructive" : "secondary"}
                                      className={(member.days_inactive || 999) >= 30 && (member.days_inactive || 999) < 60 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30" : ""}
                                    >
                                      {member.days_inactive != null ? `${member.days_inactive}d` : "∞"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                                {isExpanded && secondaries.map((sec) => (
                                  <TableRow key={`${member.user_id}-${sec.secondary_email}`} className="bg-muted/20">
                                    <TableCell>
                                      <div className="flex items-center gap-2 pl-8">
                                        <Avatar className="h-7 w-7">
                                          <AvatarFallback className="text-[10px]">
                                            {sec.secondary_name?.slice(0, 2).toUpperCase() || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                          <span className="text-sm">{sec.secondary_name}</span>
                                          <span className="text-[10px] text-muted-foreground">{sec.relationship}</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{sec.secondary_email}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-[10px]">Secundário</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {sec.last_activity
                                        ? new Date(sec.last_activity).toLocaleDateString("pt-BR")
                                        : sec.secondary_user_id ? "Nunca acessou" : "Sem conta"}
                                    </TableCell>
                                    <TableCell>
                                      {sec.days_inactive != null ? (
                                        <Badge
                                          variant={sec.days_inactive >= 60 ? "destructive" : "secondary"}
                                          className={sec.days_inactive >= 30 && sec.days_inactive < 60 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : sec.days_inactive < 30 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
                                        >
                                          {sec.days_inactive}d
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px]">—</Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>Nenhum membro inativo encontrado 🎉</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cashback Club Dashboard */}
              <CashbackDashboardSection />
            </TabsContent>

            <TabsContent value="cliques">
              <ClicksDashboard />
            </TabsContent>

            <TabsContent value="onboarding">
              <OnboardingDashboard />
            </TabsContent>
          </Tabs>
        </div>

        <PageClicksModal
          open={!!selectedPage}
          onOpenChange={(open) => !open && setSelectedPage(null)}
          pageName={selectedPage?.name || ""}
          pagePaths={selectedPage?.paths || []}
        />

        <ContentItemStatsModal
          open={!!selectedTrack}
          onOpenChange={(open) => !open && setSelectedTrack(null)}
          trackId={selectedTrack?.id || null}
          trackTitle={selectedTrack?.title || ""}
        />

        <Dialog open={showAllMembers} onOpenChange={setShowAllMembers}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Todos os membros ativos
              </DialogTitle>
              <DialogDescription>
                Lista completa de membros com assinatura ativa, ordenada pelo maior tempo sem acessar.
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou plano..."
                value={allMembersSearch}
                onChange={(e) => setAllMembersSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              {allMembersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : allMembers?.length ? (
                (() => {
                  const term = allMembersSearch.trim().toLowerCase();
                  const filtered = term
                    ? allMembers.filter((m) =>
                        (m.name || "").toLowerCase().includes(term) ||
                        (m.email || "").toLowerCase().includes(term) ||
                        (m.subscription_plan || "").toLowerCase().includes(term)
                      )
                    : allMembers;
                  return (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        Mostrando {filtered.length} de {allMembers.length} membros
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Membro</TableHead>
                            <TableHead>E-mail</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Último Acesso</TableHead>
                            <TableHead>Dias Inativo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((m) => (
                            <TableRow key={m.user_id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarImage src={m.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {m.name?.slice(0, 2).toUpperCase() || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">{m.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{m.subscription_plan || "N/A"}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {m.last_activity ? new Date(m.last_activity).toLocaleDateString("pt-BR") : "Nunca acessou"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={(m.days_inactive ?? 999) >= 60 ? "destructive" : "secondary"}
                                  className={
                                    (m.days_inactive ?? 999) >= 30 && (m.days_inactive ?? 999) < 60
                                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                      : (m.days_inactive ?? 999) < 30
                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                        : ""
                                  }
                                >
                                  {m.days_inactive != null ? `${m.days_inactive}d` : "∞"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  );
                })()
              ) : (
                <p className="text-center py-8 text-muted-foreground">Nenhum membro encontrado</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </PermissionGate>
  );
}

function StatsCard({ icon: Icon, label, value, loading, variant }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | number;
  loading?: boolean;
  variant?: "success" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            variant === "success" ? "bg-green-500/10 text-green-500" :
            variant === "destructive" ? "bg-destructive/10 text-destructive" :
            "bg-primary/10 text-primary"
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
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

function CashbackDashboardSection() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["cashback-dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cashback_dashboard_stats");
      if (error) throw error;
      return data as { total_registros: number; confirmadas: number; nao_converteu: number; aguardando: number; total_vendas: number; total_cashback: number; taxa_conversao: number };
    },
  });

  const { data: partners, isLoading: partnersLoading } = useQuery({
    queryKey: ["cashback-partner-performance"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cashback_partner_performance");
      if (error) throw error;
      return data as { partner_name: string; cliques: number; confirmadas: number; taxa_conversao: number; vendas: number; cashback: number }[];
    },
  });

  const { data: saldos, isLoading: saldosLoading } = useQuery({
    queryKey: ["cashback-saldo-planos"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cashback_saldo_planos");
      if (error) throw error;
      return data as { cliente: string; email: string; plano: string; valor_plano: number; cashback_gerado: number; saldo_a_pagar: number }[];
    },
  });

  const formatCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <>
      <div className="pt-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Dashboard Cashback Club
        </h2>
        <p className="text-muted-foreground text-sm">Métricas de conversão e cashback dos parceiros</p>
      </div>

      {/* Cashback Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={MousePointerClick} label="Total Registros" value={stats?.total_registros} loading={statsLoading} />
        <StatsCard icon={TrendingUp} label="Confirmadas" value={stats?.confirmadas} loading={statsLoading} variant="success" />
        <StatsCard icon={Clock} label="Aguardando" value={stats?.aguardando} loading={statsLoading} />
        <StatsCard icon={Percent} label="Taxa de Conversão" value={stats ? `${stats.taxa_conversao}%` : undefined} loading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard icon={Receipt} label="Total Vendas" value={stats ? formatCurrency(stats.total_vendas) : undefined} loading={statsLoading} />
        <StatsCard icon={DollarSign} label="Total Cashback" value={stats ? formatCurrency(stats.total_cashback) : undefined} loading={statsLoading} variant="success" />
      </div>

      {/* Desempenho por Parceiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MousePointerClick className="h-5 w-5 text-primary" />
            Desempenho por Parceiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          {partnersLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)
          ) : partners?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parceiro</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Confirmadas</TableHead>
                    <TableHead className="text-right">Taxa Conv.</TableHead>
                    <TableHead className="text-right">Vendas (R$)</TableHead>
                    <TableHead className="text-right">Cashback (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((p) => (
                    <TableRow key={p.partner_name}>
                      <TableCell className="font-medium">{p.partner_name}</TableCell>
                      <TableCell className="text-right">{p.cliques}</TableCell>
                      <TableCell className="text-right">{p.confirmadas}</TableCell>
                      <TableCell className="text-right">{p.taxa_conversao}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.vendas)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.cashback)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">Sem dados de parceiros</p>
          )}
        </CardContent>
      </Card>

      {/* Saldo de Planos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-primary" />
            Saldo de Planos (Cashback abatido)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {saldosLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)
          ) : saldos?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Valor Plano (R$)</TableHead>
                    <TableHead className="text-right">Cashback Gerado (R$)</TableHead>
                    <TableHead className="text-right">Saldo a Pagar (R$)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saldos.map((s) => (
                    <TableRow key={s.email}>
                      <TableCell className="font-medium">{s.cliente}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{s.plano}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(s.valor_plano)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.cashback_gerado)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(s.saldo_a_pagar)}</TableCell>
                      <TableCell>
                        <Badge variant={s.cashback_gerado > 0 ? "default" : "secondary"} className="text-xs">
                          {s.cashback_gerado > 0 ? "Com cashback" : "Sem cashback ainda"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">Sem membros com plano ativo</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
