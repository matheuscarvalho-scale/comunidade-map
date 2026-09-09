import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  User,
  Briefcase,
  FileText,
  Shield,
  Filter
} from "lucide-react";
import { useAdminSecondaryLogins, SecondaryLoginStatus } from "@/hooks/useSecondaryLogins";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { Navigate } from "react-router-dom";

const statusConfig: Record<SecondaryLoginStatus, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  pending: {
    label: "Pendente",
    icon: Clock,
    className: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  approved: {
    label: "Aprovado",
    icon: CheckCircle2,
    className: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
  },
  rejected: {
    label: "Rejeitado",
    icon: XCircle,
    className: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
  },
};

const relationshipLabels: Record<string, string> = {
  socio: "Sócio(a)",
  funcionario: "Funcionário(a)",
  familiar: "Familiar",
  assistente: "Assistente",
  outro: "Outro",
};

export default function AdminLoginsSecundarios() {
  const { user } = useAuth();
  const { hasPermission, isLoading: permLoading } = usePermission();
  const { pendingRequests, allRequests, isLoading, approve, isApproving, reject, isRejecting } = useAdminSecondaryLogins();
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch requester profiles
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url");
      
      if (error) return {};
      return (data || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, { name: string; avatar_url: string | null }>);
    },
    enabled: !permLoading && hasPermission("subscriptions.manage"),
  });

  if (permLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!hasPermission("subscriptions.manage")) {
    return <Navigate to="/" replace />;
  }

  const handleApprove = (requestId: string) => {
    approve(requestId);
  };

  const handleOpenRejectDialog = (requestId: string) => {
    setSelectedRequestId(requestId);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (selectedRequestId && rejectionReason.trim()) {
      reject({ requestId: selectedRequestId, reason: rejectionReason });
      setRejectDialogOpen(false);
      setSelectedRequestId(null);
      setRejectionReason("");
    }
  };

  const getRequesterName = (userId: string) => {
    return profiles?.[userId]?.name || "Usuário";
  };

  const getRelationshipLabel = (value: string) => {
    return relationshipLabels[value] || value;
  };

  const displayedRequests = activeTab === "pending" ? pendingRequests : allRequests;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Aprovação de Logins Secundários</h1>
          </div>
          <p className="text-muted-foreground">
            Gerencie as solicitações de logins secundários dos membros
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {pendingRequests?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aprovadas
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {allRequests?.filter(r => r.status === 'approved').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejeitadas
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {allRequests?.filter(r => r.status === 'rejected').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Solicitações
            </CardTitle>
            <CardDescription>
              Analise e aprove ou rejeite as solicitações de logins secundários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-6">
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pendentes
                  {(pendingRequests?.length || 0) > 0 && (
                    <Badge className="ml-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      {pendingRequests?.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Todas
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !displayedRequests || displayedRequests.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {activeTab === "pending" ? "Nenhuma solicitação pendente!" : "Nenhuma solicitação encontrada"}
                </h3>
                <p className="text-muted-foreground">
                  {activeTab === "pending" 
                    ? "Todas as solicitações foram processadas." 
                    : "Não há solicitações no sistema ainda."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Login Secundário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Relacionamento</TableHead>
                      <TableHead>Justificativa</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      {activeTab === "pending" && <TableHead>Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedRequests.map((request) => {
                      const status = statusConfig[request.status];
                      const StatusIcon = status.icon;
                      
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {getRequesterName(request.user_id)}
                            </div>
                          </TableCell>
                          <TableCell>{request.secondary_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {request.secondary_email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getRelationshipLabel(request.relationship)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {request.justification || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge className={status.className}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          {activeTab === "pending" && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(request.id)}
                                  disabled={isApproving}
                                  className="gap-1"
                                >
                                  {isApproving ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleOpenRejectDialog(request.id)}
                                  disabled={isRejecting}
                                  className="gap-1"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Rejeitar
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Solicitação</DialogTitle>
              <DialogDescription>
                Informe o motivo da rejeição. O membro será notificado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejection_reason">Motivo da rejeição</Label>
                <Textarea
                  id="rejection_reason"
                  placeholder="Explique o motivo da rejeição..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={!rejectionReason.trim() || isRejecting}
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejeitando...
                  </>
                ) : (
                  "Confirmar Rejeição"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
