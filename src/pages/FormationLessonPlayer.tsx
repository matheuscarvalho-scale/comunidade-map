import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
  BookOpen,
  Users,
} from "lucide-react";
import { LessonNotes } from "@/components/lessons/LessonNotes";
import { CloudflareStreamPlayer } from "@/components/video/CloudflareStreamPlayer";
import { FavoriteButton } from "@/components/lessons/FavoriteButton";
import { useFormationLessonDetails, useMarkFormationLessonComplete } from "@/hooks/useFormations";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

export default function FormationLessonPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading } = useFormationLessonDetails(id);
  const markComplete = useMarkFormationLessonComplete();

  const handleMarkComplete = async () => {
    if (!id) return;

    try {
      await markComplete.mutateAsync({ lessonId: id });
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#BFFF00", "#9ACD32", "#32CD32"],
      });

      toast({
        title: "Aula concluída! 🎉",
        description: "Parabéns! Continue aprendendo.",
      });

      // Navigate to next lesson if available
      if (data?.nextLesson) {
        setTimeout(() => {
          navigate(`/formacoes/aula/${data.nextLesson.id}`);
        }, 1500);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar a aula como concluída.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Aula não encontrada</h2>
          <Button onClick={() => navigate("/formacoes")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Formações
          </Button>
        </div>
      </MainLayout>
    );
  }

  const { lesson, module, formation, isCompleted, prevLesson, nextLesson } = data;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <Link to="/formacoes" className="hover:text-foreground transition-colors">
            Formações
          </Link>
          <span>/</span>
          <Link to={`/formacoes/${formation.id}`} className="hover:text-foreground transition-colors">
            {formation.title}
          </Link>
          <span>/</span>
          <span className="text-foreground">{module.title}</span>
        </div>

        {/* Back to Formation */}
        <Button variant="ghost" onClick={() => navigate(`/formacoes/${formation.id}`)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para {formation.title}
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <Card className="overflow-hidden">
              {lesson.cloudflare_video_uid ? (
                <CloudflareStreamPlayer videoUid={lesson.cloudflare_video_uid} />
              ) : (
                <AspectRatio ratio={16 / 9}>
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    {lesson.video_url ? (
                      lesson.video_url.includes('youtube') || lesson.video_url.includes('vimeo') || lesson.video_url.includes('embed') ? (
                        <iframe
                          src={lesson.video_url}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      ) : (
                        <video
                          key={lesson.id}
                          src={lesson.video_url}
                          className="w-full h-full object-contain bg-black"
                          controls
                          controlsList="nodownload"
                          preload="metadata"
                          playsInline
                        />
                      )
                    ) : (
                      <div className="text-center">
                        <Play className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Vídeo em breve disponível
                        </p>
                      </div>
                    )}
                  </div>
                </AspectRatio>
              )}
            </Card>

            {/* Lesson Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{module.title}</Badge>
                      {lesson.duration_minutes > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {lesson.duration_minutes} min
                        </Badge>
                      )}
                      {isCompleted && (
                        <Badge className="bg-green-500 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Concluída
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl">{lesson.title}</CardTitle>
                  </div>
                  <FavoriteButton contentType="formation_lesson" contentId={lesson.id} />
                </div>
                {lesson.description && (
                  <CardDescription className="text-base mt-2">
                    {lesson.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!isCompleted && (
                  <Button 
                    onClick={handleMarkComplete}
                    disabled={markComplete.isPending}
                    className="gap-2"
                    size="lg"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    {markComplete.isPending ? "Salvando..." : "Marcar como Concluída"}
                  </Button>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  {prevLesson ? (
                    <Link to={`/formacoes/aula/${prevLesson.id}`}>
                      <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Aula anterior</span>
                      </Button>
                    </Link>
                  ) : (
                    <div />
                  )}

                  {nextLesson ? (
                    <Link to={`/formacoes/aula/${nextLesson.id}`}>
                      <Button className="gap-2">
                        <span className="hidden sm:inline">Próxima aula</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Link to={`/formacoes/${formation.id}`}>
                      <Button className="gap-2">
                        Finalizar Módulo
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Sobre a Formação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">{formation.title}</h3>
                  <p className="text-sm text-muted-foreground">{formation.description}</p>
                </div>
                <Link to={`/formacoes/${formation.id}`}>
                  <Button variant="outline" className="w-full">
                    Ver Formação Completa
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Presenter Info - fallback from lesson to formation */}
            {(() => {
              const presenterName = lesson.presenter_name || formation.presenter_name;
              const presenterAvatar = lesson.presenter_avatar || formation.presenter_avatar;
              const presenterBio = lesson.presenter_bio || formation.presenter_bio;
              if (!presenterName) return null;
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Apresentador
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      {presenterAvatar ? (
                        <img
                          src={presenterAvatar}
                          alt={presenterName}
                          className="h-14 w-14 rounded-full object-cover border-2 border-primary/20"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold">{presenterName}</p>
                      </div>
                    </div>
                    {presenterBio && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {presenterBio}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Personal Notes */}
            <LessonNotes contentType="formation_lesson" contentId={lesson.id} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
