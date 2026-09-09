import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Suggestion {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  votes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string;
  user_vote?: "up" | "down" | null;
}

export interface SuggestionComment {
  id: string;
  suggestion_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
}

async function enrichWithProfiles(data: any[], userIdKey = "user_id") {
  const userIds = [...new Set(data.map((s: any) => s[userIdKey]))];
  if (!userIds.length) return new Map();
  const { data: profiles } = await (supabase as any)
    .from("profiles_public")
    .select("user_id, name, avatar_url")
    .in("user_id", userIds);
  return new Map((profiles || []).map((p: any) => [p.user_id, p]));
}

export function useSuggestions(filters?: { status?: string; category?: string; search?: string; sort?: string }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["suggestions", filters, user?.id],
    queryFn: async () => {
      let query = supabase.from("suggestions").select("*");

      if (filters?.status && filters.status !== "todas") {
        query = query.eq("status", filters.status);
      }
      if (filters?.category && filters.category !== "todas") {
        query = query.eq("category", filters.category);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.sort === "mais_votados") {
        query = query.order("votes_count", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      const profileMap = await enrichWithProfiles(data || []);

      let voteMap = new Map();
      if (user) {
        const { data: votes } = await supabase
          .from("suggestion_votes")
          .select("suggestion_id, vote_type")
          .eq("user_id", user.id);
        voteMap = new Map((votes || []).map((v: any) => [v.suggestion_id, v.vote_type]));
      }

      return (data || []).map((s: any) => ({
        ...s,
        author_name: profileMap.get(s.user_id)?.name || "Membro",
        author_avatar: profileMap.get(s.user_id)?.avatar_url || null,
        user_vote: voteMap.get(s.id) || null,
      })) as Suggestion[];
    },
  });
}

export function useSuggestionDetail(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["suggestion-detail", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("suggestions").select("*").eq("id", id).single();
      if (error) throw error;

      const { data: profile } = await (supabase as any)
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .eq("user_id", data.user_id)
        .maybeSingle();

      let userVote = null;
      if (user) {
        const { data: vote } = await supabase
          .from("suggestion_votes")
          .select("vote_type")
          .eq("suggestion_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        userVote = vote?.vote_type || null;
      }

      return {
        ...data,
        author_name: profile?.name || "Membro",
        author_avatar: profile?.avatar_url || null,
        user_vote: userVote,
      } as Suggestion;
    },
    enabled: !!id,
  });
}

export function useSuggestionComments(suggestionId: string) {
  return useQuery({
    queryKey: ["suggestion-comments", suggestionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggestion_comments")
        .select("*")
        .eq("suggestion_id", suggestionId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const profileMap = await enrichWithProfiles(data || []);

      return (data || []).map((c: any) => ({
        ...c,
        author_name: profileMap.get(c.user_id)?.name || "Membro",
        author_avatar: profileMap.get(c.user_id)?.avatar_url || null,
      })) as SuggestionComment[];
    },
    enabled: !!suggestionId,
  });
}

export function useCreateSuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, description, category }: { title: string; description: string; category: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("suggestions").insert({
        user_id: user.id,
        title,
        description,
        category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ suggestionId, content }: { suggestionId: string; content: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("suggestion_comments").insert({
        suggestion_id: suggestionId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
      // comments_count is updated automatically by trigger
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["suggestion-comments", vars.suggestionId] });
      queryClient.invalidateQueries({ queryKey: ["suggestion-detail", vars.suggestionId] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}

export function useVoteSuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ suggestionId, currentVote, newVoteType }: { suggestionId: string; currentVote: string | null; newVoteType?: string }) => {
      if (!user) throw new Error("Não autenticado");

      const voteType = newVoteType || "up";

      if (currentVote === voteType) {
        // Remove vote - trigger handles votes_count
        await supabase.from("suggestion_votes").delete().eq("suggestion_id", suggestionId).eq("user_id", user.id);
      } else {
        // Remove existing vote first
        if (currentVote) {
          await supabase.from("suggestion_votes").delete().eq("suggestion_id", suggestionId).eq("user_id", user.id);
        }
        // Add new vote - trigger handles votes_count
        await supabase.from("suggestion_votes").insert({ suggestion_id: suggestionId, user_id: user.id, vote_type: voteType });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["suggestion-detail"] });
    },
  });
}
