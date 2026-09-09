import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Newspaper, 
  ExternalLink, 
  RefreshCw,
  Calendar,
  Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source?: string;
  thumbnail?: string;
}

function NewsThumbnail({ src, alt }: { src?: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  const showImage = Boolean(src) && !hasError;

  return (
    <div className="relative h-48 overflow-hidden bg-muted">
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Newspaper className="h-8 w-8" />
            <span className="text-xs font-medium">Sem imagem</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Noticias() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchNews = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setIsRefreshing(true);
      }

      const { data, error } = await supabase.functions.invoke('fetch-rss');

      if (error) {
        throw error;
      }

      if (data?.items) {
        setNews(data.items);
        if (showRefreshToast) {
          toast({
            title: "Notícias atualizadas! 📰",
            description: `${data.items.length} notícias carregadas.`,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: "Erro ao carregar notícias",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <MainLayout>
      <SEOHead
        title="Notícias do E-commerce"
        description="Fique por dentro das principais notícias de e-commerce, marketplaces e marketing digital atualizadas diariamente."
        canonical="/noticias"
        noIndex
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Newspaper className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Notícias do E-commerce</h1>
            </div>
            <p className="text-muted-foreground">
              Fique por dentro das últimas novidades do mercado
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => fetchNews(true)}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* News Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : news.length === 0 ? (
          <Card className="card-glow">
            <CardContent className="py-12 text-center">
              <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma notícia disponível</p>
              <p className="text-muted-foreground">
                Tente atualizar em alguns instantes
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item, index) => (
              <Card 
                key={index} 
                className="card-glow overflow-hidden hover:border-primary/50 transition-all group"
              >
                <NewsThumbnail src={item.thumbnail} alt={item.title} />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.source && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Globe className="h-3 w-3" />
                        {item.source}
                      </Badge>
                    )}
                    {item.pubDate && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.pubDate)}
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {item.description}
                    </p>
                  )}
                  
                  <Button 
                    asChild 
                    variant="ghost" 
                    size="sm" 
                    className="gap-2 w-full justify-center mt-2"
                  >
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Ler notícia completa
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
