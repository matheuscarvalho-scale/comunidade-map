import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

import { Switch } from "@/components/ui/switch";
import { MainLayout } from "@/components/layout/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { usePermission } from "@/hooks/usePermission";
import { useUserStats, useUserProfile } from "@/hooks/useUserProfile";
import { 
  getGreeting,
  useNextMentoring, 
  useNextWebinar,
  usePlatformUpdates, 
  useRecentAchievements 
} from "@/hooks/useDashboardData";
import { useFormations } from "@/hooks/useFormations";
import { useContinueFormation } from "@/hooks/useContinueFormation";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { NextMentoringCard } from "@/components/dashboard/NextMentoringCard";
import { NextWebinarCard } from "@/components/dashboard/NextWebinarCard";
import { ContinueFormationCard } from "@/components/dashboard/ContinueFormationCard";
import { FormationsProgressCard } from "@/components/dashboard/FormationsProgressCard";
import { PlatformUpdatesCard } from "@/components/dashboard/PlatformUpdatesCard";
import { RecentAchievementsCard } from "@/components/dashboard/RecentAchievementsCard";
import { PersonalizedTrailCard } from "@/components/dashboard/PersonalizedTrailCard";


import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { SEOHead } from "@/components/SEOHead";

export default function Dashboard() {
  const { data: userStats, isLoading: statsLoading } = useUserStats();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: nextMentoring } = useNextMentoring();
  const { data: nextWebinar } = useNextWebinar();

  const { data: continueFormation } = useContinueFormation();
  const { data: formations } = useFormations();
  const { data: platformUpdates } = usePlatformUpdates();
  const { data: recentAchievements } = useRecentAchievements();
  
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const { isEnabled, toggleMutation, toggles } = useFeatureToggles();
  const { hasRole, isLoading: roleLoading } = useRole();
  const isAdmin = hasRole(["admin_geral", "admin", "admin_conteudo"]);
  const trilhaToggle = toggles.find(t => t.feature_key === "trilha-ia");
  const trilhaEnabled = isEnabled("trilha-ia");
  const [localTrilhaEnabled, setLocalTrilhaEnabled] = useState(trilhaEnabled);

  useEffect(() => {
    setLocalTrilhaEnabled(trilhaEnabled);
  }, [trilhaEnabled]);

  const handleTrilhaToggle = () => {
    const newValue = !localTrilhaEnabled;
    setLocalTrilhaEnabled(newValue);
    toggleMutation.mutate(
      { featureKey: "trilha-ia", enabled: newValue },
      {
        onSuccess: () => {
          toast({
            title: newValue ? "Trilha IA ativada ✅" : "Trilha IA desativada 🔒",
            description: `A trilha personalizada com IA ${newValue ? "está visível" : "está oculta"} para os membros.`,
          });
        },
        onError: () => {
          setLocalTrilhaEnabled(!newValue);
          toast({ title: "Erro ao atualizar", variant: "destructive" });
        },
      }
    );
  };


  const userName = profile?.name?.split(" ")[0] || "Usuário";

  return (
    <MainLayout>
      <SEOHead
        title="Painel do Aluno"
        description="Acompanhe seu progresso, próximas mentorias e formações na MAP Acelera em um único painel."
        canonical="/"
        noIndex
      />
      <div className="space-y-6 animate-fade-in">
        {/* Greeting */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold md:text-3xl">
            {getGreeting()}, {userName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Continue sua jornada de aprendizado e alcance novos objetivos.
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards 
          coursesCompleted={userStats?.coursesCompleted || 0}
          mentoringsAttended={userStats?.mentoringsAttended || 0}
          streak={userStats?.streak || 0}
        />

        {/* Trilha IA Admin Toggle */}
        {isAdmin && trilhaToggle && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={localTrilhaEnabled ? "default" : "secondary"} className="text-xs">
                {localTrilhaEnabled ? "Ativo" : "Desativado"}
              </Badge>
              <span className="text-muted-foreground">
                Trilha Personalizada com IA
              </span>
            </div>
            <Switch
              checked={localTrilhaEnabled}
              onCheckedChange={handleTrilhaToggle}
              disabled={toggleMutation.isPending}
            />
          </div>
        )}

        {/* Personalized Trail - visible to admins always, members only when enabled */}
        {(localTrilhaEnabled || isAdmin) && <PersonalizedTrailCard />}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Next Event: whichever comes first (webinar or mentoring) */}
            {(() => {
              const canSeeMentoring = !!nextMentoring && hasPermission('mentorship.access');
              const webinarFirst =
                !!nextWebinar &&
                (!canSeeMentoring ||
                  new Date(nextWebinar.scheduled_at).getTime() <
                    new Date(nextMentoring!.scheduled_at).getTime());

              if (webinarFirst) return <NextWebinarCard webinar={nextWebinar!} />;
              if (canSeeMentoring) return <NextMentoringCard mentoring={nextMentoring!} />;
              return null;
            })()}


            {/* Continue Formation */}
            {continueFormation && (
              <ContinueFormationCard data={continueFormation} />
            )}

            {/* Formations Progress */}
            {formations && formations.length > 0 && (
              <FormationsProgressCard formations={formations} />
            )}

          </div>


          {/* Sidebar Content */}
          <div className="space-y-6">
            {/* Recent Achievements */}
            <RecentAchievementsCard achievements={recentAchievements || []} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
