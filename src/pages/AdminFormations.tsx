import { useState, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { PresenterProfileSearch } from "@/components/admin/PresenterProfileSearch";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Upload,
  BookOpen,
  Video,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";

interface FormationWithCounts {
  id: string;
  title: string;
  description: string | null;
  level: string;
  thumbnail_url: string | null;
  order_index: number;
  is_published: boolean;
  duration_hours: number;
  created_at: string;
  module_count: number;
  lesson_count: number;
}

interface FormationForm {
  title: string;
  description: string;
  level: string;
  thumbnail_url: string;
  is_published: boolean;
  is_coming_soon: boolean;
  duration_hours: string;
  presenter_name: string;
  presenter_bio: string;
  presenter_avatar: string;
}

const emptyForm: FormationForm = {
  title: "",
  description: "",
  level: "beginner",
  thumbnail_url: "",
  is_published: false,
  is_coming_soon: false,
  duration_hours: "",
  presenter_name: "",
  presenter_bio: "",
  presenter_avatar: "",
};

const levelLabels: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
  iniciante: "Iniciante",
  intermediário: "Intermediário",
  intermediario: "Intermediário",
  avançado: "Avançado",
  avancado: "Avançado",
};

const levelColors: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-500 border-green-500/20",
  intermediate: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  advanced: "bg-red-500/10 text-red-500 border-red-500/20",
  iniciante: "bg-green-500/10 text-green-500 border-green-500/20",
  intermediário: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  intermediario: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  avançado: "bg-red-500/10 text-red-500 border-red-500/20",
  avancado: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function AdminFormations() {
  const { hasPermission, isLoading: permLoading } = usePermission();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFormation, setDeletingFormation] = useState<FormationWithCounts | null>(null);
  const [form, setForm] = useState<FormationForm>(emptyForm);
  const [uploading, setUploading] = useState(false);

  // Permission check
  if (!permLoading && !hasPermission("formations.manage")) {
    return <Navigate to="/" replace />;
  }

  // Fetch all formations with module/lesson counts
  const { data: formations = [], isLoading } = useQuery({
    queryKey: ["admin-formations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formations")
        .select(`
          *,
          formation_modules (
            id,
            formation_lessons (id)
          )
        `)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []).map((f: any) => ({
        ...f,
        is_published: f.is_published ?? true,
        duration_hours: f.duration_hours ?? 0,
        module_count: f.formation_modules?.length || 0,
        lesson_count: f.formation_modules?.reduce(
          (acc: number, m: any) => acc + (m.formation_lessons?.length || 0),
          0
        ) || 0,
      })) as FormationWithCounts[];
    },
  });

  // Create formation mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormationForm) => {
      const maxOrder = formations.length > 0 
        ? Math.max(...formations.map(f => f.order_index)) + 1 
        : 0;

      const { data: created, error } = await supabase
        .from("formations")
        .insert({
          title: data.title.trim(),
          description: data.description.trim() || null,
          level: data.level,
          thumbnail_url: data.thumbnail_url || null,
          is_published: data.is_published,
          is_coming_soon: data.is_coming_soon,
          duration_hours: data.duration_hours ? parseInt(data.duration_hours) : 0,
          order_index: maxOrder,
          presenter_name: data.presenter_name?.trim() || null,
          presenter_bio: data.presenter_bio?.trim() || null,
          presenter_avatar: data.presenter_avatar || null,
        })
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["admin-formations"] });
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: "✅ Formação criada! Agora adicione módulos e aulas." });
      navigate(`/admin/formations/${created.id}`);
    },
    onError: () => {
      toast({ title: "Erro ao criar formação", variant: "destructive" });
    },
  });

  // Delete formation mutation
  const deleteMutation = useMutation({
    mutationFn: async (formation: FormationWithCounts) => {
      // Delete thumbnail from storage if exists
      if (formation.thumbnail_url) {
        const path = formation.thumbnail_url.split("/formation-thumbnails/")[1];
        if (path) {
          await supabase.storage.from("formation-thumbnails").remove([decodeURIComponent(path)]);
        }
      }
      const { error } = await supabase
        .from("formations")
        .delete()
        .eq("id", formation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-formations"] });
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      setDeleteDialogOpen(false);
      setDeletingFormation(null);
      toast({ title: "🗑️ Formação excluída" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir formação", variant: "destructive" });
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ formationId, direction }: { formationId: string; direction: "up" | "down" }) => {
      const sorted = [...formations].sort((a, b) => a.order_index - b.order_index);
      const idx = sorted.findIndex(f => f.id === formationId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;

      const currentItem = sorted[idx];
      const swapItem = sorted[swapIdx];

      // Swap order_index values
      const { error: e1 } = await supabase
        .from("formations")
        .update({ order_index: swapItem.order_index })
        .eq("id", currentItem.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("formations")
        .update({ order_index: currentItem.order_index })
        .eq("id", swapItem.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-formations"] });
      queryClient.invalidateQueries({ queryKey: ["formations"] });
    },
    onError: () => {
      toast({ title: "Erro ao reordenar", variant: "destructive" });
    },
  });
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast({ title: "Formato inválido. Use JPG, PNG ou WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Imagem muito grande. Máximo 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("formation-thumbnails")
        .upload(fileName, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("formation-thumbnails")
        .getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, thumbnail_url: urlData.publicUrl }));
      toast({ title: "✅ Imagem enviada!" });
    } catch {
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (form.title.trim().length < 3) {
      toast({ title: "Título deve ter pelo menos 3 caracteres.", variant: "destructive" });
      return;
    }
    createMutation.mutate(form);
  };

  // Filters
  const filtered = formations.filter((f) => {
    if (search && !f.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "published" && !f.is_published) return false;
    if (statusFilter === "draft" && f.is_published) return false;
    if (levelFilter !== "all" && f.level !== levelFilter) return false;
    return true;
  });

  // Metrics
  const totalFormations = formations.length;
  const publishedFormations = formations.filter((f) => f.is_published).length;
  const totalModules = formations.reduce((acc, f) => acc + f.module_count, 0);
  const totalLessons = formations.reduce((acc, f) => acc + f.lesson_count, 0);

  if (permLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">🎓 Gerenciar Formações</h1>
            </div>
            <p className="text-muted-foreground">
              Crie e gerencie formações, módulos e aulas da comunidade
            </p>
          </div>
          {hasPermission("formations.create") && (
            <Button onClick={openCreate} className="gap-2 bg-[#BFFF00] text-black hover:bg-[#BFFF00]/90">
              <Plus className="h-4 w-4" />
              Nova Formação
            </Button>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total de Formações</p>
              <p className="text-2xl font-bold">{totalFormations}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Publicadas</p>
              <p className="text-2xl font-bold text-primary">{publishedFormations}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total de Módulos</p>
              <p className="text-2xl font-bold">{totalModules}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total de Aulas</p>
              <p className="text-2xl font-bold">{totalLessons}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="published">Publicadas</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Dificuldade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="beginner">Iniciante</SelectItem>
              <SelectItem value="intermediate">Intermediário</SelectItem>
              <SelectItem value="advanced">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid of Cards */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma formação encontrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((f) => (
              <Card key={f.id} className="overflow-hidden group hover:border-primary/30 transition-colors">
                {/* Thumbnail */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {f.thumbnail_url ? (
                    <img
                      src={f.thumbnail_url}
                      alt={f.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Badges overlay */}
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Badge variant="outline" className={levelColors[f.level] || levelColors.beginner}>
                      {levelLabels[f.level] || f.level}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                   {(f as any).is_coming_soon && (
                      <Badge className="bg-yellow-500/80 text-white border-0 text-xs mb-1">
                        ⏳ Em breve
                      </Badge>
                    )}
                    {f.is_published ? (
                      <Badge className="bg-green-500/80 text-white border-0 text-xs">
                        ● Publicada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-background/80 text-muted-foreground text-xs">
                        ● Rascunho
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Title & Description */}
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {f.description || "Sem descrição"}
                    </p>
                  </div>

                  {/* Counters */}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {f.module_count} módulos
                    </span>
                    <span className="flex items-center gap-1">
                      <Video className="h-3.5 w-3.5" />
                      {f.lesson_count} aulas
                    </span>
                    {f.duration_hours > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {f.duration_hours}h
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reorderMutation.isPending || filtered.indexOf(f) === 0}
                        onClick={() => reorderMutation.mutate({ formationId: f.id, direction: "up" })}
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reorderMutation.isPending || filtered.indexOf(f) === filtered.length - 1}
                        onClick={() => reorderMutation.mutate({ formationId: f.id, direction: "down" })}
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => navigate(`/admin/formations/${f.id}`)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    {hasPermission("formations.delete") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setDeletingFormation(f);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>➕ Nova Formação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0 pr-2">
              {/* Thumbnail */}
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                {form.thumbnail_url ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={form.thumbnail_url}
                      alt="Pré-visualização da miniatura da formação"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => setForm((prev) => ({ ...prev, thumbnail_url: "" }))}
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div
                    className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          JPG, PNG ou WebP (max 2MB)
                        </span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleThumbnailUpload}
                />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Nome da formação"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição da formação..."
                  rows={3}
                />
              </div>

              {/* Level */}
              <div className="space-y-2">
                <Label>Dificuldade *</Label>
                <Select
                  value={form.level}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, level: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Duração estimada (horas)</Label>
                <Input
                  type="number"
                  value={form.duration_hours}
                  onChange={(e) => setForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
                  placeholder="Ex: 10"
                  min="0"
                />
              </div>

              {/* Publish */}
              <div className="flex items-center justify-between">
                <Label>Publicar agora?</Label>
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(v) => setForm((prev) => ({ ...prev, is_published: v }))}
                />
              </div>
              {/* Coming Soon */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Marcar como "Em breve"</Label>
                  <p className="text-xs text-muted-foreground">Card visível mas não clicável, com blur</p>
                </div>
                <Switch
                  checked={form.is_coming_soon}
                  onCheckedChange={(v) => setForm((prev) => ({ ...prev, is_coming_soon: v }))}
                />
              </div>
              {/* Presenter Section */}
              <PresenterProfileSearch
                presenterName={form.presenter_name}
                presenterBio={form.presenter_bio}
                presenterAvatar={form.presenter_avatar}
                onSelect={(profile) => setForm((prev) => ({
                  ...prev,
                  presenter_name: profile.name,
                  presenter_bio: profile.bio || "",
                  presenter_avatar: profile.avatar_url || "",
                }))}
                onClear={() => setForm((prev) => ({
                  ...prev,
                  presenter_name: "",
                  presenter_bio: "",
                  presenter_avatar: "",
                }))}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="gap-2"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                ✅ Criar Formação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete AlertDialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Formação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{deletingFormation?.title}"? Todos os
                módulos, aulas, progresso dos alunos e certificados serão removidos
                permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingFormation && deleteMutation.mutate(deletingFormation)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
