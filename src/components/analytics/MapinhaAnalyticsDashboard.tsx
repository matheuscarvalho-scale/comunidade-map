import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, AlertCircle, Bot, CheckCircle2, Clock3, MessageCircle,
  Search, Sparkles, ThumbsDown, ThumbsUp, Users, Wifi,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Summary = {
  total_questions: number;
  unique_users: number;
  conversations: number;
  answered: number;
  errors: number;
  success_rate: number;
  avg_latency_ms: number;
  web_search_rate: number;
  positive_ratings: number;
  negative_ratings: number;
  rating_rate: number;
};

type Topic = {
  topic: string;
  questions: number;
  users: number;
  avg_latency_ms: number;
  positive: number;
  negative: number;
};

type TopUser = {
  user_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  company: string | null;
  subscription_plan: string | null;
  questions: number;
  conversations: number;
  last_question_at: string;
};

type RepeatedQuestion = {
  question: string;
  topic: string;
  occurrences: number;
  users: number;
  last_asked_at: string;
};

type Interaction = {
  id: string;
  question: string;
  answer: string | null;
  topic: string;
  status: "processing" | "answered" | "error";
  error_message: string | null;
  latency_ms: number | null;
  web_search_count: number;
  search_queries: string[];
  rating: -1 | 1 | null;
  created_at: string;
  conversation_id: string;
  user_name: string;
  user_email: string | null;
  avatar_url: string | null;
};

type AnalyticsData = {
  period_days: number;
  summary: Summary;
  daily: Array<{ day: string; questions: number; users: number; errors: number }>;
  topics: Topic[];
  top_users: TopUser[];
  repeated_questions: RepeatedQuestion[];
  recent: Interaction[];
  hours: Array<{ hour: number; questions: number }>;
};

const PERIODS = [7, 30, 90] as const;

function formatDuration(ms: number) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}

function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function MetricCard({
  icon: Icon, label, value, helper, loading,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  helper: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? <Skeleton className="h-8 w-20 mt-2" /> : <p className="text-2xl font-bold mt-1">{value}</p>}
            <p className="text-xs text-muted-foreground mt-1">{helper}</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-14 text-center">
        <Bot className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="font-medium">Ainda não há perguntas neste período</p>
        <p className="text-sm text-muted-foreground mt-1">
          A coleta começa com as próximas conversas feitas no Mapinha.
        </p>
      </CardContent>
    </Card>
  );
}

