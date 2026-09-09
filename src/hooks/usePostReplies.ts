import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PostReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: {
    name: string;
    avatar_url: string | null;
  };
  _optimistic?: boolean;
}

export function usePostReplies(postId: string) {
  return useQuery({
    queryKey: ["post-replies", postId],
    queryFn: async () => {
      const { data: replies, error } = await supabase
        .from("post_replies")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((replies || []).map((r) => r.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await (supabase as any)
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, { name: p.name, avatar_url: p.avatar_url }])
      );

      return (replies || []).map((reply) => ({
        ...reply,
        author: profileMap.get(reply.user_id),
      })) as PostReply[];
    },
    enabled: !!postId,
  });
}

export function useCreateReply() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("post_replies")
        .insert({ post_id: postId, user_id: user.id, content })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ postId, content }) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: ["post-replies", postId] });
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      const previousReplies = queryClient.getQueryData<PostReply[]>(["post-replies", postId]);

      const profileData = queryClient.getQueryData<any>(["profile", user.id]);
      const userProfileData = queryClient.getQueryData<any>(["userProfile", user.id]);
      const authorName = profileData?.name || userProfileData?.name || user.email?.split("@")[0] || "Você";
      const authorAvatar = profileData?.avatar_url || userProfileData?.avatar_url || null;

      const optimisticReply: PostReply = {
        id: `temp-${Date.now()}`,
        post_id: postId,
        user_id: user.id,
        content,
        created_at: new Date().toISOString(),
        author: { name: authorName, avatar_url: authorAvatar },
        _optimistic: true,
      };

      queryClient.setQueryData<PostReply[]>(["post-replies", postId], (old) =>
        old ? [...old, optimisticReply] : [optimisticReply]
      );

      // Optimistically increment replies_count on the post
      const postsQueries = queryClient.getQueriesData<any[]>({ queryKey: ["posts"] });
      for (const [queryKey] of postsQueries) {
        queryClient.setQueryData<any[]>(queryKey, (old) =>
          old?.map((post) =>
            post.id === postId
              ? { ...post, replies_count: (post.replies_count ?? 0) + 1 }
              : post
          )
        );
      }

      return { previousReplies, postId, postsQueries };
    },
    onError: (_err, { postId }, context) => {
      if (context?.previousReplies !== undefined) {
        queryClient.setQueryData(["post-replies", postId], context.previousReplies);
      }
      if (context?.postsQueries) {
        for (const [queryKey, data] of context.postsQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error("Erro ao publicar resposta. Tente novamente.");
    },
    onSettled: (_, __, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["post-replies", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeleteReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ replyId, postId }: { replyId: string; postId: string }) => {
      const { error } = await supabase
        .from("post_replies")
        .delete()
        .eq("id", replyId);

      if (error) throw error;
      return { replyId, postId };
    },
    onMutate: async ({ replyId, postId }) => {
      await queryClient.cancelQueries({ queryKey: ["post-replies", postId] });

      const previousReplies = queryClient.getQueryData<PostReply[]>(["post-replies", postId]);

      queryClient.setQueryData<PostReply[]>(["post-replies", postId], (old) =>
        old?.filter((r) => r.id !== replyId)
      );

      // Decrement replies_count
      const postsQueries = queryClient.getQueriesData<any[]>({ queryKey: ["posts"] });
      for (const [queryKey] of postsQueries) {
        queryClient.setQueryData<any[]>(queryKey, (old) =>
          old?.map((post) =>
            post.id === postId
              ? { ...post, replies_count: Math.max(0, (post.replies_count ?? 1) - 1) }
              : post
          )
        );
      }

      return { previousReplies, postId, postsQueries };
    },
    onError: (_err, { postId }, context) => {
      if (context?.previousReplies !== undefined) {
        queryClient.setQueryData(["post-replies", postId], context.previousReplies);
      }
      if (context?.postsQueries) {
        for (const [queryKey, data] of context.postsQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error("Erro ao excluir comentário.");
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["post-replies", data.postId] });
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      }
    },
  });
}
