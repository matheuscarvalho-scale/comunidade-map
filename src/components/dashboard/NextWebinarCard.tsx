import { useState, useEffect } from "react";
import { Radio, Clock, CalendarPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MeetingCountdown } from "@/components/countdown/MeetingCountdown";
import { generateGoogleCalendarUrl } from "@/hooks/useGoogleCalendarEvents";
import confetti from "canvas-confetti";

export interface NextWebinar {
  id: string;
  title: string;
  presenter_name: string | null;
  presenter_avatar: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_url: string | null;
  hasCheckedIn?: boolean;
}

interface NextWebinarCardProps {
  webinar: NextWebinar;
}

export function NextWebinarCard({ webinar }: NextWebinarCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  useEffect(() => {
    const calculateCountdown = () => {
      const diff = new Date(webinar.scheduled_at).getTime() - Date.now();
      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff % 86400000) / 3600000),
          minutes: Math.floor((diff % 3600000) / 60000),
          seconds: Math.floor((diff % 60000) / 1000),
        });
      }
    };
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [webinar.scheduled_at]);

  const handleCheckin = async () => {
    if (!user) return;
    setIsCheckingIn(true);
    try {
      const { data, error } = await supabase.rpc("webinar_checkin", {
        _webinar_id: webinar.id,
        _user_id: user.id,
      });
      if (error) throw error;
      const result = data as Record<string, unknown>;
      if (!result.success) throw new Error(result.error as string);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#BFFF00", "#9ACD32"],
      });

      supabase.functions.invoke("send-webinar-email", {
        body: {
          to: user.email as string,
          user_name: result.user_name as string,
          webinar_title: result.webinar_title as string,
          scheduled_at: result.scheduled_at as string,
          meeting_url: (result.meeting_url as string) || "",
          type: "checkin",
        },
      });

      toast({ title: "Check-in realizado! ✅", description: "Email de confirmação enviado." });
      queryClient.invalidateQueries({ queryKey: ["nextWebinar"] });
      queryClient.invalidateQueries({ queryKey: ["webinar-checkins"] });
    } catch (error) {
      toast({
        title: "Erro ao fazer check-in",
        description: (error as Error).message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card className="card-glow border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radio className="h-5 w-5 text-primary" />
          Próximo Webinar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {webinar.presenter_avatar ? (
            <Avatar className="h-20 w-20 flex-shrink-0">
              <AvatarImage
                src={webinar.presenter_avatar}
                alt={webinar.presenter_name || webinar.title}
                className="object-cover"
              />
              <AvatarFallback>{getInitials(webinar.presenter_name || webinar.title)}</AvatarFallback>
            </Avatar>
          ) : null}
          <div className="min-w-0">
            <h3 className="font-semibold">{webinar.title}</h3>
            {webinar.presenter_name && (
              <p className="text-sm text-muted-foreground">com {webinar.presenter_name}</p>
            )}
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
              <p className="text-xl font-bold text-primary animate-countdown">
                {String(item.value).padStart(2, "0")}
              </p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 self-center">
            <Clock className="h-4 w-4" />
            {formatDate(webinar.scheduled_at)} às {formatTime(webinar.scheduled_at)} •{" "}
            {webinar.duration_minutes || 60} min
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9 text-xs rounded-full flex-1 min-w-[180px] border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
            asChild
          >
            <a
              href={generateGoogleCalendarUrl(
                webinar.title,
                webinar.scheduled_at,
                webinar.duration_minutes || 60,
                webinar.presenter_name ? `com ${webinar.presenter_name}` : null,
                webinar.meeting_url
              )}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Adicionar webinar ao Google Calendar"
            >
              <CalendarPlus className="h-4 w-4" />
              Adicionar ao Calendário
            </a>
          </Button>

          {webinar.hasCheckedIn ? (
            <MeetingCountdown scheduledAt={webinar.scheduled_at} meetingUrl={webinar.meeting_url} />
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
