import { useState, useRef, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  Video,
  Clock,
  User,
  Image as ImageIcon,
  FileVideo,
  FileText,
  GripVertical,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { CloudflareVideoUploader } from "@/components/video/CloudflareVideoUploader";

interface ContentItem {
  id: string;
  track_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  cloudflare_video_uid: string | null;
  duration_minutes: number | null;
  speaker: string | null;
  category: string | null;
  thumbnail_url: string | null;
  order_index: number;
  presenter_name: string | null;
  presenter_bio: string | null;
  presenter_avatar: string | null;
  created_at: string;
}

interface ContentItemMaterial {
  id?: string;
  url: string;
  name: string;
}

interface ContentTrack {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  event_name: string | null;
  event_date: string | null;
  is_active: boolean;
}

interface PresenterSearchResult {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  source: "member" | "external";
}

interface ItemForm {
  title: string;
  description: string;
  video_url: string;
  cloudflare_video_uid: string;
  duration_minutes: string;
  speaker: string;
  category: string;
  thumbnail_url: string;
  order_index: string;
  presenter_name: string;
  presenter_bio: string;
  presenter_avatar: string;
}

const emptyItemForm: ItemForm = {
  title: "",
  description: "",
  video_url: "",
  cloudflare_video_uid: "",
  duration_minutes: "",
  speaker: "",
  category: "",
  thumbnail_url: "",
  order_index: "0",
  presenter_name: "",
  presenter_bio: "",
  presenter_avatar: "",
};

export default function AdminContentTrackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission, isLoading: permLoading } = usePermission();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ContentItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  // Official mentors linked to the item being edited
  const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([]);
  const [mentorSearch, setMentorSearch] = useState("");
  const [showMentorList, setShowMentorList] = useState(false);

  // Materials (PDF/PPT/Planilha) linked to the item being edited
  const [materials, setMaterials] = useState<ContentItemMaterial[]>([]);

  // Profile search for presenter
  const [presenterSearch, setPresenterSearch] = useState("");
  const [showPresenterResults, setShowPresenterResults] = useState(false);

  if (!permLoading && !hasPermission("formations.manage")) {
    return <Navigate to="/" replace />;
  }

  // Fetch track info
  const { data: track, isLoading: trackLoading } = useQuery({
    queryKey: ["admin-content-track", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("content_tracks")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as ContentTrack | null;
    },
    enabled: !!id,
  });

  // Fetch items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["admin-content-items", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("content_items")
        .select("*")
        .eq("track_id", id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as ContentItem[];
    },
    enabled: !!id,
  });

  // Search members and external presenters
  const { data: profileResults = [] } = useQuery({
    queryKey: ["profile-search-presenter", presenterSearch],
    queryFn: async () => {
      if (presenterSearch.length < 2) return [];
      const search = presenterSearch.trim();
      const [profilesResult, mentorsResult] = await Promise.all([
        supabase
        .from("profiles")
        .select("user_id, name, avatar_url, bio")
        .ilike("name", `%${search}%`)
        .limit(8),
        supabase
          .from("mentors_public")
          .select("id, name, avatar_url, bio, specialty")
          .ilike("name", `%${search}%`)
          .limit(8),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (mentorsResult.error) throw mentorsResult.error;

      const externalResults: PresenterSearchResult[] = (mentorsResult.data || []).map((mentor) => ({
        id: mentor.id,
        name: mentor.name,
        avatar_url: mentor.avatar_url,
        bio: mentor.bio || mentor.specialty || null,
        source: "external",
      }));
      const memberResults: PresenterSearchResult[] = (profilesResult.data || []).map((profile) => ({
        id: profile.user_id,
        name: profile.name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        source: "member",
      }));

      const seen = new Set<string>();
      return [...externalResults, ...memberResults]
        .filter((presenter) => {
          const key = presenter.name.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 10);
    },
    enabled: presenterSearch.length >= 2 && showPresenterResults,
  });

  // All official mentors (for multi-select picker)
  const { data: allMentors = [] } = useQuery({
    queryKey: ["admin-all-mentors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors")
        .select("id, name, email, avatar_url, bio, specialty")
        .order("name");
      if (error) throw error;
      return data as Array<{ id: string; name: string; email: string | null; avatar_url: string | null; bio: string | null; specialty: string | null }>;
    },
  });

  // Existing mentor links for the item being edited
  const { data: existingMentorLinks = [] } = useQuery({
    queryKey: ["content-item-mentors", editingItem?.id],
    queryFn: async () => {
      if (!editingItem?.id) return [];
      const { data, error } = await supabase
        .from("content_item_mentors")
        .select("mentor_id, order_index")
        .eq("content_item_id", editingItem.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as { mentor_id: string; order_index: number }[];
    },
    enabled: !!editingItem?.id,
  });

  // Existing materials for the item being edited
  const { data: existingMaterials = [] } = useQuery({
    queryKey: ["content-item-materials", editingItem?.id],
    queryFn: async () => {
      if (!editingItem?.id) return [];
      const { data, error } = await supabase
        .from("content_item_materials")
        .select("id, url, name, order_index")
        .eq("content_item_id", editingItem.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as { id: string; url: string; name: string | null; order_index: number }[];
    },
    enabled: !!editingItem?.id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-content-items", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-content-tracks"] });
    queryClient.invalidateQueries({ queryKey: ["content-tracks"] });
    queryClient.invalidateQueries({ queryKey: ["content-track-by-slug"] });
    queryClient.invalidateQueries({ queryKey: ["content-track-details"] });
  };

  // Save item mutation
  const saveItemMutation = useMutation({
    mutationFn: async (data: { form: ItemForm; itemId?: string; mentorIds: string[]; materials: ContentItemMaterial[] }) => {
      const payload = {
        track_id: id!,
        title: data.form.title.trim(),
        description: data.form.description.trim() || null,
        video_url: data.form.video_url.trim() || null,
        cloudflare_video_uid: data.form.cloudflare_video_uid?.trim() || null,
        duration_minutes: data.form.duration_minutes ? parseInt(data.form.duration_minutes) : 0,
        speaker: data.form.speaker.trim() || null,
        category: data.form.category.trim() || null,
        thumbnail_url: data.form.thumbnail_url || null,
        order_index: parseInt(data.form.order_index) || 0,
        presenter_name: data.form.presenter_name.trim() || null,
        presenter_bio: data.form.presenter_bio.trim() || null,
        presenter_avatar: data.form.presenter_avatar || null,
      };
      let itemId = data.itemId;
      if (itemId) {
        const { error } = await supabase.from("content_items").update(payload).eq("id", itemId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("content_items").insert(payload).select("id").single();
        if (error) throw error;
        itemId = inserted!.id;
      }
      // Sync official mentor links (delete-all + insert)
      const { error: delErr } = await supabase.from("content_item_mentors").delete().eq("content_item_id", itemId!);
      if (delErr) throw delErr;
      if (data.mentorIds.length > 0) {
        const rows = data.mentorIds.map((mentor_id, idx) => ({
          content_item_id: itemId!,
          mentor_id,
          order_index: idx,
        }));
        const { error: insErr } = await supabase.from("content_item_mentors").insert(rows);
        if (insErr) throw insErr;
      }
      // Sync materials (delete-all + insert)
      const { error: delMatErr } = await supabase.from("content_item_materials").delete().eq("content_item_id", itemId!);
      if (delMatErr) throw delMatErr;
      if (data.materials.length > 0) {
        const matRows = data.materials.map((m, idx) => ({
          content_item_id: itemId!,
          url: m.url,
          name: m.name || null,
          order_index: idx,
        }));
        const { error: insMatErr } = await supabase.from("content_item_materials").insert(matRows);
        if (insMatErr) throw insMatErr;
      }
    },
    onSuccess: (_, vars) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["content-item-mentors"] });
      queryClient.invalidateQueries({ queryKey: ["content-item-materials"] });
      setItemDialogOpen(false);
      setEditingItem(null);
      setItemForm(emptyItemForm);
      setSelectedMentorIds([]);
      setMaterials([]);
      toast({ title: vars.itemId ? "✅ Conteúdo atualizado!" : "✅ Conteúdo criado!" });
    },
    onError: () => toast({ title: "Erro ao salvar conteúdo", variant: "destructive" }),
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (item: ContentItem) => {
      // Delete video from storage if uploaded
      if (item.video_url) {
        const path = item.video_url.split("/formation-videos/")[1];
        if (path) await supabase.storage.from("formation-videos").remove([decodeURIComponent(path)]);
      }
      // Delete attached materials from storage
      const { data: itemMaterials } = await supabase
        .from("content_item_materials")
        .select("url")
        .eq("content_item_id", item.id);
      for (const m of itemMaterials || []) {
        const path = m.url.split("/resources/")[1];
        if (path) await supabase.storage.from("resources").remove([decodeURIComponent(path)]);
      }
      const { error } = await supabase.from("content_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      toast({ title: "🗑️ Conteúdo excluído" });
    },
    onError: () => toast({ title: "Erro ao excluir conteúdo", variant: "destructive" }),
  });

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
      setItemForm((p) => ({ ...p, presenter_avatar: urlData.publicUrl }));
      toast({ title: "✅ Foto enviada!" });
    } catch {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setUploadingThumb(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `content-items/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("formation-thumbnails").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("formation-thumbnails").getPublicUrl(fileName);
      setItemForm((p) => ({ ...p, thumbnail_url: urlData.publicUrl }));
      toast({ title: "✅ Thumbnail enviada!" });
    } catch {
      toast({ title: "Erro ao enviar thumbnail", variant: "destructive" });
    } finally {
      setUploadingThumb(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    }
  };

  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "ppt", "pptx", "xlsx", "xls", "csv"].includes(ext)) {
      toast({ title: "Formato inválido. Use PDF, PPT, PPTX, XLSX, XLS ou CSV.", variant: "destructive" });
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast({ title: "Máximo 30MB.", variant: "destructive" });
      return;
    }
    setUploadingMaterial(true);
    try {
      const fileName = `content-materials/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("resources").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("resources").getPublicUrl(fileName);
      setMaterials((prev) => [...prev, { url: urlData.publicUrl, name: file.name }]);
      toast({ title: "✅ Material enviado!" });
    } catch {
      toast({ title: "Erro ao enviar material", variant: "destructive" });
    } finally {
      setUploadingMaterial(false);
      if (materialInputRef.current) materialInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^video\/(mp4|webm|quicktime)$/)) {
      toast({ title: "Formato inválido. Use MP4, WebM ou MOV.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast({ title: "Máximo 2GB por arquivo.", variant: "destructive" });
      return;
    }
    setUploadingVideo(true);
    setVideoUploadProgress(0);
    try {
      const { Upload } = await import("tus-js-client");
      const fileName = `content-items/${crypto.randomUUID()}_${file.name}`;
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      let accessToken = currentSession?.access_token;

      if (!accessToken) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw new Error("Sua sessão expirou. Faça login novamente.");
        accessToken = refreshData.session?.access_token;
      }

      if (!accessToken) throw new Error("Sua sessão expirou. Faça login novamente.");

      await new Promise<void>(async (resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "x-upsert": "true",
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: "formation-videos",
            objectName: fileName,
            contentType: file.type,
            cacheControl: "3600",
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (error) => reject(error),
          onProgress: (bytesUploaded, bytesTotal) => {
            setVideoUploadProgress(Math.round((bytesUploaded / bytesTotal) * 100));
          },
          onSuccess: () => resolve(),
        });

        const previousUploads = await upload.findPreviousUploads();
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      });

      const { data: urlData } = supabase.storage.from("formation-videos").getPublicUrl(fileName);
      setItemForm((p) => ({ ...p, video_url: urlData.publicUrl }));
      toast({ title: "✅ Vídeo enviado!" });
    } catch (error) {
      console.error("Erro no upload de vídeo (trilha):", error);
      toast({
        title: "Erro ao enviar vídeo",
        description: error instanceof Error ? error.message : "Falha no upload resumável.",
        variant: "destructive",
      });
    } finally {
      setUploadingVideo(false);
      setVideoUploadProgress(0);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const selectPresenter = (profile: { name: string; avatar_url: string | null; bio: string | null }) => {
    setItemForm((p) => ({
      ...p,
      presenter_name: profile.name,
      presenter_bio: profile.bio || "",
      presenter_avatar: profile.avatar_url || "",
    }));
    setShowPresenterResults(false);
    setPresenterSearch("");
  };

  const openCreateItem = () => {
    setEditingItem(null);
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index)) + 1 : 0;
    setItemForm({ ...emptyItemForm, order_index: maxOrder.toString() });
    setPresenterSearch("");
    setSelectedMentorIds([]);
    setMentorSearch("");
    setMaterials([]);
    setItemDialogOpen(true);
  };

  const openEditItem = (item: ContentItem) => {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      description: item.description || "",
      video_url: item.video_url || "",
      cloudflare_video_uid: item.cloudflare_video_uid || "",
      duration_minutes: item.duration_minutes?.toString() || "",
      speaker: item.speaker || "",
      category: item.category || "",
      thumbnail_url: item.thumbnail_url || "",
      order_index: item.order_index.toString(),
      presenter_name: item.presenter_name || "",
      presenter_bio: item.presenter_bio || "",
      presenter_avatar: item.presenter_avatar || "",
    });
    setPresenterSearch("");
    setMentorSearch("");
    setSelectedMentorIds([]); // will be populated when existingMentorLinks resolves
    setMaterials([]); // will be populated when existingMaterials resolves
    setItemDialogOpen(true);
  };

  // Sync selectedMentorIds when existingMentorLinks loads for the editing item
  useEffect(() => {
    if (editingItem && existingMentorLinks) {
      setSelectedMentorIds(existingMentorLinks.map((l) => l.mentor_id));
    }
  }, [editingItem, existingMentorLinks]);

  // Sync materials when existingMaterials loads for the editing item
  useEffect(() => {
    if (editingItem && existingMaterials) {
      setMaterials(existingMaterials.map((m) => ({ id: m.id, url: m.url, name: m.name || "" })));
    }
  }, [editingItem, existingMaterials]);

  const handleSubmitItem = () => {
    if (itemForm.title.trim().length < 3) {
      toast({ title: "Título deve ter ao menos 3 caracteres.", variant: "destructive" });
      return;
    }
    saveItemMutation.mutate({ form: itemForm, itemId: editingItem?.id, mentorIds: selectedMentorIds, materials });
  };

  const isLoading = permLoading || trackLoading || itemsLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!track) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Trilha não encontrada</h2>
          <Button onClick={() => navigate("/admin/content-tracks")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
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
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/content-tracks")} className="gap-2 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Trilhas
            </Button>
            <div className="flex items-center gap-3">
              {track.thumbnail_url && (
                <img src={track.thumbnail_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
              )}
              <div>
                <h1 className="text-2xl font-bold">{track.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{track.category}</Badge>
                  {track.event_name && <Badge variant="secondary">{track.event_name}</Badge>}
                  <span className="text-sm text-muted-foreground">{items.length} conteúdos</span>
                </div>
              </div>
            </div>
          </div>
          <Button onClick={openCreateItem} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Conteúdo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Com Vídeo</p>
              <p className="text-2xl font-bold text-primary">{items.filter((i) => i.cloudflare_video_uid || i.video_url).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Duração Total</p>
              <p className="text-2xl font-bold">{items.reduce((a, i) => a + (i.duration_minutes || 0), 0)} min</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Apresentadores</p>
              <p className="text-2xl font-bold">{new Set(items.filter((i) => i.presenter_name).map((i) => i.presenter_name)).size}</p>
            </CardContent>
          </Card>
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <FileVideo className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum conteúdo ainda</h3>
            <p className="text-muted-foreground mb-4">Adicione palestras, painéis e vídeos a esta trilha.</p>
            <Button onClick={openCreateItem} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Conteúdo
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <Card key={item.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Order number */}
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary font-bold text-lg flex-shrink-0">
                      {index + 1}
                    </div>

                    {/* Thumbnail */}
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt="" className="h-16 w-24 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-16 w-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Video className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-1">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {/* Presenter */}
                        {item.presenter_name && (
                          <div className="flex items-center gap-1.5">
                            {item.presenter_avatar ? (
                              <img src={item.presenter_avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-xs text-muted-foreground">{item.presenter_name}</span>
                          </div>
                        )}
                        {item.duration_minutes && item.duration_minutes > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {item.duration_minutes} min
                          </div>
                        )}
                        {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
                        {item.cloudflare_video_uid ? (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                            <Video className="h-3 w-3 mr-1" />
                            Cloudflare
                          </Badge>
                        ) : item.video_url ? (
                          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                            <Video className="h-3 w-3 mr-1" />
                            Legado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Sem vídeo</Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { setDeletingItem(item); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Item Dialog */}
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingItem ? "✏️ Editar Conteúdo" : "➕ Novo Conteúdo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0 pr-1">
              {/* Title */}
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={itemForm.title} onChange={(e) => setItemForm((p) => ({ ...p, title: e.target.value }))} placeholder="Título do conteúdo" />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={itemForm.description} onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
              </div>

              {/* Cloudflare Video UID */}
              <div className="space-y-2">
                <Label>Cloudflare Video UID</Label>
                <Input
                  value={itemForm.cloudflare_video_uid}
                  onChange={async (e) => {
                    const uid = e.target.value.trim();
                    setItemForm((p) => ({ ...p, cloudflare_video_uid: uid }));
                    if (uid.length >= 20) {
                      try {
                        const { data: statusData } = await supabase.functions.invoke("cloudflare-video-status", { body: { videoUid: uid } });
                        if (statusData?.duration) {
                          const mins = Math.round(statusData.duration / 60);
                          setItemForm((p) => ({ ...p, duration_minutes: mins.toString() }));
                          toast({ title: `Duração detectada: ${mins} min` });
                        }
                      } catch {}
                    }
                  }}
                  placeholder="Cole o UID do vídeo da Cloudflare"
                />
                <p className="text-xs text-muted-foreground">
                  Cole o identificador do vídeo já enviado na Cloudflare Stream.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input type="number" value={itemForm.duration_minutes} onChange={(e) => setItemForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input type="number" value={itemForm.order_index} onChange={(e) => setItemForm((p) => ({ ...p, order_index: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Speaker (legado)</Label>
                  <Input value={itemForm.speaker} onChange={(e) => setItemForm((p) => ({ ...p, speaker: e.target.value }))} placeholder="Nome" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={itemForm.category} onChange={(e) => setItemForm((p) => ({ ...p, category: e.target.value }))} placeholder="Ex: IA" />
                </div>
              </div>

              {/* Thumbnail */}
              <div className="space-y-2">
                <Label>Thumbnail do Conteúdo</Label>
                <div className="flex items-center gap-3">
                  {itemForm.thumbnail_url ? (
                    <div className="relative h-16 w-24 rounded-lg overflow-hidden bg-muted">
                      <img src={itemForm.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      <button className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5" onClick={() => setItemForm((p) => ({ ...p, thumbnail_url: "" }))}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => thumbnailInputRef.current?.click()} disabled={uploadingThumb} className="gap-2">
                      {uploadingThumb ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      Upload
                    </Button>
                  )}
                  <input ref={thumbnailInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleThumbUpload} />
                </div>
              </div>

              {/* Materiais da aula (PDF/PPT/Planilha) */}
              <div className="space-y-2">
                <Label>Materiais da Aula (PDF/PPT/Planilha)</Label>
                <div className="space-y-2">
                  {materials.map((m, idx) => (
                    <div key={m.id || `${m.url}-${idx}`} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 pl-3 pr-2 py-1.5">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate flex-1">{m.name || "Material anexado"}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => setMaterials((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => materialInputRef.current?.click()} disabled={uploadingMaterial} className="gap-2">
                    {uploadingMaterial ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    Adicionar material
                  </Button>
                  <input
                    ref={materialInputRef}
                    type="file"
                    accept=".pdf,.ppt,.pptx,.xlsx,.xls,.csv,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    className="hidden"
                    onChange={handleMaterialUpload}
                  />
                </div>
              </div>

              {/* Official Mentors (many-to-many) */}
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">👥 Mentores Oficiais</p>
                  <span className="text-xs text-muted-foreground">{selectedMentorIds.length} selecionado(s)</span>
                </div>

                {/* Selected mentors chips */}
                {selectedMentorIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedMentorIds.map((mid) => {
                      const m = allMentors.find((x) => x.id === mid);
                      if (!m) return null;
                      return (
                        <div key={mid} className="flex items-center gap-2 rounded-full border border-border bg-muted/40 pl-1 pr-2 py-1">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <span className="text-xs">{m.name}</span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setSelectedMentorIds((prev) => prev.filter((x) => x !== mid))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mentor search / add */}
                <div className="space-y-2 relative">
                  <Label>Adicionar mentor</Label>
                  <Input
                    value={mentorSearch}
                    onChange={(e) => { setMentorSearch(e.target.value); setShowMentorList(true); }}
                    onFocus={() => setShowMentorList(true)}
                    onBlur={() => setTimeout(() => setShowMentorList(false), 200)}
                    placeholder="Buscar mentor cadastrado..."
                  />
                  {showMentorList && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {allMentors
                        .filter((m) => !selectedMentorIds.includes(m.id) && (!mentorSearch || m.name.toLowerCase().includes(mentorSearch.toLowerCase())))
                        .slice(0, 20)
                        .map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className="w-full flex items-center gap-3 p-2 hover:bg-accent text-left transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedMentorIds((prev) => [...prev, m.id]);
                              setMentorSearch("");
                            }}
                          >
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{m.name}</p>
                              {(m.specialty || m.bio) && (
                                <p className="text-xs text-muted-foreground truncate">{m.specialty || m.bio}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      {allMentors.filter((m) => !selectedMentorIds.includes(m.id)).length === 0 && (
                        <p className="p-3 text-xs text-muted-foreground text-center">Todos os mentores já foram adicionados</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Adicione um ou mais mentores oficiais. Todos serão exibidos como palestrantes.</p>
                </div>
              </div>

              {/* Presenter Section */}
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-muted-foreground">🎤 Apresentador deste Conteúdo</p>

                {/* Profile Search */}
                <div className="space-y-2 relative">
                  <Label>Buscar Perfil</Label>
                  <Input
                    value={presenterSearch}
                    onChange={(e) => {
                      setPresenterSearch(e.target.value);
                      setShowPresenterResults(true);
                    }}
                    onFocus={() => setShowPresenterResults(true)}
                    placeholder="Buscar por nome..."
                  />
                  {showPresenterResults && profileResults.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {profileResults.map((p) => (
                        <button
                          key={`${p.source}-${p.id}`}
                          className="w-full flex items-center gap-3 p-3 hover:bg-accent text-left transition-colors"
                          onClick={() => selectPresenter(p)}
                        >
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            {p.bio && <p className="text-xs text-muted-foreground truncate">{p.bio}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Avatar */}
                <div>
                  <Label>Foto</Label>
                  <div className="mt-1 flex items-center gap-3">
                    {itemForm.presenter_avatar ? (
                      <img src={itemForm.presenter_avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="gap-2">
                        {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        {uploadingAvatar ? "Enviando..." : "Upload manual"}
                      </Button>
                      <span className="text-xs text-muted-foreground">JPG, PNG, WebP • Max 2MB</span>
                    </div>
                    <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={itemForm.presenter_name} onChange={(e) => setItemForm((p) => ({ ...p, presenter_name: e.target.value }))} placeholder="Nome do apresentador" />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label>Mini Bio</Label>
                  <Textarea value={itemForm.presenter_bio} onChange={(e) => setItemForm((p) => ({ ...p, presenter_bio: e.target.value }))} rows={2} placeholder="Breve descrição..." />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmitItem} disabled={saveItemMutation.isPending} className="gap-2">
                {saveItemMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingItem ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Conteúdo</AlertDialogTitle>
              <AlertDialogDescription>
                Excluir "{deletingItem?.title}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingItem && deleteItemMutation.mutate(deletingItem)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteItemMutation.isPending}
              >
                {deleteItemMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
