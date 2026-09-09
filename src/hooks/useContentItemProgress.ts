import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useContentItemProgress(trackId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content-item-progress", trackId, user?.id],
    queryFn: async () => {
      if (!trackId || !user) return {};

      // Get all item IDs via secure view (hides video URLs)
      const { data: items } = await (supabase as any)
        .from("content_items_public")
        .select("id")
        .eq("track_id", trackId)
        .order("order_index", { ascending: true });

      if (!items || items.length === 0) return {};

      const itemIds = items.map((i) => i.id);

      const { data: progress } = await supabase
        .from("content_item_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("item_id", itemIds);

      const map: Record<string, boolean> = {};
      (progress || []).forEach((p) => {
        if (p.completed) map[p.item_id] = true;
      });
      return map;
    },
    enabled: !!trackId && !!user,
  });
}

export function useMarkContentItemComplete() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("content_item_progress")
        .upsert(
          {
            user_id: user.id,
            item_id: itemId,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,item_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-item-progress"] });
    },
  });
}
