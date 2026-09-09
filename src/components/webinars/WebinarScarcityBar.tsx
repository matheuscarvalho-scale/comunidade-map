import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

interface WebinarScarcityBarProps {
  realCheckins: number;
  baseFake: number;
  minCheckinsToShow?: number;
  scheduledAt: string;
  createdAt: string;
}

export function WebinarScarcityBar({ realCheckins, minCheckinsToShow = 5, scheduledAt, createdAt }: WebinarScarcityBarProps) {
  const shouldShow = realCheckins >= minCheckinsToShow;

  const percentage = useMemo(() => {
    const now = Date.now();
    const eventTime = new Date(scheduledAt).getTime();
    const startTime = new Date(createdAt).getTime();

    if (now <= startTime) return 0;
    if (now >= eventTime) return 90;

    const total = eventTime - startTime;
    if (total <= 0) return 90;

    const elapsed = now - startTime;
    const ratio = elapsed / total;
    return Math.round(ratio * 90);
  }, [scheduledAt, createdAt]);

  const urgencyMessage = useMemo(() => {
    if (percentage >= 85) return { emoji: "🚨", text: "Quase esgotado! Garanta sua vaga agora", color: "bg-red-500/20 text-red-500 border-red-500/30" };
    if (percentage >= 70) return { emoji: "🚨", text: "Últimas vagas disponíveis!", color: "bg-red-500/20 text-red-500 border-red-500/30" };
    if (percentage >= 50) return { emoji: "⚡", text: "70% das vagas preenchidas — corra!", color: "bg-orange-500/20 text-orange-500 border-orange-500/30" };
    return { emoji: "🔥", text: "Mais da metade das vagas preenchidas", color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" };
  }, [percentage]);

  const barColor = percentage >= 70
    ? "bg-red-500"
    : percentage >= 50
      ? "bg-orange-500"
      : "bg-yellow-500";

  if (!shouldShow || percentage < 50) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <Badge variant="outline" className={`${urgencyMessage.color} text-[11px] px-2 py-0.5 ${percentage >= 70 ? "animate-pulse" : ""}`}>
          {urgencyMessage.emoji} {urgencyMessage.text}
        </Badge>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
