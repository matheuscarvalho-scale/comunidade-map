import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  User,
  Briefcase,
  FileText
} from "lucide-react";
import { useSecondaryLogins, useIsSecondaryAccount, useOrganizationMembers, SecondaryLoginStatus } from "@/hooks/useSecondaryLogins";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

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

const relationshipOptions = [
  { value: "socio", label: "Sócio(a)" },
  { value: "funcionario", label: "Funcionário(a)" },
  { value: "familiar", label: "Familiar" },
  { value: "assistente", label: "Assistente" },
  { value: "outro", label: "Outro" },
];

const requestSchema = z.object({
  secondary_email: z.string().trim().email({ message: "Email inválido" }),
  secondary_name: z.string().trim().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }).max(100),
  relationship: z.string().min(1, { message: "Selecione o relacionamento" }),
  justification: z.string().max(500).optional(),
});

export default function GestaoEquipe() {
  const { myRequests, mySecondaryLogins, isLoading, createRequest, isCreating } = useSecondaryLogins();
  const { data: isSecondaryAccount, isLoading: isLoadingSecondary } = useIsSecondaryAccount();
  const primaryUserId = isSecondaryAccount?.primary_user_id ?? null;
  const { data: orgMembers, isLoading: isLoadingOrgMembers } = useOrganizationMembers(primaryUserId);

  // Fetch the primary user's profile when viewing as secondary
  const { data: primaryProfile } = useQuery({
    queryKey: ["profile", primaryUserId],
    queryFn: async () => {
      if (!primaryUserId) return null;
      const { data, error } = await (supabase as any)
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .eq("user_id", primaryUserId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!primaryUserId,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    secondary_email: "",
    secondary_name: "",
    relationship: "",
    justification: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = requestSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    createRequest({
      secondary_email: result.data.secondary_email,
      secondary_name: result.data.secondary_name,
      relationship: result.data.relationship,
      justification: result.data.justification,
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({
          secondary_email: "",
          secondary_name: "",
          relationship: "",
          justification: "",
        });
      },
    });
  };

  const getRelationshipLabel = (value: string) => {
    return relationshipOptions.find(opt => opt.value === value)?.label || value;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Gestão de Equipe</h1>
            </div>
            <p className="text-muted-foreground">
              Gerencie logins secundários para sua equipe acessar a plataforma
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Solicitar Novo Login
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Solicitar Login Secundário</DialogTitle>
                <DialogDescription>
                  Preencha os dados da pessoa que terá acesso à plataforma. A solicitação será analisada pela equipe.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="secondary_name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome completo
                  </Label>
                  <Input
                    id="secondary_name"
                    placeholder="Nome da pessoa"
                    value={formData.secondary_name}
                    onChange={(e) => setFormData({ ...formData, secondary_name: e.target.value })}
                  />
                  {errors.secondary_name && (
                    <p className="text-sm text-destructive">{errors.secondary_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary_email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="secondary_email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.secondary_email}
                    onChange={(e) => setFormData({ ...formData, secondary_email: e.target.value })}
                  />
                  {errors.secondary_email && (
                    <p className="text-sm text-destructive">{errors.secondary_email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Relacionamento
                  </Label>
                  <Select
                    value={formData.relationship}
                    onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o relacionamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.relationship && (
                    <p className="text-sm text-destructive">{errors.relationship}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="justification" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Justificativa (opcional)
                  </Label>
                  <Textarea
                    id="justification"
                    placeholder="Explique por que essa pessoa precisa de acesso..."
                    value={formData.justification}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                    rows={3}
                  />
                  {errors.justification && (
                    <p className="text-sm text-destructive">{errors.justification}</p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Solicitação"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Secondary Logins */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {isSecondaryAccount ? "Membros da Organização" : "Logins Ativos"}
            </CardTitle>
            <CardDescription>
              {isSecondaryAccount
                ? "Todos os membros com acesso à plataforma nesta organização"
                : "Pessoas com acesso aprovado à plataforma"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || isLoadingSecondary || isLoadingOrgMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : isSecondaryAccount ? (
              // Secondary account view: show titular + all org members
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Relacionamento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Primary account holder (titular) */}
                  {primaryProfile && (
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-500" />
                          {primaryProfile.name}
                          <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                            Titular
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">Titular da conta</TableCell>
                      <TableCell>
                        <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                          Ativo
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Other secondary members */}
                  {orgMembers && orgMembers.length > 0 ? (
                    orgMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {member.secondary_user_id === isSecondaryAccount?.id ? (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            ) : null}
                            {member.secondary_name}
                          </div>
                        </TableCell>
                        <TableCell>{member.secondary_email}</TableCell>
                        <TableCell>{getRelationshipLabel(member.relationship)}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                            Ativo
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !primaryProfile ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum membro encontrado
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            ) : !mySecondaryLogins || mySecondaryLogins.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum login secundário ativo</h3>
                <p className="text-muted-foreground">
                  Solicite um login secundário para dar acesso à sua equipe.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Relacionamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mySecondaryLogins.map((login) => (
                    <TableRow key={login.id}>
                      <TableCell className="font-medium">{login.secondary_name}</TableCell>
                      <TableCell>{login.secondary_email}</TableCell>
                      <TableCell>{getRelationshipLabel(login.relationship)}</TableCell>
                      <TableCell>
                        <Badge className={login.is_active 
                          ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30"
                          : "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"
                        }>
                          {login.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(login.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Requests History */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Histórico de Solicitações
            </CardTitle>
            <CardDescription>
              Acompanhe o status das suas solicitações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !myRequests || myRequests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma solicitação</h3>
                <p className="text-muted-foreground">
                  Você ainda não fez nenhuma solicitação de login secundário.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Relacionamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.map((request) => {
                    const status = statusConfig[request.status];
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.secondary_name}</TableCell>
                        <TableCell>{request.secondary_email}</TableCell>
                        <TableCell>{getRelationshipLabel(request.relationship)}</TableCell>
                        <TableCell>
                          <Badge className={status.className}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {request.rejection_reason || request.justification || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="p-4 rounded-full bg-primary/20">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Como funciona?</h3>
                <ul className="text-muted-foreground space-y-2">
                  <li>• Solicite um login secundário informando os dados da pessoa</li>
                  <li>• Nossa equipe analisará a solicitação em até 24 horas</li>
                  <li>• Após aprovação, a pessoa receberá um email com instruções de acesso</li>
                  <li>• Logins secundários têm acesso limitado às funcionalidades da plataforma</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
