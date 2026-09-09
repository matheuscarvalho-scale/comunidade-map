import { PlayCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { ContinueFormationData } from "@/hooks/useContinueFormation";

interface ContinueFormationCardProps {
  data: ContinueFormationData;
}

export function ContinueFormationCard({ data }: ContinueFormationCardProps) {
  return (
    <Card className="card-glow border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PlayCircle className="h-5 w-5 text-primary" />
          Continue de Onde Parou
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Thumbnail */}
          {data.formation.thumbnail_url ? (
            <img
              src={data.formation.thumbnail_url}
              alt={data.formation.title}
              className="h-32 w-full rounded-lg object-cover sm:w-48 flex-shrink-0"
            />
          ) : (
            <div className="h-32 w-full sm:w-48 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <PlayCircle className="h-12 w-12 text-primary/40" />
            </div>
          )}
          
          <div className="flex flex-1 flex-col justify-between min-w-0">
            <div>
              <p className="text-sm text-muted-foreground">{data.formation.title}</p>
              <h3 className="font-semibold mt-1 line-clamp-1">{data.lesson.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Módulo: {data.module.title}
              </p>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso da Formação</span>
                <span className="font-medium text-primary">{data.progressPercent}%</span>
              </div>
              <Progress value={data.progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {data.completedLessons} de {data.totalLessons} aulas concluídas
              </p>
            </div>
          </div>
        </div>
        
        <Button asChild className="mt-4 w-full rounded-full" variant="default">
          <Link to={`/formacoes/aula/${data.lesson.id}`}>
            Continuar Aula <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