export function MapinhaAnalyticsDashboard() {
  const [period, setPeriod] = useState<number>(30);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Interaction | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["mapinha-analytics", period],
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data: response, error: queryError } = await supabase.rpc(
        "get_mapinha_analytics",
        { days_back: period },
      );
      if (queryError) throw queryError;
      return response as AnalyticsData;
    },
  });

  const filteredRecent = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return data?.recent ?? [];
    return (data?.recent ?? []).filter((item) =>
      [item.question, item.answer, item.topic, item.user_name, item.user_email]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [data?.recent, search]);

  const hourlyData = useMemo(() => {
    const byHour = new Map((data?.hours ?? []).map((item) => [Number(item.hour), Number(item.questions)]));
    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${String(hour).padStart(2, "0")}h`,
      questions: byHour.get(hour) ?? 0,
    }));
  }, [data?.hours]);

  const summary = data?.summary;
  const totalRatings = (summary?.positive_ratings ?? 0) + (summary?.negative_ratings ?? 0);
  const satisfaction = totalRatings
    ? Math.round(100 * (summary?.positive_ratings ?? 0) / totalRatings)
    : 0;

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="font-medium">Não foi possível carregar o analytics</p>
          <p className="text-sm text-muted-foreground mt-1">Confirme se a migration do Mapinha foi aplicada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Inteligência do Mapinha
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            O que os membros perguntam, quem mais usa e onde o assistente pode melhorar.
          </p>
        </div>
        <div className="flex rounded-lg border p-1 bg-muted/30" aria-label="Período do relatório">
          {PERIODS.map((days) => (
            <Button
              key={days}
              size="sm"
              variant={period === days ? "default" : "ghost"}
              className="h-8"
              onClick={() => setPeriod(days)}
            >
              {days} dias
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={MessageCircle}
          label="Perguntas"
          value={summary?.total_questions ?? 0}
          helper={`${summary?.conversations ?? 0} conversas`}
          loading={isLoading}
        />
        <MetricCard
          icon={Users}
          label="Membros usando"
          value={summary?.unique_users ?? 0}
          helper="usuários únicos"
          loading={isLoading}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Respostas concluídas"
          value={`${summary?.success_rate ?? 0}%`}
          helper={`${summary?.errors ?? 0} falhas no período`}
          loading={isLoading}
        />
        <MetricCard
          icon={Clock3}
          label="Tempo médio"
          value={formatDuration(summary?.avg_latency_ms ?? 0)}
          helper={`${summary?.web_search_rate ?? 0}% usam busca externa`}
          loading={isLoading}
        />
      </div>

      {!isLoading && !summary?.total_questions ? <EmptyState /> : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Perguntas ao longo do tempo</CardTitle>
                <CardDescription>Volume diário e membros únicos</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                {isLoading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.daily ?? []}>
                      <defs>
                        <linearGradient id="mapinhaQuestions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" tickFormatter={(value) => formatDate(value)} fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip labelFormatter={(value) => formatDate(String(value))} />
                      <Area type="monotone" dataKey="questions" name="Perguntas" stroke="hsl(var(--primary))" fill="url(#mapinhaQuestions)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Qualidade das respostas</CardTitle>
                <CardDescription>Avaliações deixadas pelos membros</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-bold">{totalRatings ? `${satisfaction}%` : "—"}</span>
                    <span className="text-xs text-muted-foreground">{totalRatings} avaliações</span>
                  </div>
                  <Progress value={satisfaction} className="mt-3" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <ThumbsUp className="h-4 w-4 text-emerald-500 mb-2" />
                    <p className="text-xl font-semibold">{summary?.positive_ratings ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Úteis</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <ThumbsDown className="h-4 w-4 text-destructive mb-2" />
                    <p className="text-xl font-semibold">{summary?.negative_ratings ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Não úteis</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary?.rating_rate ?? 0}% das respostas receberam avaliação.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Temas mais perguntados</CardTitle>
                <CardDescription>Assuntos classificados automaticamente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data?.topics ?? []).slice(0, 8).map((topic, index) => {
                  const max = data?.topics?.[0]?.questions || 1;
                  return (
                    <div key={topic.topic} className="space-y-1.5">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="truncate"><span className="text-muted-foreground mr-2">{index + 1}.</span>{topic.topic}</span>
                        <span className="font-medium shrink-0">{topic.questions}</span>
                      </div>
                      <Progress value={100 * topic.questions / max} className="h-1.5" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Horários de maior uso</CardTitle>
                <CardDescription>Horário de Brasília</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="hour" interval={2} fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="questions" name="Perguntas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quem mais pergunta</CardTitle>
                <CardDescription>Membros com maior uso no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(data?.top_users ?? []).slice(0, 8).map((member, index) => (
                    <div key={member.user_id} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar_url ?? undefined} />
                        <AvatarFallback>{initials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.company || member.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{member.questions}</p>
                        <p className="text-[10px] text-muted-foreground">{member.conversations} conversas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Perguntas recorrentes</CardTitle>
                <CardDescription>Oportunidades para conteúdo, FAQ e novas aulas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(data?.repeated_questions ?? []).slice(0, 8).map((item, index) => (
                    <div key={`${item.question}-${index}`} className="flex gap-3">
                      <Badge variant="secondary" className="h-6 shrink-0">{item.occurrences}×</Badge>
                      <div className="min-w-0">
                        <p className="text-sm line-clamp-2">{item.question}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.topic} · {item.users} membro(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Perguntas recentes</CardTitle>
                <CardDescription>Últimas 100 interações; clique para ver a resposta completa</CardDescription>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar pergunta, tema ou membro..."
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>Pergunta</TableHead>
                    <TableHead>Tema</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecent.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => setSelected(item)}>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-36">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={item.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[10px]">{initials(item.user_name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm truncate max-w-36">{item.user_name}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(item.created_at, true)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><p className="max-w-md truncate">{item.question}</p></TableCell>
                      <TableCell><Badge variant="outline">{item.topic}</Badge></TableCell>
                      <TableCell>
                        {item.status === "answered" ? (
                          <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Respondida</span>
                        ) : item.status === "error" ? (
                          <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />Falhou</span>
                        ) : (
                          <span className="text-xs text-amber-600 flex items-center gap-1"><Activity className="h-3.5 w-3.5" />Processando</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatDuration(item.latency_ms ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!filteredRecent.length && (
                <p className="text-center text-sm text-muted-foreground py-10">Nenhuma interação encontrada.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da conversa</DialogTitle>
            <DialogDescription>
              {selected?.user_name} · {selected ? formatDate(selected.created_at, true) : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge>{selected.topic}</Badge>
                <Badge variant="outline"><Clock3 className="h-3 w-3 mr-1" />{formatDuration(selected.latency_ms ?? 0)}</Badge>
                {selected.web_search_count > 0 && <Badge variant="outline"><Wifi className="h-3 w-3 mr-1" />{selected.web_search_count} busca(s)</Badge>}
                {selected.rating === 1 && <Badge className="bg-emerald-600"><ThumbsUp className="h-3 w-3 mr-1" />Útil</Badge>}
                {selected.rating === -1 && <Badge variant="destructive"><ThumbsDown className="h-3 w-3 mr-1" />Não útil</Badge>}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Pergunta</p>
                <div className="rounded-lg bg-primary/10 p-4 text-sm whitespace-pre-wrap">{selected.question}</div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Resposta do Mapinha</p>
                <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">{selected.answer || selected.error_message || "Sem resposta registrada."}</div>
              </div>
              {!!selected.search_queries?.length && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Buscas feitas</p>
                  <ul className="space-y-1 text-sm">
                    {selected.search_queries.map((query, index) => <li key={index}>• {query}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
