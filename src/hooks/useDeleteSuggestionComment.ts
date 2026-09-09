import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDeleteSuggestionComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, suggestionId }: { commentId: string; suggestionId: string }) => {
      const { error } = await supabase
        .from("suggestion_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
      return { suggestionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["suggestion-comments", data.suggestionId] });
      queryClient.invalidateQueries({ queryKey: ["suggestion-detail", data.suggestionId] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}
