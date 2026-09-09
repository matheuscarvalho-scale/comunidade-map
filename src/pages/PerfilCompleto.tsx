import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  User, 
  Camera,
  Trophy,
  Flame,
  BookOpen,
  Award,
  Bell,
  Settings,
  MapPin,
  Save,
  X,
  CheckCircle2,
  Users,
  UserPlus,
  Mail,
  Calendar,
  Crown,
  BarChart3,
  Clock,
  TrendingUp,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Briefcase,
  Building2,
  Globe,
  Trash2,
  MessageCircle
} from "lucide-react";
import { useUserProfile, useUserStats, useUpdateProfile, useUploadAvatar } from "@/hooks/useUserProfile";
import { useAchievements } from "@/hooks/useAchievements";
import { useFormations } from "@/hooks/useFormations";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionStatusCard } from "@/components/profile/SubscriptionStatusCard";
import { useSecondaryLogins, useIsSecondaryAccount, useOrganizationMembers } from "@/hooks/useSecondaryLogins";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotificationPreferences, NOTIFICATION_TYPES } from "@/hooks/useNotificationPreferences";

const industryOptions = [
  "E-commerce / Varejo",
  "Dropshipping",
  "Consultoria / Serviços",
  "Marketing Digital",
  "Tecnologia / SaaS",
  "Educação",
  "Indústria / Manufatura",
  "Saúde / Bem-estar",
  "Alimentação",
  "Moda / Beleza",
  "Outro",
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  status: "active" | "pending" | "inactive";
}

