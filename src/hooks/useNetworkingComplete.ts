import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MemberProfile, MemberMessage, Conversation } from "@/types/networking";

// Internal MAP team user IDs to exclude from member listings
const INTERNAL_MEMBER_IDS = [
  "430cdde2-f2e4-49c8-8c96-f0c649519f00",
  "1894fbbc-eb90-45f3-9abb-c67065393c31",
  "e4e8f871-cedd-47ab-9e14-3c52eed7d40e",
  "9747c48e-ab50-4d33-82f6-36e8a4d94398",
  "69add853-127c-411d-8f68-2051f278e84c",
  "297e25c2-fb4e-47ad-a8da-bdf0b4c70ebf",
  "634f99e0-131b-481c-816d-c14301568fe7", // Ingrid Medeiros (equipe interna)
  "b7783f1f-5e44-46ad-b1f9-17fe451d0689", // José Arthur Freitas (equipe interna)
  "7a68fe88-1dec-4fec-af54-a9deed5e634e", // Filipe Tardin (reembolsado)
  "628785b5-36c9-4516-bf27-bea300165f1f", // Renzo Lima (equipe interna)
  "498b0eb2-e4d4-418c-96ca-062d25675049", // Diego Sayegh (equipe interna)
  "44059506-de82-41e6-afd1-39bb3d7589c7", // Rodrigo Ferreira (equipe interna)
];

const INTERNAL_MEMBER_ROLES = ["admin", "admin_geral", "admin_financeiro", "admin_conteudo", "cx", "comercial", "marketing", "automacao"] as const;

// Fetch all public members
export function usePublicMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["public-members", user?.id],
    queryFn: async () => {
      // Get internal role users to exclude (secondary logins are NOT excluded — they participate)
      const rolesResult = await supabase.from("user_roles").select("user_id").in("role", INTERNAL_MEMBER_ROLES);
      const internalRoleUserIds = [...new Set((rolesResult.data || []).map(r => r.user_id))];
      const excludedUserIds = [...new Set([...INTERNAL_MEMBER_IDS, ...internalRoleUserIds])];

      const { data: profiles, error } = await supabase
        .from("profiles_public")
        .select("*")
        .eq("is_public", true)
        .not("user_id", "in", `(${excludedUserIds.join(",")})`)
        .order("total_points", { ascending: false });

      if (error) throw error;

      let followingIds: string[] = [];
      let followerCounts: Record<string, number> = {};
      let followingCounts: Record<string, number> = {};

      if (user) {
        const { data: following } = await supabase
          .from("member_connections")
          .select("following_id")
          .eq("follower_id", user.id);

        followingIds = (following || []).map(f => f.following_id);

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

      const members: MemberProfile[] = (profiles || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        name: profile.name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        niche: profile.niche || "outro",
        location: profile.location,
        location_state: profile.location_state,
        location_city: profile.location_city,
        experience_level: profile.experience_level || "iniciante",
        website_url: profile.website_url,
        instagram_url: profile.instagram_url,
        linkedin_url: profile.linkedin_url,
        is_public: profile.is_public ?? true,
        company: profile.company,
        job_title: profile.job_title,
        industry: profile.industry,
        total_points: profile.total_points || 0,
        streak: profile.streak || 0,
        created_at: profile.created_at,
        specialties: profile.specialties,
        isFollowing: followingIds.includes(profile.user_id),
        followersCount: followerCounts[profile.user_id] || 0,
        followingCount: followingCounts[profile.user_id] || 0
      }));

      return members;
    }
  });
}

// Fetch single member profile
export function useMemberProfile(userId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["member-profile", userId],
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from("profiles_public")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      // Get follow counts
      const { data: followers } = await supabase
        .from("member_connections")
        .select("follower_id")
        .eq("following_id", userId);

      const { data: following } = await supabase
        .from("member_connections")
        .select("following_id")
        .eq("follower_id", userId);

      // Check if current user follows this member
      let isFollowing = false;
      if (user) {
        const { data: followCheck } = await supabase
          .from("member_connections")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", userId)
          .single();
        isFollowing = !!followCheck;
      }

      const member: MemberProfile = {
        id: profile.id,
        user_id: profile.user_id,
        name: profile.name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        niche: profile.niche || "outro",
        location: profile.location,
        location_state: profile.location_state,
        location_city: profile.location_city,
        experience_level: profile.experience_level || "iniciante",
        website_url: profile.website_url,
        instagram_url: profile.instagram_url,
        linkedin_url: profile.linkedin_url,
        is_public: profile.is_public ?? true,
        company: profile.company,
        job_title: profile.job_title,
        industry: profile.industry,
        total_points: profile.total_points || 0,
        streak: profile.streak || 0,
        created_at: profile.created_at,
        isFollowing,
        followersCount: followers?.length || 0,
        followingCount: following?.length || 0
      };

      return member;
    },
    enabled: !!userId
  });
}

// Follow a member
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
      queryClient.invalidateQueries({ queryKey: ["public-members"] });
      queryClient.invalidateQueries({ queryKey: ["member-profile"] });
      queryClient.invalidateQueries({ queryKey: ["member-following"] });
    }
  });
}

// Unfollow a member
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
      queryClient.invalidateQueries({ queryKey: ["public-members"] });
      queryClient.invalidateQueries({ queryKey: ["member-profile"] });
      queryClient.invalidateQueries({ queryKey: ["member-following"] });
    }
  });
}

