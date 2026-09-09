import { useState } from "react";
import { Trophy, Crown, ArrowLeft, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LeaderboardCard } from "@/components/conquistas/LeaderboardCard";
import { MemberLevelBadge } from "@/components/conquistas/MemberLevelBadge";
import { useLeaderboard, useAchievementStats } from "@/hooks/useAchievementsComplete";
import { useAuth } from "@/contexts/AuthContext";

export default function ConquistasRanking() {
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");
  const { data: leaderboard, isLoading } = useLeaderboard(period);
  const { data: stats } = useAchievementStats();
  const { user } = useAuth();

  // Find current user's position
  const userPosition = leaderboard?.findIndex((entry) => entry.user_id === user?.id);
  const userEntry = userPosition !== undefined && userPosition >= 0 ? leaderboard?.[userPosition] : null;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/conquistas">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
                  <Crown className="h-7 w-7 text-yellow-400" />
                  Ranking de Membros
                </h1>
                <p className="text-muted-foreground">
                  Veja quem são os membros mais ativos da comunidade
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User's Position Card */}
        {userEntry && userPosition !== undefined && (
          <Card className="card-glow border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sua posição</p>
                  <p className="text-4xl font-bold text-primary">#{userPosition + 1}</p>
                </div>
                <div className="text-right">
                  <MemberLevelBadge points={stats?.totalPoints || 0} showProgress />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Period Tabs */}
        <Tabs defaultValue="all" onValueChange={(v) => setPeriod(v as "week" | "month" | "all")}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="week">Esta Semana</TabsTrigger>
            <TabsTrigger value="month">Este Mês</TabsTrigger>
            <TabsTrigger value="all">Todos os Tempos</TabsTrigger>
          </TabsList>

          <TabsContent value={period} className="mt-6">
            <Card className="card-glow border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-primary" />
                  Top Membros
                  {leaderboard && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({leaderboard.length} membros)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  // Loading skeletons
                  Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))
                ) : leaderboard && leaderboard.length > 0 ? (
                  leaderboard.map((entry, index) => (
                    <LeaderboardCard key={entry.user_id} entry={entry} position={index + 1} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum membro no ranking ainda.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
