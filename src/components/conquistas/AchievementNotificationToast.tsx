import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useAchievementNotifications, useMarkNotificationRead } from "@/hooks/useAchievementsComplete";

export function AchievementNotificationWatcher() {
  const { data: notifications } = useAchievementNotifications();
  const markAsRead = useMarkNotificationRead();
  const shownNotifications = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    notifications.forEach((notification) => {
      // Skip if already shown
      if (shownNotifications.current.has(notification.id)) return;
      shownNotifications.current.add(notification.id);

      const achievement = notification.achievement;
      if (!achievement) return;

      // Show toast
      toast.success(
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-bounce">{achievement.icon}</span>
          <div>
            <p className="font-bold">🎉 Conquista Desbloqueada!</p>
            <p className="text-sm font-medium">{achievement.name}</p>
            <p className="text-xs text-muted-foreground">+{achievement.points || 0} pontos</p>
          </div>
        </div>,
        {
          duration: 6000,
        }
      );

      // Show confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#BFFF00", "#9ACD32", "#7CFC00", "#00FF00"],
      });

      // Mark as read
      markAsRead.mutate(notification.id);
    });
  }, [notifications, markAsRead]);

  return null;
}
