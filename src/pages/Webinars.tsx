import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Video,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Loader2,
  Star,
  PlayCircle,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { isFuture, isPast, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WebinarCard } from "@/components/webinars/WebinarCard";
import { WebinarFakeNotifications } from "@/components/webinars/WebinarFakeNotifications";
import { useWebinarScarcity } from "@/hooks/useWebinarScarcity";
import { GoogleCalendarEvent } from "@/hooks/useGoogleCalendarEvents";
import { useRecordedTrackItems } from "@/hooks/useRecordedTrackItems";
import { RecordedItemCard } from "@/components/recordings/RecordedItemCard";
import { RecordedVideoDialog } from "@/components/recordings/RecordedVideoDialog";

interface Webinar {
  id: string;
  title: string;
  description: string | null;
  partner_name: string | null;
  scheduled_at: string;
  created_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  max_attendees: number | null;
  is_active: boolean;
  thumbnail_url?: string | null;
  presenter_name?: string | null;
  presenter_bio?: string | null;
  presenter_avatar?: string | null;
}

interface WebinarCheckin {
  id: string;
  webinar_id: string;
  user_id: string;
  checked_in_at: string;
}

export default function Webinars() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const { data: scarcityConfigs = {} } = useWebinarScarcity();
  // Google Calendar integration removed; kept as an empty list so the
  // day-modal/dot-marking code below still works untouched.
  const calendarEvents: GoogleCalendarEvent[] = [];
  const { data: recordedWebinars = [] } = useRecordedTrackItems(["webinars"]);
  const [playingItem, setPlayingItem] = useState<{ id: string; title: string; cloudflare_video_uid: string } | null>(null);

  // Map published recordings by date (from title dd/mm/yyyy or created_at)
  const recordingByDate = useMemo(() => {
    const map: Record<string, { id: string; title: string; cloudflare_video_uid: string }> = {};
    recordedWebinars.forEach((item) => {
      if (!item.cloudflare_video_uid) return;
      const m = item.title.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const key = m ? `${m[3]}-${m[2]}-${m[1]}` : format(new Date(item.created_at), "yyyy-MM-dd");
      if (!map[key]) {
        map[key] = { id: item.id, title: item.title, cloudflare_video_uid: item.cloudflare_video_uid };
      }
    });
    return map;
  }, [recordedWebinars]);

  const recordingForWebinar = (scheduledAt: string) =>
    recordingByDate[format(new Date(scheduledAt), "yyyy-MM-dd")] || null;
  // Check if any webinar has notifications enabled
  const showNotifications = Object.values(scarcityConfigs).some(
    (c) => c.is_active && c.show_notifications
  );


  // Fetch webinars
  const { data: webinars = [], isLoading } = useQuery({
    queryKey: ["webinars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webinars")
        .select("*")
        .eq("is_active", true)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as Webinar[];
    },
  });

  // Fetch user's checkins
  const { data: checkins = [] } = useQuery({
    queryKey: ["webinar-checkins", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("webinar_checkins")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as WebinarCheckin[];
    },
    enabled: !!user,
  });

  // Fetch all checkin counts per webinar
  const { data: checkinCounts = {} } = useQuery({
    queryKey: ["webinar-checkin-counts"],
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

  // Fetch all mentors
  const { data: mentorsData = [] } = useQuery({
    queryKey: ["all-mentors-webinars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors_public")
        .select("*")
        .eq("is_listed", true);
      if (error) throw error;
      return data as { id: string; name: string; avatar_url: string | null; bio: string | null; specialty: string | null }[];
    },
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // Check-in mutation using RPC
  const checkinMutation = useMutation({
    mutationFn: async (webinarId: string) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("webinar_checkin", {
        _webinar_id: webinarId,
        _user_id: user.id,
      });

      if (error) throw error;
      const result = data as Record<string, unknown>;
      if (!result.success) throw new Error(result.error as string);

      return result;
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["webinars"] });
      queryClient.invalidateQueries({ queryKey: ["webinar-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["webinar-checkin-counts"] });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#BFFF00", "#9ACD32"],
      });

      // Send checkin confirmation email (the queued reminder row is already
      // marked as sent by the RPC, so the cron won't send a second copy)
      supabase.functions.invoke("send-webinar-email", {
        body: {
          to: user?.email as string,
          user_name: result.user_name as string,
          webinar_title: result.webinar_title as string,
          scheduled_at: result.scheduled_at as string,
          meeting_url: (result.meeting_url as string) || "",
          type: "checkin",
        },
      });

      toast({
        title: "Check-in realizado! ✅",
        description: "Email de confirmação enviado.",
      });

      if (result.spots_remaining !== null && result.spots_remaining !== undefined) {
        toast({
          title: `📋 Restam ${result.spots_remaining} vagas`,
        });
      }
    },
    onError: (error: Error) => {
      if (error.message.includes("lotado")) {
        toast({
          title: "🚫 Webinar lotado!",
          description: "Todas as vagas foram preenchidas.",
          variant: "destructive",
        });
      } else if (error.message.includes("já fez check-in")) {
        toast({
          title: "Você já fez check-in neste webinar.",
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

  // Cancel check-in mutation
  const cancelCheckinMutation = useMutation({
    mutationFn: async (webinarId: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("webinar_checkins")
        .delete()
        .eq("webinar_id", webinarId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webinars"] });
      queryClient.invalidateQueries({ queryKey: ["webinar-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["webinar-checkin-counts"] });
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
  const handleAccessWebinar = (webinar: Webinar) => {
    if (webinar.meeting_url) {
      window.open(webinar.meeting_url, "_blank");
    } else {
      toast({
        title: "Link do webinar ainda não disponível",
        variant: "destructive",
      });
    }
  };

  const isCheckedIn = (webinarId: string) =>
    checkins.some((c) => c.webinar_id === webinarId);

  const upcomingWebinars = webinars.filter((w) =>
    isFuture(new Date(w.scheduled_at))
  );
  const pastWebinars = webinars.filter((w) =>
    isPast(new Date(w.scheduled_at))
  );
  const myWebinars = webinars.filter((w) => isCheckedIn(w.id));

  const webinarDates = webinars.map((w) =>
    new Date(w.scheduled_at).toDateString()
  );

  const calendarEventDates = calendarEvents
    .filter((e: GoogleCalendarEvent) => e.start)
    .map((e: GoogleCalendarEvent) => new Date(e.start!).toDateString());

  // Events for the selected date
  const selectedDateStr = selectedDate?.toDateString();
  const eventsOnSelectedDate = calendarEvents.filter(
    (e: GoogleCalendarEvent) => e.start && new Date(e.start).toDateString() === selectedDateStr
  );

  // Webinars do dia selecionado (pop-up igual ao das mentorias)
  const selectedDateWebinars = useMemo(
    () =>
      selectedDateStr
        ? webinars.filter((w) => new Date(w.scheduled_at).toDateString() === selectedDateStr)
        : [],
    [selectedDateStr, webinars]
  );

  const handleSelectDate = (date: Date | undefined) => {
    setSelectedDate(date);
    if (!date) return;
    const key = date.toDateString();
    if (webinars.some((w) => new Date(w.scheduled_at).toDateString() === key)) {
      setDayModalOpen(true);
    }
  };


  const renderWebinarList = (list: Webinar[], emptyIcon: React.ReactNode, emptyTitle: string, emptyDescription: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <Card className="card-glow">
          <CardContent className="py-12 text-center">
            {emptyIcon}
            <p className="text-lg font-medium">{emptyTitle}</p>
            <p className="text-muted-foreground">{emptyDescription}</p>
          </CardContent>
        </Card>
      );
    }
    return list.map((webinar) => (
      <WebinarCard
        key={webinar.id}
        webinar={webinar}
        isCheckedIn={isCheckedIn(webinar.id)}
        currentCheckins={checkinCounts[webinar.id] || 0}
        onCheckin={(id) => checkinMutation.mutate(id)}
        onCancelCheckin={(id) => cancelCheckinMutation.mutate(id)}
        onAccessWebinar={handleAccessWebinar}
        isCheckinPending={checkinMutation.isPending}
        isCancelPending={cancelCheckinMutation.isPending}
        scarcityConfig={scarcityConfigs[webinar.id]}
        recording={recordingForWebinar(webinar.scheduled_at)}
        onWatchRecording={(rec) => setPlayingItem(rec)}
      />
    ));
  };

  return (
    <MainLayout>
      <SEOHead
        title="Webinars"
        description="Confira a agenda mensal de webinars do MAP Acelera, faça check-in e acompanhe gravações dos encontros ao vivo."
        canonical="/webinars"
        noIndex
      />
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Video className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">Webinars</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Participe de webinars exclusivos com nossos parceiros
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
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
                  hasWebinar: (date) =>
                    webinarDates.includes(date.toDateString()),
                  hasCalendarEvent: (date) =>
                    calendarEventDates.includes(date.toDateString()),
                }}
                modifiersClassNames={{
                  hasWebinar: "bg-primary/20 text-primary font-semibold",
                  hasCalendarEvent: "ring-2 ring-blue-400/50 ring-inset",
                }}
              />
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-3 w-3 rounded-full bg-primary/50" />
                  Dias com webinars agendados
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-3 w-3 rounded-full ring-2 ring-blue-400/50 bg-transparent" />
                  Eventos do Google Calendar
                </div>
              </div>

              {/* Events on selected date */}
              {eventsOnSelectedDate.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">
                    Eventos em {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}:
                  </p>
                  {eventsOnSelectedDate.map((event: GoogleCalendarEvent) => (
                    <div
                      key={event.id}
                      className="p-2.5 rounded-md bg-muted/50 border border-border/50 text-sm"
                    >
                      <p className="font-medium">{event.title}</p>
                      {event.start && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(event.start), "HH:mm")}
                          {event.end && ` - ${format(new Date(event.end), "HH:mm")}`}
                        </p>
                      )}
                      {event.htmlLink && (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-1 inline-block"
                        >
                          Ver no Google Calendar
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue="upcoming" className="space-y-4">
              <TabsList className="bg-muted/50 flex-wrap h-auto">
                <TabsTrigger value="upcoming" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <Video className="h-4 w-4" />
                  Próximos
                  {upcomingWebinars.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {upcomingWebinars.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="my" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Meus Check-ins
                  {myWebinars.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {myWebinars.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="gravadas" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <PlayCircle className="h-4 w-4" />
                  Gravadas
                  {recordedWebinars.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {recordedWebinars.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                {renderWebinarList(
                  upcomingWebinars,
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />,
                  "Nenhum webinar agendado",
                  "Novos webinars serão anunciados em breve"
                )}
              </TabsContent>

              <TabsContent value="my" className="space-y-4">
                {renderWebinarList(
                  myWebinars,
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />,
                  "Nenhum check-in realizado",
                  "Faça check-in em um webinar para vê-lo aqui"
                )}
              </TabsContent>

              <TabsContent value="gravadas" className="space-y-4">
                {recordedWebinars.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <PlayCircle className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">Nenhum webinar gravado</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Em breve disponibilizaremos as gravações dos webinars aqui.
                    </p>
                  </div>
                ) : (
                  recordedWebinars.map((item) => (
                    <RecordedItemCard key={item.id} item={item} onPlay={setPlayingItem} />
                  ))
                )}
              </TabsContent>

            </Tabs>

          </div>
        </div>

        {/* Nossos Mentores Section */}
        {mentorsData.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Nossos Mentores
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {mentorsData.map((m) => (
                <Card key={m.id} className="card-glow border-border/50">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                      <Avatar className="h-24 w-24 border-2 border-primary/20">
                        <AvatarImage src={m.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                          {getInitials(m.name)}
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
            </div>
          </div>
        )}
      </div>
      {showNotifications && <WebinarFakeNotifications />}

      {/* Pop-up com o(s) card(s) de webinar do dia clicado no calendário */}
      <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
        <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : "Webinar"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDateWebinars.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum webinar neste dia.
              </p>
            ) : (
              selectedDateWebinars.map((webinar) => (
                <WebinarCard
                  key={webinar.id}
                  webinar={webinar}
                  isCheckedIn={isCheckedIn(webinar.id)}
                  currentCheckins={checkinCounts[webinar.id] || 0}
                  onCheckin={(id) => checkinMutation.mutate(id)}
                  onCancelCheckin={(id) => cancelCheckinMutation.mutate(id)}
                  onAccessWebinar={handleAccessWebinar}
                  isCheckinPending={checkinMutation.isPending}
                  isCancelPending={cancelCheckinMutation.isPending}
                  scarcityConfig={scarcityConfigs[webinar.id]}
                  recording={recordingForWebinar(webinar.scheduled_at)}
                  onWatchRecording={(rec) => setPlayingItem(rec)}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RecordedVideoDialog item={playingItem} onClose={() => setPlayingItem(null)} />
    </MainLayout>

  );
}
