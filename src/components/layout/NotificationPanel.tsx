import { useEffect } from "react";
import { X, Bell, BookOpen, Video, Route, Users, CheckCheck, FileBox, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/useNotifications";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; route: string }> = {
  new_formation: { icon: BookOpen, color: "text-blue-500", route: "/formacoes" },
  new_webinar: { icon: Video, color: "text-green-500", route: "/webinars" },
  new_track: { icon: Route, color: "text-purple-500", route: "/trilha-conteudo" },
  new_mentoring: { icon: Users, color: "text-orange-500", route: "/mentorias" },
  recurso: { icon: FileBox, color: "text-teal-500", route: "/recursos" },
  new_resource: { icon: FileBox, color: "text-teal-500", route: "/recursos" },
  achievement: { icon: Trophy, color: "text-yellow-500", route: "/conquistas" },
  info: { icon: Bell, color: "text-muted-foreground", route: "/" },
};

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { data: allNotifications, isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const navigate = useNavigate();
  const { disabledTypes } = useNotificationPreferences();

  useEffect(() => {
    if (isOpen) {
      void refetch();
    }
  }, [isOpen, refetch]);

  if (!isOpen) return null;

  const notifications = allNotifications?.filter(
    (n) => !disabledTypes.includes(n.type as any)
  );

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  const handleClick = (notif: (typeof notifications)[0]) => {
    if (!notif.is_read) markRead.mutate(notif.id);
    const cfg = typeConfig[notif.type] || typeConfig.info;
    // Deep link to the specific item when reference_id is available
    let route = cfg.route;
    if (notif.reference_id) {
      if (notif.type === "new_formation") {
        route = `/formacoes/${notif.reference_id}`;
      } else if (notif.type === "new_track") {
        route = `/trilha-conteudo/${notif.reference_id}`;
      }
    }
    navigate(route);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-4 top-14 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-background shadow-xl animate-in slide-in-from-top-2 fade-in-0 duration-200">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notificações</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => markAllRead.mutate()}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Marcar todas
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[70vh]">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : !notifications?.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhuma notificação ainda
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => {
                const cfg = typeConfig[notif.type] || typeConfig.info;
                const Icon = cfg.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                      !notif.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span className="shrink-0 h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-xs text-muted-foreground/70 mt-1 block">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
}
