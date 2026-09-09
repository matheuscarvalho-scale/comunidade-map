import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  type: string;
  file_url: string | null;
  external_url: string | null;
  thumbnail: string | null;
  downloads_count: number;
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
  /** True for materials pulled in from a lesson (content_items) — edited/removed from the lesson itself, not here. */
  readOnly?: boolean;
}

export function useResources(includeInactive = false) {
  return useQuery({
    queryKey: ["resources", includeInactive],
    queryFn: async () => {
      let query = supabase
        .from("resources")
        .select("*")
        .order("downloads_count", { ascending: false })
        .order("title", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Resource[];
    }
  });
}

export function useIncrementDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resourceId: string) => {
      // Get current count
      const { data: resource } = await supabase
        .from("resources")
        .select("downloads_count")
        .eq("id", resourceId)
        .single();

      // Note: This would ideally be an RPC call, but we'll do a simple update
      // In production, consider adding an RPC function for atomic increment
      const { error } = await supabase
        .from("resources")
        .update({ downloads_count: (resource?.downloads_count || 0) + 1 })
        .eq("id", resourceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    }
  });
}
