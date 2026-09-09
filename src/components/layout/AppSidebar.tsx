import { useState, useEffect } from "react";
import { NavLink, useLocation, Link, useSearchParams } from "react-router-dom";
import {
  Home,
  BookOpen,
  Users,
  Video,
  Trophy,
  Wrench,
  Network,
  ChevronDown,
  Flame,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  User,
  Gift,
  Award,
  Monitor,
  Newspaper,
  Coins,
  Wallet,
  TrendingUp,
  Presentation,
  Webhook,
  CreditCard,
  GraduationCap,
  Lightbulb,
  Shield,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { usePermission } from "@/hooks/usePermission";
import { useRole } from "@/hooks/useRole";
import { useUpdateStreak } from "@/hooks/useStreak";
import logoMapDark from "@/assets/logo-map-dark.png";
import logoMapLight from "@/assets/logo-map-light.png";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "INÍCIO",
    items: [
      { title: "Dashboard", href: "/", icon: Home },
      { title: "Notícias", href: "/noticias", icon: Newspaper },
    ],
  },
  {
    label: "APRENDIZADO",
    items: [
      { title: "Mentorias", href: "/mentorias", icon: Video, permission: "mentorship.access" },
      { title: "Trilha de Conteúdo", href: "/trilha-conteudo", icon: TrendingUp },
      { title: "Formações", href: "/formacoes", icon: BookOpen },
      { title: "Webinars", href: "/webinars", icon: Presentation, permission: "webinars.attend" },
    ],
  },
  {
    label: "FERRAMENTAS",
    items: [
      { title: "Recursos", href: "/recursos", icon: Wrench },
      { title: "Networking", href: "/networking", icon: Network },
      { title: "Conquistas", href: "/conquistas", icon: Trophy },
      { title: "Parceiros e Benefícios", href: "/parceiros", icon: Gift },
      { title: "Certificados", href: "/certificados", icon: Award },
      { title: "Sugestões", href: "/sugestoes", icon: Lightbulb },
    ],
  },
];

export function AppSidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["INÍCIO", "APRENDIZADO", "FERRAMENTAS", "CONFIGURAÇÕES"]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const { hasPermission } = usePermission();
  const { hasRole } = useRole();
  
  // Update streak when user accesses the app
  useUpdateStreak();

  // Detectar tema efetivo (dark ou light) considerando o tema sistema
  useEffect(() => {
    const checkDarkMode = () => {
      if (theme === "system") {
        setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
      } else {
        setIsDarkMode(theme === "dark");
      }
    };
    
    checkDarkMode();
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkDarkMode);
    return () => mediaQuery.removeEventListener("change", checkDarkMode);
  }, [theme]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Até logo! 👋",
      description: "Você saiu da sua conta.",
    });
  };

  const userName = profile?.name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário";
  const userEmail = user?.email || "";
  const userAvatar = profile?.avatar_url;
  const userStreak = profile?.streak || 0;

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between p-6">
        <Link to="/" className="flex items-center gap-3">
          <img 
            src={isDarkMode ? logoMapDark : logoMapLight} 
            alt="MAP" 
            className="h-8 w-auto"
          />
        </Link>
        {/* Streak Badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 animate-streak-glow">
          <Flame className="h-4 w-4 text-primary animate-fire" />
          <span className="text-sm font-semibold text-primary">{userStreak}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-3">
        {navGroups.map((group) => (
          <Collapsible
            key={group.label}
            open={openGroups.includes(group.label)}
            onOpenChange={() => toggleGroup(group.label)}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 transition-colors">
              {group.label}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  openGroups.includes(group.label) ? "rotate-0" : "-rotate-90"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pt-1">
              {group.items.map((item) => {
                if (item.permission && !hasPermission(item.permission)) return null;
                const currentHref = location.pathname + location.search;
                const isActive = item.href.includes("?") ? currentHref === item.href : location.pathname === item.href;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </NavLink>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        ))}

        {/* CONFIGURAÇÕES: precisa conter Perfil/Equipe + Sair */}
        <Collapsible
          open={openGroups.includes("CONFIGURAÇÕES")}
          onOpenChange={() => toggleGroup("CONFIGURAÇÕES")}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 transition-colors">
            CONFIGURAÇÕES
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                openGroups.includes("CONFIGURAÇÕES") ? "rotate-0" : "-rotate-90"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-1">
            {(() => {
              const profileHref = "/perfil";
              const teamHref = "/perfil?tab=team";
              const currentTab = searchParams.get("tab");
              const isProfileActive = location.pathname === "/perfil" && currentTab !== "team";
              const isTeamActive = location.pathname === "/perfil" && currentTab === "team";

              return (
                <>
                  <Link
                    to={profileHref}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isProfileActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <User className="h-5 w-5" />
                    Perfil
                  </Link>

                  <Link
                    to={teamHref}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isTeamActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Users className="h-5 w-5" />
                    Gestão de Equipe
                  </Link>

                  {/* Admin items - permission-gated */}
                  {hasPermission('subscriptions.manage') && (
                    <Link
                      to="/admin/logins-secundarios"
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        location.pathname === "/admin/logins-secundarios"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Shield className="h-5 w-5" />
                      Logins Secundários
                    </Link>
                  )}

                  {hasPermission('subscriptions.manage') && (
                    <Link
                      to="/admin/assinaturas"
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        location.pathname === "/admin/assinaturas"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <CreditCard className="h-5 w-5" />
                      Gestão de Assinaturas
                    </Link>
                  )}


                  {hasPermission('webhooks.view_logs') && (
                    <Link
                      to="/admin/webhook-logs"
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        location.pathname === "/admin/webhook-logs"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Webhook className="h-5 w-5" />
                      Logs de Webhook
                    </Link>
                  )}


                  {hasPermission('webinars.manage') && (
                    <Link
                      to="/admin/webinars"
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        location.pathname === "/admin/webinars"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Monitor className="h-5 w-5" />
                      Gerenciar Webinars & Mentoria
                    </Link>
                  )}

                  {hasPermission('formations.manage') && (
                    <Link
                      to="/admin/formations"
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        location.pathname.startsWith("/admin/formations")
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <GraduationCap className="h-5 w-5" />
                      Gerenciar Formações
                    </Link>
                  )}

                  {hasPermission('formations.manage') && (
                    <Link
                      to="/admin/content-tracks"
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        location.pathname === "/admin/content-tracks"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Presentation className="h-5 w-5" />
                      Gerenciar Trilha de Conteúdo
                    </Link>
                  )}


                  {hasPermission('analytics.manage') && (
                    <Link
                      to="/admin/analytics"
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        location.pathname === "/admin/analytics"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <BarChart3 className="h-5 w-5" />
                      Analytics de Engajamento
                    </Link>
                  )}

                </>
              );
            })()}

            <Button
              variant="ghost"
              onClick={async () => {
                await handleSignOut();
                setIsMobileOpen(false);
              }}
              className="w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </nav>

      {/* User Profile with Theme Dropdown */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Link 
            to="/perfil" 
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-3 flex-1 min-w-0 rounded-lg p-2 -m-2 hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src={userAvatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </Link>
          
          {/* Theme Dropdown */}
          <div className="relative">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
              className="appearance-none bg-muted/50 hover:bg-muted rounded-lg p-2 pr-7 text-sm cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-primary/50"
              title="Alterar tema"
            >
              <option value="light">☀️</option>
              <option value="dark">🌙</option>
              <option value="system">💻</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar transition-transform duration-300 md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Spacer for desktop */}
      <div className="hidden w-64 flex-shrink-0 md:block" />
    </>
  );
}
