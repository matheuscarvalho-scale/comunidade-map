import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ContentType = "formation_lesson" | "content_item";

// ─── Notes ───
export function useContentNote(contentType: ContentType, contentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content-note", contentType, contentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_content_notes")
        .select("*")
        .eq("user_id", user!.id)
        .eq("content_type", contentType)
        .eq("content_id", contentId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!contentId,
  });
}

export function useSaveContentNote() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentType, contentId, note }: { contentType: ContentType; contentId: string; note: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_content_notes")
        .upsert(
          { user_id: user.id, content_type: contentType, content_id: contentId, note },
          { onConflict: "user_id,content_type,content_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["content-note", vars.contentType, vars.contentId] });
    },
  });
}

// ─── Favorites ───
export function useContentFavorite(contentType: ContentType, contentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content-favorite", contentType, contentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_content_favorites")
        .select("id")
        .eq("user_id", user!.id)
        .eq("content_type", contentType)
        .eq("content_id", contentId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!contentId,
  });
}

export function useToggleContentFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentType, contentId, isFavorited }: { contentType: ContentType; contentId: string; isFavorited: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      if (isFavorited) {
        const { error } = await supabase
          .from("user_content_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("content_type", contentType)
          .eq("content_id", contentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_content_favorites")
          .insert({ user_id: user.id, content_type: contentType, content_id: contentId });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["content-favorite", vars.contentType, vars.contentId] });
      qc.invalidateQueries({ queryKey: ["content-favorites-list"] });
    },
  });
}

// ─── List all favorites ───
export function useContentFavoritesList(contentType?: ContentType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content-favorites-list", contentType],
    queryFn: async () => {
      let query = supabase
        .from("user_content_favorites")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (contentType) query = query.eq("content_type", contentType);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
