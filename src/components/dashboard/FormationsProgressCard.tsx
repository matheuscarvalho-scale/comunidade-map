import { BookOpen, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { FormationWithProgress } from "@/hooks/useFormations";

interface FormationsProgressCardProps {
  formations: FormationWithProgress[];
}

export function FormationsProgressCard({ formations }: FormationsProgressCardProps) {
  // Filter out "coming soon" formations
  const availableFormations = formations.filter(f => !f.is_coming_soon);
  // Get the most recently started formation (one with progress but not complete)
  const inProgress = availableFormations.filter(f => f.progressPercent > 0 && f.progressPercent < 100);
  const nextToStart = availableFormations.find(f => f.progressPercent === 0);
  
  // Show formations with progress first, then the next one to start
  const formationsToShow = [...inProgress];
  if (formationsToShow.length < 3 && nextToStart) {
    formationsToShow.push(nextToStart);
  }
  
  const displayFormations = formationsToShow.slice(0, 3);
  
  // Calculate overall progress
  const totalLessons = availableFormations.reduce((acc, f) => acc + f.totalLessons, 0);
  const completedLessons = availableFormations.reduce((acc, f) => acc + f.completedLessons, 0);
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  if (availableFormations.length === 0) return null;

  return (
    <Card className="card-glow border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            Trilha de Formações
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {overallProgress}% concluído
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso Geral</span>
            <span className="font-medium">{completedLessons}/{totalLessons} aulas</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Individual Formations */}
        <div className="space-y-3 pt-2">
          {displayFormations.map((formation) => (
            <Link 
              key={formation.id} 
              to={`/formacoes/${formation.id}`}
              className="block"
            >
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                {formation.thumbnail_url ? (
                  <img 
                    src={formation.thumbnail_url} 
                    alt={formation.title}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{formation.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={formation.progressPercent} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formation.progressPercent}%
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        <Button asChild variant="outline" className="w-full rounded-full">
          <Link to="/formacoes">
            Ver Todas as Formações <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
