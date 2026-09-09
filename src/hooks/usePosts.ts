import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CommunityPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  likes_count: number;
  replies_count: number;
  views_count: number;
  created_at: string;
  author?: {
    name: string;
    avatar_url: string | null;
  };
  isLiked?: boolean;
  _optimistic?: boolean;
}

export function usePosts(filter?: string, category?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["posts", filter, category, user?.id],
    queryFn: async () => {
      let query = supabase.from("community_posts").select("*");

      if (category) {
        query = query.eq("category", category);
      }

      if (filter === "Populares") {
        query = query.order("likes_count", { ascending: false });
      } else if (filter === "Sem Respostas") {
        query = query.eq("replies_count", 0).order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data: posts, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((posts || []).map((p) => p.user_id))];
      const { data: profiles } = await (supabase as any)
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, { name: p.name, avatar_url: p.avatar_url }])
      );

      let userLikes: string[] = [];
      if (user) {
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id);
        userLikes = (likes || []).map((l) => l.post_id);
      }

      return (posts || []).map((post) => ({
        ...post,
        likes_count: post.likes_count ?? 0,
        replies_count: post.replies_count ?? 0,
        views_count: post.views_count ?? 0,
        author: profileMap.get(post.user_id),
        isLiked: userLikes.includes(post.id),
      })) as CommunityPost[];
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, content, category }: { title: string; content: string; category: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("community_posts")
        .insert({ user_id: user.id, title, content, category })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ title, content, category }) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      const queriesData = queryClient.getQueriesData<CommunityPost[]>({ queryKey: ["posts"] });

      // Get user profile for author info
      const profileData = queryClient.getQueryData<any>(["profile", user.id]);
      const userProfileData = queryClient.getQueryData<any>(["userProfile", user.id]);
      const authorName = profileData?.name || userProfileData?.name || user.email?.split("@")[0] || "Você";
      const authorAvatar = profileData?.avatar_url || userProfileData?.avatar_url || null;

      const optimisticPost: CommunityPost = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        title,
        content,
        category,
        likes_count: 0,
        replies_count: 0,
        views_count: 0,
        created_at: new Date().toISOString(),
        author: { name: authorName, avatar_url: authorAvatar },
        isLiked: false,
        _optimistic: true,
      };

      for (const [queryKey] of queriesData) {
        queryClient.setQueryData<CommunityPost[]>(queryKey, (old) =>
          old ? [optimisticPost, ...old] : [optimisticPost]
        );
      }

      return { queriesData };
    },
    onError: (_err, _vars, context) => {
      if (context?.queriesData) {
        for (const [queryKey, data] of context.queriesData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error("Erro ao publicar tópico. Tente novamente.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, isCurrentlyLiked }: { postId: string; isCurrentlyLiked: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      if (isCurrentlyLiked) {
        const { error: deleteError } = await supabase
          .from("post_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
        if (deleteError) throw deleteError;

        const { data: post } = await supabase
          .from("community_posts")
          .select("likes_count")
          .eq("id", postId)
          .single();

        await supabase
          .from("community_posts")
          .update({ likes_count: Math.max(0, (post?.likes_count ?? 1) - 1) })
          .eq("id", postId);
      } else {
        const { error: insertError } = await supabase
          .from("post_likes")
          .insert({ user_id: user.id, post_id: postId });
        if (insertError) throw insertError;

        const { data: post } = await supabase
          .from("community_posts")
          .select("likes_count")
          .eq("id", postId)
          .single();

        await supabase
          .from("community_posts")
          .update({ likes_count: (post?.likes_count ?? 0) + 1 })
          .eq("id", postId);
      }

      return { postId, liked: !isCurrentlyLiked };
    },
    onMutate: async ({ postId, isCurrentlyLiked }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      const queriesData = queryClient.getQueriesData<CommunityPost[]>({ queryKey: ["posts"] });

      for (const [queryKey] of queriesData) {
        queryClient.setQueryData<CommunityPost[]>(queryKey, (old) =>
          old?.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  isLiked: !isCurrentlyLiked,
                  likes_count: isCurrentlyLiked
                    ? Math.max(0, post.likes_count - 1)
                    : post.likes_count + 1,
                }
              : post
          )
        );
      }

      return { queriesData };
    },
    onError: (_err, _vars, context) => {
      if (context?.queriesData) {
        for (const [queryKey, data] of context.queriesData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error("Erro ao curtir. Tente novamente.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
