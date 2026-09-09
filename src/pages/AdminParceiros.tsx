import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus,
  Pencil,
  Trash2,
  Gift,
  Loader2,
  ArrowUpDown,
  ExternalLink,
  Shield
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { Navigate } from "react-router-dom";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  discount_percentage: number | null;
  discount_description: string | null;
  description: string | null;
  website_url: string | null;
  discount_code: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

interface PartnerFormData {
  name: string;
  logo_url: string;
  category: string;
  discount_percentage: string;
  discount_description: string;
  description: string;
  website_url: string;
  discount_code: string;
  is_active: boolean;
  display_order: string;
}

const initialFormData: PartnerFormData = {
  name: "",
  logo_url: "",
  category: "",
  discount_percentage: "",
  discount_description: "",
  description: "",
  website_url: "",
  discount_code: "",
  is_active: true,
  display_order: "0",
};

export default function AdminParceiros() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<PartnerFormData>(initialFormData);

  const { hasPermission, isLoading: permLoading } = usePermission();

  // Fetch all partners (including inactive for admin)
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Partner[];
    },
    enabled: !permLoading && hasPermission("partners.manage"),
  });

  // Create partner mutation
  const createMutation = useMutation({
    mutationFn: async (data: PartnerFormData) => {
      const { error } = await supabase.from("partners").insert({
        name: data.name,
        logo_url: data.logo_url || null,
        category: data.category || null,
        discount_percentage: data.discount_percentage ? parseInt(data.discount_percentage) : null,
        discount_description: data.discount_description || null,
        description: data.description || null,
        website_url: data.website_url || null,
        discount_code: data.discount_code || null,
        is_active: data.is_active,
        display_order: parseInt(data.display_order) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      setDialogOpen(false);
      setFormData(initialFormData);
      toast({
        title: "Parceiro criado! ✅",
        description: "O parceiro foi adicionado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar parceiro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update partner mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PartnerFormData }) => {
      const { error } = await supabase
        .from("partners")
        .update({
          name: data.name,
          logo_url: data.logo_url || null,
          category: data.category || null,
          discount_percentage: data.discount_percentage ? parseInt(data.discount_percentage) : null,
          discount_description: data.discount_description || null,
          description: data.description || null,
          website_url: data.website_url || null,
          discount_code: data.discount_code || null,
          is_active: data.is_active,
          display_order: parseInt(data.display_order) || 0,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      setDialogOpen(false);
      setEditingPartner(null);
      setFormData(initialFormData);
      toast({
        title: "Parceiro atualizado! ✅",
        description: "As alterações foram salvas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete partner mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      setDeleteDialogOpen(false);
      setPartnerToDelete(null);
      toast({
        title: "Parceiro removido",
        description: "O parceiro foi excluído.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("partners")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
  });

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      logo_url: partner.logo_url || "",
      category: partner.category || "",
      discount_percentage: partner.discount_percentage?.toString() || "",
      discount_description: partner.discount_description || "",
      description: partner.description || "",
      website_url: partner.website_url || "",
      discount_code: partner.discount_code || "",
      is_active: partner.is_active,
      display_order: partner.display_order?.toString() || "0",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleOpenDialog = () => {
    setEditingPartner(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  // Loading state
  if (permLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  // Not authorized - redirect
  if (!hasPermission("partners.manage")) {
    return <Navigate to="/parceiros" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Gestão de Parceiros</h1>
            </div>
            <p className="text-muted-foreground">
              Adicione, edite e gerencie os parceiros da plataforma
            </p>
          </div>
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Parceiro
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{partners.length}</div>
              <p className="text-sm text-muted-foreground">Total de Parceiros</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">
                {partners.filter((p) => p.is_active).length}
              </div>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-500">
                {partners.filter((p) => !p.is_active).length}
              </div>
              <p className="text-sm text-muted-foreground">Inativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">
                {partners.filter((p) => p.discount_percentage && p.discount_percentage > 0).length}
              </div>
              <p className="text-sm text-muted-foreground">Com Desconto</p>
            </CardContent>
          </Card>
        </div>

        {/* Partners Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Lista de Parceiros
            </CardTitle>
            <CardDescription>
              Gerencie todos os parceiros cadastrados na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : partners.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum parceiro cadastrado</p>
                <p className="text-muted-foreground mb-4">
                  Comece adicionando seu primeiro parceiro
                </p>
                <Button onClick={handleOpenDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Parceiro
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <ArrowUpDown className="h-4 w-4" />
                      </TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Desconto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {partner.display_order}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {partner.logo_url ? (
                              <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center p-1.5 border">
                                <img
                                  src={partner.logo_url}
                                  alt={partner.name}
                                  className="h-full w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {partner.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{partner.name}</p>
                              {partner.website_url && (
                                <a
                                  href={partner.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Website
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{partner.category || "Geral"}</Badge>
                        </TableCell>
                        <TableCell>
                          {partner.discount_percentage ? (
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              {partner.discount_percentage}%
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Exclusivo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={partner.is_active}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({ id: partner.id, is_active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(partner)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setPartnerToDelete(partner);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPartner ? "Editar Parceiro" : "Novo Parceiro"}
              </DialogTitle>
              <DialogDescription>
                {editingPartner
                  ? "Atualize as informações do parceiro"
                  : "Preencha os dados para adicionar um novo parceiro"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do parceiro"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Ferramentas, Marketplace"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">URL do Logo</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_percentage">Desconto (%)</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_percentage: e.target.value })
                    }
                    placeholder="Ex: 20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_code">Código de Desconto</Label>
                  <Input
                    id="discount_code"
                    value={formData.discount_code}
                    onChange={(e) => setFormData({ ...formData, discount_code: e.target.value })}
                    placeholder="Ex: MAP20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_description">Título do Benefício</Label>
                <Input
                  id="discount_description"
                  value={formData.discount_description}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_description: e.target.value })
                  }
                  placeholder="Ex: 20% de desconto em todos os planos"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição detalhada do parceiro e benefícios"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Link do Parceiro</Label>
                <Input
                  id="website_url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_order">Ordem de Exibição</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Parceiro Ativo</Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingPartner ? "Salvar" : "Criar Parceiro"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir parceiro?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o parceiro "{partnerToDelete?.name}"? Esta
                ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => partnerToDelete && deleteMutation.mutate(partnerToDelete.id)}
              >
                {deleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
