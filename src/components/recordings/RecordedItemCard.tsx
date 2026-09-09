import { Calendar as CalendarIcon, Clock, PlayCircle, Play, Download } from "lucide-react";
import { getSignedResourceUrl } from "@/lib/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RecordedTrackItem } from "@/hooks/useRecordedTrackItems";

async function downloadMaterial(materialUrl: string, materialName: string | null) {
  const signedUrl = await getSignedResourceUrl(materialUrl);
  try {
    const response = await fetch(signedUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = materialName || "material.pdf";
    a.setAttribute("data-ga-ignore", "true");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(signedUrl, "_blank");
  }
}

interface RecordedItemCardProps {
  item: RecordedTrackItem;
  onPlay: (item: { id: string; title: string; cloudflare_video_uid: string }) => void;
}

export function RecordedItemCard({ item, onPlay }: RecordedItemCardProps) {
  const dateMatch = item.title.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const displayDate = dateMatch ? `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}` : null;
  const canPlay = !!item.cloudflare_video_uid;

  return (
    <Card className="card-glow border-border/50 hover:border-primary/50 transition-all overflow-hidden">
      <div className="flex flex-row min-h-[13rem]">
        {item.presenter_avatar ? (
          <img
            src={item.presenter_avatar}
            alt={item.presenter_name || "Palestrante"}
            className="flex-shrink-0 w-40 sm:w-48 object-cover self-stretch"
            loading="lazy"
          />
        ) : (
          <div className="flex-shrink-0 w-40 sm:w-48 self-stretch bg-primary/10 flex items-center justify-center">
            <PlayCircle className="h-10 w-10 text-primary/60" />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="px-4 pt-4 flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={
                item.source === "webinar"
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"
                  : "bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs"
              }
            >
              {item.source === "webinar" ? "Webinar" : "Gravada"}
            </Badge>
          </div>

          <CardContent className="p-4 sm:p-5 flex-1 min-w-0 flex flex-col justify-between overflow-hidden">
            <div className="min-w-0">
              <h3 className="font-semibold text-base sm:text-lg line-clamp-2">
                {item.title.replace(/\s*-?\s*\d{2}\/\d{2}\/\d{4}\s*$/, "").trim() || item.title}
              </h3>
              {item.presenter_name && (
                <p className="text-sm text-muted-foreground">com {item.presenter_name}</p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                {displayDate && (
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-primary/70" />
                    {displayDate}
                  </div>
                )}
                {item.duration_minutes ? (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary/70" />
                    {item.duration_minutes} min
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <Button
                  size="sm"
                  disabled={!canPlay}
                  onClick={() =>
                    canPlay &&
                    onPlay({
                      id: item.id,
                      title: item.title,
                      cloudflare_video_uid: item.cloudflare_video_uid!,
                    })
                  }
                  className="rounded-full gap-2"
                  title={canPlay ? undefined : "Vídeo em breve"}
                >
                  <Play className="h-4 w-4" />
                  {canPlay ? "Assistir" : "Em breve"}
                </Button>
                {item.materials.map((m, idx) => (
                  <Button
                    key={`${item.id}-material-${idx}`}
                    size="sm"
                    variant="outline"
                    className="rounded-full gap-2"
                    onClick={() => downloadMaterial(m.url, m.name)}
                  >
                    <Download className="h-4 w-4" />
                    {item.materials.length > 1 ? `Material ${idx + 1}` : "Material"}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
