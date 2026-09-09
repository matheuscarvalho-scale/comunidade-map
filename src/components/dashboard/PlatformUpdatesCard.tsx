import { Sparkles, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlatformUpdate {
  id: string;
  title: string;
  description: string;
  type: string;
  created_at: string;
}

interface PlatformUpdatesCardProps {
  updates: PlatformUpdate[];
}

export function PlatformUpdatesCard({ updates }: PlatformUpdatesCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case 'success': return 'Novo';
      case 'info': return 'Info';
      case 'warning': return 'Aviso';
      default: return 'Novo';
    }
  };

  return (
    <Card className="card-glow border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          Últimas Atualizações
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Acompanhe as novidades e melhorias da plataforma
        </p>
      </CardHeader>
      <CardContent>
        {updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atualização recente.</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-primary/30" />

            <div className="space-y-6">
              {updates.map((update, index) => (
                <div key={update.id} className="relative pl-7">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 ${
                      index === 0
                        ? "bg-primary border-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                        : "bg-background border-muted-foreground/40"
                    }`}
                  />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{update.title}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/30 font-medium"
                      >
                        {getBadgeLabel(update.type)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {update.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                      <Calendar className="h-3 w-3" />
                      {formatDate(update.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
