import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Star, Video, CheckCircle2, Loader2, Users, User, CalendarPlus, PlayCircle, Play, Maximize2, Minimize2, X, Download } from "lucide-react";
import { MeetingCountdown } from "@/components/countdown/MeetingCountdown";
import { fetchMentoringMeetingUrl } from "@/lib/mentoring";
import { generateGoogleCalendarUrl, useGoogleCalendarEvents } from "@/hooks/useGoogleCalendarEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEOHead } from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { format, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ImageConsentModal } from "@/components/mentorias/ImageConsentModal";
import { CloudflareStreamPlayer } from "@/components/video/CloudflareStreamPlayer";
import { useRecordedTrackItems } from "@/hooks/useRecordedTrackItems";
import { RecordedItemCard } from "@/components/recordings/RecordedItemCard";




interface Mentor {
  id: string;
  name: string;
  bio: string | null;
  specialty: string | null;
  avatar_url: string | null;
  email?: string | null;
}

interface MentoringSession {
  id: string;
  mentor_id: string | null;
  mentor_name: string;
  mentor_email: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  session_type: string;
  max_attendees: number | null;
  is_active: boolean;
  mentor?: Mentor;
}

interface MentoringCheckin {
  id: string;
  session_id: string;
  user_id: string;
  checked_in_at: string;
}