export default function PerfilCompleto() {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast({ title: "Conta excluída", description: "Sua conta foi removida com sucesso." });
      await signOut();
      navigate("/auth", { replace: true });
    } catch (e: any) {
      toast({ title: "Erro ao excluir conta", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsDeletingAccount(false);
    }
  };
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get the tab from URL query params
  const tabFromUrl = searchParams.get("tab") || "overview";
  
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: stats } = useUserStats();
  const { data: achievements } = useAchievements();
  const { data: formations } = useFormations();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const { mySecondaryLogins, myRequests, createRequest, isCreating } = useSecondaryLogins();
  const { data: isSecondaryData } = useIsSecondaryAccount();
  const isSecondaryAccount = !!isSecondaryData;
  const primaryUserId = isSecondaryData?.primary_user_id ?? null;
  const { data: orgMembers } = useOrganizationMembers(primaryUserId);
  const { isLoading: notifPrefsLoading, isEnabled: isNotifEnabled, toggle: toggleNotif } = useNotificationPreferences();

  // Fetch primary user profile when viewing as secondary account
  const { data: primaryProfile } = useQuery({
    queryKey: ["profile", primaryUserId],
    queryFn: async () => {
      if (!primaryUserId) return null;
      const { data, error } = await (supabase as any)
        .from("profiles_public")
        .select("user_id, name, avatar_url, created_at")
        .eq("user_id", primaryUserId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!primaryUserId,
  });

  // Derived team data from real database
  const activeMembers = mySecondaryLogins?.filter(login => login.is_active) || [];
  const pendingRequests = myRequests?.filter(req => req.status === 'pending') || [];
  const teamMembersCount = 1 + activeMembers.length; // Owner + secondary logins

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    location: "",
    job_title: "",
    company: "",
    industry: "",
    phone: "",
  });
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    secondary_email: "",
    secondary_name: "",
    relationship: "",
    justification: "",
  });
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});

  // Notification preferences are now managed via useNotificationPreferences hook

  // Security / Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!user) return;

    if (passwordForm.newPassword.length < 8) {
      toast({ title: "Erro", description: "A nova senha deve ter pelo menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      // Verify current password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        toast({ title: "Erro", description: "Senha atual incorreta.", variant: "destructive" });
        setIsChangingPassword(false);
        return;
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;

      toast({ title: "Senha alterada!", description: "Sua senha foi atualizada com sucesso." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast({ title: "Erro", description: error?.message || "Não foi possível alterar a senha.", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const startEditing = () => {
    setEditForm({
      name: profile?.name || "",
      bio: profile?.bio || "",
      location: profile?.location || "",
      job_title: profile?.job_title || "",
      company: profile?.company || "",
      industry: profile?.industry || "",
      phone: (() => {
        const raw = (profile as any)?.phone || "";
        const digits = raw.replace(/\D/g, "");
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      })(),
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(editForm);
      setIsEditing(false);
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso."
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive"
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadAvatar.mutateAsync(file);
      toast({
        title: "Avatar atualizado!",
        description: "Sua foto de perfil foi alterada."
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive"
      });
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleIndustryToggle = (option: string) => {
    setEditForm(prev => {
      const current = prev.industry ? prev.industry.split(",").map(s => s.trim()).filter(Boolean) : [];
      if (current.includes(option)) {
        return { ...prev, industry: current.filter(s => s !== option).join(", ") };
      }
      if (current.length >= 2) {
        toast({ title: "Limite atingido", description: "Você pode selecionar no máximo 2 setores.", variant: "destructive" });
        return prev;
      }
      return { ...prev, industry: [...current, option].join(", ") };
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleInviteMember = () => {
    const errors: Record<string, string> = {};
    if (!inviteForm.secondary_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.secondary_email)) {
      errors.secondary_email = "Email inválido";
    }
    if (!inviteForm.secondary_name || inviteForm.secondary_name.trim().length < 2) {
      errors.secondary_name = "Nome deve ter pelo menos 2 caracteres";
    }
    if (!inviteForm.relationship) {
      errors.relationship = "Selecione o relacionamento";
    }
    if (Object.keys(errors).length > 0) {
      setInviteErrors(errors);
      return;
    }
    setInviteErrors({});
    createRequest({
      secondary_email: inviteForm.secondary_email.trim(),
      secondary_name: inviteForm.secondary_name.trim(),
      relationship: inviteForm.relationship,
      justification: inviteForm.justification,
    }, {
      onSuccess: () => {
        setIsInviteDialogOpen(false);
        setInviteForm({ secondary_email: "", secondary_name: "", relationship: "", justification: "" });
      },
    });
  };

  const unlockedAchievements = achievements?.filter(a => a.isUnlocked) || [];
  const allFormations = formations || [];
  const completedFormations = allFormations.filter(f => f.progressPercent === 100);
  const inProgressFormations = allFormations.filter(f => f.progressPercent > 0 && f.progressPercent < 100);
  
  const completionRate = allFormations.length > 0 
    ? Math.round((completedFormations.length / allFormations.length) * 100) 
    : 0;

  const memberSince = profile?.created_at 
    ? format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: ptBR })
    : "Janeiro de 2024";

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card className="card-glow">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {getInitials(profile?.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{profile?.name}</h1>
                  <Badge className="w-fit bg-primary/20 text-primary border-primary/30">
                    <Crown className="h-3 w-3 mr-1" />
                    Membro Premium
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-2">{user?.email}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Membro desde {memberSince}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={startEditing} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Editar
                </Button>
                <Button variant="outline" className="gap-2">
                  <Bell className="h-4 w-4" />
                  Notificações
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue={tabFromUrl} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-auto lg:inline-grid h-auto">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Estatísticas</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Formações</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Gestão de Equipe</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Subscription Status */}
            <SubscriptionStatusCard />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="card-glow">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <BookOpen className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="text-3xl font-bold">{allFormations.length}</p>
                    <p className="text-sm text-muted-foreground">Total de Formações</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-glow">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="text-3xl font-bold">{completedFormations.length}</p>
                    <p className="text-sm text-muted-foreground">Concluídas</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-glow">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="text-3xl font-bold">{completionRate}%</p>
                    <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-glow">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Clock className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="text-3xl font-bold">{inProgressFormations.length}</p>
                    <p className="text-sm text-muted-foreground">Ativas</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Overview */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Progresso Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Formações concluídas</span>
                    <span className="font-semibold">{completedFormations.length} de {allFormations.length}</span>
                  </div>
                  <Progress value={completionRate} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Atividade Recente</CardTitle>
              </CardHeader>
              <CardContent>
                {inProgressFormations.length === 0 && completedFormations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma atividade recente
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[...completedFormations, ...inProgressFormations].slice(0, 3).map(formation => (
                      <div key={formation.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{formation.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formation.progressPercent === 100 ? "Concluída" : `Em andamento - ${formation.progressPercent}%`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="card-glow">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Trophy className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="text-3xl font-bold">{stats?.totalPoints || 0}</p>
                    <p className="text-sm text-muted-foreground">Pontos totais</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-glow">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Flame className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                    <p className="text-3xl font-bold">{stats?.streak || 0}</p>
                    <p className="text-sm text-muted-foreground">Dias seguidos</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-glow">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <BookOpen className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                    <p className="text-3xl font-bold">{stats?.coursesCompleted || 0}</p>
                    <p className="text-sm text-muted-foreground">Cursos concluídos</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-glow">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Award className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                    <p className="text-3xl font-bold">{stats?.achievementsUnlocked || 0}</p>
                    <p className="text-sm text-muted-foreground">Conquistas</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Achievements */}
            <Card className="card-glow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Conquistas Recentes
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="/conquistas">Ver todas</a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {unlockedAchievements.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma conquista desbloqueada ainda
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {unlockedAchievements.slice(0, 6).map(achievement => (
                      <div
                        key={achievement.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      >
                        <span className="text-2xl">{achievement.icon}</span>
                        <span className="text-sm font-medium">{achievement.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            {/* In Progress */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Formações em Andamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inProgressFormations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma formação em andamento
                  </p>
                ) : (
                  <div className="space-y-4">
                    {inProgressFormations.map(formation => (
                      <div key={formation.id} className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{formation.title}</p>
                          <p className="text-sm text-muted-foreground">{formation.completedLessons} de {formation.totalLessons} aulas</p>
                        </div>
                        <div className="w-32">
                          <Progress value={formation.progressPercent} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1 text-right">
                            {formation.progressPercent}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Formações Concluídas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedFormations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma formação concluída ainda
                  </p>
                ) : (
                  <div className="space-y-3">
                    {completedFormations.map(formation => (
                      <div key={formation.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{formation.title}</p>
                          <p className="text-sm text-muted-foreground">{formation.totalLessons} aulas</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/certificados">Ver Certificado</a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>
                  Para sua segurança, informe a senha atual antes de definir uma nova
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Digite sua senha atual"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repita a nova senha"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="w-full"
                >
                  {isChangingPassword ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Alterar Senha
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Excluir minha conta
                </CardTitle>
                <CardDescription>
                  Esta ação remove permanentemente sua conta e todos os dados associados (perfil, progresso, mensagens, conquistas). Não pode ser desfeita.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeletingAccount}>
                      {isDeletingAccount ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Excluir minha conta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso apaga permanentemente sua conta e todos os seus dados. Esta ação é irreversível.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeletingAccount}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeletingAccount ? "Excluindo..." : "Sim, excluir"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Preferências de Notificação
                </CardTitle>
                <CardDescription>Gerencie como você recebe notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {notifPrefsLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando preferências...</p>
                ) : (
                  NOTIFICATION_TYPES.map((notifType) => (
                    <div key={notifType.key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{notifType.label}</p>
                        <p className="text-sm text-muted-foreground">{notifType.description}</p>
                      </div>
                      <Switch
                        checked={isNotifEnabled(notifType.key)}
                        onCheckedChange={(v) => toggleNotif({ type: notifType.key, enabled: v })}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Management Tab */}
          <TabsContent value="team" className="space-y-6">
            {/* Organization Header */}
            <Card className="card-glow">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {isSecondaryAccount ? "Minha Organização" : "Minha Organização"}
                      </h2>
                      {isSecondaryAccount ? (
                        <p className="text-muted-foreground">
                          Você é um membro secundário desta organização
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Plano Premium • {teamMembersCount} membro(s) ativo(s)</p>
                      )}
                    </div>
                  </div>
                  {/* Only primary accounts can request secondary access */}
                  {!isSecondaryAccount && (
                    <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <UserPlus className="h-4 w-4" />
                          Solicitar Acesso Secundário
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Solicitar acesso secundário</DialogTitle>
                          <DialogDescription>
                            Preencha os dados da pessoa que terá acesso à plataforma.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="invite_name">Nome completo</Label>
                            <Input
                              id="invite_name"
                              placeholder="Nome da pessoa"
                              value={inviteForm.secondary_name}
                              onChange={(e) => setInviteForm({ ...inviteForm, secondary_name: e.target.value })}
                            />
                            {inviteErrors.secondary_name && (
                              <p className="text-sm text-destructive">{inviteErrors.secondary_name}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invite_email">Email</Label>
                            <Input
                              id="invite_email"
                              type="email"
                              placeholder="email@exemplo.com"
                              value={inviteForm.secondary_email}
                              onChange={(e) => setInviteForm({ ...inviteForm, secondary_email: e.target.value })}
                            />
                            {inviteErrors.secondary_email && (
                              <p className="text-sm text-destructive">{inviteErrors.secondary_email}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invite_relationship">Relacionamento</Label>
                            <select
                              id="invite_relationship"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={inviteForm.relationship}
                              onChange={(e) => setInviteForm({ ...inviteForm, relationship: e.target.value })}
                            >
                              <option value="">Selecione...</option>
                              <option value="socio">Sócio(a)</option>
                              <option value="funcionario">Funcionário(a)</option>
                              <option value="familiar">Familiar</option>
                              <option value="assistente">Assistente</option>
                              <option value="outro">Outro</option>
                            </select>
                            {inviteErrors.relationship && (
                              <p className="text-sm text-destructive">{inviteErrors.relationship}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invite_justification">Justificativa (opcional)</Label>
                            <textarea
                              id="invite_justification"
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              placeholder="Explique por que essa pessoa precisa de acesso..."
                              value={inviteForm.justification}
                              onChange={(e) => setInviteForm({ ...inviteForm, justification: e.target.value })}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleInviteMember} disabled={isCreating}>
                            {isCreating ? "Enviando..." : "Enviar Solicitação"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team Tabs */}
            {isSecondaryAccount ? (
              /* Secondary account: show organization members view */
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Membros da Organização
                  </CardTitle>
                  <CardDescription>
                    Titular e membros associados à sua organização
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Primary account holder (Titular) */}
                    {primaryProfile ? (
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={primaryProfile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(primaryProfile.name || "T")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{primaryProfile.name}</p>
                            <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                              <Crown className="h-3 w-3 mr-1" />
                              Titular
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Titular da conta</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Desde {primaryProfile.created_at ? format(new Date(primaryProfile.created_at), "dd MMM yyyy", { locale: ptBR }) : "-"}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {/* All org members from the primary's secondary_logins */}
                    {(!orgMembers || orgMembers.length === 0) && !primaryProfile ? (
                      <p className="text-muted-foreground text-center py-6">
                        Nenhum membro encontrado na organização
                      </p>
                    ) : (
                      orgMembers?.map(member => {
                        const isMe = member.secondary_user_id === user?.id;
                        return (
                          <div key={member.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(member.secondary_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{member.secondary_name}</p>
                                <Badge variant="secondary" className="text-xs">
                                  {member.relationship}
                                </Badge>
                                {isMe && (
                                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                                    Você
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{member.secondary_email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                Desde {format(new Date(member.created_at), "dd MMM yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Primary account: show full team management tabs */
              <Tabs defaultValue="members" className="space-y-4">
              <TabsList>
                <TabsTrigger value="members">Membros</TabsTrigger>
                <TabsTrigger value="pending">Solicitações Pendentes</TabsTrigger>
                <TabsTrigger value="inactive">Inativos</TabsTrigger>
                <TabsTrigger value="metrics">Métricas</TabsTrigger>
              </TabsList>

              <TabsContent value="members">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="card-glow">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Users className="h-6 w-6 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">{teamMembersCount}</p>
                        <p className="text-sm text-muted-foreground">Membros Ativos</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-glow">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Mail className="h-6 w-6 mx-auto text-amber-500 mb-2" />
                        <p className="text-2xl font-bold">{pendingRequests.length}</p>
                        <p className="text-sm text-muted-foreground">Solicitações Pendentes</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-glow">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                        <p className="text-2xl font-bold">{teamMembersCount + pendingRequests.length}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Members List */}
                <Card className="card-glow">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Owner (current user) */}
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(profile?.name || "Você")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{profile?.name || "Você"}</p>
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              <Crown className="h-3 w-3 mr-1" />
                              Titular
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Desde {profile?.created_at ? format(new Date(profile.created_at), "dd MMM yyyy", { locale: ptBR }) : "-"}
                          </p>
                        </div>
                      </div>

                      {/* Secondary logins */}
                      {activeMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(member.secondary_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{member.secondary_name}</p>
                              <Badge variant="secondary" className="text-xs">
                                {member.relationship}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{member.secondary_email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Desde {format(new Date(member.created_at), "dd MMM yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}

                      {activeMembers.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          Nenhum login secundário ativo
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pending">
                <Card className="card-glow">
                  <CardContent className="pt-6">
                    {pendingRequests.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhuma solicitação pendente
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {pendingRequests.map(request => (
                          <div key={request.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                              <Mail className="h-5 w-5 text-amber-500" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{request.secondary_name}</p>
                              <p className="text-sm text-muted-foreground">{request.secondary_email}</p>
                              <p className="text-xs text-muted-foreground">
                                Enviado em {format(new Date(request.created_at), "dd MMM yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <Badge variant="secondary">Aguardando aprovação</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inactive">
                <Card className="card-glow">
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum membro inativo
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="metrics">
                <Card className="card-glow">
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Métricas da Equipe</p>
                      <p className="text-muted-foreground">
                        Disponível quando você tiver mais membros na equipe
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            )} {/* end isSecondaryAccount ternary */}
          </TabsContent>
        </Tabs>

        {/* Support Section */}
        <Card className="card-glow border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
              Suporte e Atendimento
            </CardTitle>
            <CardDescription>
              Estamos aqui para te ajudar. Entre em contato pelo canal que preferir:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</p>
                <p className="text-sm font-medium select-all">sucesso@mapeducacao.com</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
              onClick={() => {
                const message = "Olá! Preciso de ajuda com a minha conta no MAP Acelera.";
                window.open(
                  `https://wa.me/5522936183349?text=${encodeURIComponent(message)}`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp (22) 93618-3349
            </Button>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
              <DialogDescription>
                Atualize suas informações pessoais
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 pr-1">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-4 w-4" /> E-mail</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">Para alterar o e-mail, entre em contato com o suporte</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={editForm.phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    let formatted = digits;
                    if (digits.length <= 2) {
                      formatted = digits;
                    } else if (digits.length <= 7) {
                      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                    } else if (digits.length <= 11) {
                      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
                    } else {
                      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
                    }
                    setEditForm(prev => ({ ...prev, phone: formatted }));
                  }}
                  maxLength={16}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  placeholder="Ex: São Paulo, SP"
                  value={editForm.location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Conte um pouco sobre você..."
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Cargo Atual</Label>
                  <Input
                    placeholder="Ex: Analista de Marketing"
                    value={editForm.job_title}
                    onChange={(e) => handleFieldChange("job_title", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Empresa</Label>
                  <Input
                    placeholder="Ex: Minha Empresa Ltda"
                    value={editForm.company}
                    onChange={(e) => handleFieldChange("company", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> Setor/Indústria</Label>
                <p className="text-xs text-muted-foreground">Selecione até 2 setores</p>
                <div className="flex flex-wrap gap-2">
                  {industryOptions.map(option => {
                    const selected = editForm.industry ? editForm.industry.split(",").map(s => s.trim()).includes(option) : false;
                    return (
                      <Badge
                        key={option}
                        variant={selected ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleIndustryToggle(option)}
                      >
                        {option}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={cancelEditing}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateProfile.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
