import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number | null;
  max_progress: number | null;
  is_seasonal: boolean;
  expires_at: string | null;
  season_name: string | null;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number | null;
  unlocked_at: string | null;
  created_at: string;
}

export interface AchievementWithProgress extends Achievement {
  userProgress?: UserAchievement;
  isUnlocked: boolean;
}

export interface AchievementNotification {
  id: string;
  user_id: string;
  achievement_id: string;
  is_read: boolean;
  created_at: string;
  achievement?: Achievement;
}

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_points: number;
  achievements_count: number;
}

// Hook to fetch all achievements with user progress
export function useAchievementsComplete() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["achievements-complete", user?.id],
    queryFn: async () => {
      // Get all achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("*")
        .order("category", { ascending: true });

      if (achievementsError) throw achievementsError;

      // Get user's achievements if logged in
      let userAchievements: UserAchievement[] = [];
      if (user) {
        const { data, error } = await supabase
          .from("user_achievements")
          .select("*")
          .eq("user_id", user.id);

        if (error) throw error;
        userAchievements = data || [];
      }

      // Merge achievements with user progress
      const achievementsWithProgress: AchievementWithProgress[] = (achievements || []).map((achievement) => {
        const userProgress = userAchievements.find((ua) => ua.achievement_id === achievement.id);
        return {
          ...achievement,
          is_seasonal: achievement.is_seasonal || false,
          userProgress,
          isUnlocked: !!userProgress?.unlocked_at,
        };
      });

      return achievementsWithProgress;
    },
  });
}

// Internal MAP team user IDs to exclude from rankings
const INTERNAL_USER_IDS = [
  "430cdde2-f2e4-49c8-8c96-f0c649519f00",
  "1894fbbc-eb90-45f3-9abb-c67065393c31",
  "e4e8f871-cedd-47ab-9e14-3c52eed7d40e",
  "9747c48e-ab50-4d33-82f6-36e8a4d94398",
  "69add853-127c-411d-8f68-2051f278e84c",
  "297e25c2-fb4e-47ad-a8da-bdf0b4c70ebf",
];

// Internal roles to exclude from rankings
const INTERNAL_ROLES = ["admin", "admin_geral", "admin_financeiro", "admin_conteudo", "cx", "comercial", "marketing", "automacao"] as const;

// Hook to fetch leaderboard data (uses SECURITY DEFINER RPC — no cross-user table access)
export function useLeaderboard(_period: "week" | "month" | "all" = "all") {
  return useQuery({
    queryKey: ["leaderboard", _period],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_leaderboard_with_achievements");
      if (error) throw error;
      return (data || []) as LeaderboardEntry[];
    },
  });
}

// Hook to fetch unread achievement notifications
export function useAchievementNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["achievement-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: notifications, error } = await supabase
        .from("achievement_notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get achievement details for each notification
      if (notifications && notifications.length > 0) {
        const achievementIds = notifications.map((n) => n.achievement_id);
        const { data: achievements } = await supabase
          .from("achievements")
          .select("*")
          .in("id", achievementIds);

        return notifications.map((notification) => ({
          ...notification,
          achievement: achievements?.find((a) => a.id === notification.achievement_id),
        })) as AchievementNotification[];
      }

      return [] as AchievementNotification[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Check for new notifications every 30 seconds
  });
}

// Hook to mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("achievement_notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievement-notifications"] });
    },
  });
}

// Hook to get user stats for achievements page
export function useAchievementStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["achievement-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_points, streak")
        .eq("user_id", user.id)
        .single();

      // Get unlocked achievements count
      const { count: unlockedCount } = await supabase
        .from("user_achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("unlocked_at", "is", null);

      // Get total achievements count
      const { count: totalCount } = await supabase
        .from("achievements")
        .select("*", { count: "exact", head: true });

      return {
        totalPoints: profile?.total_points || 0,
        streak: profile?.streak || 0,
        unlockedCount: unlockedCount || 0,
        totalCount: totalCount || 0,
      };
    },
    enabled: !!user,
  });
}

// Display achievement unlock toast
export function showAchievementUnlockToast(achievement: Achievement) {
  toast.success(`🎉 ${achievement.name} - +${achievement.points || 0} pontos`, {
    duration: 5000,
    description: achievement.description,
  });
}
