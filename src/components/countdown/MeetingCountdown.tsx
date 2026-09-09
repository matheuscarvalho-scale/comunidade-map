import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Video, ExternalLink, Clock, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MeetingCountdownProps {
  scheduledAt: string;
  meetingUrl: string | null;
  unlockMinutesBefore?: number;
  /** When true, the link is always unlocked (e.g. for the session mentor/host) */
  alwaysUnlocked?: boolean;
  /** When provided, the meeting URL is fetched on click instead of being known upfront */
  fetchMeetingUrl?: () => Promise<string | null>;
}

export function MeetingCountdown({
  scheduledAt,
  meetingUrl,
  unlockMinutesBefore = 30,
  alwaysUnlocked = false,
  fetchMeetingUrl,
}: MeetingCountdownProps) {
  const [now, setNow] = useState(new Date());
  const [isOpening, setIsOpening] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sessionDate = new Date(scheduledAt);
  const unlockTime = new Date(sessionDate.getTime() - unlockMinutesBefore * 60 * 1000);
  const isUnlocked = alwaysUnlocked || now >= unlockTime;
  const isOver = now >= new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000); // 2h after

  if (isOver) {
    return null;
  }

  if (isUnlocked && !meetingUrl && fetchMeetingUrl) {
    const handleOpen = async () => {
      setIsOpening(true);
      try {
        const url = await fetchMeetingUrl();
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          toast({
            title: "Link ainda não disponível",
            description: "O link é liberado 30 minutos antes.",
          });
        }
      } finally {
        setIsOpening(false);
      }
    };

    return (
      <Button size="sm" className="gap-2" onClick={handleOpen} disabled={isOpening}>
        <Video className="h-4 w-4" />
        {isOpening ? "Abrindo..." : "Entrar na Reunião"}
        <ExternalLink className="h-3 w-3" />
      </Button>
    );
  }

  if (isUnlocked && meetingUrl) {
    return (
      <Button asChild size="sm" className="gap-2">
        <a href={meetingUrl} target="_blank" rel="noopener noreferrer">
          <Video className="h-4 w-4" />
          Entrar na Reunião
          <ExternalLink className="h-3 w-3" />
        </a>
      </Button>
    );
  }

  // Calculate remaining time until unlock
  const diffMs = unlockTime.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  let countdownDisplay: string;
  if (days > 0) {
    countdownDisplay = `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  } else if (hours > 0) {
    countdownDisplay = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    countdownDisplay = `${pad(minutes)}:${pad(seconds)}`;
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Libera em</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 border border-border">
        <Clock className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-sm font-semibold tabular-nums">
          {countdownDisplay}
        </span>
      </div>
    </div>
  );
}
