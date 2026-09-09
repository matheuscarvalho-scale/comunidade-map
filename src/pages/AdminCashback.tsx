import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Coins,
  Loader2,
  Calendar,
  Search,
  Check,
  X,
  Banknote,
  Eye,
  ExternalLink,
  MousePointerClick,
} from "lucide-react";
import { useAdminCashback, CashbackStatus } from "@/hooks/useCashbackComplete";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PartnerLogo } from "@/components/parceiros/PartnerLogo";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { usePermission } from "@/hooks/usePermission";
import { Navigate } from "react-router-dom";
import { trackCashbackConfirmed } from "@/lib/analytics";

export default function AdminCashback() {
  const { hasPermission, isLoading: permLoading } = usePermission();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CashbackStatus>("all");
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: "approve" | "reject" | "pay";
  } | null>(null);
  
  const { user } = useAuth();
  const { 
    transactions,
    isLoading, 
    stats,
    updateStatus,
    isUpdating,
  } = useAdminCashback();

  // Fetch pending partner clicks
  const { data: pendingClicks = [], isLoading: clicksLoading } = useQuery({
    queryKey: ["partner-clicks-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_clicks")
        .select("*")
        .eq("status", "aguardando")
        .order("clicked_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (!permLoading && !hasPermission("cashback.manage")) {
    return <Navigate to="/" replace />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: CashbackStatus) => {
    const statusConfig = {
      pending: { label: "Pendente", className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" },
      confirmed: { label: "Confirmado", className: "bg-blue-500/20 text-blue-600 border-blue-500/30" },
      approved: { label: "Aprovado", className: "bg-green-500/20 text-green-600 border-green-500/30" },
      paid: { label: "Pago", className: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" },
      rejected: { label: "Rejeitado", className: "bg-red-500/20 text-red-600 border-red-500/30" },
      expired: { label: "Expirado", className: "bg-gray-500/20 text-gray-600 border-gray-500/30" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  // Filter transactions
  const filteredTransactions = transactions?.filter(tx => {
    const matchesSearch = !searchTerm || 
      tx.partner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.user_profile?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleAction = (id: string, action: "approve" | "reject" | "pay") => {
    setConfirmAction({ id, action });
  };

  const executeAction = () => {
    if (!confirmAction || !user) return;
    
    const statusMap = {
      approve: "approved" as CashbackStatus,
      reject: "rejected" as CashbackStatus,
      pay: "paid" as CashbackStatus,
    };

    // Track GA4 event when approving cashback
    if (confirmAction.action === "approve") {
      const tx = transactions?.find(t => t.id === confirmAction.id);
      if (tx) {
        trackCashbackConfirmed({
          partner_name: tx.partner_name,
          purchase_value: Number(tx.purchase_amount) || 0,
          cashback_value: Number(tx.cashback_amount) || 0,
          user_plan: "admin",
        });
      }
    }
    
    updateStatus({
      id: confirmAction.id,
      status: statusMap[confirmAction.action],
      approved_by: user.id,
    });
    
    setConfirmAction(null);
  };

  const actionLabels = {
    approve: { title: "Aprovar Cashback", description: "Tem certeza que deseja aprovar esta solicitação de cashback?" },
    reject: { title: "Rejeitar Cashback", description: "Tem certeza que deseja rejeitar esta solicitação de cashback?" },
    pay: { title: "Marcar como Pago", description: "Confirma que o pagamento deste cashback foi realizado?" },
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Coins className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Gestão de Cashback</h1>
          </div>
          <p className="text-muted-foreground">
            Gerencie as solicitações de cashback dos membros
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="card-glow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600">{stats.pending}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.pendingValue)}</div>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <Badge variant="outline" className="bg-green-500/20 text-green-600">{stats.approved}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">Aguardando pagamento</div>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagos</CardTitle>
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-600">{stats.paid}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">Concluídos</div>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
              <Badge variant="outline" className="bg-red-500/20 text-red-600">{stats.rejected}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">Negados</div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="card-glow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Solicitações de Cashback</CardTitle>
                <CardDescription>
                  Todas as solicitações dos membros
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} className="mb-6">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="approved">Aprovados</TabsTrigger>
                <TabsTrigger value="paid">Pagos</TabsTrigger>
                <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !filteredTransactions.length ? (
              <div className="text-center py-12">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhuma solicitação encontrada
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "Tente outra busca" : "Nenhuma solicitação de cashback ainda"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor Compra</TableHead>
                      <TableHead className="text-right">Cashback</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Comprovante</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {tx.user_profile?.name?.charAt(0) || "?"}
                              </span>
                            </div>
                            <span className="font-medium">
                              {tx.user_profile?.name || "Membro"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PartnerLogo 
                              name={tx.partner?.name || tx.partner_name} 
                              logoUrl={tx.partner?.logo_url} 
                              className="h-8 w-8"
                            />
                            <span>{tx.partner_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(tx.usage_date).toLocaleDateString("pt-BR")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.purchase_amount ? formatCurrency(Number(tx.purchase_amount)) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-primary">
                            {formatCurrency(Number(tx.cashback_amount) || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(tx.status)}
                        </TableCell>
                        <TableCell>
                          {tx.proof_url ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={tx.proof_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(tx.status === "pending" || tx.status === "confirmed") && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAction(tx.id, "approve")}
                                  disabled={isUpdating}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAction(tx.id, "reject")}
                                  disabled={isUpdating}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {tx.status === "approved" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(tx.id, "pay")}
                                disabled={isUpdating}
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              >
                                <Banknote className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partner Clicks - Pending Section */}
        <Card className="card-glow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <MousePointerClick className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Cliques em Parceiros (Aguardando)</CardTitle>
                <CardDescription>
                  Registros de cliques aguardando confirmação de conversão
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {clicksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingClicks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum clique aguardando conversão
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Benefício</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>UTM Campaign</TableHead>
                      <TableHead>Data do Clique</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingClicks.map((click) => (
                      <TableRow key={click.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{click.user_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{click.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{click.partner_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{click.benefit_type || "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{click.user_plan || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{click.utm_campaign || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(click.clicked_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction && actionLabels[confirmAction.action].title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && actionLabels[confirmAction.action].description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
