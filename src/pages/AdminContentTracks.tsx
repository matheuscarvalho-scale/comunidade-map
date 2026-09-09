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
  Tv,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Upload,
  FileVideo,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";

interface ContentTrack {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  event_name: string | null;
  event_date: string | null;
  order_index: number;
  is_active: boolean;
  presenter_name: string | null;
  presenter_bio: string | null;
  presenter_avatar: string | null;
  created_at: string;
  item_count: number;
}

interface TrackForm {
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  category: string;
  event_name: string;
  is_active: boolean;
  presenter_name: string;
  presenter_bio: string;
  presenter_avatar: string;
}

const emptyForm: TrackForm = {
  title: "",
  slug: "",
  description: "",
  thumbnail_url: "",
  category: "evento",
  event_name: "",
  is_active: true,
  presenter_name: "",
  presenter_bio: "",
  presenter_avatar: "",
};

export default function AdminContentTracks() {
  const navigate = useNavigate();
  const { hasPermission, isLoading: permLoading } = usePermission();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<ContentTrack | null>(null);
  const [deletingTrack, setDeletingTrack] = useState<ContentTrack | null>(null);
  const [form, setForm] = useState<TrackForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  if (!permLoading && !hasPermission("formations.manage")) {
    return <Navigate to="/" replace />;
  }

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["admin-content-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_tracks")
        .select(`*, content_items (id)`)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        item_count: t.content_items?.length || 0,
      })) as ContentTrack[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { form: TrackForm; id?: string }) => {
      const payload = {
        title: data.form.title.trim(),
        slug: data.form.slug.trim() || data.form.title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        description: data.form.description.trim() || null,
        thumbnail_url: data.form.thumbnail_url || null,
        category: data.form.category,
        event_name: data.form.event_name.trim() || null,
        is_active: data.form.is_active,
        presenter_name: data.form.presenter_name.trim() || null,
        presenter_bio: data.form.presenter_bio.trim() || null,
        presenter_avatar: data.form.presenter_avatar || null,
      };

      if (data.id) {
        const { error } = await supabase.from("content_tracks").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const maxOrder = tracks.length > 0 ? Math.max(...tracks.map(t => t.order_index)) + 1 : 0;
        const { error } = await supabase.from("content_tracks").insert({ ...payload, order_index: maxOrder });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-content-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["content-tracks"] });
      setDialogOpen(false);
      setEditingTrack(null);
      setForm(emptyForm);
      toast({ title: vars.id ? "✅ Trilha atualizada!" : "✅ Trilha criada!" });
    },
    onError: () => toast({ title: "Erro ao salvar trilha", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (track: ContentTrack) => {
      const { error } = await supabase.from("content_tracks").delete().eq("id", track.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["content-tracks"] });
      setDeleteDialogOpen(false);
      setDeletingTrack(null);
      toast({ title: "🗑️ Trilha excluída" });
    },
    onError: () => toast({ title: "Erro ao excluir trilha", variant: "destructive" }),
  });

  // Reorder mutation: swap order_index with neighbor
  const reorderMutation = useMutation({
    mutationFn: async ({ trackId, direction }: { trackId: string; direction: "up" | "down" }) => {
      const sorted = [...tracks].sort((a, b) => a.order_index - b.order_index);
      const idx = sorted.findIndex((t) => t.id === trackId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;

      const current = sorted[idx];
      const neighbor = sorted[swapIdx];

      const { error: e1 } = await supabase
        .from("content_tracks")
        .update({ order_index: neighbor.order_index })
        .eq("id", current.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("content_tracks")
        .update({ order_index: current.order_index })
        .eq("id", neighbor.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["content-tracks"] });
    },
    onError: () => toast({ title: "Erro ao reordenar", variant: "destructive" }),
  });

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast({ title: "Formato inválido.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Máximo 2MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `content-tracks/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("formation-thumbnails").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("formation-thumbnails").getPublicUrl(fileName);
      setForm((p) => ({ ...p, thumbnail_url: urlData.publicUrl }));
      toast({ title: "✅ Imagem enviada!" });
    } catch {
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast({ title: "Formato inválido.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Máximo 2MB.", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `presenters/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("formation-thumbnails").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("formation-thumbnails").getPublicUrl(fileName);
      setForm((p) => ({ ...p, presenter_avatar: urlData.publicUrl }));
      toast({ title: "✅ Foto enviada!" });
    } catch {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const openCreate = () => {
    setEditingTrack(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (track: ContentTrack) => {
    setEditingTrack(track);
    setForm({
      title: track.title,
      slug: track.slug || "",
      description: track.description || "",
      thumbnail_url: track.thumbnail_url || "",
      category: track.category,
      event_name: track.event_name || "",
      is_active: track.is_active,
      presenter_name: track.presenter_name || "",
      presenter_bio: track.presenter_bio || "",
      presenter_avatar: track.presenter_avatar || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (form.title.trim().length < 3) {
      toast({ title: "Título deve ter ao menos 3 caracteres.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ form, id: editingTrack?.id });
  };

  const filtered = tracks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Tv className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">📺 Gerenciar Trilha de Conteúdo</h1>
            </div>
            <p className="text-muted-foreground">
              Crie e gerencie trilhas de conteúdo e eventos
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Trilha
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total de Trilhas</p>
              <p className="text-2xl font-bold">{tracks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Ativas</p>
              <p className="text-2xl font-bold text-primary">{tracks.filter(t => t.is_active).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Conteúdos</p>
              <p className="text-2xl font-bold">{tracks.reduce((a, t) => a + t.item_count, 0)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar trilhas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhuma trilha encontrada.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((track, index) => (
              <Card key={track.id} className="overflow-hidden group hover:border-primary/30 transition-colors">
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {track.thumbnail_url ? (
                    <img src={track.thumbnail_url} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileVideo className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Reorder buttons (admin) - disabled when search is active */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm"
                      disabled={reorderMutation.isPending || index === 0 || !!search}
                      title={search ? "Limpe a busca para reordenar" : "Mover para cima"}
                      onClick={() => reorderMutation.mutate({ trackId: track.id, direction: "up" })}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm"
                      disabled={reorderMutation.isPending || index === filtered.length - 1 || !!search}
                      title={search ? "Limpe a busca para reordenar" : "Mover para baixo"}
                      onClick={() => reorderMutation.mutate({ trackId: track.id, direction: "down" })}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="absolute top-2 right-2">
                    {track.is_active ? (
                      <Badge className="bg-green-500/80 text-white border-0 text-xs">● Ativa</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-background/80 text-muted-foreground text-xs">● Inativa</Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">{track.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{track.description || "Sem descrição"}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{track.item_count} conteúdos</span>
                    <Badge variant="outline" className="text-xs">{track.category}</Badge>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="default" size="sm" className="flex-1 gap-1.5" onClick={() => navigate(`/admin/content-tracks/${track.id}`)}>
                      <FileVideo className="h-3.5 w-3.5" />
                      Conteúdos
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(track)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setDeletingTrack(track); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingTrack ? "✏️ Editar Trilha" : "➕ Nova Trilha"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                {form.thumbnail_url ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img src={form.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    <Button variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => setForm((p) => ({ ...p, thumbnail_url: "" }))}>Remover</Button>
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                    {uploading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">JPG, PNG ou WebP (max 2MB)</span>
                      </>
                    )}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleThumbnailUpload} />
              </div>

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Nome da trilha" />
              </div>

              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="auto-gerado se vazio" />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="Ex: Evento, Parceria, Curso..." />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Evento</Label>
                  <Input value={form.event_name} onChange={(e) => setForm((p) => ({ ...p, event_name: e.target.value }))} placeholder="Ex: MAP Experience" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Ativa?</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
              </div>

              <PresenterProfileSearch
                presenterName={form.presenter_name}
                presenterBio={form.presenter_bio}
                presenterAvatar={form.presenter_avatar}
                onSelect={(profile) => setForm((p) => ({
                  ...p,
                  presenter_name: profile.name,
                  presenter_bio: profile.bio || "",
                  presenter_avatar: profile.avatar_url || "",
                }))}
                onClear={() => setForm((p) => ({
                  ...p,
                  presenter_name: "",
                  presenter_bio: "",
                  presenter_avatar: "",
                }))}
              />

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="gap-2">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTrack ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Trilha</AlertDialogTitle>
              <AlertDialogDescription>
                Excluir "{deletingTrack?.title}"? Todos os conteúdos serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingTrack && deleteMutation.mutate(deletingTrack)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
