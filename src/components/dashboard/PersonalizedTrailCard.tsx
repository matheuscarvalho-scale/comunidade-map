import { Sparkles, RefreshCw, ArrowRight, BookOpen, Video, Layout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecommendations, useGenerateRecommendations, type Recommendation } from "@/hooks/useRecommendations";
import { Link } from "react-router-dom";

const typeConfig: Record<string, { icon: typeof BookOpen; label: string; defaultRoute: string; color: string }> = {
  formation: { icon: BookOpen, label: "Formação", defaultRoute: "/formacoes", color: "text-blue-500" },
  webinar: { icon: Video, label: "Webinar", defaultRoute: "/webinars", color: "text-purple-500" },
  track: { icon: Layout, label: "Trilha", defaultRoute: "/trilha-conteudo", color: "text-emerald-500" },
};

const priorityColor: Record<string, string> = {
  alta: "border-red-500/30 text-red-500",
  media: "border-yellow-500/30 text-yellow-500",
  baixa: "border-green-500/30 text-green-500",
};

function RecommendationItem({ rec }: { rec: Recommendation }) {
  const config = typeConfig[rec.type] || typeConfig.formation;
  const Icon = config.icon;
  const route = rec.route || config.defaultRoute;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 transition-colors hover:bg-muted/40">
      <div className={`mt-0.5 rounded-md bg-muted p-2 ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{rec.title}</span>
          <Badge variant="outline" className={`text-xs ${priorityColor[rec.priority] || ""}`}>
            {rec.priority}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.reason}</p>
      </div>
      <Button asChild variant="ghost" size="icon" className="shrink-0">
        <Link to={route}>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export function PersonalizedTrailCard() {
  const { data, isLoading } = useRecommendations();
  const generate = useGenerateRecommendations();

  // No data yet - show generate button
  if (!isLoading && !data) {
    return (
      <Card className="card-glow border-border/50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Sparkles className="h-10 w-10 text-primary mb-3" />
          <h3 className="font-semibold text-lg">Trilha Personalizada com IA</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Gere recomendações personalizadas baseadas no seu perfil, objetivos e atividade na plataforma.
          </p>
          <Button className="mt-4 gap-2" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generate.isPending ? "Analisando seu perfil..." : "Gerar Minha Trilha"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="card-glow border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const nextStep = data?.next_step;
  const nextConfig = nextStep ? typeConfig[nextStep.type] || typeConfig.formation : null;

  return (
    <Card className="card-glow border-border/50">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Sua Trilha Personalizada
        </CardTitle>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => generate.mutate()} disabled={generate.isPending}>
          <RefreshCw className={`h-3.5 w-3.5 ${generate.isPending ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Step */}
        {nextStep && nextConfig && (
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-primary mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              PRÓXIMO PASSO RECOMENDADO
            </div>
            <h4 className="font-semibold">{nextStep.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{nextStep.description}</p>
            <Button asChild size="sm" className="mt-3 gap-1.5">
              <Link to={nextStep.route || nextConfig.defaultRoute}>
                <nextConfig.icon className="h-3.5 w-3.5" />
                Ir para {nextConfig.label}
              </Link>
            </Button>
          </div>
        )}

        {/* Recommendations list */}
        <div className="space-y-2">
          {(data?.recommendations || []).slice(0, 4).map((rec, i) => (
            <RecommendationItem key={i} rec={rec} />
          ))}
        </div>

        {data?.generated_at && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            Atualizado em {new Date(data.generated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
