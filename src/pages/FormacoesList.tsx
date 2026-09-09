import { MainLayout } from "@/components/layout/MainLayout";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Rocket,
  BookOpen,
  TrendingUp,
  BarChart3,
  GraduationCap,
  ChevronRight,
  Users,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useFormations } from "@/hooks/useFormations";
import { Link } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const levelConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  iniciante: { icon: BookOpen, color: "bg-green-500", label: "Iniciante" },
  intermediário: { icon: TrendingUp, color: "bg-blue-500", label: "Intermediário" },
  avançado: { icon: BarChart3, color: "bg-purple-500", label: "Avançado" },
  todos: { icon: Users, color: "bg-amber-500", label: "Todos os Níveis" },
};

export default function FormacoesList() {
  const { data: formations, isLoading } = useFormations();
  const { data: isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Reorder mutation (admin only)
  const reorderMutation = useMutation({
    mutationFn: async ({ formationId, direction }: { formationId: string; direction: "up" | "down" }) => {
      if (!formations) return;
      const sorted = [...formations].sort((a, b) => a.order_index - b.order_index);
      const idx = sorted.findIndex(f => f.id === formationId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;

      const currentItem = sorted[idx];
      const swapItem = sorted[swapIdx];

      const { error: e1 } = await supabase
        .from("formations")
        .update({ order_index: swapItem.order_index })
        .eq("id", currentItem.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("formations")
        .update({ order_index: currentItem.order_index })
        .eq("id", swapItem.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-formations"] });
    },
    onError: () => {
      toast({ title: "Erro ao reordenar", variant: "destructive" });
    },
  });
  const totalLessons = formations?.reduce((acc, f) => acc + f.totalLessons, 0) || 0;
  const completedLessons = formations?.reduce((acc, f) => acc + f.completedLessons, 0) || 0;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <MainLayout>
      <SEOHead
        title="Formações"
        description="Explore todas as formações em e-commerce, marketplaces e estratégia disponíveis no MAP Acelera e acompanhe seu progresso."
        canonical="/formacoes"
        noIndex
      />
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Rocket className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Formações</h1>
            </div>
            <p className="text-muted-foreground">
              Seu caminho para o sucesso nos marketplaces
            </p>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-2">Seu Progresso Geral</h2>
                <p className="text-muted-foreground mb-4">
                  Continue estudando para dominar todos os fundamentos do e-commerce.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Aulas concluídas</span>
                      <span className="font-semibold text-primary">{overallProgress}%</span>
                    </div>
                    <Progress value={overallProgress} className="h-2" />
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {completedLessons}/{totalLessons} aulas
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formations Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-32 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {formations?.map((formation, index) => {
              const config = levelConfig[formation.level] || levelConfig.todos;
              const IconComponent = config.icon;
              const isComingSoon = (formation as any).is_coming_soon === true;

              const cardContent = (
                <Card className={`h-full flex flex-col transition-all overflow-hidden relative ${isComingSoon ? 'pointer-events-none' : 'card-glow hover:border-primary/50 cursor-pointer group'}`}>
                  {isComingSoon && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <Badge className="bg-yellow-500 text-white text-sm px-4 py-1.5 shadow-lg">
                        Em breve
                      </Badge>
                    </div>
                  )}
                  {/* Admin reorder buttons */}
                  {isAdmin && !isComingSoon && (
                    <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm"
                        disabled={reorderMutation.isPending || index === 0}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          reorderMutation.mutate({ formationId: formation.id, direction: "up" });
                        }}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm"
                        disabled={reorderMutation.isPending || index === (formations?.length || 1) - 1}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          reorderMutation.mutate({ formationId: formation.id, direction: "down" });
                        }}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <div className={`flex flex-col flex-1 ${isComingSoon ? 'blur-[3px] opacity-75' : ''}`}>
                  {/* Thumbnail */}
                  <div className="h-32 flex items-center justify-center relative overflow-hidden bg-muted">
                    {formation.thumbnail_url ? (
                      <img 
                        src={formation.thumbnail_url} 
                        alt={formation.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <IconComponent className={`h-16 w-16 ${config.color.replace("bg-", "text-")} opacity-50`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    {!isComingSoon && (
                      <Badge 
                        className={`absolute top-3 right-3 ${config.color} text-white`}
                      >
                        {config.label}
                      </Badge>
                    )}
                  </div>
                  
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                      {formation.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {formation.description}
                    </CardDescription>
                  </CardHeader>

                  {/* Presenter Info - hidden for Mentorias (acts like Webinars) */}
                  {(formation as any).presenter_name && !/mentoria/i.test(formation.title) && (
                    <div className="px-6 pb-2 flex items-center gap-2">
                      {(formation as any).presenter_avatar ? (
                        <img src={(formation as any).presenter_avatar} alt="" className="h-8 w-8 min-w-[2rem] rounded-full object-cover aspect-square" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{(formation as any).presenter_name}</p>
                        {(formation as any).presenter_bio && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{(formation as any).presenter_bio}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <CardContent className="mt-auto">
                    {isComingSoon ? (
                      <div className="flex items-center justify-center text-sm text-muted-foreground py-2">
                        <Clock className="h-4 w-4 mr-2" />
                        Conteúdo em preparação
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {formation.totalLessons} aulas
                            {(formation as any).duration_hours > 0 && (
                              <span className="ml-1">· {(formation as any).duration_hours}h</span>
                            )}
                          </span>
                          <span className="font-medium text-primary">
                            {formation.progressPercent}%
                          </span>
                        </div>
                        <Progress value={formation.progressPercent} className="h-2" />
                        
                        <Button 
                          variant="ghost" 
                          className="w-full mt-2 group-hover:bg-primary/10"
                        >
                          {formation.progressPercent === 0 
                            ? "Começar Formação" 
                            : formation.progressPercent === 100 
                            ? "Revisar Formação"
                            : "Continuar"
                          }
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                  </div>
                </Card>
              );

              if (isComingSoon) {
                return <div key={formation.id}>{cardContent}</div>;
              }

              return (
                <Link key={formation.id} to={`/formacoes/${formation.id}`}>
                  {cardContent}
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!formations || formations.length === 0) && (
          <Card className="p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma formação disponível</h3>
            <p className="text-muted-foreground">
              As formações estarão disponíveis em breve.
            </p>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
