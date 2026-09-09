import { useState, useRef, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  Upload,
  Video,
  BookOpen,
  Clock,
  BarChart3,
  GraduationCap,
  Image as ImageIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermission } from "@/hooks/usePermission";
import { PresenterProfileSearch } from "@/components/admin/PresenterProfileSearch";
import { useToast } from "@/hooks/use-toast";
import { CloudflareVideoUploader } from "@/components/video/CloudflareVideoUploader";
import { MentorPresenterSelect } from "@/components/admin/MentorPresenterSelect";

// Types
interface FormationLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  created_at: string;
}

interface FormationModule {
  id: string;
  formation_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  formation_lessons: FormationLesson[];
}

interface Formation {
  id: string;
  title: string;
  description: string | null;
  level: string;
  thumbnail_url: string | null;
  order_index: number;
  is_published: boolean;
  duration_hours: number;
  created_at: string;
  formation_modules: FormationModule[];
}

// Form types
interface ModuleForm {
  title: string;
  description: string;
  order_index: string;
}

interface LessonForm {
  title: string;
  description: string;
  duration_minutes: string;
  video_url: string;
  cloudflare_video_uid: string;
  order_index: string;
  presenter_name: string;
  presenter_bio: string;
  presenter_avatar: string;
}

interface EditFormationForm {
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

export default function AdminFormationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission, isLoading: permLoading } = usePermission();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const presenterAvatarFormationRef = useRef<HTMLInputElement>(null);
  const presenterAvatarLessonRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [editFormationOpen, setEditFormationOpen] = useState(false);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [deleteModuleOpen, setDeleteModuleOpen] = useState(false);
  const [deleteLessonOpen, setDeleteLessonOpen] = useState(false);

  // Edit states
  const [editingModule, setEditingModule] = useState<FormationModule | null>(null);
  const [editingLesson, setEditingLesson] = useState<FormationLesson | null>(null);
  const [currentModuleId, setCurrentModuleId] = useState<string>("");
  const [deletingModule, setDeletingModule] = useState<FormationModule | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<FormationLesson | null>(null);

  // Form states
  const [editFormForm, setEditFormForm] = useState<EditFormationForm>({
    title: "", description: "", level: "beginner", thumbnail_url: "", is_published: false, is_coming_soon: false, duration_hours: "", presenter_name: "", presenter_bio: "", presenter_avatar: "",
  });
  const [moduleForm, setModuleForm] = useState<ModuleForm>({ title: "", description: "", order_index: "0" });
  const [lessonForm, setLessonForm] = useState<LessonForm>({
    title: "", description: "", duration_minutes: "", video_url: "", cloudflare_video_uid: "", order_index: "0", presenter_name: "", presenter_bio: "", presenter_avatar: "",
  });

  // Upload states
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [uploadingPresenterAvatar, setUploadingPresenterAvatar] = useState(false);
  const [uploadingLessonPresenterAvatar, setUploadingLessonPresenterAvatar] = useState(false);

  // Expanded modules
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Permission check
  if (!permLoading && !hasPermission("formations.manage")) {
    return <Navigate to="/" replace />;
  }

  // Fetch formation with modules and lessons
  const { data: formation, isLoading } = useQuery({
    queryKey: ["admin-formation-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("formations")
        .select(`
          *,
          formation_modules (
            *,
            formation_lessons (*)
          )
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      // Sort modules and lessons
      const f = data as any as Formation;
      f.formation_modules = (f.formation_modules || []).sort((a, b) => a.order_index - b.order_index);
      f.formation_modules.forEach((m) => {
        m.formation_lessons = (m.formation_lessons || []).sort((a, b) => a.order_index - b.order_index);
      });
      return f;
    },
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-formation-detail", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-formations"] });
    queryClient.invalidateQueries({ queryKey: ["formations"] });
  };

  // ── EDIT FORMATION ──
  const editFormationMutation = useMutation({
    mutationFn: async (form: EditFormationForm) => {
      const { error } = await supabase
        .from("formations")
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          level: form.level,
          thumbnail_url: form.thumbnail_url || null,
          is_published: form.is_published,
          is_coming_soon: form.is_coming_soon,
          duration_hours: form.duration_hours ? parseInt(form.duration_hours) : 0,
          presenter_name: form.presenter_name.trim() || null,
          presenter_bio: form.presenter_bio.trim() || null,
          presenter_avatar: form.presenter_avatar || null,
        })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditFormationOpen(false);
      toast({ title: "✅ Formação atualizada!" });
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const openEditFormation = () => {
    if (!formation) return;
    setEditFormForm({
      title: formation.title,
      description: formation.description || "",
      level: formation.level,
      thumbnail_url: formation.thumbnail_url || "",
      is_published: formation.is_published,
      is_coming_soon: (formation as any).is_coming_soon || false,
      duration_hours: formation.duration_hours?.toString() || "",
      presenter_name: (formation as any).presenter_name || "",
      presenter_bio: (formation as any).presenter_bio || "",
      presenter_avatar: (formation as any).presenter_avatar || "",
    });
    setEditFormationOpen(true);
  };

  // ── THUMBNAIL UPLOAD ──
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast({ title: "Formato inválido. Use JPG, PNG ou WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Máximo 2MB.", variant: "destructive" });
      return;
    }
    setUploadingThumbnail(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("formation-thumbnails").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("formation-thumbnails").getPublicUrl(fileName);
      setEditFormForm((prev) => ({ ...prev, thumbnail_url: urlData.publicUrl }));
      toast({ title: "✅ Imagem enviada!" });
    } catch {
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploadingThumbnail(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    }
  };

  // ── PRESENTER AVATAR UPLOAD (Formation) ──
  const handlePresenterAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'formation' | 'lesson') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast({ title: "Formato inválido. Use JPG, PNG ou WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Máximo 2MB.", variant: "destructive" });
      return;
    }
    const setUploading = target === 'formation' ? setUploadingPresenterAvatar : setUploadingLessonPresenterAvatar;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `presenters/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("formation-thumbnails").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("formation-thumbnails").getPublicUrl(fileName);
      if (target === 'formation') {
        setEditFormForm((prev) => ({ ...prev, presenter_avatar: urlData.publicUrl }));
      } else {
        setLessonForm((prev) => ({ ...prev, presenter_avatar: urlData.publicUrl }));
      }
      toast({ title: "✅ Foto enviada!" });
    } catch {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setUploading(false);
      if (target === 'formation' && presenterAvatarFormationRef.current) presenterAvatarFormationRef.current.value = "";
      if (target === 'lesson' && presenterAvatarLessonRef.current) presenterAvatarLessonRef.current.value = "";
    }
  };


  const saveModuleMutation = useMutation({
    mutationFn: async (data: { form: ModuleForm; moduleId?: string }) => {
      const payload = {
        formation_id: id!,
        title: data.form.title.trim(),
        description: data.form.description.trim() || null,
        order_index: parseInt(data.form.order_index) || 0,
      };
      if (data.moduleId) {
        const { error } = await supabase.from("formation_modules").update(payload).eq("id", data.moduleId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("formation_modules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      invalidate();
      setModuleDialogOpen(false);
      setEditingModule(null);
      toast({ title: vars.moduleId ? "✅ Módulo atualizado!" : "✅ Módulo criado!" });
    },
    onError: () => toast({ title: "Erro ao salvar módulo", variant: "destructive" }),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (mod: FormationModule) => {
      // Delete videos from storage for all lessons in this module
      for (const lesson of mod.formation_lessons) {
        if (lesson.video_url) {
          const path = lesson.video_url.split("/formation-videos/")[1];
          if (path) await supabase.storage.from("formation-videos").remove([decodeURIComponent(path)]);
        }
      }
      const { error } = await supabase.from("formation_modules").delete().eq("id", mod.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setDeleteModuleOpen(false);
      setDeletingModule(null);
      toast({ title: "🗑️ Módulo excluído" });
    },
    onError: () => toast({ title: "Erro ao excluir módulo", variant: "destructive" }),
  });

  const openCreateModule = () => {
    const maxOrder = formation?.formation_modules?.length
      ? Math.max(...formation.formation_modules.map((m) => m.order_index)) + 1
      : 0;
    setEditingModule(null);
    setModuleForm({ title: "", description: "", order_index: maxOrder.toString() });
    setModuleDialogOpen(true);
  };

  const openEditModule = (mod: FormationModule) => {
    setEditingModule(mod);
    setModuleForm({
      title: mod.title,
      description: mod.description || "",
      order_index: mod.order_index.toString(),
    });
    setModuleDialogOpen(true);
  };

  // ── LESSON CRUD ──
  const saveLessonMutation = useMutation({
    mutationFn: async (data: { form: LessonForm; moduleId: string; lessonId?: string }) => {
      const payload = {
        module_id: data.moduleId,
        title: data.form.title.trim(),
        description: data.form.description.trim() || null,
        duration_minutes: data.form.duration_minutes ? parseInt(data.form.duration_minutes) : 0,
        video_url: data.form.video_url || null,
        cloudflare_video_uid: data.form.cloudflare_video_uid?.trim() || null,
        order_index: parseInt(data.form.order_index) || 0,
        presenter_name: data.form.presenter_name?.trim() || null,
        presenter_bio: data.form.presenter_bio?.trim() || null,
        presenter_avatar: data.form.presenter_avatar || null,
      };
      if (data.lessonId) {
        const { error } = await supabase.from("formation_lessons").update(payload).eq("id", data.lessonId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("formation_lessons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      invalidate();
      setLessonDialogOpen(false);
      setEditingLesson(null);
      toast({ title: vars.lessonId ? "✅ Aula atualizada!" : "✅ Aula criada!" });
    },
    onError: () => toast({ title: "Erro ao salvar aula", variant: "destructive" }),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lesson: FormationLesson) => {
      if (lesson.video_url) {
        const path = lesson.video_url.split("/formation-videos/")[1];
        if (path) await supabase.storage.from("formation-videos").remove([decodeURIComponent(path)]);
      }
      const { error } = await supabase.from("formation_lessons").delete().eq("id", lesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setDeleteLessonOpen(false);
      setDeletingLesson(null);
      toast({ title: "🗑️ Aula excluída" });
    },
    onError: () => toast({ title: "Erro ao excluir aula", variant: "destructive" }),
  });

  const openCreateLesson = (moduleId: string) => {
    const mod = formation?.formation_modules.find((m) => m.id === moduleId);
    const maxOrder = mod?.formation_lessons?.length
      ? Math.max(...mod.formation_lessons.map((l) => l.order_index)) + 1
      : 0;
    setEditingLesson(null);
    setCurrentModuleId(moduleId);
    setLessonForm({ title: "", description: "", duration_minutes: "", video_url: "", cloudflare_video_uid: "", order_index: maxOrder.toString(), presenter_name: "", presenter_bio: "", presenter_avatar: "" });
    setLessonDialogOpen(true);
  };

  const openEditLesson = (lesson: FormationLesson) => {
    setEditingLesson(lesson);
    setCurrentModuleId(lesson.module_id);
    setLessonForm({
      title: lesson.title,
      description: lesson.description || "",
      duration_minutes: lesson.duration_minutes?.toString() || "",
      video_url: lesson.video_url || "",
      cloudflare_video_uid: (lesson as any).cloudflare_video_uid || "",
      order_index: lesson.order_index.toString(),
      presenter_name: (lesson as any).presenter_name || "",
      presenter_bio: (lesson as any).presenter_bio || "",
      presenter_avatar: (lesson as any).presenter_avatar || "",
    });
    setLessonDialogOpen(true);
  };

  // ── VIDEO UPLOAD (with tus resumable upload + progress) ──
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
      const fileName = `${crypto.randomUUID()}_${file.name}`;
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
      setLessonForm((prev) => ({ ...prev, video_url: urlData.publicUrl }));
      toast({ title: "✅ Vídeo enviado!" });
    } catch (error) {
      console.error("Erro no upload de vídeo (formação):", error);
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

  // ── REORDER ──
  const reorderMutation = useMutation({
    mutationFn: async (updates: { table: string; items: { id: string; order_index: number }[] }) => {
      for (const item of updates.items) {
        const { error } = await supabase.from(updates.table as any).update({ order_index: item.order_index }).eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => invalidate(),
  });

  const moveModule = (index: number, direction: "up" | "down") => {
    if (!formation) return;
    const modules = [...formation.formation_modules];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= modules.length) return;

    const currentOrder = modules[index].order_index;
    const swapOrder = modules[swapIdx].order_index;

    reorderMutation.mutate({
      table: "formation_modules",
      items: [
        { id: modules[index].id, order_index: swapOrder },
        { id: modules[swapIdx].id, order_index: currentOrder },
      ],
    });
  };

  const moveLesson = (moduleId: string, lessonIndex: number, direction: "up" | "down") => {
    if (!formation) return;
    const mod = formation.formation_modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const lessons = [...mod.formation_lessons];
    const swapIdx = direction === "up" ? lessonIndex - 1 : lessonIndex + 1;
    if (swapIdx < 0 || swapIdx >= lessons.length) return;

    const currentOrder = lessons[lessonIndex].order_index;
    const swapOrder = lessons[swapIdx].order_index;

    reorderMutation.mutate({
      table: "formation_lessons",
      items: [
        { id: lessons[lessonIndex].id, order_index: swapOrder },
        { id: lessons[swapIdx].id, order_index: currentOrder },
      ],
    });
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  // Loading & not found
  if (permLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!formation) {
    return (
      <MainLayout>
        <div className="text-center py-24 space-y-4">
          <p className="text-muted-foreground">Formação não encontrada.</p>
          <Button variant="outline" onClick={() => navigate("/admin/formations")}>
            Voltar para Formações
          </Button>
        </div>
      </MainLayout>
    );
  }

  const totalLessons = formation.formation_modules.reduce((acc, m) => acc + m.formation_lessons.length, 0);
  const totalDuration = formation.formation_modules.reduce(
    (acc, m) => acc + m.formation_lessons.reduce((a, l) => a + (l.duration_minutes || 0), 0),
    0
  );

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 mb-4 -ml-2"
            onClick={() => navigate("/admin/formations")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Formações
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{formation.title}</h1>
                  {formation.is_published ? (
                    <Badge className="bg-green-500/80 text-white border-0">● Publicada</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">● Rascunho</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formation.formation_modules.length} módulos • {totalLessons} aulas • {totalDuration >= 60 ? `${Math.ceil(totalDuration / 60)}h` : `${totalDuration}min`}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={openEditFormation} className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar Informações
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="modules">
          <TabsList>
            <TabsTrigger value="modules" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Módulos e Aulas
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: MODULES ── */}
          <TabsContent value="modules" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={openCreateModule} className="gap-2 bg-[#BFFF00] text-black hover:bg-[#BFFF00]/90">
                <Plus className="h-4 w-4" />
                Novo Módulo
              </Button>
            </div>

            {formation.formation_modules.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhum módulo criado ainda. Clique em "Novo Módulo" para começar.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {formation.formation_modules.map((mod, modIdx) => (
                  <Card key={mod.id} className="overflow-hidden">
                    {/* Module Header */}
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleModule(mod.id)}
                    >
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${expandedModules.has(mod.id) ? "rotate-90" : ""}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            Módulo {modIdx + 1}
                          </span>
                          <h3 className="font-semibold truncate">{mod.title}</h3>
                        </div>
                        {mod.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{mod.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {mod.formation_lessons.length} aulas •{" "}
                        {(() => { const mins = mod.formation_lessons.reduce((a, l) => a + (l.duration_minutes || 0), 0); return mins >= 60 ? `${Math.ceil(mins / 60)}h` : `${mins}min`; })()}
                      </span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={modIdx === 0} onClick={() => moveModule(modIdx, "up")}>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={modIdx === formation.formation_modules.length - 1} onClick={() => moveModule(modIdx, "down")}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModule(mod)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { setDeletingModule(mod); setDeleteModuleOpen(true); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Lessons */}
                    {expandedModules.has(mod.id) && (
                      <div className="border-t">
                        {mod.formation_lessons.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            Nenhuma aula neste módulo.
                          </div>
                        ) : (
                          <div className="divide-y">
                            {mod.formation_lessons.map((lesson, lessonIdx) => (
                              <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 pl-10 hover:bg-muted/20 transition-colors">
                                <span className="text-xs font-mono text-muted-foreground w-12">
                                  {modIdx + 1}.{lessonIdx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{lesson.title}</p>
                                </div>
                                {lesson.duration_minutes ? (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {lesson.duration_minutes}min
                                  </span>
                                ) : null}
                                {(lesson as any).cloudflare_video_uid ? (
                                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                    <Video className="h-3 w-3 mr-1" />
                                    Cloudflare
                                  </Badge>
                                ) : lesson.video_url ? (
                                  <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                                    <Video className="h-3 w-3 mr-1" />
                                    Legado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Sem vídeo
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={lessonIdx === 0} onClick={() => moveLesson(mod.id, lessonIdx, "up")}>
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={lessonIdx === mod.formation_lessons.length - 1} onClick={() => moveLesson(mod.id, lessonIdx, "down")}>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLesson(lesson)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { setDeletingLesson(lesson); setDeleteLessonOpen(true); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="px-4 py-3 border-t bg-muted/10">
                          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openCreateLesson(mod.id)}>
                            <Plus className="h-3.5 w-3.5" />
                            Nova Aula
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: STATS ── */}
          <TabsContent value="stats" className="mt-4">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Estatísticas em breve</p>
                <p className="text-sm mt-1">Total de alunos inscritos, progresso médio, taxa de conclusão...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── DIALOG: EDIT FORMATION ── */}
        <Dialog open={editFormationOpen} onOpenChange={setEditFormationOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>✏️ Editar Formação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[85vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                {editFormForm.thumbnail_url ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img src={editFormForm.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    <Button variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => setEditFormForm((p) => ({ ...p, thumbnail_url: "" }))}>
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => thumbnailInputRef.current?.click()}>
                    {uploadingThumbnail ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">JPG, PNG ou WebP (max 2MB)</span>
                      </>
                    )}
                  </div>
                )}
                <input ref={thumbnailInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleThumbnailUpload} />
              </div>
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={editFormForm.title} onChange={(e) => setEditFormForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={editFormForm.description} onChange={(e) => setEditFormForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Dificuldade *</Label>
                <Select value={editFormForm.level} onValueChange={(v) => setEditFormForm((p) => ({ ...p, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração estimada (horas)</Label>
                <Input type="number" value={editFormForm.duration_hours} onChange={(e) => setEditFormForm((p) => ({ ...p, duration_hours: e.target.value }))} min="0" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Publicar?</Label>
                <Switch checked={editFormForm.is_published} onCheckedChange={(v) => setEditFormForm((p) => ({ ...p, is_published: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Marcar como "Em breve"</Label>
                  <p className="text-xs text-muted-foreground">Card visível mas não clicável</p>
                </div>
                <Switch checked={editFormForm.is_coming_soon} onCheckedChange={(v) => setEditFormForm((p) => ({ ...p, is_coming_soon: v }))} />
              </div>
              {/* Presenter Section - Profile Search */}
              <PresenterProfileSearch
                presenterName={editFormForm.presenter_name}
                presenterBio={editFormForm.presenter_bio}
                presenterAvatar={editFormForm.presenter_avatar}
                onSelect={(profile) => {
                  setEditFormForm((p) => ({
                    ...p,
                    presenter_name: profile.name,
                    presenter_bio: profile.bio || "",
                    presenter_avatar: profile.avatar_url || "",
                  }));
                }}
                onClear={() => {
                  setEditFormForm((p) => ({
                    ...p,
                    presenter_name: "",
                    presenter_bio: "",
                    presenter_avatar: "",
                  }));
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditFormationOpen(false)}>Cancelar</Button>
              <Button onClick={() => { if (editFormForm.title.trim().length < 3) { toast({ title: "Título deve ter ao menos 3 caracteres.", variant: "destructive" }); return; } editFormationMutation.mutate(editFormForm); }} disabled={editFormationMutation.isPending} className="gap-2">
                {editFormationMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── DIALOG: MODULE ── */}
        <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingModule ? "✏️ Editar Módulo" : "➕ Novo Módulo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={moduleForm.title} onChange={(e) => setModuleForm((p) => ({ ...p, title: e.target.value }))} placeholder="Nome do módulo" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={moduleForm.description} onChange={(e) => setModuleForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input type="number" value={moduleForm.order_index} onChange={(e) => setModuleForm((p) => ({ ...p, order_index: e.target.value }))} min="0" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => { if (moduleForm.title.trim().length < 3) { toast({ title: "Título deve ter ao menos 3 caracteres.", variant: "destructive" }); return; } saveModuleMutation.mutate({ form: moduleForm, moduleId: editingModule?.id }); }} disabled={saveModuleMutation.isPending} className="gap-2">
                {saveModuleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                ✅ Salvar Módulo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── DIALOG: LESSON ── */}
        <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingLesson ? "✏️ Editar Aula" : "➕ Nova Aula"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={lessonForm.title} onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))} placeholder="Nome da aula" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={lessonForm.description} onChange={(e) => setLessonForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Duração (minutos)</Label>
                <Input type="number" value={lessonForm.duration_minutes} onChange={(e) => setLessonForm((p) => ({ ...p, duration_minutes: e.target.value }))} min="0" />
              </div>
              <div className="space-y-2">
                <Label>Cloudflare Video UID</Label>
                <Input
                  value={lessonForm.cloudflare_video_uid}
                  onChange={async (e) => {
                    const uid = e.target.value.trim();
                    setLessonForm((p) => ({ ...p, cloudflare_video_uid: uid }));
                    if (uid.length >= 20) {
                      try {
                        const { data: statusData } = await supabase.functions.invoke("cloudflare-video-status", { body: { videoUid: uid } });
                        if (statusData?.duration) {
                          const mins = Math.round(statusData.duration / 60);
                          setLessonForm((p) => ({ ...p, duration_minutes: mins.toString() }));
                          toast({ title: `Duração detectada: ${mins} min` });
                        }
                      } catch {}
                    }
                  }}
                  placeholder="Cole o UID do vídeo da Cloudflare"
                />
                <p className="text-xs text-muted-foreground">
                  Cole o UID e a duração será preenchida automaticamente.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input type="number" value={lessonForm.order_index} onChange={(e) => setLessonForm((p) => ({ ...p, order_index: e.target.value }))} min="0" />
              </div>
              {/* Presenter from mentors */}
              <div className="space-y-2">
                <Label>Apresentador</Label>
                <MentorPresenterSelect
                  currentName={lessonForm.presenter_name}
                  onSelect={(mentor) => setLessonForm((p) => ({
                    ...p,
                    presenter_name: mentor.name,
                    presenter_bio: mentor.bio || "",
                    presenter_avatar: mentor.avatar_url || "",
                  }))}
                  onClear={() => setLessonForm((p) => ({
                    ...p,
                    presenter_name: "",
                    presenter_bio: "",
                    presenter_avatar: "",
                  }))}
                />
                {lessonForm.presenter_name && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    {lessonForm.presenter_avatar && (
                      <img src={lessonForm.presenter_avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{lessonForm.presenter_name}</p>
                      {lessonForm.presenter_bio && <p className="text-xs text-muted-foreground line-clamp-1">{lessonForm.presenter_bio}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => { if (lessonForm.title.trim().length < 3) { toast({ title: "Título deve ter ao menos 3 caracteres.", variant: "destructive" }); return; } saveLessonMutation.mutate({ form: lessonForm, moduleId: currentModuleId, lessonId: editingLesson?.id }); }} disabled={saveLessonMutation.isPending} className="gap-2">
                {saveLessonMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                ✅ Salvar Aula
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── DELETE MODULE ── */}
        <AlertDialog open={deleteModuleOpen} onOpenChange={setDeleteModuleOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Módulo</AlertDialogTitle>
              <AlertDialogDescription>
                Excluir "{deletingModule?.title}"? Todas as aulas serão removidas permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteModuleMutation.isPending} onClick={() => deletingModule && deleteModuleMutation.mutate(deletingModule)}>
                {deleteModuleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── DELETE LESSON ── */}
        <AlertDialog open={deleteLessonOpen} onOpenChange={setDeleteLessonOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Aula</AlertDialogTitle>
              <AlertDialogDescription>
                Excluir "{deletingLesson?.title}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteLessonMutation.isPending} onClick={() => deletingLesson && deleteLessonMutation.mutate(deletingLesson)}>
                {deleteLessonMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
