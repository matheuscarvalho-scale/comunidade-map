import { useState, useEffect } from "react";
import { Trophy, Flame, Award, Lock, Crown, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEOHead } from "@/components/SEOHead";
import { AchievementCard } from "@/components/conquistas/AchievementCard";
import { MemberLevelBadge } from "@/components/conquistas/MemberLevelBadge";
import { ShareAchievementModal } from "@/components/conquistas/ShareAchievementModal";
import { 
  useAchievementsComplete, 
  useAchievementStats,
  AchievementWithProgress 
} from "@/hooks/useAchievementsComplete";
import confetti from "canvas-confetti";

const categoryLabels: Record<string, { icon: string; color: string }> = {
  Acesso: { icon: "🔑", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  Aprendizado: { icon: "📚", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  Comunidade: { icon: "👥", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  Mentorias: { icon: "🎯", color: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  Especiais: { icon: "⭐", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  webinar: { icon: "📺", color: "bg-red-500/10 text-red-400 border-red-500/30" },
  Webinars: { icon: "📺", color: "bg-red-500/10 text-red-400 border-red-500/30" },
};

export default function Conquistas() {
  const { data: achievements, isLoading: achievementsLoading } = useAchievementsComplete();
  const { data: stats, isLoading: statsLoading } = useAchievementStats();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null);

  const unlockedAchievements = achievements?.filter((a) => a.isUnlocked) || [];
  const lockedAchievements = achievements?.filter((a) => !a.isUnlocked) || [];
  const totalPoints = stats?.totalPoints || 0;

  // Check for recent unlocks and show confetti
  useEffect(() => {
    if (!unlockedAchievements.length) return;
    
    const recentUnlock = unlockedAchievements.some((a) => {
      if (!a.userProgress?.unlocked_at) return false;
      const unlockDate = new Date(a.userProgress.unlocked_at);
      const now = new Date();
      const diffHours = (now.getTime() - unlockDate.getTime()) / (1000 * 60 * 60);
      return diffHours < 24;
    });

    if (recentUnlock) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#BFFF00", "#9ACD32", "#7CFC00"],
        });
      }, 300);
    }
  }, [unlockedAchievements]);

  const handleShare = (achievement: AchievementWithProgress) => {
    setSelectedAchievement(achievement);
    setShareModalOpen(true);
  };

  // Group achievements by category
  const groupedAchievements = (achievements || []).reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, AchievementWithProgress[]>);

  const isLoading = achievementsLoading || statsLoading;

  return (
    <MainLayout>
      <SEOHead
        title="Conquistas"
        description="Veja suas medalhas, pontos e nível na jornada gamificada do MAP Acelera e suba no ranking da comunidade."
        canonical="/conquistas"
        noIndex
      />
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Conquistas</h1>
            <p className="text-muted-foreground">
              Acompanhe seu progresso e desbloqueie novas conquistas.
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/conquistas/ranking">
              <Crown className="h-4 w-4 mr-2" />
              Ver Ranking
            </Link>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="card-glow border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/20 p-3">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold text-primary">{totalPoints}</p>
                )}
                <p className="text-sm text-muted-foreground">Pontos Totais</p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glow border-border/50">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold">{stats?.unlockedCount || 0}</p>
                )}
                <p className="text-sm text-muted-foreground">Conquistados</p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glow border-border/50">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3 animate-fire">
                <Flame className="h-6 w-6 text-primary" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold">{stats?.streak || 0}</p>
                )}
                <p className="text-sm text-muted-foreground">Dias Consecutivos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glow border-border/50">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Seu Nível</p>
              {isLoading ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <MemberLevelBadge points={totalPoints} showProgress size="lg" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Achievements */}
        <Card className="card-glow border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-primary" />
              Conquistas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-32 flex-shrink-0" />
                ))}
              </div>
            ) : unlockedAchievements.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {unlockedAchievements.slice(-5).reverse().map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex-shrink-0 flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-border/50 min-w-[120px] cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleShare(achievement)}
                  >
                    <div className="text-4xl animate-badge-unlock">{achievement.icon}</div>
                    <p className="text-sm font-medium text-center">{achievement.name}</p>
                    <Badge variant="outline" className="text-primary border-primary/30">
                      +{achievement.points || 0}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Você ainda não conquistou nenhum badge. Continue aprendendo!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Next Achievements */}
        <Card className="card-glow border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-muted-foreground" />
              Próximas Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : (
              lockedAchievements
                .filter((a) => a.max_progress !== null)
                .sort((a, b) => {
                  const progressA = (a.userProgress?.progress || 0) / (a.max_progress || 1);
                  const progressB = (b.userProgress?.progress || 0) / (b.max_progress || 1);
                  return progressB - progressA;
                })
                .slice(0, 5)
                .map((achievement) => {
                  const progress = achievement.userProgress?.progress || 0;
                  const maxProgress = achievement.max_progress || 1;
                  return (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/50"
                    >
                      <div className="text-3xl opacity-50">{achievement.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{achievement.name}</h4>
                          <Badge variant="outline" className="text-muted-foreground">
                            +{achievement.points || 0}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {achievement.description}
                        </p>
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">
                              {progress}/{maxProgress}
                            </span>
                          </div>
                          <Progress
                            value={(progress / maxProgress) * 100}
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>

        {/* Seasonal Achievements */}
        {achievements?.some((a) => a.is_seasonal) && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Conquistas Especiais
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {achievements
                .filter((a) => a.is_seasonal)
                .map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    onShare={handleShare}
                  />
                ))}
            </div>
          </div>
        )}

        {/* All Achievements by Category */}
        {Object.entries(groupedAchievements)
          .filter(([category]) => category !== "Especiais")
          .map(([category, categoryAchievements]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span>{categoryLabels[category]?.icon}</span>
                {category === "webinar" ? "Webinars" : category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {categoryAchievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    onShare={achievement.isUnlocked ? handleShare : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Share Modal */}
      <ShareAchievementModal
        achievement={selectedAchievement}
        open={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setSelectedAchievement(null);
        }}
      />
    </MainLayout>
  );
}
