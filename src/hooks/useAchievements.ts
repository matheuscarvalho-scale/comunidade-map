import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  max_progress: number | null;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  unlocked_at: string | null;
  created_at: string;
}

export interface AchievementWithProgress extends Achievement {
  userProgress?: UserAchievement;
  isUnlocked: boolean;
}

export function useAchievements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["achievements", user?.id],
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
          userProgress,
          isUnlocked: !!userProgress?.unlocked_at,
        };
      });

      return achievementsWithProgress;
    },
  });
}

export function useUnlockAchievement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (achievementId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_achievements")
        .upsert({
          user_id: user.id,
          achievement_id: achievementId,
          unlocked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUpdateAchievementProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ achievementId, progress }: { achievementId: string; progress: number }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_achievements")
        .upsert({
          user_id: user.id,
          achievement_id: achievementId,
          progress,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}
