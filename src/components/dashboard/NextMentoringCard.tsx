import { useState, useEffect } from "react";
import { Video, Clock, CalendarPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useMentoringCheckin } from "@/hooks/useDashboardData";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MeetingCountdown } from "@/components/countdown/MeetingCountdown";
import { fetchMentoringMeetingUrl } from "@/lib/mentoring";
import { generateGoogleCalendarUrl } from "@/hooks/useGoogleCalendarEvents";
import confetti from "canvas-confetti";


interface MentoringSession {
  id: string;
  title: string;
  mentor_name: string;
  mentor_id?: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  hasCheckedIn?: boolean;
}

interface NextMentoringCardProps {
  mentoring: MentoringSession;
}

export function NextMentoringCard({ mentoring }: NextMentoringCardProps) {
  const { toast } = useToast();
  const { checkin } = useMentoringCheckin();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Fetch mentor data
  const { data: mentor } = useQuery({
    queryKey: ["mentor", mentoring.mentor_id],
    queryFn: async () => {
      if (!mentoring.mentor_id) return null;
      const { data, error } = await supabase
        .from("mentors_public")
        .select("*")
        .eq("id", mentoring.mentor_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!mentoring.mentor_id,
  });

  // Countdown timer
  useEffect(() => {
    const calculateCountdown = () => {
      const mentoringDate = new Date(mentoring.scheduled_at);
      const now = new Date();
      const diff = mentoringDate.getTime() - now.getTime();

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown({ days, hours, minutes, seconds });
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [mentoring.scheduled_at]);

  const handleCheckin = async () => {
    setIsCheckingIn(true);
    try {
      await checkin(mentoring.id);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#BFFF00', '#9ACD32'],
      });
      toast({
        title: "Check-in realizado! ✅",
        description: "Você receberá uma notificação antes da mentoria começar.",
      });
      queryClient.invalidateQueries({ queryKey: ["nextMentoring"] });
    } catch (error) {
      toast({
        title: "Erro ao fazer check-in",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="card-glow border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-primary" />
          Próxima Mentoria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {mentor?.avatar_url ? (
            <Avatar className="h-20 w-20 flex-shrink-0">
              <AvatarImage src={mentor.avatar_url} alt={mentor.name} className="object-cover" />
              <AvatarFallback>{getInitials(mentor?.name || mentoring.mentor_name)}</AvatarFallback>
            </Avatar>
          ) : null}
          <div className="min-w-0">
            <h3 className="font-semibold">{mentoring.title}</h3>
            <p className="text-sm text-muted-foreground">com {mentor?.name || mentoring.mentor_name}</p>
          </div>
        </div>



        {/* Countdown */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { value: countdown.days, label: "Dias" },
            { value: countdown.hours, label: "Horas" },
            { value: countdown.minutes, label: "Min" },
            { value: countdown.seconds, label: "Seg" },
          ].map((item, i) => (
            <div key={i} className="rounded-lg bg-muted/50 p-3">
              <p className="text-xl font-bold text-primary animate-countdown">{String(item.value).padStart(2, '0')}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 self-center">
            <Clock className="h-4 w-4" />
            {formatDate(mentoring.scheduled_at)} às {formatTime(mentoring.scheduled_at)} • {mentoring.duration_minutes || 60} min
          </div>

          {/* Botão central: Adicionar ao Calendário */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9 text-xs rounded-full flex-1 min-w-[180px] border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
            asChild
          >
            <a
              href={generateGoogleCalendarUrl(
                mentoring.title,
                mentoring.scheduled_at,
                mentoring.duration_minutes || 60,
                `com ${mentor?.name || mentoring.mentor_name} — acesse a sala em ${window.location.origin}/mentorias`,
                `${window.location.origin}/mentorias`
              )}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Adicionar mentoria ao Google Calendar"
            >
              <CalendarPlus className="h-4 w-4" />
              Adicionar ao Calendário
            </a>
          </Button>

          {mentoring.hasCheckedIn ? (
            <MeetingCountdown
              scheduledAt={mentoring.scheduled_at}
              meetingUrl={null}
              fetchMeetingUrl={() => fetchMentoringMeetingUrl(mentoring.id)}
            />
          ) : (
            <Button
              onClick={handleCheckin}
              disabled={isCheckingIn}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isCheckingIn ? "Fazendo Check-in..." : "Fazer Check-in"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
