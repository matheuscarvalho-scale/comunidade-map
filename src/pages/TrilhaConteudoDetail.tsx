import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Play,
  User,
  Video,
  Filter,
  X,
  CheckCircle2,
} from "lucide-react";
import { LessonNotes } from "@/components/lessons/LessonNotes";
import { FavoriteButton } from "@/components/lessons/FavoriteButton";
import { useContentTrackBySlug, useContentTrackDetails, ContentItem } from "@/hooks/useContentTracks";
import { useContentItemProgress, useMarkContentItemComplete } from "@/hooks/useContentItemProgress";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { CloudflareStreamPlayer } from "@/components/video/CloudflareStreamPlayer";

export default function TrilhaConteudoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Try slug first, fallback to ID for legacy URLs
  const { data: trackBySlug, isLoading: isLoadingSlug } = useContentTrackBySlug(id);
  const { data: trackById, isLoading: isLoadingId } = useContentTrackDetails(
    trackBySlug ? undefined : id
  );
  
  const track = trackBySlug || trackById;
  const isLoading = isLoadingSlug || (isLoadingId && !trackBySlug);

  const { data: progressMap = {} } = useContentItemProgress(track?.id);
  const markComplete = useMarkContentItemComplete();
  
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Get unique categories from this track's items
  const availableCategories = useMemo(() => {
    if (!track?.items) return [];
    const cats = new Set(track.items.map(i => i.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [track?.items]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (!track?.items) return [];
    if (!categoryFilter) return track.items;
    return track.items.filter(item => item.category === categoryFilter);
  }, [track?.items, categoryFilter]);

  // Get the current selected item or first filtered item (free navigation)
  const currentItem = useMemo(() => {
    if (selectedItem) {
      const found = filteredItems.find(i => i.id === selectedItem);
      if (found) return found;
    }
    return filteredItems[0];
  }, [selectedItem, filteredItems]);

  const handleSelectItem = useCallback((item: ContentItem) => {
    setSelectedItem(item.id);
  }, []);

  const handleMarkComplete = useCallback(() => {
    if (!currentItem) return;
    markComplete.mutate({ itemId: currentItem.id });
    toast({ title: "✅ Conteúdo marcado como assistido!" });
  }, [currentItem, markComplete, toast]);


  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="aspect-video w-full" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!track) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Conteúdo não encontrado</h2>
          <Button onClick={() => navigate("/trilha-conteudo")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Trilha de Conteúdo
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/trilha-conteudo")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Trilha de Conteúdo
        </Button>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {track.event_name && (
              <Badge variant="secondary">{track.event_name}</Badge>
            )}
            {track.event_date && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(track.event_date), "dd MMM yyyy", { locale: ptBR })}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">{track.title}</h1>
          {track.description && (
            <p className="text-muted-foreground">{track.description}</p>
          )}
        </div>

        {/* Category Filter */}
        {availableCategories.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mr-2">Filtrar por:</span>
            {categoryFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCategoryFilter(null)}
                className="h-7 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
            {availableCategories.map((cat) => (
              <Badge
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        )}

        {/* Content Section */}
        {track.items && track.items.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content - Video Player */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="overflow-hidden">
                <AspectRatio ratio={16 / 9}>
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    {currentItem?.cloudflare_video_uid ? (
                      <CloudflareStreamPlayer videoUid={currentItem.cloudflare_video_uid} />
                    ) : (
                      <div className="text-center p-8">
                        <Play className="h-16 w-16 mx-auto text-primary/50 mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                          Em Breve
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          {currentItem 
                            ? "Este conteúdo estará disponível em breve."
                            : "Selecione um conteúdo para assistir"}
                        </p>
                      </div>
                    )}
                  </div>
                </AspectRatio>
              </Card>

              {currentItem && (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{currentItem.title}</CardTitle>
                        {currentItem.description && (
                          <CardDescription className="mt-2">{currentItem.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <FavoriteButton contentType="content_item" contentId={currentItem.id} />
                        {currentItem.category && (
                          <Badge variant="secondary">
                            {currentItem.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Official mentors (multiple) */}
                        {currentItem.official_mentors && currentItem.official_mentors.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {currentItem.official_mentors.length > 1 ? 'Palestrantes' : 'Palestrante'}
                            </p>
                            <div className="flex flex-wrap gap-3">
                              {currentItem.official_mentors.map((m) => (
                                <div key={m.id} className="flex items-center gap-2 rounded-full border border-border bg-muted/30 pl-1 pr-3 py-1">
                                  {m.avatar_url ? (
                                    <img src={m.avatar_url} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
                                  ) : (
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium leading-tight">{m.name}</p>
                                    {m.specialty && (
                                      <p className="text-[11px] text-muted-foreground leading-tight">{m.specialty}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(currentItem.presenter_name || currentItem.speaker) && (!currentItem.official_mentors || currentItem.official_mentors.length === 0) && (
                          <div className="flex items-start gap-3">
                            {currentItem.presenter_avatar ? (
                              <img
                                src={currentItem.presenter_avatar}
                                alt={currentItem.presenter_name || currentItem.speaker || ''}
                                className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground text-sm">
                                {currentItem.presenter_name || currentItem.speaker}
                              </p>
                              {currentItem.presenter_bio && (
                                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line break-words">
                                  {currentItem.presenter_bio}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {currentItem.duration_minutes && currentItem.duration_minutes > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {currentItem.duration_minutes} min
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {(currentItem.cloudflare_video_uid) && !progressMap[currentItem.id] && (
                          <Button
                            size="sm"
                            onClick={handleMarkComplete}
                            disabled={markComplete.isPending}
                            className="gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Marcar como assistido
                          </Button>
                        )}
                        {progressMap[currentItem.id] && (
                          <Badge variant="outline" className="text-green-600 border-green-600/30 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Assistido
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Personal Notes */}
              {currentItem && (
                <LessonNotes contentType="content_item" contentId={currentItem.id} />
              )}
            </div>

            {/* Sidebar - Video List */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Video className="h-5 w-5" />
                Palestras ({filteredItems.length})
              </h3>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredItems.map((item, index) => {
                  const isCompleted = progressMap[item.id];

                  return (
                    <Card
                      key={item.id}
                      className={`transition-all cursor-pointer hover:border-primary/50 ${
                        currentItem?.id === item.id ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex items-center justify-center h-8 w-8 rounded-full font-medium text-sm flex-shrink-0 ${
                            isCompleted
                              ? "bg-green-500/20 text-green-600"
                              : item.cloudflare_video_uid
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium line-clamp-2">{item.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                              {item.official_mentors && item.official_mentors.length > 0 ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="flex -space-x-1.5 flex-shrink-0">
                                    {item.official_mentors.map((m) => (
                                      m.avatar_url ? (
                                        <img key={m.id} src={m.avatar_url} alt={m.name} className="h-5 w-5 rounded-full object-cover ring-1 ring-background" />
                                      ) : (
                                        <div key={m.id} className="h-5 w-5 rounded-full bg-muted ring-1 ring-background flex items-center justify-center text-[9px] font-medium">
                                          {m.name.charAt(0)}
                                        </div>
                                      )
                                    ))}
                                  </div>
                                  <span className="truncate">
                                    {item.official_mentors.map((m) => m.name.split(' ')[0]).join(', ')}
                                  </span>
                                </div>
                              ) : (item.presenter_name || item.speaker) && (
                                <div className="flex items-center gap-1.5">
                                  {item.presenter_avatar && (
                                    <img src={item.presenter_avatar} alt={item.presenter_name || item.speaker || ''} className="h-5 w-5 rounded-full object-cover flex-shrink-0" />
                                  )}
                                  <span className="truncate">{item.presenter_name || item.speaker}</span>
                                </div>
                              )}
                              {item.duration_minutes && item.duration_minutes > 0 && (
                                <span>{item.duration_minutes}min</span>
                              )}
                            </div>
                          </div>
                          {currentItem?.id === item.id && (
                            <Play className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Empty State - No content yet */
          <Card className="p-12 text-center border-dashed">
            <Video className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Conteúdos em breve</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              As palestras e painéis serão disponibilizados após o evento. Fique ligado!
            </p>
            <Badge variant="outline" className="mt-4 text-yellow-600 border-yellow-600/50">
              <Clock className="h-3 w-3 mr-1" />
              Em preparação
            </Badge>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
