import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PlayCircle } from "lucide-react";

interface ContentItemStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string | null;
  trackTitle: string;
}

interface ItemStat {
  item_id: string;
  item_title: string;
  presenter_name: string | null;
  duration_minutes: number | null;
  users_completed: number;
}

export function ContentItemStatsModal({ open, onOpenChange, trackId, trackTitle }: ContentItemStatsModalProps) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["content-item-completion-stats", trackId],
    enabled: open && !!trackId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_content_item_completion_stats", {
        p_track_id: trackId ?? undefined,
      });
      if (error) throw error;
      return data as ItemStat[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            {trackTitle} — por conteúdo
          </DialogTitle>
          <DialogDescription>
            Quantos membros concluíram cada palestra/mentoria desta trilha
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : items?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conteúdo</TableHead>
                  <TableHead>Apresentador</TableHead>
                  <TableHead className="text-right">Concluíram</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell className="font-medium">{item.item_title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.presenter_name || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.users_completed > 0 ? "default" : "outline"}>
                        {item.users_completed}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Sem conteúdos nesta trilha</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
