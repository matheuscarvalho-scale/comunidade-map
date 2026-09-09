import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CloudflareStreamPlayer } from "@/components/video/CloudflareStreamPlayer";

interface RecordedVideoDialogProps {
  item: { id: string; title: string; cloudflare_video_uid: string } | null;
  onClose: () => void;
}

export function RecordedVideoDialog({ item, onClose }: RecordedVideoDialogProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    const el = videoContainerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen error:", e);
    }
  }, []);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] p-0 overflow-hidden flex flex-col max-h-[90vh] [&>button.absolute]:hidden">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-base sm:text-lg leading-tight pr-2 line-clamp-1">
              {item?.title}
            </DialogTitle>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                className="shrink-0 h-8 w-8"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Fechar"
                  className="shrink-0 h-8 w-8"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>
        {item && (
          <div ref={videoContainerRef} className="w-full bg-black flex-1 min-h-0 overflow-hidden">
            <CloudflareStreamPlayer videoUid={item.cloudflare_video_uid} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
