import { useState } from "react";
import { useWebhookLogs, useWebhookStats, WebhookLog } from "@/hooks/useWebhookLogs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  RefreshCw,
  Filter,
  Webhook,
  Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { usePermission } from "@/hooks/usePermission";
import { Navigate } from "react-router-dom";

export default function AdminWebhookLogs() {
  const { hasPermission, isLoading: permLoading } = usePermission();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [replaying, setReplaying] = useState(false);

  async function handleReplay(log: WebhookLog) {
    if (log.provider !== "asaas") {
      toast.error("Reenvio disponível apenas para webhooks Asaas");
      return;
    }
    setReplaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("replay-asaas-webhook", {
        body: { log_id: log.id },
      });
      if (error) throw error;
      toast.success(`Webhook reenviado (status ${data?.status})`);
      refetch();
    } catch (e: any) {
      toast.error("Erro ao reenviar: " + (e.message || String(e)));
    } finally {
      setReplaying(false);
    }
  }

  const { data: logs, isLoading: logsLoading, refetch } = useWebhookLogs({
    status: statusFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: stats, isLoading: statsLoading } = useWebhookStats();

  if (!permLoading && !hasPermission("webhooks.view_logs")) {
    return <Navigate to="/" replace />;
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Sucesso</Badge>;
      case "error":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Erro</Badge>;
      case "ignored":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Ignorado</Badge>;
      case "received":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Recebido</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "ignored":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default:
        return <Clock className="h-4 w-4 text-blue-400" />;
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Webhook className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Logs de Webhook</h1>
            <p className="text-muted-foreground">Monitoramento de webhooks do Stripe</p>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.total || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.success || 0}
                </p>
                <p className="text-sm text-muted-foreground">Sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-400">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.error || 0}
                </p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-yellow-400">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.ignored || 0}
                </p>
                <p className="text-sm text-muted-foreground">Ignorados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-blue-400">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.received || 0}
                </p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="ignored">Ignorado</SelectItem>
                  <SelectItem value="received">Recebido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Data inicial"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Data final"
              />
            </div>
            <Button variant="ghost" onClick={clearFilters}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Recebidos</CardTitle>
          <CardDescription>
            {logs?.length || 0} registros encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.event_type || "Evento desconhecido"}</span>
                        {getStatusBadge(log.status)}
                        {log.customer_name && (
                          <span className="text-sm text-muted-foreground">— {log.customer_name}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                      </p>
                      {log.error_message && (
                        <p className="text-sm text-red-400 mt-1 truncate max-w-md">
                          {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.user_created_id && (
                      <Badge variant="outline" className="text-xs">
                        User: {log.user_created_id.slice(0, 8)}...
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum webhook registrado ainda</p>
              <p className="text-sm">Os webhooks do Stripe aparecerão aqui quando forem recebidos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && getStatusIcon(selectedLog.status)}
              Detalhes do Webhook
            </DialogTitle>
            {selectedLog?.provider === "asaas" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReplay(selectedLog)}
                disabled={replaying}
                className="mt-2 w-fit"
              >
                <Send className="h-4 w-4 mr-2" />
                {replaying ? "Reenviando..." : "Reenviar webhook"}
              </Button>
            )}
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    {getStatusBadge(selectedLog.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Evento</p>
                    <p>{selectedLog.event_type || "Desconhecido"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Recebido em</p>
                    <p>{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Processado em</p>
                    <p>
                      {selectedLog.processed_at 
                        ? format(new Date(selectedLog.processed_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                        : "Pendente"}
                    </p>
                  </div>
                  {selectedLog.customer_name && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                      <p>{selectedLog.customer_name}</p>
                    </div>
                  )}
                  {selectedLog.user_created_id && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Usuário Criado</p>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{selectedLog.user_created_id}</code>
                    </div>
                  )}
                  {selectedLog.error_message && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Mensagem de Erro</p>
                      <p className="text-red-400">{selectedLog.error_message}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Payload</p>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