export default function Mentorias() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { hasRole } = useRole();
  const isEnterprise = hasRole(['enterprise', 'admin', 'admin_geral']);
  const isAdmin = hasRole(['admin', 'admin_geral']);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [pendingCheckinSession, setPendingCheckinSession] = useState<MentoringSession | null>(null);

  const [playingItem, setPlayingItem] = useState<{ id: string; title: string; cloudflare_video_uid: string } | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);

  // Recorded mentorias (from the "Mentorias" content_track)
  const { data: recordedMentorias = [] } = useRecordedTrackItems(["mentorias"]);


  // Fetch "mentorias quinzenais" events from Google Calendar to get Meet links
  const { data: calendarEvents = [] } = useGoogleCalendarEvents("mentorias quinzenais");


  // Fetch mentoring sessions from database
  const { data: rawSessions = [], isLoading } = useQuery({
    queryKey: ["mentoring-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentoring_sessions_public" as any)
        .select("*")
        .eq("is_active", true)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data as unknown) as MentoringSession[];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Usa o meeting_url direto do banco (mesma fonte usada no dashboard),
  // para garantir consistência entre "Adicionar ao Calendário" e o link do Meet.
  const sessions = rawSessions;


  // Fetch all mentors
  const { data: mentorsMap = {} } = useQuery({
    queryKey: ["all-mentors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors_public")
        .select("*")
        .eq("is_listed", true);
      if (error) throw error;
      const map: Record<string, Mentor> = {};
      (data as Mentor[]).forEach((m) => { map[m.id] = m; });
      return map;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  // All mentors list for the section
  const allMentors = useMemo(() => Object.values(mentorsMap), [mentorsMap]);

  // Helper to get mentor for a session
  const getMentorForSession = (session: MentoringSession): Mentor | null => {
    if (session.mentor_id && mentorsMap[session.mentor_id]) {
      return mentorsMap[session.mentor_id];
    }
    return null;
  };

  // Fetch user's checkins
  const { data: checkins = [] } = useQuery({
    queryKey: ["mentoring-checkins", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("mentoring_checkins")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as MentoringCheckin[];
    },
    enabled: !!user,
  });

  // Fetch checkin counts per session
  const { data: checkinCounts = {} } = useQuery({
    queryKey: ["mentoring-checkin-counts"],
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

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("mentoring_checkin", {
        _session_id: sessionId,
        _user_id: user.id,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        error?: string;
        
        user_name?: string;
        session_title?: string;
        scheduled_at?: string;
        meeting_url?: string;
      };
      if (!result.success) {
        throw new Error(result.error || "Erro ao fazer check-in");
      }
      return result;
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["mentoring-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["mentoring-checkin-counts"] });
      queryClient.invalidateQueries({ queryKey: ["nextMentoring"] });
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#BFFF00", "#9ACD32"],
      });

      // Send instant check-in confirmation email
      if (user?.email && result?.session_title && result?.scheduled_at) {
        try {
          await supabase.functions.invoke("send-webinar-email", {
            body: {
              to: user.email,
              user_name: result.user_name || "Membro MAP",
              webinar_title: result.session_title,
              scheduled_at: result.scheduled_at,
              duration_minutes: 60,
              meeting_url: result.meeting_url || "",
              type: "checkin_confirmation",
              event_type: "mentoring",
            },
          });
          // Mark the queued checkin_confirmation reminder as sent to avoid duplicate from cron
          await supabase
            .from("mentoring_email_reminders")
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq("user_id", user!.id)
            .eq("reminder_type", "checkin_confirmation")
            .eq("sent", false);
        } catch (e) {
          console.error("Failed to send instant checkin email", e);
        }
      }

      toast({
        title: "Check-in realizado! ✅",
        description: "Email de confirmação enviado. Agora você pode acessar a mentoria.",
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("lotada") || error.message.includes("vagas")) {
        toast({
          title: "🚫 Sala lotada!",
          description: "Todas as vagas desta mentoria foram preenchidas.",
          variant: "destructive",
        });
      } else if (error.message.includes("já fez check-in")) {
        toast({
          title: "Você já fez check-in nesta mentoria.",
          description: "Confira seus check-ins na aba correspondente.",
        });
      } else {
        toast({
          title: "Erro no check-in",
          description: error.message || "Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    },
  });

  // Open consent modal before check-in
  const handleCheckinClick = useCallback((session: MentoringSession) => {
    setPendingCheckinSession(session);
    setConsentModalOpen(true);
  }, []);

  // After consent accepted, save consent and do check-in
  const handleConsentAccepted = useCallback(async () => {
    if (!pendingCheckinSession || !user) return;
    try {
      await supabase.from("image_consent").insert({
        user_id: user.id,
        session_id: pendingCheckinSession.id,
        user_agent: navigator.userAgent,
        consent_version: "1.0",
      });
    } catch (e) {
      // consent already exists or minor error — proceed anyway
    }
    setConsentModalOpen(false);
    checkinMutation.mutate(pendingCheckinSession.id);
    setPendingCheckinSession(null);
  }, [pendingCheckinSession, user, checkinMutation]);


  const cancelCheckinMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user) throw new Error("User not authenticated");
      const { error } = await supabase
        .from("mentoring_checkins")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentoring-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["mentoring-checkin-counts"] });
      queryClient.invalidateQueries({ queryKey: ["nextMentoring"] });
      toast({
        title: "Check-in cancelado",
        description: "Sua inscrição foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao cancelar check-in",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const isCheckedIn = (sessionId: string) => {
    return checkins.some((c) => c.session_id === sessionId);
  };

  const [sessionTypeTab, setSessionTypeTab] = useState<string>("group");

  // Filter by session type
  const filteredSessions = sessions.filter((s) =>
    sessionTypeTab === "group" ? s.session_type === "group" : s.session_type === "individual"
  );

  // Get dates with sessions for calendar highlighting
  const sessionDates = filteredSessions.map((s) => new Date(s.scheduled_at).toDateString());

  const upcomingSessions = filteredSessions.filter((s) => isFuture(new Date(s.scheduled_at)));
  const mySessions = filteredSessions.filter((s) => isCheckedIn(s.id));

  // Modal que mostra o(s) card(s) de mentoria ao clicar num dia do calendário
  const [dayModalOpen, setDayModalOpen] = useState(false);

  const selectedDateSessions = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.toDateString();
    return filteredSessions.filter((s) => new Date(s.scheduled_at).toDateString() === key);
  }, [selectedDate, filteredSessions]);

  const handleSelectDate = useCallback(
    (date: Date | undefined) => {
      setSelectedDate(date);
      if (!date) return;
      const key = date.toDateString();
      const hasSession = filteredSessions.some(
        (s) => new Date(s.scheduled_at).toDateString() === key
      );
      if (hasSession) setDayModalOpen(true);
    },
    [filteredSessions]
  );

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Map recorded mentorias by date (title contains dd/mm/yyyy) to link past sessions to their recording
  const recordingByDate = useMemo(() => {
    const map: Record<string, typeof recordedMentorias[number]> = {};
    recordedMentorias.forEach((item) => {
      if (!item.cloudflare_video_uid) return;
      const m = item.title.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const key = m ? `${m[3]}-${m[2]}-${m[1]}` : format(new Date(item.created_at), "yyyy-MM-dd");
      if (!map[key]) map[key] = item;
    });
    return map;
  }, [recordedMentorias]);

  const recordingForSession = useCallback(
    (session: MentoringSession) => recordingByDate[format(new Date(session.scheduled_at), "yyyy-MM-dd")] || null,
    [recordingByDate]
  );


  // Fullscreen toggle for the recorded mentoring video dialog
  const toggleVideoFullscreen = useCallback(async () => {
    const el = videoContainerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen error:", e);
    }
  }, []);

  // Sync fullscreen button icon with ESC / browser fullscreen changes
  useEffect(() => {
    const handleChange = () => setIsVideoFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const SessionCard = ({ session }: { session: MentoringSession }) => {
    const checkedIn = isCheckedIn(session.id);
    const isUpcoming = isFuture(new Date(session.scheduled_at));
    const currentCount = checkinCounts[session.id] || 0;
    const isFull = session.max_attendees !== null && currentCount >= session.max_attendees;

    const sessionMentor = getMentorForSession(session);
    const mentorName = sessionMentor?.name || session.mentor_name;
    const mentorAvatar = sessionMentor?.avatar_url || undefined;

    // Check if logged-in user is the mentor → always unlock the Meet link
    const isMentor = user?.email && (
      user.email === session.mentor_email ||
      (sessionMentor?.email && user.email === sessionMentor.email)
    );

    return (
      <Card className="card-glow border-border/50 hover:border-primary/50 transition-all overflow-hidden">
        <div className="flex flex-row min-h-[13rem]">
          {/* Left: full-height rectangular image */}
          {mentorAvatar ? (
            <img
              src={mentorAvatar}
              alt={mentorName}
              className="flex-shrink-0 w-40 sm:w-48 object-cover self-stretch"
              loading="lazy"
            />
          ) : null}

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="px-4 pt-4 flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className={
                  session.session_type === "group"
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"
                    : "bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs"
                }
              >
                {session.session_type === "group" ? "Grupo" : "Individual"}
              </Badge>
            </div>

            {/* Content */}
            <CardContent className="p-4 sm:p-5 flex-1 min-w-0 flex flex-col justify-between overflow-hidden">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg truncate">Mentoria Semanal - Comunidade MAP</h3>
                    <p className="text-sm text-muted-foreground">com {mentorName}</p>
                  </div>
                  {session.max_attendees !== null && (
                    <Badge
                      variant="outline"
                      className={`text-xs flex-shrink-0 ${
                        isFull
                          ? "bg-red-500/20 text-red-500 border-red-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      {isFull ? "LOTADO" : `${currentCount}/${session.max_attendees}`}
                    </Badge>
                  )}
                </div>

                {sessionMentor?.bio && !checkedIn && (
                  <p className="mt-1.5 text-xs text-muted-foreground/70 line-clamp-2">{sessionMentor.bio}</p>
                )}


              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary/70" />
                  {format(new Date(session.scheduled_at), "dd 'de' MMMM", { locale: ptBR })}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary/70" />
                  {format(new Date(session.scheduled_at), "HH:mm")} • {session.duration_minutes}min
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {checkedIn && (
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Check-in Realizado
                </Badge>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                {isUpcoming ? (
                  checkedIn ? (
                    <>
                      <MeetingCountdown
                        scheduledAt={session.scheduled_at}
                        meetingUrl={null}
                        fetchMeetingUrl={() => fetchMentoringMeetingUrl(session.id)}
                        alwaysUnlocked={!!isMentor}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8 text-xs"
                        asChild
                      >
                        <a
                          href={generateGoogleCalendarUrl(
                            "Mentoria Semanal - Comunidade MAP",
                            session.scheduled_at,
                            session.duration_minutes,
                            `com ${mentorName} — acesse a sala em ${window.location.origin}/mentorias`,
                            `${window.location.origin}/mentorias`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <CalendarPlus className="h-3 w-3" />
                          Adicionar ao Calendário
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => cancelCheckinMutation.mutate(session.id)}
                        disabled={cancelCheckinMutation.isPending}
                      >
                        {cancelCheckinMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : null}
                        Cancelar Check-in
                      </Button>
                    </>
                  ) : isFull ? (
                    <Button disabled variant="outline" size="sm" className="gap-2">
                      <Users className="h-4 w-4" />
                      Lotado
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleCheckinClick(session)}
                      disabled={checkinMutation.isPending}
                      className="rounded-full gap-2"
                    >
                      {checkinMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Fazer Check-in
                    </Button>
                  )
                ) : recordingForSession(session) ? (
                  <Button
                    size="sm"
                    className="rounded-full gap-2"
                    onClick={() => {
                      const rec = recordingForSession(session)!;
                      setPlayingItem({ id: rec.id, title: rec.title, cloudflare_video_uid: rec.cloudflare_video_uid! });
                    }}
                  >
                    <PlayCircle className="h-4 w-4" />
                    Assistir gravação
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground gap-1">
                    <Clock className="h-3 w-3" />
                    Gravação em breve
                  </Badge>
                )}

              </div>
            </div>
          </CardContent>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <MainLayout>
      <SEOHead
        title="Mentorias"
        description="Agende e participe das mentorias semanais do MAP Acelera com especialistas em e-commerce e marketplaces."
        canonical="/mentorias"
        noIndex
      />
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Mentorias</h1>
          <p className="text-muted-foreground">
            Participe de mentorias ao vivo e tire suas dúvidas com nossos mentores.
          </p>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <CalendarIcon className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold text-primary">Mentorias Semanais</p>
                <p className="text-sm text-muted-foreground">
                  Toda quinta-feira, das 19h às 20h, via Google Meet
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Type Header */}
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5 text-primary" />
          Mentorias em Grupo
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Calendar */}
          <Card className="border-border/50 bg-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Calendário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleSelectDate}
                className="rounded-md pointer-events-auto"
                modifiers={{
                  hasSession: (date) => sessionDates.includes(date.toDateString()),
                }}
                modifiersClassNames={{
                  hasSession: "bg-primary/20 text-primary font-semibold",
                }}
              />
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-3 w-3 rounded-full bg-primary/50" />
                Dias com sessões agendadas
              </div>
            </CardContent>
          </Card>

          {/* Sessions */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="upcoming" className="space-y-4">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="upcoming" className="gap-2">
                  <Video className="h-4 w-4" />
                  Próximas
                  {upcomingSessions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {upcomingSessions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="checkins" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Meus Check-ins
                  {mySessions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {mySessions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="gravadas" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Gravadas
                  {recordedMentorias.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {recordedMentorias.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : upcomingSessions.length === 0 ? (
                  <Card className="card-glow">
                    <CardContent className="py-12 text-center">
                      <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Nenhuma mentoria agendada</p>
                      <p className="text-muted-foreground">
                        Novas mentorias serão agendadas em breve
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="checkins" className="space-y-4">
                {mySessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">Nenhum check-in ainda</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Faça check-in em uma mentoria para vê-la aqui.
                    </p>
                  </div>
                ) : (
                  mySessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="gravadas" className="space-y-4">
                {recordedMentorias.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <PlayCircle className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">Nenhuma mentoria gravada</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Em breve disponibilizaremos as gravações das mentorias aqui.
                    </p>
                  </div>
                ) : (
                  recordedMentorias.map((item) => (
                    <RecordedItemCard key={item.id} item={item} onPlay={setPlayingItem} />
                  ))
                )}

              </TabsContent>
            </Tabs>
          </div>
        </div>


        {/* Mentor Section */}
        {allMentors.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              {allMentors.length === 1 ? "Nosso Mentor" : "Nossos Mentores"}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {allMentors.map((m) => (
                <Card key={m.id} className="card-glow border-border/50">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center md:items-start">
                      <Avatar className="h-20 w-20 rounded-md flex-shrink-0">
                        {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.name} className="object-cover" />}
                        <AvatarFallback className="rounded-md text-lg">
                          {m.name?.charAt(0) || "M"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-semibold">{m.name}</h3>
                        {m.specialty && (
                          <Badge variant="outline" className="mt-1 bg-primary/10 text-primary border-primary/30">
                            {m.specialty}
                          </Badge>
                        )}
                        {m.bio && (
                          <p className="mt-3 text-muted-foreground">{m.bio}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="card-glow border-border/50">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4">Como Funciona</h4>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Mentorias em grupo toda <strong className="text-foreground">quinta-feira</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Horário: <strong className="text-foreground">19h às 20h</strong> (horário de Brasília)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Faça check-in para liberar o <strong className="text-foreground">link do Google Meet</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Tire suas dúvidas ao vivo com o mentor</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <ImageConsentModal
        open={consentModalOpen}
        onAccept={handleConsentAccepted}
        onCancel={() => {
          setConsentModalOpen(false);
          setPendingCheckinSession(null);
        }}
        isLoading={checkinMutation.isPending}
        sessionTitle={pendingCheckinSession?.title}
      />

      {/* Pop-up com o(s) card(s) de mentoria do dia clicado no calendário */}
      <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
        <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : "Mentoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDateSessions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma mentoria neste dia.
              </p>
            ) : (
              selectedDateSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!playingItem} onOpenChange={(open) => !open && setPlayingItem(null)}>
        <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] p-0 overflow-hidden flex flex-col max-h-[90vh] [&>button.absolute]:hidden">
          <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-base sm:text-lg leading-tight pr-2 line-clamp-1">
                {playingItem?.title}
              </DialogTitle>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVideoFullscreen}
                  aria-label={isVideoFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                  className="shrink-0 h-8 w-8"
                >
                  {isVideoFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Fechar"
                    className="shrink-0 h-8 w-8"
                    onClick={() => setPlayingItem(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>
          {playingItem && (
            <div ref={videoContainerRef} className="w-full bg-black flex-1 min-h-0 overflow-hidden">
              <CloudflareStreamPlayer videoUid={playingItem.cloudflare_video_uid} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
