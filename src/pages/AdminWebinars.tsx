import { useState, useRef, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Video,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Users,
  Calendar as CalendarIcon,
  Loader2,
  Image as ImageIcon,
  Upload,
  User,
  Flame,
} from "lucide-react";
import { MentorSearch } from "@/components/admin/MentorSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresenterProfileSearch } from "@/components/admin/PresenterProfileSearch";
import type { GoogleCalendarEvent } from "@/hooks/useGoogleCalendarEvents";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { format, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Webinar types ───
interface Webinar {
  id: string;
  title: string;
  description: string | null;
  partner_name: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_url: string | null;
  max_attendees: number | null;
  is_active: boolean | null;
  thumbnail_url: string | null;
  presenter_name: string | null;
  presenter_bio: string | null;
  presenter_avatar: string | null;
  created_at: string;
}

interface WebinarForm {
  title: string;
  description: string;
  partner_name: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string;
  max_attendees: string;
  is_active: boolean;
  thumbnail_url: string;
  presenter_name: string;
  presenter_bio: string;
  presenter_avatar: string;
}

const emptyWebinarForm: WebinarForm = {
  title: "",
  description: "",
  partner_name: "",
  scheduled_at: "",
  duration_minutes: 60,
  meeting_url: "",
  max_attendees: "",
  is_active: true,
  thumbnail_url: "",
  presenter_name: "",
  presenter_bio: "",
  presenter_avatar: "",
};

// ─── Mentoring types ───
interface MentoringSession {
  id: string;
  title: string;
  description: string | null;
  mentor_name: string;
  mentor_email: string;
  mentor_id: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_url: string | null;
  session_type: string | null;
  is_active: boolean | null;
  max_attendees: number | null;
  cohost_email: string | null;
  created_at: string;
}

interface MentoringForm {
  title: string;
  description: string;
  mentor_id: string | null;
  mentor_name: string;
  mentor_email: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string;
  session_type: string;
  is_active: boolean;
  max_attendees: string;
}

const emptyMentoringForm: MentoringForm = {
  mentor_id: null,
  title: "",
  description: "",
  mentor_name: "Bruno Mesquita",
  mentor_email: "brunomesquita@mapmarketplaces.com",
  scheduled_at: "",
  duration_minutes: 60,
  meeting_url: "",
  session_type: "group",
  is_active: true,
  max_attendees: "",
};

export default function AdminWebinars() {
  const { hasPermission, isLoading: permLoading } = usePermission();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("webinars");

  // ─── Webinar state ───
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [linkFilter, setLinkFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingWebinar, setEditingWebinar] = useState<Webinar | null>(null);
  const [deletingWebinar, setDeletingWebinar] = useState<Webinar | null>(null);
  const [form, setForm] = useState<WebinarForm>(emptyWebinarForm);
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ─── Webinar checkin management state ───
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [managingWebinar, setManagingWebinar] = useState<Webinar | null>(null);

  // ─── Scarcity config state ───
  const [scarcityDialogOpen, setScarcityDialogOpen] = useState(false);
  const [scarcityWebinar, setScarcityWebinar] = useState<Webinar | null>(null);
  const [scarcityForm, setScarcityForm] = useState({
    base_fake_registrations: 70,
    show_live_counter: true,
    show_notifications: true,
    is_active: true,
    min_checkins_to_show: 5,
  });

  // ─── Mentoring state ───
  const [mentSearch, setMentSearch] = useState("");
  const [mentDialogOpen, setMentDialogOpen] = useState(false);
  const [mentDeleteOpen, setMentDeleteOpen] = useState(false);
  const [editingMent, setEditingMent] = useState<MentoringSession | null>(null);
  const [deletingMent, setDeletingMent] = useState<MentoringSession | null>(null);
  const [mentForm, setMentForm] = useState<MentoringForm>(emptyMentoringForm);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningSession, setAssigningSession] = useState<MentoringSession | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignResults, setAssignResults] = useState<{ user_id: string; name: string; avatar_url: string | null }[]>([]);
  const [assignSearching, setAssignSearching] = useState(false);
  const [mentCheckinDialogOpen, setMentCheckinDialogOpen] = useState(false);
  const [managingMentoring, setManagingMentoring] = useState<MentoringSession | null>(null);

  // Google Calendar integration removed; kept empty so calendarMeetLinks below still works untouched.
  const calendarEvents: GoogleCalendarEvent[] = [];


  // Permission check
  if (!permLoading && !hasPermission("webinars.manage")) {
    return <Navigate to="/" replace />;
  }

  // ═══════════════════ WEBINAR QUERIES ═══════════════════
  const { data: webinars = [], isLoading } = useQuery({
    queryKey: ["admin-webinars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webinars")
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as Webinar[];
    },
  });

  const { data: checkinCounts = {} } = useQuery({
    queryKey: ["admin-webinar-checkin-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webinar_checkins")
        .select("webinar_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((c: { webinar_id: string }) => {
        counts[c.webinar_id] = (counts[c.webinar_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch scarcity configs for all webinars
  const { data: scarcityConfigs = {} } = useQuery({
    queryKey: ["admin-scarcity-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webinar_scarcity_config")
        .select("*");
      if (error) throw error;
      const map: Record<string, { base_fake_registrations: number; show_live_counter: boolean; show_notifications: boolean; is_active: boolean }> = {};
      data?.forEach((c) => { map[c.webinar_id] = c; });
      return map;
    },
  });

  // Save scarcity config mutation
  const saveScarcityMutation = useMutation({
    mutationFn: async ({ webinarId, config }: { webinarId: string; config: typeof scarcityForm }) => {
      const { error } = await supabase
        .from("webinar_scarcity_config")
        .upsert({
          webinar_id: webinarId,
          ...config,
        }, { onConflict: "webinar_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-scarcity-configs"] });
      queryClient.invalidateQueries({ queryKey: ["webinar-scarcity-configs"] });
      setScarcityDialogOpen(false);
      toast({ title: "Configuração de escassez salva! ✅" });
    },
    onError: () => toast({ title: "Erro ao salvar configuração", variant: "destructive" }),
  });

  // Fetch checkins with profile info for the managed webinar
  const { data: webinarCheckins = [], isLoading: checkinsLoading } = useQuery({
    queryKey: ["admin-webinar-checkins-detail", managingWebinar?.id],
    queryFn: async () => {
      if (!managingWebinar) return [];
      const { data, error } = await supabase
        .from("webinar_checkins")
        .select("id, user_id, checked_in_at")
        .eq("webinar_id", managingWebinar.id)
        .order("checked_in_at", { ascending: true });
      if (error) throw error;

      // Fetch profiles for these users
      const userIds = data.map((c) => c.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      return data.map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id) || { name: "Desconhecido", avatar_url: null },
      }));
    },
    enabled: !!managingWebinar,
  });

  // Admin remove checkin mutation
  const adminRemoveCheckinMutation = useMutation({
    mutationFn: async ({ checkinId }: { checkinId: string }) => {
      const { error } = await supabase
        .from("webinar_checkins")
        .delete()
        .eq("id", checkinId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-webinar-checkins-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-webinar-checkin-counts"] });
      queryClient.invalidateQueries({ queryKey: ["webinar-checkins"] });
      toast({ title: "Participante removido do check-in ✅" });
    },
    onError: () => toast({ title: "Erro ao remover participante", variant: "destructive" }),
  });

  // Fetch checkins with profile info for managed mentoring session
  const { data: mentCheckinsList = [], isLoading: mentCheckinsLoading } = useQuery({
    queryKey: ["admin-mentoring-checkins-detail", managingMentoring?.id],
    queryFn: async () => {
      if (!managingMentoring) return [];
      const { data, error } = await supabase
        .from("mentoring_checkins")
        .select("id, user_id, checked_in_at")
        .eq("session_id", managingMentoring.id)
        .order("checked_in_at", { ascending: true });
      if (error) throw error;

      const userIds = data.map((c) => c.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      return data.map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id) || { name: "Desconhecido", avatar_url: null },
      }));
    },
    enabled: !!managingMentoring,
  });

  // Admin remove mentoring checkin mutation
  const adminRemoveMentCheckinMutation = useMutation({
    mutationFn: async ({ checkinId }: { checkinId: string }) => {
      const { error } = await supabase
        .from("mentoring_checkins")
        .delete()
        .eq("id", checkinId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mentoring-checkins-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-mentoring-checkin-counts"] });
      queryClient.invalidateQueries({ queryKey: ["mentoring-checkins"] });
      toast({ title: "Participante removido da mentoria ✅" });
    },
    onError: () => toast({ title: "Erro ao remover participante", variant: "destructive" }),
  });

  // ═══════════════════ MENTORING QUERIES ═══════════════════
  const { data: mentSessions = [], isLoading: mentLoading } = useQuery({
    queryKey: ["admin-mentoring-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentoring_sessions")
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as MentoringSession[];
    },
  });

  // Map mentor_id → avatar_url for the mentoring table
  const { data: mentorAvatarById = {} } = useQuery({
    queryKey: ["admin-mentor-avatars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors")
        .select("id, avatar_url");
      if (error) throw error;
      const map: Record<string, string | null> = {};
      (data || []).forEach((m: { id: string; avatar_url: string | null }) => {
        map[m.id] = m.avatar_url;
      });
      return map;
    },
  });

  // Build a map: session id → calendar Meet link (calendarEvents declared above)

  // Build a map: session id → calendar Meet link
  const calendarMeetLinks = useMemo(() => {
    const map: Record<string, string> = {};
    if (!calendarEvents.length || !mentSessions.length) return map;
    for (const session of mentSessions) {
      const sessionTime = new Date(session.scheduled_at).getTime();
      let bestMatch: { meetLink: string; diff: number } | null = null;
      for (const ev of calendarEvents) {
        if (!ev.start || !ev.meetLink) continue;
        const evTime = new Date(ev.start).getTime();
        const diff = Math.abs(evTime - sessionTime);
        if (diff < 2 * 60 * 60 * 1000 && (!bestMatch || diff < bestMatch.diff)) {
          bestMatch = { meetLink: ev.meetLink, diff };
        }
      }
      if (bestMatch) map[session.id] = bestMatch.meetLink;
    }
    return map;
  }, [mentSessions, calendarEvents]);

  const { data: mentCheckinCounts = {} } = useQuery({
    queryKey: ["admin-mentoring-checkin-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentoring_checkins")
        .select("session_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((c: { session_id: string }) => {
        counts[c.session_id] = (counts[c.session_id] || 0) + 1;
      });
      return counts;
    },
  });

  // ═══════════════════ WEBINAR MUTATIONS ═══════════════════
  const saveMutation = useMutation({
    mutationFn: async (data: { form: WebinarForm; id?: string }) => {
      const payload = {
        title: data.form.title.trim(),
        description: data.form.description.trim() || null,
        partner_name: data.form.partner_name.trim() || null,
        scheduled_at: data.form.scheduled_at ? new Date(data.form.scheduled_at).toISOString() : data.form.scheduled_at,
        duration_minutes: data.form.duration_minutes,
        meeting_url: data.form.meeting_url.trim() || null,
        max_attendees: data.form.max_attendees ? parseInt(data.form.max_attendees) : null,
        is_active: data.form.is_active,
        thumbnail_url: data.form.thumbnail_url || null,
        presenter_name: data.form.presenter_name.trim() || null,
        presenter_bio: data.form.presenter_bio.trim() || null,
        presenter_avatar: data.form.presenter_avatar || null,
      };
      if (data.id) {
        const { error } = await supabase.from("webinars").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("webinars").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-webinars"] });
      queryClient.invalidateQueries({ queryKey: ["webinars"] });
      setDialogOpen(false);
      setEditingWebinar(null);
      setForm(emptyWebinarForm);
      toast({ title: variables.id ? "Webinar atualizado! ✅" : "Webinar criado com link do Meet! ✅" });
    },
    onError: () => toast({ title: "Erro ao salvar webinar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (webinar: Webinar) => {
      if (webinar.thumbnail_url) {
        const path = webinar.thumbnail_url.split("/webinar-thumbnails/")[1];
        if (path) await supabase.storage.from("webinar-thumbnails").remove([path]);
      }
      const { error } = await supabase.from("webinars").delete().eq("id", webinar.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-webinars"] });
      queryClient.invalidateQueries({ queryKey: ["webinars"] });
      setDeleteDialogOpen(false);
      setDeletingWebinar(null);
      toast({ title: "Webinar excluído! 🗑️" });
    },
    onError: () => toast({ title: "Erro ao excluir webinar", variant: "destructive" }),
  });

  // ═══════════════════ MENTORING MUTATIONS ═══════════════════
  const saveMentMutation = useMutation({
    mutationFn: async (data: { form: MentoringForm; id?: string; applyToAll?: boolean }) => {
      const isIndividual = data.form.session_type === "individual";
      const meetingUrl = data.form.meeting_url.trim() || null;

      const payload = {
        title: data.form.title.trim(),
        description: data.form.description.trim() || null,
        mentor_name: data.form.mentor_name.trim(),
        mentor_email: data.form.mentor_email.trim(),
        mentor_id: data.form.mentor_id,
        scheduled_at: new Date(data.form.scheduled_at).toISOString(),
        duration_minutes: data.form.duration_minutes,
        meeting_url: meetingUrl,
        session_type: data.form.session_type,
        is_active: data.form.is_active,
        max_attendees: isIndividual ? 1 : (data.form.max_attendees ? parseInt(data.form.max_attendees) : null),
        cohost_email: data.form.mentor_email.trim() || null,
      };
      if (data.id) {
        const { error } = await supabase.from("mentoring_sessions").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mentoring_sessions").insert(payload);
        if (error) throw error;
      }
      // If applyToAll, update mentor info on all active sessions
      if (data.applyToAll && data.form.mentor_id) {
        await supabase.from("mentoring_sessions")
          .update({ mentor_id: data.form.mentor_id, mentor_name: data.form.mentor_name.trim(), mentor_email: data.form.mentor_email.trim() })
          .eq("is_active", true);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-mentoring-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["mentoring-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["all-mentors"] });
      setMentDialogOpen(false);
      setEditingMent(null);
      setMentForm(emptyMentoringForm);
      toast({ title: vars.applyToAll ? "Mentor atualizado em todas as sessões! ✅" : (vars.id ? "Mentoria atualizada! ✅" : "Mentoria criada com link do Meet! ✅") });
    },
    onError: () => toast({ title: "Erro ao salvar mentoria", variant: "destructive" }),
  });

  const deleteMentMutation = useMutation({
    mutationFn: async (session: MentoringSession) => {
      const { error } = await supabase.from("mentoring_sessions").delete().eq("id", session.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mentoring-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["mentoring-sessions"] });
      setMentDeleteOpen(false);
      setDeletingMent(null);
      toast({ title: "Mentoria excluída! 🗑️" });
    },
    onError: () => toast({ title: "Erro ao excluir mentoria", variant: "destructive" }),
  });

  // Admin check-in mutation for individual sessions
  const assignCheckinMutation = useMutation({
    mutationFn: async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      const { error } = await supabase.from("mentoring_checkins").insert({
        session_id: sessionId,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mentoring-checkin-counts"] });
      queryClient.invalidateQueries({ queryKey: ["mentoring-checkins"] });
      setAssignDialogOpen(false);
      setAssigningSession(null);
      setAssignSearch("");
      setAssignResults([]);
      toast({ title: "Participante adicionado! ✅" });
    },
    onError: () => toast({ title: "Erro ao adicionar participante. Pode já estar inscrito.", variant: "destructive" }),
  });

  const handleAssignSearch = async (query: string) => {
    setAssignSearch(query);
    if (query.trim().length < 2) { setAssignResults([]); return; }
    setAssignSearching(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .ilike("name", `%${query.trim()}%`)
        .limit(10);
      setAssignResults(data || []);
    } finally {
      setAssignSearching(false);
    }
  };

  // ═══════════════════ WEBINAR HANDLERS ═══════════════════
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
      const { error } = await supabase.storage.from("webinar-thumbnails").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("webinar-thumbnails").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, thumbnail_url: urlData.publicUrl }));
      toast({ title: "Imagem enviada! ✅" });
    } catch {
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openCreate = () => {
    setEditingWebinar(null);
    setForm(emptyWebinarForm);
    setDialogOpen(true);
  };

  const openEdit = (webinar: Webinar) => {
    setEditingWebinar(webinar);
    setForm({
      title: webinar.title,
      description: webinar.description || "",
      partner_name: webinar.partner_name || "",
      scheduled_at: webinar.scheduled_at ? format(new Date(webinar.scheduled_at), "yyyy-MM-dd'T'HH:mm") : "",
      duration_minutes: webinar.duration_minutes || 60,
      meeting_url: webinar.meeting_url || "",
      max_attendees: webinar.max_attendees?.toString() || "",
      is_active: webinar.is_active ?? true,
      thumbnail_url: webinar.thumbnail_url || "",
      presenter_name: webinar.presenter_name || "",
      presenter_bio: webinar.presenter_bio || "",
      presenter_avatar: webinar.presenter_avatar || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (form.title.trim().length < 5) {
      toast({ title: "Título deve ter pelo menos 5 caracteres.", variant: "destructive" });
      return;
    }
    if (!form.scheduled_at) {
      toast({ title: "Data e hora são obrigatórios.", variant: "destructive" });
      return;
    }
    if (!editingWebinar && !isFuture(new Date(form.scheduled_at))) {
      toast({ title: "A data deve ser no futuro.", variant: "destructive" });
      return;
    }
    if (form.duration_minutes < 15 || form.duration_minutes > 480) {
      toast({ title: "Duração deve ser entre 15 e 480 minutos.", variant: "destructive" });
      return;
    }
    if (form.meeting_url && !form.meeting_url.startsWith("https://")) {
      toast({ title: "URL da reunião deve começar com https://", variant: "destructive" });
      return;
    }
    if (form.max_attendees && parseInt(form.max_attendees) <= 0) {
      toast({ title: "Máximo de participantes deve ser maior que 0.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ form, id: editingWebinar?.id });
  };

  // ═══════════════════ MENTORING HANDLERS ═══════════════════
  const openCreateMent = () => {
    setEditingMent(null);
    setMentForm(emptyMentoringForm);
    setMentDialogOpen(true);
  };

  const openEditMent = (s: MentoringSession) => {
    setEditingMent(s);
    setMentForm({
      mentor_id: s.mentor_id,
      title: s.title,
      description: s.description || "",
      mentor_name: s.mentor_name,
      mentor_email: s.mentor_email,
      scheduled_at: s.scheduled_at ? format(new Date(s.scheduled_at), "yyyy-MM-dd'T'HH:mm") : "",
      duration_minutes: s.duration_minutes || 60,
      meeting_url: s.meeting_url || "",
      session_type: s.session_type || "group",
      is_active: s.is_active ?? true,
      max_attendees: s.max_attendees?.toString() || "",
    });
    setMentDialogOpen(true);
  };

  const handleMentSubmit = (applyToAll = false) => {
    if (mentForm.title.trim().length < 3) {
      toast({ title: "Título deve ter pelo menos 3 caracteres.", variant: "destructive" });
      return;
    }
    if (!mentForm.scheduled_at) {
      toast({ title: "Data e hora são obrigatórios.", variant: "destructive" });
      return;
    }
    if (!mentForm.mentor_name.trim()) {
      toast({ title: "Nome do mentor é obrigatório.", variant: "destructive" });
      return;
    }
    saveMentMutation.mutate({ form: mentForm, id: editingMent?.id, applyToAll });
  };

  // ═══════════════════ FILTERS ═══════════════════
  // Hide past events from listings (keep in DB, just don't display once date has passed)
  const nowMs = Date.now();
  const filteredWebinars = webinars.filter((w) => {
    if (new Date(w.scheduled_at).getTime() < nowMs) return false;
    if (search && !w.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "active" && !w.is_active) return false;
    if (statusFilter === "inactive" && w.is_active) return false;
    if (linkFilter === "with" && !w.meeting_url) return false;
    if (linkFilter === "without" && w.meeting_url) return false;
    return true;
  });

  const filteredMent = mentSessions.filter((s) => {
    if (new Date(s.scheduled_at).getTime() < nowMs) return false;
    if (mentSearch && !s.title.toLowerCase().includes(mentSearch.toLowerCase())) return false;
    return true;
  });

  // Webinar metrics
  const totalWebinars = webinars.length;
  const activeWebinars = webinars.filter((w) => w.is_active).length;
  const totalCheckins = Object.values(checkinCounts).reduce((a, b) => a + b, 0);
  const nextWebinar = webinars
    .filter((w) => w.is_active && isFuture(new Date(w.scheduled_at)))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

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
              <Video className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Webinars & Mentoria</h1>
            </div>
            <p className="text-muted-foreground">
              Gerencie webinars e sessões de mentoria da comunidade
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="webinars" className="gap-2">
              <Video className="h-4 w-4" />
              Webinars
            </TabsTrigger>
            <TabsTrigger value="mentoring" className="gap-2">
              <User className="h-4 w-4" />
              Mentorias
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════ WEBINARS TAB ═══════════════════ */}
          <TabsContent value="webinars" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Webinar
              </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{totalWebinars}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Ativos</p><p className="text-2xl font-bold text-primary">{activeWebinars}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Check-ins</p><p className="text-2xl font-bold">{totalCheckins}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Próximo</p><p className="text-sm font-semibold truncate">{nextWebinar ? format(new Date(nextWebinar.scheduled_at), "dd/MMM HH:mm", { locale: ptBR }) : "Nenhum"}</p></CardContent></Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por título..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={linkFilter} onValueChange={setLinkFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Link" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">Com link</SelectItem>
                  <SelectItem value="without">Sem link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : filteredWebinars.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhum webinar encontrado.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Img</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Parceiro</TableHead>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead className="text-center">Link</TableHead>
                          <TableHead>Vagas</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWebinars.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell>
                              {w.thumbnail_url ? (
                                <img src={w.thumbnail_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">{w.title}</TableCell>
                            <TableCell className="text-muted-foreground">{w.partner_name || "—"}</TableCell>
                            <TableCell className="text-sm">{format(new Date(w.scheduled_at), "dd/MMM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                            <TableCell className="text-center">
                              {w.meeting_url ? <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-destructive mx-auto" />}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm"><Users className="h-3 w-3" />{checkinCounts[w.id] || 0}{w.max_attendees ? `/${w.max_attendees}` : ""}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={w.is_active ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                                {w.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" title="Gerenciar check-ins" onClick={() => { setManagingWebinar(w); setCheckinDialogOpen(true); }}>
                                  <Users className="h-4 w-4 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => { setDeletingWebinar(w); setDeleteDialogOpen(true); }} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
          </TabsContent>

          {/* ═══════════════════ MENTORING TAB ═══════════════════ */}
          <TabsContent value="mentoring" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={openCreateMent} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Mentoria
              </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{mentSessions.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Ativas</p><p className="text-2xl font-bold text-primary">{mentSessions.filter(s => s.is_active).length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Em Grupo</p><p className="text-2xl font-bold">{mentSessions.filter(s => s.session_type === "group").length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Individuais</p><p className="text-2xl font-bold">{mentSessions.filter(s => s.session_type === "individual").length}</p></CardContent></Card>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar mentorias..." value={mentSearch} onChange={(e) => setMentSearch(e.target.value)} className="pl-9" />
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {mentLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : filteredMent.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhuma mentoria encontrada.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Mentor</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead className="text-center">Link</TableHead>
                          <TableHead>Check-ins</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMent.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">{s.title}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  {(() => {
                                    const url = s.mentor_id ? mentorAvatarById[s.mentor_id] : null;
                                    return url ? <AvatarImage src={url} alt={s.mentor_name} className="object-cover" /> : null;
                                  })()}
                                  <AvatarFallback className="text-xs">{s.mentor_name?.charAt(0) || "?"}</AvatarFallback>
                                </Avatar>
                                <span className="text-muted-foreground truncate max-w-[140px]">{s.mentor_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={s.session_type === "group" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-purple-500/10 text-purple-400 border-purple-500/30"}>
                                {s.session_type === "group" ? "Grupo" : "Individual"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{format(new Date(s.scheduled_at), "dd/MMM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                            <TableCell className="text-center">
                              {(s.meeting_url || calendarMeetLinks[s.id]) ? (
                                <a href={s.meeting_url || calendarMeetLinks[s.id] || "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline max-w-[180px] truncate block mx-auto" title={s.meeting_url || calendarMeetLinks[s.id] || ""}>
                                  {(s.meeting_url || calendarMeetLinks[s.id] || "").replace("https://meet.google.com/", "meet/")}
                                </a>
                              ) : <XCircle className="h-5 w-5 text-destructive mx-auto" />}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm"><Users className="h-3 w-3" />{mentCheckinCounts[s.id] || 0}{s.max_attendees ? `/${s.max_attendees}` : ""}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={s.is_active ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                                {s.is_active ? "Ativa" : "Inativa"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" title="Gerenciar check-ins" onClick={() => { setManagingMentoring(s); setMentCheckinDialogOpen(true); }}>
                                  <Users className="h-4 w-4 text-primary" />
                                </Button>
                                {s.session_type === "individual" && (
                                  <Button variant="ghost" size="icon" title="Adicionar participante" onClick={() => { setAssigningSession(s); setAssignDialogOpen(true); }}>
                                    <User className="h-4 w-4 text-primary" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => openEditMent(s)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => { setDeletingMent(s); setMentDeleteOpen(true); }} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══════════════════ WEBINAR DIALOG ═══════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingWebinar ? "Editar Webinar" : "Novo Webinar"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Thumbnail */}
            <div>
              <Label>Thumbnail</Label>
              <div className="mt-1 flex items-center gap-3">
                {form.thumbnail_url ? (
                  <img src={form.thumbnail_url} alt="Miniatura do webinar" className="h-16 w-24 rounded-lg object-cover" />
                ) : (
                  <div className="h-16 w-24 rounded-lg bg-muted flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                )}
                <div className="flex flex-col gap-1">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {uploading ? "Enviando..." : "Upload"}
                  </Button>
                  <span className="text-xs text-muted-foreground">JPG, PNG, WebP • Max 2MB</span>
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleThumbnailUpload} />
              </div>
            </div>
            <div><Label htmlFor="title">Título *</Label><Input id="title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Tendências E-commerce 2026" maxLength={200} /></div>
            <div><Label htmlFor="description">Descrição</Label><Textarea id="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Descrição do webinar..." rows={3} /></div>
            <div><Label htmlFor="partner">Parceiro</Label><Input id="partner" value={form.partner_name} onChange={(e) => setForm((p) => ({ ...p, partner_name: e.target.value }))} placeholder="Ex: Amazon, TikTok Shop" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="scheduled_at">Data e Hora *</Label><Input id="scheduled_at" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))} /></div>
              <div><Label htmlFor="duration">Duração (min)</Label><Input id="duration" type="number" min={15} max={480} value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: parseInt(e.target.value) || 60 }))} /></div>
            </div>
            <div>
              <Label htmlFor="meeting_url">URL da Reunião</Label>
              <Input id="meeting_url" value={form.meeting_url} onChange={(e) => setForm((p) => ({ ...p, meeting_url: e.target.value }))} placeholder="https://meet.google.com/..." className="mt-1" />
            </div>
            <div><Label htmlFor="max_attendees">Máximo de Participantes</Label><Input id="max_attendees" type="number" min={1} value={form.max_attendees} onChange={(e) => setForm((p) => ({ ...p, max_attendees: e.target.value }))} placeholder="Deixe vazio para sem limite" /></div>
            {/* Presenter */}
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
            <div className="flex items-center gap-2">
              <Checkbox id="is_active" checked={form.is_active} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked === true }))} />
              <Label htmlFor="is_active">Webinar Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingWebinar ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webinar Delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Webinar</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir &quot;{deletingWebinar?.title}&quot;? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingWebinar && deleteMutation.mutate(deletingWebinar)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════ MENTORING DIALOG ═══════════════════ */}
      <Dialog open={mentDialogOpen} onOpenChange={setMentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingMent ? "Editar Mentoria" : "Nova Mentoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
            <div><Label>Título *</Label><Input value={mentForm.title} onChange={(e) => setMentForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Mentoria Semanal" /></div>
            <div><Label>Descrição</Label><Textarea value={mentForm.description} onChange={(e) => setMentForm((p) => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <MentorSearch
              mentorId={mentForm.mentor_id}
              mentorName={mentForm.mentor_name}
              mentorEmail={mentForm.mentor_email}
              onSelect={(mentor) => {
                setMentForm((p) => ({
                  ...p,
                  mentor_id: mentor.id,
                  mentor_name: mentor.name,
                  mentor_email: mentor.email || "",
                }));
              }}
              onClear={() => setMentForm((p) => ({ ...p, mentor_id: null, mentor_name: "", mentor_email: "" }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data e Hora *</Label><Input type="datetime-local" value={mentForm.scheduled_at} onChange={(e) => setMentForm((p) => ({ ...p, scheduled_at: e.target.value }))} /></div>
              <div><Label>Duração (min)</Label><Input type="number" min={15} max={480} value={mentForm.duration_minutes} onChange={(e) => setMentForm((p) => ({ ...p, duration_minutes: parseInt(e.target.value) || 60 }))} /></div>
            </div>
            <div>
              <Label>URL da Reunião</Label>
              <Input value={mentForm.meeting_url} onChange={(e) => setMentForm((p) => ({ ...p, meeting_url: e.target.value }))} placeholder="https://meet.google.com/..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Sessão</Label>
                <Select value={mentForm.session_type} onValueChange={(v) => setMentForm((p) => ({ ...p, session_type: v, max_attendees: v === "individual" ? "1" : p.max_attendees }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Em Grupo</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Máx. Participantes</Label>
                <Input type="number" min={1} value={mentForm.max_attendees} onChange={(e) => setMentForm((p) => ({ ...p, max_attendees: e.target.value }))} placeholder="Sem limite" disabled={mentForm.session_type === "individual"} />
                {mentForm.session_type === "individual" && <p className="text-xs text-muted-foreground mt-1">Individual é sempre limitado a 1 participante</p>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              O mentor ({mentForm.mentor_email || "não definido"}) será adicionado automaticamente como co-host no Google Meet.
            </p>
            <div className="flex items-center gap-2">
              <Checkbox id="ment_active" checked={mentForm.is_active} onCheckedChange={(checked) => setMentForm((p) => ({ ...p, is_active: checked === true }))} />
              <Label htmlFor="ment_active">Mentoria Ativa</Label>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setMentDialogOpen(false)}>Cancelar</Button>
            {editingMent && mentForm.mentor_id && (
              <Button
                variant="secondary"
                onClick={() => handleMentSubmit(true)}
                disabled={saveMentMutation.isPending}
                className="gap-2"
              >
                {saveMentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Aplicar mentor a todas as sessões
              </Button>
            )}
            <Button onClick={() => handleMentSubmit(false)} disabled={saveMentMutation.isPending} className="gap-2">
              {saveMentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingMent ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mentoring Delete */}
      <AlertDialog open={mentDeleteOpen} onOpenChange={setMentDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mentoria</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir &quot;{deletingMent?.title}&quot;? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingMent && deleteMentMutation.mutate(deletingMent)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMentMutation.isPending}>
              {deleteMentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════ MENTORING CHECKIN MANAGEMENT DIALOG ═══════════════════ */}
      <Dialog open={mentCheckinDialogOpen} onOpenChange={(open) => { setMentCheckinDialogOpen(open); if (!open) setManagingMentoring(null); }}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Check-ins: {managingMentoring?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            {mentCheckinsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : mentCheckinsList.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum check-in realizado</p>
            ) : (
              <div className="space-y-2">
                {mentCheckinsList.map((checkin) => (
                  <div key={checkin.id} className="flex items-center gap-3 p-2 rounded-md border border-border/50 bg-muted/30">
                    {checkin.profile.avatar_url ? (
                      <img src={checkin.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{checkin.profile.name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(checkin.checked_in_at), "dd/MMM HH:mm", { locale: ptBR })}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive flex-shrink-0"
                      onClick={() => adminRemoveMentCheckinMutation.mutate({ checkinId: checkin.id })}
                      disabled={adminRemoveMentCheckinMutation.isPending}
                      title="Remover check-in"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMentCheckinDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ WEBINAR CHECKIN MANAGEMENT DIALOG ═══════════════════ */}
      <Dialog open={checkinDialogOpen} onOpenChange={(open) => { setCheckinDialogOpen(open); if (!open) setManagingWebinar(null); }}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Check-ins: {managingWebinar?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            {checkinsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : webinarCheckins.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum check-in realizado</p>
            ) : (
              <div className="space-y-2">
                {webinarCheckins.map((checkin) => (
                  <div key={checkin.id} className="flex items-center gap-3 p-2 rounded-md border border-border/50 bg-muted/30">
                    {checkin.profile.avatar_url ? (
                      <img src={checkin.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{checkin.profile.name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(checkin.checked_in_at), "dd/MMM HH:mm", { locale: ptBR })}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive flex-shrink-0"
                      onClick={() => adminRemoveCheckinMutation.mutate({ checkinId: checkin.id })}
                      disabled={adminRemoveCheckinMutation.isPending}
                      title="Remover check-in"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckinDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ ASSIGN PARTICIPANT DIALOG ═══════════════════ */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => { setAssignDialogOpen(open); if (!open) { setAssignSearch(""); setAssignResults([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Participante</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Busque o perfil do membro para fazer check-in na mentoria individual &quot;{assigningSession?.title}&quot;.</p>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={assignSearch}
              onChange={(e) => handleAssignSearch(e.target.value)}
              placeholder="Digite o nome do membro..."
              className="pl-9"
            />
          </div>
          {assignSearching && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {assignResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-1">
              {assignResults.map((profile) => (
                <button
                  key={profile.user_id}
                  type="button"
                  className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted rounded-md transition-colors"
                  onClick={() => {
                    if (assigningSession) {
                      assignCheckinMutation.mutate({ sessionId: assigningSession.id, userId: profile.user_id });
                    }
                  }}
                  disabled={assignCheckinMutation.isPending}
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm font-medium truncate">{profile.name}</span>
                </button>
              ))}
            </div>
          )}
          {assignSearch.length >= 2 && !assignSearching && assignResults.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhum perfil encontrado</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
}