// Get member's followers
export function useMemberFollowers(userId: string) {
  return useQuery({
    queryKey: ["member-followers", userId],
    queryFn: async () => {
      const { data: connections, error } = await supabase
        .from("member_connections")
        .select("follower_id")
        .eq("following_id", userId);

      if (error) throw error;

      if (!connections?.length) return [];

      const followerIds = connections.map(c => c.follower_id);
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("*")
        .in("user_id", followerIds);

      return (profiles || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        avatar_url: p.avatar_url,
        bio: p.bio,
        niche: p.niche,
        location: p.location,
        location_state: p.location_state,
        location_city: p.location_city,
        experience_level: p.experience_level,
        website_url: p.website_url,
        instagram_url: p.instagram_url,
        linkedin_url: p.linkedin_url,
        is_public: p.is_public ?? true,
        total_points: p.total_points || 0,
        streak: p.streak || 0,
        created_at: p.created_at
      })) as MemberProfile[];
    },
    enabled: !!userId
  });
}

// Get member's following
export function useMemberFollowing(userId: string) {
  return useQuery({
    queryKey: ["member-following", userId],
    queryFn: async () => {
      const { data: connections, error } = await supabase
        .from("member_connections")
        .select("following_id")
        .eq("follower_id", userId);

      if (error) throw error;

      if (!connections?.length) return [];

      const followingIds = connections.map(c => c.following_id);
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("*")
        .in("user_id", followingIds);

      return (profiles || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        avatar_url: p.avatar_url,
        bio: p.bio,
        niche: p.niche,
        location: p.location,
        location_state: p.location_state,
        location_city: p.location_city,
        experience_level: p.experience_level,
        website_url: p.website_url,
        instagram_url: p.instagram_url,
        linkedin_url: p.linkedin_url,
        is_public: p.is_public ?? true,
        total_points: p.total_points || 0,
        streak: p.streak || 0,
        created_at: p.created_at
      })) as MemberProfile[];
    },
    enabled: !!userId
  });
}

// Update own profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<MemberProfile>) => {
      if (!user) throw new Error("Not authenticated");

      // Server-side guard: reject unsafe URL schemes before persisting.
      const safeUrl = (raw: string | null | undefined): string | null => {
        if (raw === null || raw === undefined) return null;
        const trimmed = String(raw).trim();
        if (!trimmed) return null;
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/?#].*)?$/i.test(trimmed)) {
          return `https://${trimmed}`;
        }
        throw new Error("URL inválida: use http:// ou https://");
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          bio: data.bio,
          niche: data.niche,
          location_state: data.location_state,
          location_city: data.location_city,
          experience_level: data.experience_level,
          website_url: safeUrl(data.website_url as any),
          instagram_url: safeUrl(data.instagram_url as any),
          linkedin_url: safeUrl(data.linkedin_url as any),
          is_public: data.is_public,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-members"] });
      queryClient.invalidateQueries({ queryKey: ["member-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  });
}

// Get conversations
export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: messages, error } = await supabase
        .from("member_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversationsMap = new Map<string, { messages: MemberMessage[], partnerId: string }>();

      messages?.forEach(msg => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, { messages: [], partnerId });
        }
        conversationsMap.get(partnerId)!.messages.push(msg as MemberMessage);
      });

      // Get partner profiles
      const partnerIds = Array.from(conversationsMap.keys());
      if (!partnerIds.length) return [];

      const { data: profiles } = await (supabase as any)
        .from("profiles_public")
        .select("*")
        .in("user_id", partnerIds);

      const profilesMap = new Map((profiles as any[] | null)?.map((p: any) => [p.user_id, p]) || []);

      const conversations: Conversation[] = Array.from(conversationsMap.values()).map(({ messages, partnerId }) => {
        const profile = profilesMap.get(partnerId);
        const unreadCount = messages.filter(m => m.receiver_id === user.id && !m.is_read).length;
        
        return {
          partnerId,
          partner: {
            id: profile?.id || "",
            user_id: partnerId,
            name: profile?.name || "Usuário",
            avatar_url: profile?.avatar_url || null,
            bio: profile?.bio || null,
            niche: profile?.niche || null,
            location: profile?.location || null,
            location_state: profile?.location_state || null,
            location_city: profile?.location_city || null,
            experience_level: profile?.experience_level || null,
            website_url: profile?.website_url || null,
            instagram_url: profile?.instagram_url || null,
            linkedin_url: profile?.linkedin_url || null,
            is_public: profile?.is_public ?? true,
            total_points: profile?.total_points || 0,
            streak: profile?.streak || 0,
            created_at: profile?.created_at || ""
          },
          lastMessage: messages[0],
          unreadCount
        };
      });

      return conversations.sort((a, b) => 
        new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      );
    },
    enabled: !!user
  });
}

// Get messages with a specific user
export function useMessages(partnerId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["messages", user?.id, partnerId],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("member_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as MemberMessage[];
    },
    enabled: !!user && !!partnerId
  });
}

// Send a message
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string, content: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("member_messages")
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", user?.id, variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  });
}

// Mark messages as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (senderId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("member_messages")
        .update({ is_read: true })
        .eq("sender_id", senderId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    }
  });
}

// Get total unread count
export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("member_messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user
  });
}

// Delete conversation (all messages with a partner)
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (partnerId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Delete messages sent by current user to partner
      const { error: error1 } = await supabase
        .from("member_messages")
        .delete()
        .eq("sender_id", user.id)
        .eq("receiver_id", partnerId);

      if (error1) throw error1;

      // Delete messages received from partner
      const { error: error2 } = await supabase
        .from("member_messages")
        .delete()
        .eq("sender_id", partnerId)
        .eq("receiver_id", user.id);

      if (error2) throw error2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    }
  });
}
