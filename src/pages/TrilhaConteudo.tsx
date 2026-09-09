import { MainLayout } from "@/components/layout/MainLayout";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Video,
  PlayCircle,
  ChevronRight,
  Tv,
  FileVideo,
  User,
  Clock,
} from "lucide-react";
import { useContentTracks } from "@/hooks/useContentTracks";
import { Link } from "react-router-dom";

export default function TrilhaConteudo() {
  const { data: allTracks, isLoading } = useContentTracks();
  const HIDDEN_SLUGS = ["mentorias", "webinars"];
  const tracks = allTracks?.filter(
    (t) => !HIDDEN_SLUGS.includes((t.slug || "").toLowerCase())
  );

  return (
    <MainLayout>
      <SEOHead
        title="Trilha de Conteúdo"
        description="Acesse trilhas estratégicas de conteúdo, webinars e mentorias gravadas selecionadas para acelerar seu e-commerce."
        canonical="/trilha-conteudo"
        noIndex
      />
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Tv className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Trilha de Conteúdo</h1>
            </div>
            <p className="text-muted-foreground">
              Acesso livre a palestras, eventos e conteúdos especiais
            </p>
          </div>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : tracks && tracks.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {tracks.map((track) => {
              const isComingSoon = track.is_coming_soon === true;

              const cardContent = (
                <Card className={`h-full transition-all overflow-hidden relative ${isComingSoon ? 'pointer-events-none' : 'card-glow hover:border-primary/50 cursor-pointer group'}`}>
                  {isComingSoon && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <Badge className="bg-yellow-500 text-white text-sm px-4 py-1.5 shadow-lg">
                        Em breve
                      </Badge>
                    </div>
                  )}
                  <div className={isComingSoon ? 'blur-[3px] opacity-75' : ''}>
                    {/* Thumbnail */}
                    <div className="h-44 flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                      {track.thumbnail_url ? (
                        <img 
                          src={track.thumbnail_url} 
                          alt={track.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <FileVideo className="h-20 w-20 text-primary/40" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                      {!isComingSoon && (
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-primary/90">
                            <PlayCircle className="h-3 w-3 mr-1" />
                            Acesso Livre
                          </Badge>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 right-3">
                        <h2 className="text-xl font-bold text-white drop-shadow-lg">
                          {track.title}
                        </h2>
                      </div>
                    </div>
                    
                    <CardHeader className="pb-2">
                      {track.description && (
                        <CardDescription className="line-clamp-2">
                          {track.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    
                    <CardContent>
                      {track.presenter_name && (
                        <div className="flex items-center gap-3 mb-3">
                          {track.presenter_avatar ? (
                            <img src={track.presenter_avatar} alt={track.presenter_name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{track.presenter_name}</p>
                            {track.presenter_bio && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{track.presenter_bio}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {isComingSoon ? (
                        <div className="flex items-center justify-center text-sm text-muted-foreground py-2">
                          <Clock className="h-4 w-4 mr-2" />
                          Conteúdo em preparação
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-3 text-sm">
                          <span className="flex items-center text-muted-foreground">
                            <PlayCircle className="h-4 w-4 mr-1.5" />
                            {track.itemsCount} {track.itemsCount === 1 ? "aula" : "aulas"}
                          </span>
                          <span className="flex items-center text-primary font-medium">
                            Ver Conteúdos
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </div>
                </Card>
              );

              if (isComingSoon) {
                return <div key={track.id}>{cardContent}</div>;
              }

              return (
                <Link key={track.id} to={`/trilha-conteudo/${track.slug || track.id}`}>
                  {cardContent}
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum conteúdo disponível</h3>
            <p className="text-muted-foreground">
              Os conteúdos estarão disponíveis em breve.
            </p>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}