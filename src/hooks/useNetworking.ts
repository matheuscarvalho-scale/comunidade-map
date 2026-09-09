import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MemberProfile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  location: string | null;
  total_points: number;
  streak: number;
  created_at: string;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
}

export function useMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["members", user?.id],
    queryFn: async () => {
      // Fetch all profiles except current user
      const { data: profiles, error } = await supabase
        .from("profiles_public")
        .select("*")
        .order("total_points", { ascending: false });

      if (error) throw error;

      // Get connections if user is logged in
      let followingIds: string[] = [];
      let followerCounts: Record<string, number> = {};
      let followingCounts: Record<string, number> = {};

      if (user) {
        // Get who current user is following
        const { data: following } = await supabase
          .from("member_connections")
          .select("following_id")
          .eq("follower_id", user.id);

        followingIds = (following || []).map(f => f.following_id);

        // Get follower counts for all profiles
        const { data: allConnections } = await supabase
          .from("member_connections")
          .select("follower_id, following_id");

        if (allConnections) {
          allConnections.forEach(conn => {
            followerCounts[conn.following_id] = (followerCounts[conn.following_id] || 0) + 1;
            followingCounts[conn.follower_id] = (followingCounts[conn.follower_id] || 0) + 1;
          });
        }
      }

      // Map profiles with connection info
      const members: MemberProfile[] = (profiles || []).map(profile => ({
        ...profile,
        total_points: profile.total_points || 0,
        streak: profile.streak || 0,
        isFollowing: followingIds.includes(profile.user_id),
        followersCount: followerCounts[profile.user_id] || 0,
        followingCount: followingCounts[profile.user_id] || 0
      }));

      return members;
    }
  });
}

export function useFollowMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("member_connections")
        .insert({
          follower_id: user.id,
          following_id: memberId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    }
  });
}

export function useUnfollowMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("member_connections")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    }
  });
}
