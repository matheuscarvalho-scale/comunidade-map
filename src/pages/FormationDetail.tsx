import { MainLayout } from "@/components/layout/MainLayout";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lock,
  Play,
  ChevronDown,
  Clock,
  Award,
  Loader2,
  Download
} from "lucide-react";
import { useFormationDetails } from "@/hooks/useFormations";
import { useGenerateCertificate } from "@/hooks/useCertificates";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function FormationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useFormationDetails(id);
  const generateCertificate = useGenerateCertificate();
  const [openModules, setOpenModules] = useState<string[]>([]);

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Formação não encontrada</h2>
          <Button onClick={() => navigate("/formacoes")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Formações
          </Button>
        </div>
      </MainLayout>
    );
  }

  const { formation, modules, progressPercent, completedLessons, totalLessons } = data;

  // Find first incomplete lesson
  const findFirstIncomplete = () => {
    for (const module of modules) {
      for (const lesson of module.lessons) {
        if (!lesson.isCompleted && !lesson.isLocked) {
          return lesson.id;
        }
      }
    }
    return modules[0]?.lessons[0]?.id;
  };

  const firstIncompleteLesson = findFirstIncomplete();

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": formation.title,
    "description": formation.description,
    "provider": {
      "@type": "Organization",
      "name": "MAP Acelera",
      "sameAs": "https://acelera.mapeducacao.com",
    },
  };

  return (
    <MainLayout>
      <SEOHead
        title={formation.title}
        description={formation.description?.slice(0, 155)}
        canonical={`/formacoes/${id}`}
        jsonLd={courseJsonLd}
        noIndex
      />
      <div className="space-y-6 animate-fade-in">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/formacoes")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Formações
        </Button>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <Badge variant="secondary" className="mb-3">
              {formation.level === "iniciante" && "Iniciante"}
              {formation.level === "intermediário" && "Intermediário"}
              {formation.level === "avançado" && "Avançado"}
              {formation.level === "todos" && "Todos os Níveis"}
            </Badge>
            <h1 className="text-3xl font-bold mb-2">{formation.title}</h1>
            <p className="text-muted-foreground mb-4">{formation.description}</p>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span>{modules.length} módulos</span>
              </div>
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-muted-foreground" />
                <span>{totalLessons} aulas</span>
              </div>
              {formation.duration_hours != null && formation.duration_hours > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formation.duration_hours}h de conteúdo</span>
                </div>
              )}
              {(() => {
                const totalMinutes = modules.reduce((acc, m) => 
                  acc + m.lessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0), 0
                );
                const remainingMinutes = modules.reduce((acc, m) => 
                  acc + m.lessons.filter(l => !l.isCompleted).reduce((sum, l) => sum + (l.duration_minutes || 0), 0), 0
                );
                if (totalMinutes > 0 && remainingMinutes > 0 && remainingMinutes < totalMinutes) {
                  const hours = Math.floor(remainingMinutes / 60);
                  const mins = remainingMinutes % 60;
                  return (
                    <div className="flex items-center gap-2 text-primary">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">
                        {hours > 0 ? `${hours}h ${mins > 0 ? `${mins}min` : ""}` : `${mins}min`} restantes
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          <Card className="w-full lg:w-80 shrink-0">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Seu progresso</span>
                    <span className="font-semibold text-primary">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {completedLessons} de {totalLessons} aulas concluídas
                  </p>
                </div>

                {progressPercent === 100 ? (
                  <Button 
                    className="w-full gap-2" 
                    onClick={() => generateCertificate.mutate(formation.id)}
                    disabled={generateCertificate.isPending}
                  >
                    {generateCertificate.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Award className="h-4 w-4" />
                    )}
                    Gerar Certificado
                  </Button>
                ) : firstIncompleteLesson && (
                  <Link to={`/formacoes/aula/${firstIncompleteLesson}`}>
                    <Button className="w-full gap-2">
                      <Play className="h-4 w-4" />
                      {progressPercent === 0 ? "Começar Formação" : "Continuar"}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modules */}
        <div className="space-y-4">
          {modules.map((module, moduleIndex) => (
            <Collapsible 
              key={module.id}
              open={openModules.includes(module.id)}
              onOpenChange={() => toggleModule(module.id)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/20 text-primary font-bold">
                          {moduleIndex + 1}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                          <CardDescription>{module.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium">
                            {module.completedLessons}/{module.totalLessons}
                          </p>
                          <p className="text-xs text-muted-foreground">aulas</p>
                        </div>
                        {module.completedLessons === module.totalLessons && module.totalLessons > 0 ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <ChevronDown className={`h-5 w-5 transition-transform ${
                            openModules.includes(module.id) ? "rotate-180" : ""
                          }`} />
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={module.totalLessons > 0 ? (module.completedLessons / module.totalLessons) * 100 : 0} 
                      className="h-1 mt-4" 
                    />
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <Link 
                          key={lesson.id}
                          to={lesson.isLocked ? "#" : `/formacoes/aula/${lesson.id}`}
                          className={lesson.isLocked ? "pointer-events-none" : ""}
                        >
                          <div className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                            lesson.isCompleted 
                              ? "bg-green-500/10 border-green-500/30" 
                              : lesson.isLocked
                              ? "bg-muted/30 opacity-50 cursor-not-allowed"
                              : "bg-muted/50 hover:bg-muted hover:border-primary/50"
                          }`}>
                            <div className="flex items-center gap-4">
                              {lesson.isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                              ) : lesson.isLocked ? (
                                <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <Play className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                              <div>
                                <p className="font-medium">
                                  {lessonIndex + 1}. {lesson.title}
                                </p>
                                {lesson.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {lesson.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {lesson.duration_minutes > 0 && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {lesson.duration_minutes}min
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
