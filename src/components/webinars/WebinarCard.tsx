import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Loader2,
  User,
  CalendarPlus,
  PlayCircle,
} from "lucide-react";
import { format, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MeetingCountdown } from "@/components/countdown/MeetingCountdown";
import { WebinarScarcityBar } from "@/components/webinars/WebinarScarcityBar";
import { generateGoogleCalendarUrl } from "@/hooks/useGoogleCalendarEvents";

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

interface ScarcityConfig {
  base_fake_registrations: number;
  show_live_counter: boolean;
  show_notifications: boolean;
  is_active: boolean;
  min_checkins_to_show?: number;
}

interface RecordingRef {
  id: string;
  title: string;
  cloudflare_video_uid: string;
}

interface WebinarCardProps {
  webinar: Webinar;
  isCheckedIn: boolean;
  currentCheckins: number;
  onCheckin: (webinarId: string) => void;
  onCancelCheckin?: (webinarId: string) => void;
  onAccessWebinar: (webinar: Webinar) => void;
  isCheckinPending: boolean;
  isCancelPending?: boolean;
  scarcityConfig?: ScarcityConfig;
  /** Published recording for this (past) webinar, when available */
  recording?: RecordingRef | null;
  onWatchRecording?: (recording: RecordingRef) => void;
}

function getPartnerColor(partner: string | null) {
  switch (partner?.toLowerCase()) {
    case "amazon":
      return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    case "base":
      return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    case "tiktok shop":
      return "bg-pink-500/20 text-pink-500 border-pink-500/30";
    default:
      return "bg-primary/20 text-primary border-primary/30";
  }
}

export function WebinarCard({
  webinar,
  isCheckedIn,
  currentCheckins,
  onCheckin,
  onCancelCheckin,
  onAccessWebinar,
  isCheckinPending,
  isCancelPending,
  scarcityConfig,
  recording,
  onWatchRecording,
}: WebinarCardProps) {
  const isUpcoming = isFuture(new Date(webinar.scheduled_at));

  return (
    <Card className="card-glow hover:border-primary/50 transition-all">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Thumbnail or large presenter avatar */}
          {(webinar.thumbnail_url || webinar.presenter_avatar) && (
            <div className="flex-shrink-0 w-full md:w-40 md:self-stretch rounded-lg overflow-hidden">
              <img
                src={webinar.thumbnail_url || webinar.presenter_avatar!}
                alt={webinar.title}
                className={`w-full h-full object-cover ${!webinar.thumbnail_url ? 'rounded-lg' : ''}`}
                loading="lazy"
              />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-lg">{webinar.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {webinar.partner_name && (
                    <Badge
                      variant="outline"
                      className={getPartnerColor(webinar.partner_name)}
                    >
                      {webinar.partner_name}
                    </Badge>
                  )}
                </div>
              </div>
              {isCheckedIn && (
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30 flex-shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Inscrito
                </Badge>
              )}
            </div>

            {webinar.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {webinar.description}
              </p>
            )}

            {/* Presenter info - only show small card when thumbnail exists (otherwise avatar is already shown large) */}
            {webinar.presenter_name && webinar.thumbnail_url && (
              <div className="flex items-start gap-2 mb-3 p-2.5 rounded-md bg-muted/50 border border-border/50">
                {webinar.presenter_avatar ? (
                  <img
                    src={webinar.presenter_avatar}
                    alt={webinar.presenter_name}
                    className="flex-shrink-0 h-10 w-10 rounded-full object-cover mt-0.5"
                  />
                ) : (
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{webinar.presenter_name}</p>
                  {webinar.presenter_bio && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{webinar.presenter_bio}</p>
                  )}
                </div>
              </div>
            )}
            {/* When no thumbnail, show presenter name/bio as text next to large avatar */}
            {webinar.presenter_name && !webinar.thumbnail_url && (
              <div className="mb-3">
                <p className="text-sm font-medium">{webinar.presenter_name}</p>
                {webinar.presenter_bio && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{webinar.presenter_bio}</p>
                )}
              </div>
            )}

            {/* Scarcity bar */}
            {isUpcoming && scarcityConfig && scarcityConfig.is_active && (
              <div className="mb-3">
                <WebinarScarcityBar
                  realCheckins={currentCheckins}
                  baseFake={scarcityConfig.base_fake_registrations}
                  minCheckinsToShow={scarcityConfig.min_checkins_to_show ?? 5}
                  scheduledAt={webinar.scheduled_at}
                  createdAt={webinar.created_at}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                {format(new Date(webinar.scheduled_at), "dd 'de' MMMM", {
                  locale: ptBR,
                })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(new Date(webinar.scheduled_at), "HH:mm")} •{" "}
                {webinar.duration_minutes}min
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            {isUpcoming ? (
              isCheckedIn ? (
                <>
                  <MeetingCountdown
                    scheduledAt={webinar.scheduled_at}
                    meetingUrl={webinar.meeting_url}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    asChild
                  >
                    <a
                      href={generateGoogleCalendarUrl(
                        webinar.title,
                        webinar.scheduled_at,
                        webinar.duration_minutes,
                        webinar.description,
                        webinar.meeting_url
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <CalendarPlus className="h-3 w-3" />
                      Adicionar ao Calendário
                    </a>
                  </Button>
                  {onCancelCheckin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => onCancelCheckin(webinar.id)}
                      disabled={isCancelPending}
                    >
                      {isCancelPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                      Cancelar Check-in
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  onClick={() => onCheckin(webinar.id)}
                  disabled={isCheckinPending}
                  className="gap-2"
                >
                  {isCheckinPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Fazer Check-in
                </Button>
              )
            ) : recording ? (
              <Button
                size="sm"
                className="rounded-full gap-2"
                onClick={() => onWatchRecording?.(recording)}
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
    </Card>
  );
}
