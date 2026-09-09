import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Bell, HelpCircle, Mail, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/useNetworkingComplete";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { ChatPanel } from "./ChatPanel";
import { NotificationPanel } from "./NotificationPanel";

export function AppHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: unreadMessages } = useUnreadCount();
  const { data: allNotifs } = useNotifications();
  const { disabledTypes } = useNotificationPreferences();
  const unreadNotifs = allNotifs?.filter(n => !n.is_read && !disabledTypes.includes(n.type as any)).length || 0;
  const [chatOpen, setChatOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const SUPPORT_EMAIL = "sucesso@mapeducacao.com";
  const SUPPORT_PHONE_DISPLAY = "(22) 93618-3349";
  const SUPPORT_PHONE_WA = "5522936183349";
  const waUrl = `https://wa.me/${SUPPORT_PHONE_WA}?text=${encodeURIComponent("Olá! Preciso de suporte na plataforma MAP Acelera.")}`;

  const userName = profile?.name || user?.user_metadata?.name || user?.email?.split("@")[0] || "U";
  const userAvatar = profile?.avatar_url;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <header className="fixed top-0 right-0 left-0 md:left-64 z-30 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center justify-end gap-1 px-4 md:px-6">
          {/* Chat */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
            onClick={() => { setChatOpen(!chatOpen); setNotifsOpen(false); }}
          >
            <MessageCircle className="h-5 w-5" />
            {(unreadMessages || 0) > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
            onClick={() => { setNotifsOpen(!notifsOpen); setChatOpen(false); }}
          >
            <Bell className="h-5 w-5" />
            {(unreadNotifs || 0) > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </Button>

          {/* Support */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Suporte"
            className="text-primary hover:text-primary"
            onClick={() => setSupportOpen(true)}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* Profile Avatar */}
          <Link to="/perfil" className="ml-1">
            <Avatar className="h-8 w-8 border-2 border-border hover:border-primary/50 transition-colors">
              <AvatarImage src={userAvatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      <NotificationPanel isOpen={notifsOpen} onClose={() => setNotifsOpen(false)} />

      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <HelpCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Suporte</p>
                <DialogTitle className="text-xl">Precisa de ajuda?</DialogTitle>
              </div>
            </div>
            <DialogDescription className="pt-2">
              Qualquer dificuldade na plataforma — acesso, mentorias, builder, formações ou outra dúvida — nosso time resolve rápido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</p>
                <p className="text-sm font-medium truncate select-all">{SUPPORT_EMAIL}</p>
              </div>
            </div>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <Phone className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">WhatsApp do Suporte</p>
                <p className="text-sm font-medium">{SUPPORT_PHONE_DISPLAY}</p>
              </div>
            </a>
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Fechar</Button>
            </DialogClose>
            <Button asChild>
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                Chamar no WhatsApp <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
